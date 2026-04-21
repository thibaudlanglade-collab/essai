"""
Skill: generate_reply_draft
Purpose: Generate a reply draft that imitates the user's writing style
         based on their 20 most recent sent emails.
"""
from __future__ import annotations

from typing import Any

from skills.base import SkillResult

SKILL_ID = "generate_reply_draft"
TASK_TYPE = "email_reply_draft"

_SYSTEM_PROMPT_TEMPLATE = """\
Tu rédiges des brouillons de réponses aux emails en français, en imitant le style de l'utilisateur. \
Voici des exemples d'emails récents envoyés par l'utilisateur pour que tu comprennes son ton, \
ses formules, et son niveau de formalité:

{sent_samples}

Instructions pour la réponse:
- Reprends le ton, les formules et le niveau de formalité observés dans les exemples ci-dessus
- Si l'utilisateur signe avec 'Cordialement', 'Bien à vous', ou autre chose, reproduis cette signature
- Adapte la longueur à ce que tu observes dans les exemples
- Réponds de manière pertinente au contenu de l'email à traiter
- NE commence PAS par 'Bonjour' si les exemples montrent que l'utilisateur utilise un autre \
formulation (ex: 'Salut', 'Hello', ou direct)
- Retourne UNIQUEMENT le corps de la réponse, sans préambule comme 'Voici votre brouillon'\
"""


def _format_sent_samples(samples: list[dict]) -> str:
    if not samples:
        return "(Aucun exemple disponible)"
    parts = []
    for i, s in enumerate(samples[:20], 1):
        to = s.get("to") or ""
        subject = s.get("subject") or "(sans objet)"
        body = (s.get("body_plain") or "")[:500]
        parts.append(f"--- Exemple {i} ---\nÀ: {to}\nSujet: {subject}\n\n{body}")
    return "\n\n".join(parts)


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        import config

        email_to_reply = input_data.get("email_to_reply", {})
        sent_samples: list[dict] = input_data.get("sent_samples", [])
        user_instructions: str = input_data.get("user_instructions", "").strip()

        formatted_samples = _format_sent_samples(sent_samples)
        system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(sent_samples=formatted_samples)

        from_name = email_to_reply.get("from_name") or ""
        subject = email_to_reply.get("subject") or "(sans objet)"
        body_plain = (email_to_reply.get("body_plain") or "")[:3000]

        user_message = (
            f"Voici l'email auquel tu dois répondre:\n"
            f"De: {from_name}\n"
            f"Sujet: {subject}\n\n"
            f"{body_plain}"
        )
        if user_instructions:
            user_message += f"\n\nInstructions supplémentaires: {user_instructions}"

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.7,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=1024,
        )

        draft_body = (response.choices[0].message.content or "").strip()
        return SkillResult(success=True, data={"draft_body": draft_body})

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"generate_reply_draft failed: {exc}",
        )
