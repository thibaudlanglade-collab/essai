"""
Skill: agent_rapport.compose_report

Final pipeline step. Takes the ClientContext + the section blueprints
produced by `interpret_intent` and asks the LLM to fill each blueprint
with concrete content. The output is the flexible report rendered by
`AgentRapportPage` on the frontend.

Input  (dict): { "client_name", "raw_text", "summary", "entities", "intent_text", "plan": {...} }
Output (dict): {
    "client_name": str,
    "intent_summary": str,
    "sections": [
        # one of:
        {"type": "callout",   "level": "warning"|"info"|"success", "title": str, "text": str},
        {"type": "kpi_grid",  "title": str, "items": [{"label": str, "value": str, "sub": str|null, "trend": "up"|"down"|"warn"|null}]},
        {"type": "alerts",    "items": [{"level": "warning"|"info"|"success", "message": str}]},
        {"type": "table",     "title": str, "columns": [str], "rows": [[str, ...]]},
        {"type": "chart",     "title": str, "kind": "bar", "data": [{"label": str, "value": number}]},
        {"type": "narrative", "title": str, "text": str},
    ]
}

The skill validates each section the LLM emits and silently drops
malformed ones, so a partial report is better than no report at all.
"""
from __future__ import annotations

import json
from typing import Any

from skills.base import SkillResult

SKILL_ID = "compose_report"
DESCRIPTION = "Génération du rapport personnalisé"
TASK_TYPE = "complex"


_SYSTEM_PROMPT = """\
Tu es l'analyste qui ÉCRIT un rapport client. On te donne :
1. Les données brutes du client (entities + texte source).
2. L'intention du dirigeant.
3. Un PLAN de sections décidé en amont — tu dois remplir CHAQUE section
   du plan, dans l'ordre, en respectant son "type" et son "angle".

Réponds avec un objet JSON STRICT :
{
  "sections": [ <une section par blueprint, dans l'ordre> ]
}

Schémas par type (respecte-les à la lettre) :

- callout :
  {"type": "callout", "level": "warning"|"info"|"success", "title": str, "text": str}

- kpi_grid :
  {"type": "kpi_grid", "title": str, "items": [
      {"label": str, "value": str, "sub": str|null, "trend": "up"|"down"|"warn"|null}
  ]}
  3 à 4 items max. "value" est une string formatée (ex: "487 200 €", "12 jours").

- alerts :
  {"type": "alerts", "items": [
      {"level": "warning"|"info"|"success", "message": str}
  ]}
  3 items max, message <= 140 caractères.

- table :
  {"type": "table", "title": str, "columns": [str], "rows": [[str, ...]]}
  Toutes les rows ont la même longueur que columns. Maximum 8 rows.

- chart :
  {"type": "chart", "title": str, "kind": "bar", "data": [{"label": str, "value": number}]}
  Maximum 12 points.

- narrative :
  {"type": "narrative", "title": str, "text": str}
  2-4 phrases en français. Pas de markdown.

Règles GLOBALES strictes :
- Tu travailles UNIQUEMENT à partir des données fournies. Pas de chiffres inventés, pas de noms inventés.
- Si une section ne peut pas être remplie faute de données, tu la remplaces par un type "narrative" qui dit honnêtement ce qui manque.
- Sortie : JSON pur, pas de commentaire avant/après.
"""


# ── Validators ───────────────────────────────────────────────────────────────


def _str(v: Any, max_len: int = 300) -> str | None:
    if not isinstance(v, str):
        return None
    s = v.strip()
    return s[:max_len] if s else None


