"""
Skill: generate_quote
Purpose: Générer un devis BTP structuré à partir d'une description libre
         (texte saisi, transcription vocale, contenu d'email, description
         d'une photo), en se calant autant que possible sur la grille
         tarifaire du prospect.

Pure skill : aucun accès DB. Le caller (services/quote_service.py ou
api/quotes.py) fournit le contexte et persiste le résultat.
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from skills.base import SkillResult

SKILL_ID = "generate_quote"
DESCRIPTION = (
    "Produire les lignes structurées d'un devis BTP (libellé, quantité, unité, "
    "prix unitaire HT) à partir d'une description en langage naturel et d'une "
    "grille tarifaire de référence."
)

TOOL_SCHEMA = {
    "name": "generate_quote",
    "description": (
        "Génère un devis BTP structuré depuis une description libre + grille "
        "tarifaire. Les prix viennent de la grille quand le poste y figure, "
        "sinon la ligne est marquée `custom` et le LLM propose une estimation."
    ),
    "when_to_use": [
        "Création d'un devis depuis un texte libre, un vocal ou un mail",
        "Pré-remplissage de lignes de devis à partir d'une description de chantier",
    ],
    "when_not_to_use": [
        "La demande ne concerne pas du BTP / second œuvre",
        "Aucune description de besoin n'est fournie (retourner plutôt une erreur)",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "source_text": {
                "type": "string",
                "description": "Description libre du besoin (texte, vocal, extrait de mail).",
            },
            "tarif_grid": {
                "type": "array",
                "description": (
                    "Grille tarifaire du prospect. Chaque entrée : "
                    "`key`, `label`, `unit`, `unit_price_ht`, `vat_rate`, `category`."
                ),
                "items": {"type": "object"},
            },
            "client_context": {
                "type": "object",
                "description": "Optionnel. `name`, `type`, `notes`.",
            },
            "suggested_vat_rate": {
                "type": "number",
                "description": "Optionnel. TVA suggérée (0.20, 0.10, 0.055). Défaut 0.10 (rénovation).",
            },
            "existing_lines": {
                "type": "array",
                "description": (
                    "Optionnel. Lignes déjà présentes dans le devis. Si fourni, "
                    "produire uniquement des lignes COMPLÉMENTAIRES (mode additif) : "
                    "ne pas redoublonner, et renvoyer UNIQUEMENT `lines` (les autres "
                    "champs title/description peuvent être vides)."
                ),
                "items": {"type": "object"},
            },
            "mode": {
                "type": "string",
                "description": "'full' (défaut) ou 'append'. 'append' = mode additif.",
            },
        },
        "required": ["source_text", "tarif_grid"],
    },
}


_SYSTEM_PROMPT_APPEND = """\
Vous êtes le générateur de devis d'une application pour artisans BTP en France.
Mode : AJOUT DE LIGNES. Des lignes existent déjà dans le devis (fournies
en contexte). L'artisan souhaite AJOUTER de nouvelles prestations décrites
dans un texte libre.

Règles strictes :
1. Sortie JSON strict, rien avant, rien après, pas de ```json.
2. Vouvoiement, ton professionnel et sobre.
3. Ne RÉPÉTEZ jamais une ligne déjà présente dans `existing_lines`. Si le
   texte ajoute une quantité à un poste déjà présent, renvoyez une ligne
   distincte avec un libellé qui le précise (ex : "Peinture supplémentaire
   chambre").
4. Si un poste existe dans la grille tarifaire, utilisez exactement son
   `label`, son `unit` et son `unit_price_ht`. Indiquez `source: "grid"` +
   `tarif_key`. Sinon `source: "custom"`, `tarif_key: null`, avec un prix
   cohérent avec le marché BTP PACA/Occitanie (2026).
5. Les quantités viennent de la description ; arrondissez raisonnablement.
6. Regroupez les petites fournitures dans une ligne "Fournitures diverses"
   plutôt que 10 lignes séparées. Maximum 10 nouvelles lignes.
7. N'utilisez jamais les mots "IA", "automatisation", "intelligence artificielle",
   "aider".
8. N'utilisez jamais de tirets longs (caractère —). Remplacez par une virgule
   ou par des parenthèses.

Format de sortie (mode append, UNIQUEMENT ces champs) :
{
  "lines": [
    {
      "label": "libellé",
      "quantity": 12.5,
      "unit": "m²",
      "unit_price_ht": 25.00,
      "source": "grid",
      "tarif_key": "peinture_murale_m2"
    }
  ]
}
"""


_SYSTEM_PROMPT = """\
Vous êtes le générateur de devis d'une application pour artisans BTP en France.

Votre rôle : lire la description d'un besoin (travaux à réaliser) et produire
les lignes structurées d'un devis. Vous disposez d'une grille tarifaire déjà
saisie par l'artisan : utilisez-la en priorité quand le poste y figure.

Règles strictes :
1. Sortie JSON strict, rien avant, rien après, pas de ```json.
2. Vouvoiement, ton professionnel et sobre.
3. Si un poste existe dans la grille tarifaire fournie, utilisez exactement son
   `label`, son `unit` et son `unit_price_ht`. Indiquez `source: "grid"` et
   `tarif_key` = la clé correspondante. Les quantités viennent de la description.
