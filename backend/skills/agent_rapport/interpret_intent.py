"""
Skill: agent_rapport.interpret_intent

Reads the prospect's intent ("what do you want to highlight?") together
with the ClientContext from `ingest_data`, and decides the SHAPE of the
report the next skill will compose: which section types to include, in
what order, and the angle of each.

Input  (dict): { "client_name", "raw_text", "summary", "entities", "intent_text" }
Output (dict): input + {
    "plan": {
        "intent_summary": str,          # 1 sentence — echoed back to the user above the report
        "section_blueprints": [
            {"type": str, "title": str, "angle": str},
            ...
        ]
    }
}

`section_blueprints` is the LLM's plan for the next skill — `compose_report`
fills each blueprint with concrete data. Decoupling planning from
composition keeps both prompts focused and inspectable.
"""
from __future__ import annotations

import json

from skills.base import SkillResult

SKILL_ID = "interpret_intent"
DESCRIPTION = "Compréhension de votre intention"
TASK_TYPE = "planning"


_SUPPORTED_SECTION_TYPES = ("kpi_grid", "alerts", "table", "chart", "narrative", "callout")


_SYSTEM_PROMPT = f"""\
Tu es l'analyste qui décide du PLAN d'un rapport client.
On te donne :
1. Un résumé structuré du client (entities + summary).
2. L'intention du dirigeant (« ce qu'il veut mettre en avant »).

Ton job : choisir 3 à 6 sections du rapport, dans le bon ordre, qui
répondent au mieux à l'intention. Tu ne produis PAS le contenu — juste
le plan que la prochaine étape exécutera.

Réponds avec un objet JSON STRICT de la forme :
{{
  "intent_summary": "1 phrase qui reformule ce que veut le dirigeant",
  "section_blueprints": [
    {{"type": "<type>", "title": "<titre court>", "angle": "<consigne précise pour la composition de cette section>"}}
  ]
}}

Types de section autorisés : {", ".join(_SUPPORTED_SECTION_TYPES)}.
- "callout"   : un encart d'attention en haut (résultat clé / risque principal). 1 max.
- "kpi_grid"  : 3-4 indicateurs chiffrés clés.
- "alerts"    : signaux warning/info/success (max 3).
- "table"     : un tableau (devis, factures, contacts…).
- "chart"     : un graphique (CA mensuel, répartition…). Toujours bar chart.
- "narrative" : un paragraphe d'analyse / synthèse en français.

Règles :
- Choisis SEULEMENT les sections pertinentes par rapport à l'intention. Si l'intention est "risques financiers", tu mets en avant alerts + table des factures à risque ; tu n'inclus pas un graphique cosmétique.
- "angle" doit être une consigne actionnable pour le LLM suivant (ex: "Lister les 3 factures les plus en retard", "Mettre en avant la baisse de CA et son origine").
- Pas de commentaire en dehors du JSON.
"""


def _fallback_plan(client_name: str, intent: str) -> dict:
    """Sensible default plan when the LLM is unavailable."""
    return {
        "intent_summary": f"Vue d'ensemble de {client_name}.",
        "section_blueprints": [
            {"type": "kpi_grid", "title": "Indicateurs clés", "angle": "Synthèse chiffrée de l'activité"},
            {"type": "alerts", "title": "Signaux", "angle": "Risques et opportunités à connaître"},
            {"type": "table", "title": "Documents", "angle": "Lister les devis ou factures principales"},
            {"type": "narrative", "title": "Analyse", "angle": f"Synthèse libre orientée par : {intent}"},
        ],
    }


async def _llm_plan(context_blob: dict, intent: str) -> dict | None:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        if not config.OPENAI_API_KEY:
            return None

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        model = get_model(TASK_TYPE)

        user_payload = (
            f"Intention du dirigeant : « {intent} »\n\n"
            f"Données client :\n{json.dumps(context_blob, ensure_ascii=False, indent=2)}"
        )

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_payload},
            ],
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            return None

        sections = parsed.get("section_blueprints")
        if not isinstance(sections, list) or not sections:
            return None

        cleaned = []
        for s in sections[:6]:
            if not isinstance(s, dict):
                continue
            stype = s.get("type")
            if stype not in _SUPPORTED_SECTION_TYPES:
                continue
            cleaned.append({
                "type": stype,
                "title": (s.get("title") or "").strip()[:120] or "Section",
                "angle": (s.get("angle") or "").strip()[:300] or "Synthèse libre.",
            })

        if not cleaned:
            return None

        return {
            "intent_summary": (parsed.get("intent_summary") or "").strip()[:300] or "Rapport personnalisé.",
            "section_blueprints": cleaned,
        }
    except Exception:
        return None


async def execute(input_data: dict, context) -> SkillResult:
    intent = (input_data.get("intent_text") or "").strip()
    if not intent:
        return SkillResult(
            success=False,
            data=None,
            error="Aucune intention fournie — précisez ce que vous voulez voir dans le rapport.",
        )

    client_name = input_data.get("client_name") or "Client"
    summary = input_data.get("summary") or ""
    entities = input_data.get("entities") or {}

    context_blob = {"summary": summary, "entities": entities}
    plan = await _llm_plan(context_blob, intent)
    used_llm = plan is not None
    if plan is None:
        plan = _fallback_plan(client_name, intent)

    output = {**input_data, "plan": plan}
    return SkillResult(
        success=True,
        data=output,
        debug={
            "used_llm": used_llm,
            "section_count": len(plan["section_blueprints"]),
        },
    )