def _validate_section(s: Any) -> dict | None:
    if not isinstance(s, dict):
        return None
    t = s.get("type")

    if t == "callout":
        level = s.get("level")
        title = _str(s.get("title"), 200)
        text = _str(s.get("text"), 600)
        if level not in ("warning", "info", "success") or not title or not text:
            return None
        return {"type": "callout", "level": level, "title": title, "text": text}

    if t == "kpi_grid":
        title = _str(s.get("title"), 120) or "Indicateurs"
        items = s.get("items")
        if not isinstance(items, list):
            return None
        clean_items = []
        for it in items[:4]:
            if not isinstance(it, dict):
                continue
            label = _str(it.get("label"), 80)
            value = _str(it.get("value"), 80)
            if not label or not value:
                continue
            sub = _str(it.get("sub"), 120)
            trend = it.get("trend") if it.get("trend") in ("up", "down", "warn") else None
            clean_items.append({"label": label, "value": value, "sub": sub, "trend": trend})
        if not clean_items:
            return None
        return {"type": "kpi_grid", "title": title, "items": clean_items}

    if t == "alerts":
        items = s.get("items")
        if not isinstance(items, list):
            return None
        clean = []
        for a in items[:3]:
            if not isinstance(a, dict):
                continue
            level = a.get("level")
            message = _str(a.get("message"), 200)
            if level not in ("warning", "info", "success") or not message:
                continue
            clean.append({"level": level, "message": message})
        if not clean:
            return None
        return {"type": "alerts", "items": clean}

    if t == "table":
        title = _str(s.get("title"), 120) or "Tableau"
        cols = s.get("columns")
        rows = s.get("rows")
        if not isinstance(cols, list) or not cols or not isinstance(rows, list):
            return None
        n = len(cols)
        col_strs = [str(c)[:80] for c in cols]
        clean_rows = []
        for r in rows[:8]:
            if not isinstance(r, list) or len(r) != n:
                continue
            clean_rows.append([str(cell)[:200] for cell in r])
        if not clean_rows:
            return None
        return {"type": "table", "title": title, "columns": col_strs, "rows": clean_rows}

    if t == "chart":
        title = _str(s.get("title"), 120) or "Graphique"
        data = s.get("data")
        if not isinstance(data, list):
            return None
        clean = []
        for p in data[:12]:
            if not isinstance(p, dict):
                continue
            label = _str(p.get("label"), 30)
            value = p.get("value")
            if label is None or not isinstance(value, (int, float)):
                continue
            clean.append({"label": label, "value": float(value)})
        if not clean:
            return None
        return {"type": "chart", "title": title, "kind": "bar", "data": clean}

    if t == "narrative":
        title = _str(s.get("title"), 120) or "Analyse"
        text = _str(s.get("text"), 1500)
        if not text:
            return None
        return {"type": "narrative", "title": title, "text": text}

    return None


# ── Fallback (no LLM) ────────────────────────────────────────────────────────


def _fallback_sections(client_name: str, summary: str, raw_text: str) -> list[dict]:
    snippet = raw_text[:600] + ("…" if len(raw_text) > 600 else "")
    return [
        {
            "type": "narrative",
            "title": "Synthèse",
            "text": summary or f"Rapport sur {client_name}.",
        },
        {
            "type": "narrative",
            "title": "Extrait des données fournies",
            "text": snippet or "Aucun extrait disponible.",
        },
    ]


# ── LLM call ─────────────────────────────────────────────────────────────────


async def _llm_compose(payload: dict) -> list[dict] | None:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        if not config.OPENAI_API_KEY:
            return None

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        model = get_model(TASK_TYPE)

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            max_tokens=2500,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        parsed = json.loads(raw)
        sections = parsed.get("sections")
        if not isinstance(sections, list):
            return None

        clean = [validated for s in sections if (validated := _validate_section(s)) is not None]
        return clean or None
    except Exception:
        return None


# ── Skill entry ──────────────────────────────────────────────────────────────


async def execute(input_data: dict, context) -> SkillResult:
    client_name = input_data.get("client_name") or "Client"
    plan = input_data.get("plan") or {}
    intent = input_data.get("intent_text") or ""
    intent_summary = plan.get("intent_summary") or "Rapport personnalisé."
    blueprints = plan.get("section_blueprints") or []

    payload = {
        "intent": intent,
        "intent_summary": intent_summary,
        "client": {
            "name": client_name,
            "summary": input_data.get("summary"),
            "entities": input_data.get("entities"),
        },
        "raw_text_excerpt": (input_data.get("raw_text") or "")[:8000],
        "section_blueprints": blueprints,
    }

    sections = await _llm_compose(payload)
    used_llm = sections is not None
    if not sections:
        sections = _fallback_sections(
            client_name=client_name,
            summary=input_data.get("summary") or "",
            raw_text=input_data.get("raw_text") or "",
        )

    report = {
        "client_name": client_name,
        "intent_summary": intent_summary,
        "sections": sections,
    }

    return SkillResult(
        success=True,
        data=report,
        debug={
            "used_llm": used_llm,
            "section_count": len(sections),
            "blueprint_count": len(blueprints),
        },
    )
