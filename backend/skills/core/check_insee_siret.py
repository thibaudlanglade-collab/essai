"""
Skill: check_insee_siret
Purpose: Validate a French SIRET number and look up company info via the
         public INSEE Recherche d'entreprises API (no auth required).
"""
from __future__ import annotations

from typing import Any

from skills.base import SkillResult

SKILL_ID = "check_insee_siret"
DESCRIPTION = "Valider un SIRET français et obtenir les infos de l'entreprise"
TASK_TYPE = "data_validation"

_API_BASE = "https://recherche-entreprises.api.gouv.fr/search"

TOOL_SCHEMA = {
    "name": "check_insee_siret",
    "description": (
        "Valide un numéro SIRET français (vérification Luhn + lookup INSEE) "
        "et retourne les informations de l'établissement: nom, adresse, activité, statut."
    ),
    "when_to_use": [
        "Vérifier qu'un numéro SIRET est valide avant de l'utiliser dans un document",
        "Obtenir les informations légales d'une entreprise à partir de son SIRET",
        "Vérifier si un fournisseur existe dans le registre INSEE",
    ],
    "when_not_to_use": [
        "Rechercher une entreprise par son nom — la recherche par SIRET est plus précise",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "siret": {
                "type": "string",
                "description": "Numéro SIRET à 14 chiffres (espaces tolérés)",
            },
        },
        "required": ["siret"],
    },
}


def _luhn_check(number: str) -> bool:
    """
    Standard Luhn algorithm for SIRET (14-digit).
    Starting from the rightmost digit, double every second digit.
    If the doubled value > 9, subtract 9. Sum all digits.
    Valid if total % 10 == 0.
    """
    total = 0
    for i, ch in enumerate(reversed(number)):
        n = int(ch)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


def _normalize_siret(raw: str) -> str:
    """Remove all whitespace from SIRET string."""
    return "".join(raw.split())


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        import httpx

        raw_siret: str = input_data.get("siret") or ""
        siret = _normalize_siret(raw_siret)

        if not siret:
            return SkillResult(
                success=False, data=None, error="Le numéro SIRET est requis."
            )

        if not siret.isdigit():
            return SkillResult(
                success=False,
                data=None,
                error=f"Le SIRET doit contenir uniquement des chiffres (reçu: '{siret}').",
            )

        if len(siret) != 14:
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"Un SIRET doit comporter exactement 14 chiffres "
                    f"(reçu {len(siret)} chiffres: '{siret}')."
                ),
            )

        luhn_ok = _luhn_check(siret)

        # Query the public Recherche d'entreprises API
        params = {"q": siret, "per_page": 1}
        headers = {"User-Agent": "Synthese/1.0 (validation SIRET)"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(_API_BASE, params=params, headers=headers)

        if resp.status_code != 200:
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"L'API INSEE a retourné une erreur HTTP {resp.status_code}. "
                    "La validation Luhn reste disponible: "
                    f"{'valide' if luhn_ok else 'invalide'}."
                ),
            )

        body = resp.json()
        results = body.get("results", [])

        if not results:
            return SkillResult(
                success=True,
                data={
                    "siret": siret,
                    "valid": luhn_ok,
                    "found": False,
                    "company_name": None,
                    "legal_form": None,
                    "address": None,
                    "city": None,
                    "postal_code": None,
                    "activity_code": None,
                    "activity_label": None,
                    "is_active": None,
                    "creation_date": None,
                    "raw_response_excerpt": {},
                },
            )

        # The API returns "entreprises" with "matching_etablissements"
        match = results[0]
        nom = match.get("nom_complet") or match.get("nom_raison_sociale") or None
        legal_form = (match.get("forme_juridique") or {}).get("libelle") or None
        creation_date = match.get("date_creation") or None
        activity_code = (match.get("activite_principale") or {}).get("code") or None
        activity_label = (match.get("activite_principale") or {}).get("libelle") or None

        # Find the matching etablissement for address
        etabs = match.get("matching_etablissements") or []
        address = city = postal_code = None
        is_active = None

        if etabs:
            etab = etabs[0]
            adresse_parts = [
                etab.get("numero_voie", ""),
                etab.get("type_voie", ""),
                etab.get("libelle_voie", ""),
            ]
            address = " ".join(p for p in adresse_parts if p).strip() or None
            city = etab.get("libelle_commune") or None
            postal_code = etab.get("code_postal") or None
            etat = etab.get("etat_administratif")
            if etat is not None:
                is_active = etat == "A"

        return SkillResult(
            success=True,
            data={
                "siret": siret,
                "valid": luhn_ok,
                "found": True,
                "company_name": nom,
                "legal_form": legal_form,
                "address": address,
                "city": city,
                "postal_code": postal_code,
                "activity_code": activity_code,
                "activity_label": activity_label,
                "is_active": is_active,
                "creation_date": creation_date,
                "raw_response_excerpt": match,
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"check_insee_siret a échoué: {exc}",
        )
