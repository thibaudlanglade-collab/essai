"""
Skill: suggest_btp_classement
Purpose: Given a classified BTP document + its metadata, propose where to
         file it and under what name, per the Synthèse brief §6.1.
         Pure formatting — no LLM, deterministic.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date as _date, datetime
from typing import Any, Optional

from skills.base import SkillResult

SKILL_ID = "suggest_btp_classement"
DESCRIPTION = (
    "Proposer un dossier cible et un nom de fichier pour un document BTP "
    "(facture, contrat, note, devis…) à partir de ses métadonnées."
)
TASK_TYPE = "file_operation"


TOOL_SCHEMA = {
    "name": "suggest_btp_classement",
    "description": (
        "Construire un chemin de classement (dossier cible + nom de fichier) "
        "pour un document BTP, selon le schéma Synthèse §6.1 :\n"
        "  - facture → Factures/<Fournisseur>/<Mois_Année>/"
        "<YYYY-MM-DD>_<Fournisseur>_FacN<numéro>_<montantTTC>EUR.pdf\n"
        "  - contrat → Contrats/<Année>/<YYYY-MM-DD>_Contrat_<tiers>.pdf\n"
        "  - note    → Notes_chantier/<Projet>/<YYYY-MM-DD>_<Projet>.txt\n"
        "  - autre   → Autres/<basename>\n"
        "Le skill est déterministe, n'appelle pas d'API externe. Les champs "
        "manquants sont remplacés par '?' pour que le prospect voie ce qu'il "
        "lui reste à renseigner."
    ),
    "when_to_use": [
        "Après classify_document_type ou une extraction de champs facture, "
        "pour obtenir un chemin d'archivage suggéré prêt à être édité par "
        "l'utilisateur avant validation.",
    ],
    "when_not_to_use": [
        "Pour renommer ou déplacer un fichier réellement — utiliser "
        "rename_file et/ou move_file avec les valeurs produites ici.",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "document_type": {
                "type": "string",
                "description": (
                    "Type de document. Accepte les valeurs FR de "
                    "classify_document_type (facture/devis/contrat/…) et "
                    "les valeurs EN de l'UI (invoice/contract/note/other)."
                ),
            },
            "vendor": {
                "type": "string",
                "description": "Nom du fournisseur / tiers / chantier (facultatif).",
            },
            "document_date": {
                "type": "string",
                "description": "Date du document au format YYYY-MM-DD (facultatif).",
            },
            "amount_ttc": {
                "type": "number",
                "description": "Montant TTC (facultatif, utilisé pour les factures).",
            },
            "currency": {
                "type": "string",
                "description": "Devise ISO 4217 (défaut : EUR).",
            },
            "document_number": {
                "type": "string",
                "description": "Numéro du document (facture, devis…).",
            },
            "original_filename": {
                "type": "string",
                "description": (
                    "Nom de fichier original — sert de fallback pour les "
                    "documents de type 'autre'."
                ),
            },
        },
        "required": ["document_type"],
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


_INVALID_FS_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')


def _slugify(value: str) -> str:
    """Filesystem-safe slug: strip accents, spaces/specials → underscore."""
    if not value:
        return ""
    nfd = unicodedata.normalize("NFD", value)
    ascii_only = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    cleaned = _INVALID_FS_CHARS.sub("_", ascii_only)
    cleaned = re.sub(r"\s+", "_", cleaned)
    cleaned = re.sub(r"_+", "_", cleaned)
    return cleaned.strip("._-")


_MONTHS_FR = [
    "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
]


def _month_label(iso_date: Optional[str]) -> Optional[str]:
    if not iso_date:
        return None
    try:
        dt = datetime.strptime(iso_date[:10], "%Y-%m-%d")
    except (ValueError, TypeError):
        return None
    return f"{_MONTHS_FR[dt.month - 1]}_{dt.year}"


# Maps classify_document_type's FR labels + UI's EN labels to canonical buckets.
_TYPE_CANON = {
    # FR (classify_document_type)
    "facture": "invoice",
    "bon_de_commande": "invoice",
    "releve_bancaire": "other",
    "attestation": "other",
    "courrier": "other",
    "fiche_de_paie": "other",
    "devis": "quote",
    "contrat": "contract",
    "autre": "other",
    # EN (UI / frontend)
    "invoice": "invoice",
    "contract": "contract",
    "note": "note",
    "quote": "quote",
    "other": "other",
}


def _canon_type(value: str) -> str:
    key = (value or "").strip().lower()
    return _TYPE_CANON.get(key, "other")


def _amount_tag(amount: Any, currency: Optional[str]) -> str:
    if amount is None or amount == "":
        return "?EUR"
    try:
        n = float(amount)
    except (TypeError, ValueError):
        return "?EUR"
    curr = (currency or "EUR").upper()
    formatted = f"{n:.2f}".replace(".", "-")
    return f"{formatted}{curr}"


# ─────────────────────────────────────────────────────────────────────────────
# Execute
# ─────────────────────────────────────────────────────────────────────────────


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        doc_type = _canon_type(input_data.get("document_type", ""))
        vendor = (input_data.get("vendor") or "").strip() or None
        doc_date = (input_data.get("document_date") or "").strip() or None
        amount_ttc = input_data.get("amount_ttc")
        currency = input_data.get("currency") or "EUR"
        doc_number = (input_data.get("document_number") or "").strip() or None
        original_filename = (input_data.get("original_filename") or "").strip() or None

        vendor_slug = _slugify(vendor) if vendor else None
        date_str = doc_date or "?"
        year = (doc_date[:4] if doc_date else str(_date.today().year))

        # ── Invoice ──────────────────────────────────────────────────────────
        if doc_type == "invoice":
            month_label = _month_label(doc_date) or "Mois_inconnu"
            folder = f"Factures/{vendor_slug or 'Fournisseur'}/{month_label}/"
            num_slug = _slugify(doc_number) if doc_number else "?"
            num_slug = num_slug.replace("_", "") or "?"
            filename = (
                f"{date_str}_{vendor_slug or 'Fournisseur'}_"
                f"FacN{num_slug}_{_amount_tag(amount_ttc, currency)}.pdf"
            )

        # ── Contract ─────────────────────────────────────────────────────────
        elif doc_type == "contract":
            folder = f"Contrats/{year}/"
            filename = (
                f"{date_str}_Contrat_{vendor_slug or 'Tiers'}.pdf"
            )

        # ── Note de chantier ─────────────────────────────────────────────────
        elif doc_type == "note":
            project_slug = vendor_slug or "Chantier"
            folder = f"Notes_chantier/{project_slug}/"
            filename = f"{date_str}_{project_slug}.txt"

        # ── Devis ────────────────────────────────────────────────────────────
        elif doc_type == "quote":
            folder = f"Devis/{vendor_slug or 'Client'}/{year}/"
            num_slug = _slugify(doc_number) if doc_number else "?"
            filename = (
                f"{date_str}_Devis_{vendor_slug or 'Client'}_"
                f"DV{num_slug}.pdf"
            )

        # ── Other ────────────────────────────────────────────────────────────
        else:
            folder = "Autres/"
            base = _slugify(_basename(original_filename) or "document")
            filename = base if "." in base else f"{base}.txt"

        return SkillResult(
            success=True,
            data={
                "document_type": doc_type,
                "suggested_folder": folder,
                "suggested_filename": filename,
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"suggest_btp_classement a échoué: {exc}",
        )


def _basename(value: Optional[str]) -> str:
    """Return the basename of `value` if it looks like a path, else value as-is."""
    if not value:
        return ""
    from pathlib import Path

    return Path(value).name or value
