"""
Skill: clean_text
Input:  str   (raw extracted text, may contain noise, headers, footers)
Output: str   (cleaned, normalised text ready for LLM processing)
"""
from __future__ import annotations

from skills.base import SkillResult

SKILL_ID = "clean_text"
DESCRIPTION = "Remove noise, headers, footers, and normalize extracted text"
TASK_TYPE = "cleaning"

_SYSTEM_PROMPT = """\
You are a text cleaning assistant.
Your task is to clean raw text extracted from a PDF document.

Rules:
- Remove page numbers, headers, footers, and repeated boilerplate
- Fix broken words caused by PDF line-break hyphenation (e.g. "infor-\nmation" → "information")
- Normalize whitespace (no double spaces, no excessive blank lines)
- Preserve all actual content — do NOT summarize or remove real data
- Return ONLY the cleaned text, with no commentary or preamble
"""


async def execute(input_data: str, context) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        text = input_data[:20_000]

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        model = get_model(TASK_TYPE)

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            max_tokens=4096,
        )

        cleaned = response.choices[0].message.content.strip()
        return SkillResult(
            success=True,
            data=cleaned,
            debug={
                "model": model,
                "input_chars": len(input_data),
                "output_chars": len(cleaned),
            },
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"Text cleaning failed: {e}")
