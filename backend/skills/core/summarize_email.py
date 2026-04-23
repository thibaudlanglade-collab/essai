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
Tu résumes un email en 1 à 2 phrases courtes, en français, vouvoiement.

Tes règles :
1. Capture le contenu PRINCIPAL (la nouvelle, la demande, l'information clé),
   PAS les pieds de page (paramètres de notification, désinscription, "are we
   sending you too many emails", mentions légales, liens promotionnels).
2. Identifie concrètement de quoi parle l'email :
   - pour une notification Skool/LinkedIn/etc. : cite le contenu posté
     (nouvelle vidéo, nouveau post, qui a publié quoi) ;
   - pour un email commercial : cite l'offre précise ;
   - pour un email perso : cite la demande ou l'info.
3. Si l'email redirige vers un contenu externe (vidéo, article, post),
   mentionne le titre exact de ce contenu.
4. Réponds UNIQUEMENT avec le résumé, sans préambule du type "L'email dit
   que" ou "Résumé :". Commence directement par l'information.
5. Pas de markdown, pas de tirets longs.
"""


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        import config

        email = input_data.get("email", {})
        subject = email.get("subject") or "(sans objet)"
        from_name = email.get("from_name") or email.get("from_email", "")
        body_plain = (email.get("body_plain") or "")[:8000]

        user_message = (
            f"Expéditeur : {from_name}\n"
            f"Sujet : {subject}\n\n"
            f"Corps de l'email :\n{body_plain}"
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
