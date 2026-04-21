"""
Skill: classify_email
Purpose: Classify a single email into a priority level and a topic using GPT-4o.
"""
from __future__ import annotations

import json
import re
from typing import Any

from skills.base import SkillResult

SKILL_ID = "classify_email"
TASK_TYPE = "email_classification"

VALID_PRIORITIES = {"urgent", "important", "normal", "low"}

_SYSTEM_PROMPT = """\
Tu es un classificateur d'emails professionnel. Pour chaque email, tu dois retourner:
1. Une priorité parmi: urgent, important, normal, low
2. Un topic parmi la liste fournie (utilise EXACTEMENT un des noms de la liste, ne crée jamais de nouveau topic)

Critères de priorité:
- urgent: action immédiate requise (aujourd'hui), sujet critique
- important: action requise cette semaine, sujet qui compte
- normal: à traiter quand possible, pas de contrainte de temps
- low: informatif, newsletter, notification automatique, promo

Tu retournes UNIQUEMENT du JSON valide au format:
{ "priority": "...", "topic": "...", "reasoning": "..." }\
"""


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

        email = input_data.get("email", {})
        topics: list[dict] = input_data.get("topics", [])
        topic_names = [t["name"] for t in topics]

        body_plain = (email.get("body_plain") or "")[:2000]
        user_message = (
            f"De: {email.get('from_name') or email.get('from_email', '')}"
            f" <{email.get('from_email', '')}>\n"
            f"Sujet: {email.get('subject') or '(sans objet)'}\n"
            f"Aperçu: {email.get('snippet') or ''}\n\n"
            f"Corps:\n{body_plain}\n\n"
            f"Topics disponibles:\n{json.dumps(topic_names, ensure_ascii=False)}"
        )

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

        priority = parsed.get("priority", "normal")
        if priority not in VALID_PRIORITIES:
            priority = "normal"

        topic = parsed.get("topic", "Autre")
        if topic not in topic_names:
            topic = "Autre" if "Autre" in topic_names else (topic_names[0] if topic_names else None)

        return SkillResult(
            success=True,
            data={
                "priority": priority,
                "topic": topic,
                "reasoning": parsed.get("reasoning", ""),
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"classify_email failed: {exc}",
        )
