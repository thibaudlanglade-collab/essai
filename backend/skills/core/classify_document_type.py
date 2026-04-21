"""
Skill: classify_document_type
Purpose: Classify a document's type and extract structured metadata using GPT-4o.
"""
from __future__ import annotations

import json
import re
from datetime import date as _date
from typing import Any, Optional

from skills.base import SkillResult

SKILL_ID = "classify_document_type"
DESCRIPTION = "Classifier le type d'un document et extraire ses métadonnées"
TASK_TYPE = "document_classification"

VALID_DOCUMENT_TYPES = {
    "facture", "devis", "contrat", "releve_bancaire",
    "attestation", "courrier", "bon_de_commande", "fiche_de_paie", "autre",
}

TOOL_SCHEMA = {
    "name": "classify_document_type",
    "description": (
        "Classifie le type d'un document professionnel et extrait ses métadonnées "
        "(fournisseur, date, montant, numéro) via GPT-4o. "
        "Suggère aussi un nom de fichier normalisé."
    ),
    "when_to_use": [
        "Identifier automatiquement le type d'un document (facture, devis, contrat, etc.)",
        "Extraire fournisseur, date et montant d'un document scanné",
        "Générer un nom de fichier normalisé pour classer un document",
    ],
    "when_not_to_use": [
        "Extraire des tableaux de données — utiliser extract_tables_smart",
        "Classifier des emails — utiliser classify_email",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "text_content": {
                "type": "string",
                "description": "Texte extrait du document (tronqué à 4000 caractères max)",
            },
            "filename": {
                "type": "string",
                "description": "Nom du fichier original (optionnel, donne des indices au modèle)",
            },
        },
        "required": ["text_content"],
    },
}

_SYSTEM_PROMPT = """\
Tu es un classificateur de documents professionnels. Tu analyses le texte d'un document \
et tu retournes:
1. Son type parmi: facture, devis, contrat, releve_bancaire, attestation, courrier, \
bon_de_commande, fiche_de_paie, autre
2. Ses métadonnées extraites (vendor, date, amount, document_number)
3. Un nom de fichier suggéré au format: Type_Vendor_Date_Amount (ex: Facture_Martin-SARL_2026-04-09_1250EUR)

Tu retournes UNIQUEMENT du JSON valide:
{
  "document_type": "facture",
  "vendor": "Martin SARL" | null,
  "date": "2026-04-09" | null,
  "amount": 1250.50 | null,
  "currency": "EUR" | null,
  "document_number": "FAC-2026-001" | null,
  "suggested_filename": "Facture_Martin-SARL_2026-04-09_1250EUR",
  "confidence": 0.95,
  "reasoning": "explication courte en français"
}

Règles strictes:
- Le document_type DOIT être un des 9 types listés
- Les dates au format YYYY-MM-DD
- Les montants en nombre (pas de chaîne)
- Le suggested_filename SANS extension, avec underscores, sans caractères spéciaux
- Si une info est introuvable, mets null

RÈGLE CRITIQUE pour suggested_filename:
- Le nom ne doit JAMAIS contenir 'null' ou des champs vides
- Si vendor est null: utilise un mot descriptif du sujet principal \
(ex: 'Dossier-Presentation', 'Compte-Rendu-Reunion', 'Note-Interne')
- Si date est null: utilise la date du jour au format YYYY-MM-DD
- Si amount est null: ne mets rien à la place, pas de placeholder
- Format final: {document_type}_{sujet_ou_vendor}_{date}[_montantEUR]
- Exemples valides:
  * Facture_Martin-SARL_2026-04-09_1250EUR
  * Dossier-Presentation_OnHiva-Mordoree_2026-04-09
  * Compte-Rendu_Reunion-Equipe_2026-04-09
  * Contrat_Client-Dupont_2026-04-09
- Tu dois TOUJOURS produire un nom lisible et unique, jamais de 'null'\
"""

_INVALID_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f\s]')


def _sanitize_filename(name: str) -> str:
    sanitized = _INVALID_FILENAME_CHARS.sub("_", name or "document")
    return re.sub(r"_+", "_", sanitized).strip("_") or "document"


def _build_fallback_filename(
    doc_type: str,
    vendor: Optional[str],
    doc_date: Optional[str],
    amount: Optional[float],
    currency: Optional[str],
    text_content: str,
) -> str:
    """Build a clean filename when the LLM-suggested one contains 'null'."""
    type_label = doc_type.replace("_", "-").capitalize()
    parts = [type_label]

    if vendor:
        safe_vendor = re.sub(r"[^\w\-]", "-", vendor).strip("-")[:30]
        parts.append(safe_vendor)
    else:
        # Extract first 3-4 significant words from document text
        _STOPWORDS = {
            "les", "des", "une", "pour", "dans", "avec", "sur", "par", "est",
            "que", "qui", "pas", "plus", "vous", "nous", "the", "and", "for",
            "this", "that", "votre", "notre", "voici", "tout", "mais", "comme",
        }
        words = re.findall(r"\b[A-Za-zÀ-ÿ]{3,}\b", text_content)
        sig = [w.capitalize() for w in words if w.lower() not in _STOPWORDS][:4]
        if sig:
            parts.append("-".join(sig)[:30])

    parts.append(doc_date if doc_date else str(_date.today()))

    if amount is not None:
        curr = currency or "EUR"
        parts.append(f"{int(amount)}{curr}")

    return "_".join(parts)


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {}


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        import config

        text_content: str = (input_data.get("text_content") or "")[:4000]
        filename: Optional[str] = input_data.get("filename") or None

        if not text_content.strip():
            return SkillResult(
                success=False,
                data=None,
                error="Le contenu texte du document est requis.",
            )

        user_lines = ["Voici le contenu du document à classifier:"]
        if filename:
            user_lines.append(f"\nFilename: {filename}")
        user_lines.append(f"\nText:\n{text_content}")
        user_message = "\n".join(user_lines)

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=512,
        )

        raw = response.choices[0].message.content or ""
        parsed = _extract_json(raw)

        doc_type = parsed.get("document_type", "autre")
        if doc_type not in VALID_DOCUMENT_TYPES:
            doc_type = "autre"

        amount = parsed.get("amount")
        if amount is not None:
            try:
                amount = float(amount)
            except (TypeError, ValueError):
                amount = None

        confidence = parsed.get("confidence", 0.0)
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.0

        vendor = parsed.get("vendor") or None
        doc_date = parsed.get("date") or None
        currency = parsed.get("currency") or None

        suggested_raw = parsed.get("suggested_filename") or ""
        if not suggested_raw or "null" in suggested_raw.lower():
            # LLM failed to produce a clean name — build one from the fields
            suggested_raw = _build_fallback_filename(
                doc_type, vendor, doc_date, amount, currency, text_content
            )

        suggested = _sanitize_filename(suggested_raw)

        return SkillResult(
            success=True,
            data={
                "document_type": doc_type,
                "vendor": vendor,
                "date": doc_date,
                "amount": amount,
                "currency": currency,
                "document_number": parsed.get("document_number") or None,
                "suggested_filename": suggested,
                "confidence": confidence,
                "reasoning": parsed.get("reasoning") or "",
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"classify_document_type a échoué: {exc}",
        )
