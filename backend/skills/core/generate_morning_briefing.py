"""
Skill: generate_morning_briefing
Purpose: Generate a structured morning briefing from emails of the last 24 hours.
"""
from __future__ import annotations

import json
from typing import Any

from skills.base import SkillResult

SKILL_ID = "generate_morning_briefing"
TASK_TYPE = "email_briefing"

_SYSTEM_PROMPT = """\
Tu es un assistant professionnel chaleureux qui aide un entrepreneur à démarrer \
sa journée avec clarté et énergie. Tu analyses ses emails des dernières 24 heures \
et tu produis un briefing matinal en Markdown qui est:

1. CHALEUREUX mais pas mielleux: tu salues brièvement, tu tutoies par défaut, \
tu es sympathique sans être familier
2. ACTIONABLE: chaque section termine sur une action claire, pas juste de la description
3. PRIORISÉ: tu classes par importance, tu ne noies pas l'essentiel dans le bruit
4. CONCIS: pas de blabla, va à l'essentiel, l'utilisateur a peu de temps le matin

Structure du briefing (Markdown):

## ☀️ Bonjour Thibaud — Briefing du {date}

### 🎯 Tes 3 priorités du jour
[Maximum 3 actions concrètes à faire AUJOURD'HUI, pas plus. \
Format: "1. **Action verbale claire** — pourquoi c'est important en 1 phrase. (référence email)"]
[Si moins de 3 vraies priorités, n'invente rien — affiche moins]

### 📨 Ce qui t'attend
[Résumé en 2-3 phrases du paysage des emails. Pas une liste, de la prose courte. \
Style: "Ce matin, tu as 30 emails dont seulement 5 méritent vraiment ton attention. \
Le reste est du bruit que j'ai déjà classé pour toi."]

### 💡 À noter
[2-3 informations pertinentes mais non urgentes. \
Format: "• **X** te demande Y avant Z" ou "• Ton essai gratuit Intercom expire le 13 avril"]

### 🌤️ Pour bien commencer la journée
[1 phrase de conclusion bienveillante mais courte, qui pousse à l'action. \
Pas de slogan, juste une bonne énergie. Exemples:
- "Allez, tu as tout en main. À toi de jouer."
- "Une journée gérable t'attend. Concentre-toi sur les 3 priorités."
- "Pas de panique aujourd'hui, focus sur l'essentiel."]

RÈGLES STRICTES:
- N'utilise PAS de formules creuses ('je vous souhaite une bonne journée', 'cordialement', etc.)
- N'écris JAMAIS plus de 3 priorités, c'est le maximum acceptable
- Si l'utilisateur n'a aucun email urgent, sois honnête: \
'Aucune urgence ce matin, profite-en pour avancer sur tes projets de fond.'
- Les noms de personnes en gras: **Frank**, **Tara**
- Les actions verbales en gras: **Réponds à...**, **Envoie...**, **Prépare...**
- Tutoiement par défaut
- Tu peux nommer l'utilisateur 'Thibaud' une fois dans le salut, pas plus\
"""


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        import config

        emails: list[dict] = input_data.get("emails", [])
        briefing_date: str = input_data.get("briefing_date", "")

        urgent_count = sum(1 for e in emails if e.get("priority") == "urgent")
        important_count = sum(1 for e in emails if e.get("priority") == "important")

        user_message = (
            f"Voici les emails des dernières 24 heures:\n"
            f"{json.dumps(emails, ensure_ascii=False, default=str)}\n\n"
            f"Génère le briefing pour la date {briefing_date}."
        )

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.4,
            messages=[
                {
                    "role": "system",
                    "content": _SYSTEM_PROMPT.replace("{date}", briefing_date),
                },
                {"role": "user", "content": user_message},
            ],
            max_tokens=2048,
        )

        content_markdown = (response.choices[0].message.content or "").strip()

        return SkillResult(
            success=True,
            data={
                "content_markdown": content_markdown,
                "urgent_count": urgent_count,
                "important_count": important_count,
                "emails_analyzed_count": len(emails),
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"generate_morning_briefing failed: {exc}",
        )
