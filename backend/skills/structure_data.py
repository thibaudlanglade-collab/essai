"""
Skill: structure_data
Input:  str         (clean text)
Output: list[dict]  (structured JSON rows, ready for Excel)
"""
from __future__ import annotations

import json
import re

from skills.base import SkillResult

SKILL_ID = "structure_data"
DESCRIPTION = "Extract structured tabular data from text using an LLM, output as JSON array"
TASK_TYPE = "structuring"

_SYSTEM_PROMPT = """\
You are a precise data extraction assistant.

Extract ALL structured or tabular data from the provided text and return it as a JSON array of objects.

Rules:
- Each row of data becomes one JSON object in the array
- Column names become keys (use snake_case, no spaces)
- Preserve original values — do NOT interpret or transform them
- If multiple tables exist, merge them or use a "table" key to distinguish
- If no clear table exists, extract key-value pairs as a single-object array
- Return ONLY valid JSON — no prose, no markdown fences, no commentary
- If you truly cannot find any structured data, return: []
"""


def _extract_json(raw: str) -> list:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            for key in ("data", "rows", "items", "results", "records"):
                if key in parsed and isinstance(parsed[key], list):
                    return parsed[key]
            return [parsed]
    except json.JSONDecodeError:
        pass
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return []


async def execute(input_data: str, context) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        text = input_data[:12_000]

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        model = get_model(TASK_TYPE)

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            max_tokens=8192,
        )

        raw_output = response.choices[0].message.content
        rows = _extract_json(raw_output)

        if not isinstance(rows, list):
            return SkillResult(
                success=False,
                data=None,
                error=f"LLM did not return a JSON array. Raw: {raw_output[:300]}",
            )

        if len(rows) == 0:
            return SkillResult(
                success=False,
                data=None,
                error="No structured data found in the document.",
            )

        return SkillResult(
            success=True,
            data=rows,
            debug={
                "model": model,
                "rows_extracted": len(rows),
                "columns": list(rows[0].keys()) if rows and isinstance(rows[0], dict) else [],
            },
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"Data structuring failed: {e}")
