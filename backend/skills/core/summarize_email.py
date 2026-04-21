"""
Skill: summarize_email
Purpose: Generate a 2-3 sentence summary of a long email in French.
"""
from __future__ import annotations

from typing import Any

from skills.base import SkillResult

SKILL_ID = "summarize_email"
TASK_TYPE = "email_summary"

_SYSTEM_PROMPT = """\
Tu résumes des emails professionnels en 2-3 phrases maximum en français. \
Tu captures l'essentiel: qui écrit, ce qu'ils veulent, et s'il y a une action attendue \
de la part du lecteur. Tu réponds uniquement avec le résumé, sans introduction ni formule.\
"""


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        import config

        email = input_data.get("email", {})
        subject = email.get("subject") or "(sans objet)"
        from_name = email.get("from_name") or email.get("from_email", "")
        body_plain = (email.get("body_plain") or "")[:4000]

        user_message = (
            f"De: {from_name}\n"
            f"Sujet: {subject}\n\n"
            f"{body_plain}"
        )

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=256,
        )

        summary = (response.choices[0].message.content or "").strip()
        return SkillResult(success=True, data={"summary": summary})

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"summarize_email failed: {exc}",
        )