4. Si un poste manque dans la grille, produisez quand même une ligne :
   `source: "custom"`, `tarif_key: null`. Proposez un `unit_price_ht` cohérent
   avec le marché BTP PACA/Occitanie (2026). Préférez sous-évaluer légèrement
   plutôt que sur-évaluer.
5. Arrondissez les quantités à une décimale raisonnable (m² : 0.5 près).
   Arrondissez les prix unitaires au centime.
6. Si la description est vague, posez des hypothèses raisonnables et listez-les
   dans `assumptions` (chaîne courte de 1 à 3 phrases).
7. Limitez-vous à 15 lignes maximum. Regroupez les petites fournitures dans
   une ligne "Fournitures diverses" plutôt que 10 lignes séparées.
8. N'utilisez jamais les mots "IA", "automatisation", "intelligence artificielle",
   "aider".
9. N'utilisez jamais de tirets longs (caractère —). Remplacez par une virgule
   ou par des parenthèses.
10. Le champ `title` : 1 courte phrase descriptive (ex : "Rénovation salle de
    bain 8 m², pose douche italienne").
11. Le champ `description` : 2 à 4 phrases récapitulant le périmètre des travaux.

Format de sortie :
{
  "title": "titre court du devis",
  "description": "récapitulatif du périmètre en 2 à 4 phrases",
  "assumptions": "hypothèses retenues si besoin, sinon chaîne vide",
  "suggested_vat_rate": 0.10,
  "lines": [
    {
      "label": "libellé",
      "quantity": 12.5,
      "unit": "m²",
      "unit_price_ht": 25.00,
      "source": "grid",
      "tarif_key": "peinture_murale_m2"
    }
  ]
}
"""


_MAX_SOURCE_CHARS = 4000
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


def _truncate(text: Optional[str], limit: int) -> str:
    if not text:
        return ""
    text = str(text).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "…"


def _format_grid(grid: list[dict[str, Any]]) -> str:
    if not grid:
        return "(aucune grille tarifaire, produisez des lignes custom avec des prix cohérents du marché)"
    lines = []
    current_cat = object()
    for entry in grid[:_MAX_GRID_ENTRIES]:
        cat = entry.get("category") or "Autre"
        if cat != current_cat:
            lines.append(f"\n— {cat} —")
            current_cat = cat
        key = entry.get("key", "")
        label = entry.get("label", "")
        unit = entry.get("unit", "")
        price = entry.get("unit_price_ht", 0)
        lines.append(f"  [{key}] {label} — {price} €/{unit}")
    return "\n".join(lines)


def _validate_line(raw: Any, valid_keys: set[str]) -> Optional[dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    label = str(raw.get("label") or "").strip()
    if not label:
        return None
    try:
        qty = float(raw.get("quantity") or 0)
    except (TypeError, ValueError):
        qty = 0.0
    if qty < 0:
        qty = 0.0
    unit = str(raw.get("unit") or "u").strip()
    try:
        pu = float(raw.get("unit_price_ht") or 0)
    except (TypeError, ValueError):
        pu = 0.0
    if pu < 0:
        pu = 0.0
    source = str(raw.get("source") or "custom")
    if source not in {"grid", "custom"}:
        source = "custom"
    tarif_key_raw = raw.get("tarif_key")
    tarif_key = (
        str(tarif_key_raw).strip()
        if tarif_key_raw not in (None, "", "null")
        else None
    )
    if tarif_key and tarif_key not in valid_keys:
        # Guard against hallucinated keys.
        tarif_key = None
        source = "custom"
    return {
        "label": label[:255],
        "quantity": round(qty, 4),
        "unit": unit[:20],
        "unit_price_ht": round(pu, 2),
        "total_ht": round(qty * pu, 2),
        "source": source,
        "tarif_key": tarif_key,
    }


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        import config

        source_text = _truncate(input_data.get("source_text"), _MAX_SOURCE_CHARS)
        if not source_text:
            return SkillResult(
                success=False,
                data=None,
                error="source_text est requis (description du besoin).",
            )

        grid_raw = input_data.get("tarif_grid") or []
        if not isinstance(grid_raw, list):
            grid_raw = []
        valid_keys = {str(e.get("key")) for e in grid_raw if isinstance(e, dict) and e.get("key")}

        client_ctx = input_data.get("client_context") or {}
        client_block = ""
        if isinstance(client_ctx, dict):
            parts = []
            if client_ctx.get("name"):
                parts.append(f"Nom : {client_ctx['name']}")
            if client_ctx.get("type"):
                parts.append(f"Type : {client_ctx['type']}")
            if client_ctx.get("notes"):
                parts.append(f"Notes : {_truncate(client_ctx['notes'], 400)}")
            if parts:
                client_block = "Client concerné :\n" + "\n".join(parts) + "\n\n"

        suggested_vat = input_data.get("suggested_vat_rate")
        if suggested_vat is None:
            suggested_vat = 0.10

        grid_block = _format_grid(grid_raw)

        mode = str(input_data.get("mode") or "full").lower()
        existing_lines_raw = input_data.get("existing_lines") or []
        if not isinstance(existing_lines_raw, list):
            existing_lines_raw = []
        if existing_lines_raw and mode != "append":
            # If caller passes existing_lines, assume append mode.
            mode = "append"

        if mode == "append":
            existing_block_lines = []
            for idx, line in enumerate(existing_lines_raw[:30], start=1):
                if not isinstance(line, dict):
                    continue
                existing_block_lines.append(
                    f"  {idx}. {line.get('label', '')} "
                    f"— {line.get('quantity', 0)} {line.get('unit', '')} "
                    f"à {line.get('unit_price_ht', 0)} €"
                )
            existing_block = "\n".join(existing_block_lines) or "(aucune ligne existante)"

            user_message = (
                f"{client_block}"
                f"Grille tarifaire du prospect ({len(grid_raw)} postes) :\n"
                f"{grid_block}\n\n"
                f"Lignes déjà présentes dans le devis :\n{existing_block}\n\n"
                f"Prestations à AJOUTER (décrites par l'artisan) :\n{source_text}\n\n"
                "Consigne : renvoyez UNIQUEMENT les lignes à ajouter, sans redoublonner "
                "les postes déjà présents. JSON strict `{\"lines\": [...]}`."
            )
            system_prompt = _SYSTEM_PROMPT_APPEND
        else:
            user_message = (
                f"{client_block}"
                f"Grille tarifaire du prospect ({len(grid_raw)} postes) :\n"
                f"{grid_block}\n\n"
                f"TVA suggérée par défaut : {suggested_vat}\n\n"
                f"Description du besoin :\n{source_text}\n\n"
                "Consigne : générez le devis structuré en JSON strict, en priorisant "
                "les postes de la grille. Rappelez vos hypothèses si la description est vague."
            )
            system_prompt = _SYSTEM_PROMPT

        llm = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        response = await llm.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2200,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or ""
        parsed = _extract_json(raw)

        title = str(parsed.get("title") or "").strip()[:255]
        description = str(parsed.get("description") or "").strip()
        assumptions = str(parsed.get("assumptions") or "").strip()

        try:
            vat_rate = float(parsed.get("suggested_vat_rate") or suggested_vat)
        except (TypeError, ValueError):
            vat_rate = float(suggested_vat)
        if not 0 <= vat_rate <= 1:
            vat_rate = float(suggested_vat)

        raw_lines = parsed.get("lines") or []
        lines: list[dict[str, Any]] = []
        for raw_line in raw_lines:
            cleaned = _validate_line(raw_line, valid_keys)
            if cleaned is None:
                continue
            lines.append(cleaned)
            if len(lines) >= 20:
                break

        if not lines:
            return SkillResult(
                success=False,
                data=None,
                error="Le générateur n'a pas réussi à produire de lignes exploitables.",
            )

        amount_ht = round(sum(line["total_ht"] for line in lines), 2)
        amount_ttc = round(amount_ht * (1 + vat_rate), 2)

        if not title:
            title = "Devis"

        return SkillResult(
            success=True,
            data={
                "title": title,
                "description": description,
                "assumptions": assumptions,
                "vat_rate": vat_rate,
                "lines": lines,
                "amount_ht": amount_ht,
                "amount_ttc": amount_ttc,
                "mode": mode,
            },
            debug={
                "model": "gpt-4o",
                "mode": mode,
                "grid_size": len(grid_raw),
                "existing_lines_count": len(existing_lines_raw),
                "lines_returned": len(lines),
                "raw_len": len(raw),
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"generate_quote a échoué: {exc}",
        )
