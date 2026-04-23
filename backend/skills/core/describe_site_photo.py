"""
Skill: describe_site_photo
Purpose: Décrire ce qu'il y a à faire sur une photo de chantier BTP et proposer
         les postes de la grille tarifaire qui correspondent. Ne mesure PAS
         (Vision est peu fiable en métrage), c'est l'artisan qui saisit ses
         mesures dans le calculateur côté UI.

Pure skill : aucun accès DB. Le caller (api/quotes.py) fournit l'image en
base64 (data URL) + la grille tarifaire du prospect.
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from skills.base import SkillResult

SKILL_ID = "describe_site_photo"
DESCRIPTION = (
    "Identifier les postes BTP visibles sur une photo de chantier et proposer "
    "les entrées de grille tarifaire correspondantes. Ne produit pas de mesures."
)

TOOL_SCHEMA = {
    "name": "describe_site_photo",
    "description": (
        "Analyse une photo de chantier, produit une description courte des "
        "travaux à réaliser et propose les postes de la grille tarifaire "
        "qui matchent (l'artisan saisit ensuite ses mesures)."
    ),
    "when_to_use": [
        "Création d'un devis à partir d'une photo prise sur site",
    ],
    "when_not_to_use": [
        "Obtenir un métré précis (Vision n'est pas fiable pour la mesure)",
        "Identifier des personnes sur une photo",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "image_data_url": {
                "type": "string",
                "description": "Data URL base64 de l'image (data:image/jpeg;base64,...).",
            },
            "tarif_grid": {
                "type": "array",
                "description": "Grille tarifaire du prospect (key/label/unit/unit_price_ht/category).",
                "items": {"type": "object"},
            },
        },
        "required": ["image_data_url", "tarif_grid"],
    },
}


_SYSTEM_PROMPT = """\
Vous êtes l'assistant d'un artisan BTP en France, spécialisé dans l'analyse
de photos de chantier (intérieur en rénovation, murs, sols, plafonds,
plomberie, cloisons, pièces d'eau).

Votre rôle :
1. Décrire sobrement et factuellement ce qui est visible sur la photo
   (pièce, état des surfaces, équipements présents, éventuels défauts).
2. Proposer la liste des POSTES à prévoir pour ces travaux, en priorité
   ceux qui existent dans la grille tarifaire fournie.

Règles strictes :
1. Sortie JSON strict, rien avant, rien après, pas de ```json.
2. Vouvoiement, ton professionnel. Français seulement.
3. NE PAS donner de mesures précises (surfaces, longueurs). Vision n'est
   pas fiable pour cela. L'artisan mesurera sur site.
4. `description` : 2 à 5 phrases. Se limiter à ce qui est visible ; ne pas
   extrapoler un chantier complet si la photo ne montre qu'une petite zone.
5. `suggested_postes` : liste ordonnée par pertinence. Chaque entrée :
   - `tarif_key` : la clé d'un poste de la grille (ou null si rien ne matche)
   - `label` : le libellé à afficher (reprendre celui de la grille si tarif_key
     est défini, sinon proposer un libellé court)
   - `reason` : 1 phrase expliquant pourquoi ce poste (ex : "mur actuellement
     en placo, à repeindre").
6. Maximum 8 postes suggérés.
7. N'utilisez jamais les mots "IA", "automatisation", "intelligence artificielle",
   "aider".
8. N'utilisez jamais de tirets longs (caractère —). Remplacez par une virgule
   ou par des parenthèses.

Format de sortie :
{
  "description": "description visible en 2 à 5 phrases",
  "suggested_postes": [
    {"tarif_key": "peinture_murale_m2", "label": "Peinture murale", "reason": "murs en placo existants, prévus à repeindre"},
    {"tarif_key": null, "label": "Dépose tapisserie", "reason": "papier peint abîmé visible"}
  ],
  "confidence": 0.7
}
"""


_MAX_GRID_ENTRIES = 80


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


def _format_grid(grid: list[dict[str, Any]]) -> str:
    if not grid:
        return "(grille tarifaire vide — tarif_key doit être null dans les suggestions)"
    lines = []
    current_cat: Optional[str] = None
    for entry in grid[:_MAX_GRID_ENTRIES]:
        cat = entry.get("category") or "Autre"
        if cat != current_cat:
            lines.append(f"— {cat} —")
            current_cat = cat
        key = entry.get("key", "")
        label = entry.get("label", "")
        unit = entry.get("unit", "")
        lines.append(f"  [{key}] {label} ({unit})")
    return "\n".join(lines)


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        import config

        image_data_url = (input_data.get("image_data_url") or "").strip()
        if not image_data_url:
            return SkillResult(success=False, data=None, error="image_data_url est requis.")
        if not image_data_url.startswith("data:image/"):
            return SkillResult(
                success=False, data=None,
                error="image_data_url doit être une data URL (data:image/...;base64,...).",
            )

        grid_raw = input_data.get("tarif_grid") or []
        if not isinstance(grid_raw, list):
            grid_raw = []
        valid_keys = {str(e.get("key")) for e in grid_raw if isinstance(e, dict) and e.get("key")}

        grid_block = _format_grid(grid_raw)

        user_parts = [
            {
                "type": "text",
                "text": (
                    "Analysez cette photo de chantier et proposez les postes BTP à prévoir.\n\n"
                    f"Grille tarifaire du prospect ({len(grid_raw)} postes) :\n{grid_block}\n\n"
                    "Rappel : pas de mesures, seulement une description + des postes suggérés. "
                    "JSON strict en sortie."
                ),
            },
            {
                "type": "image_url",
                "image_url": {"url": image_data_url, "detail": "high"},
            },
        ]

        llm = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        response = await llm.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_parts},
            ],
            max_tokens=1200,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or ""
        parsed = _extract_json(raw)

        description = str(parsed.get("description") or "").strip()
        raw_postes = parsed.get("suggested_postes") or []

        cleaned_postes: list[dict[str, Any]] = []
        for entry in raw_postes:
            if not isinstance(entry, dict):
                continue
            tarif_key_raw = entry.get("tarif_key")
            tarif_key = (
                str(tarif_key_raw).strip()
                if tarif_key_raw not in (None, "", "null")
                else None
            )
            if tarif_key and tarif_key not in valid_keys:
                tarif_key = None
            label = str(entry.get("label") or "").strip()[:255]
            if not label and tarif_key:
                # Find label from grid
                for g in grid_raw:
                    if g.get("key") == tarif_key:
                        label = g.get("label", "") or ""
                        break
            reason = str(entry.get("reason") or "").strip()[:300]
            if not label:
                continue
            cleaned_postes.append({
                "tarif_key": tarif_key,
                "label": label,
                "reason": reason,
            })
            if len(cleaned_postes) >= 10:
                break

        try:
            confidence = float(parsed.get("confidence") or 0.5)
        except (TypeError, ValueError):
            confidence = 0.5

        if not description and not cleaned_postes:
            return SkillResult(
                success=False,
                data=None,
                error="Le modèle n'a pas pu exploiter l'image.",
            )

        return SkillResult(
            success=True,
            data={
                "description": description or "(aucune description)",
                "suggested_postes": cleaned_postes,
                "confidence": confidence,
            },
            debug={
                "model": "gpt-4o",
                "grid_size": len(grid_raw),
                "postes_returned": len(cleaned_postes),
                "raw_len": len(raw),
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"describe_site_photo a échoué: {exc}",
        )
