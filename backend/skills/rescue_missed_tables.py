"""
Skill: rescue_missed_tables
Input:  dict  (same shape as extract_pdf_tables output)
Output: dict  (same shape — tables list augmented with LLM-recovered tables)

For each page where pdfplumber found 0 tables AND the page text passes a
heuristic table-like check, calls the LLM once to extract tables as JSON.
Recovered tables are inserted at the correct positional index (page order).
Short-circuits with zero LLM calls if every page already has ≥1 table.
"""
from __future__ import annotations

import json
import re

from skills.base import SkillResult

SKILL_ID = "rescue_missed_tables"
DESCRIPTION = "LLM fallback: recover tables from pages where pdfplumber found none but text looks tabular"
TASK_TYPE = "structuring"

_SYSTEM_PROMPT = """\
You are a precise data extraction assistant.
The text below was extracted from a single PDF page.

Extract ALL tables present and return them as a JSON array of tables.
Each table is an array of rows. Each row is an array of cell strings.
The first row of each table should be the header row.

Return ONLY valid JSON — an array of tables (possibly empty).
If there are no tables at all, return: []

Correct output shape (2 tables):
[
  [["Name", "Age"], ["Alice", "30"], ["Bob", "25"]],
  [["Product", "Price"], ["Widget", "$5.00"]]
]
"""


def _looks_like_table(text: str) -> bool:
    """Heuristic: does this page text look like it contains a table?"""
    if not text.strip():
        return False
    lines = [line for line in text.splitlines() if line.strip()]
    if len(lines) < 3:
        return False
    # Count lines that have 2+ consecutive whitespace gaps (column separators)
    multi_col = sum(
        1 for line in lines
        if len(re.split(r"\s{2,}", line.strip())) >= 2
    )
    return multi_col >= 3


def _extract_json(raw: str) -> list:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return []


def _normalize_recovered(raw: list) -> list[list[list]]:
    """
    LLM should return list-of-tables, but may return a single flat table.
    Normalise to always be list[list[list[str]]].
    """
    if not raw:
        return []
    first = raw[0]
    if isinstance(first, list) and first and isinstance(first[0], str):
        # LLM returned a single flat table: [["h1","h2"], ["v1","v2"]]
        return [raw]
    # Already correct shape: [[["h1","h2"], ...], ...]
    return [t for t in raw if isinstance(t, list)]


async def execute(input_data: dict, context) -> SkillResult:
    try:
        tables: list = list(input_data.get("tables", []))
        pages_text: list[str] = input_data.get("pages_text", [])
        tables_per_page: list[int] = list(input_data.get("tables_per_page", []))

        if not pages_text:
            return SkillResult(
                success=True,
                data=input_data,
                debug={"rescued": 0, "checked": 0, "short_circuit": True, "reason": "no pages"},
            )

        # Short-circuit: every page already has at least one table
        empty_page_indices = [i for i, n in enumerate(tables_per_page) if n == 0]
        if not empty_page_indices:
            return SkillResult(
                success=True,
                data=input_data,
                debug={"rescued": 0, "checked": 0, "short_circuit": True},
            )

        candidate_pages = [i for i in empty_page_indices if _looks_like_table(pages_text[i])]
        if not candidate_pages:
            return SkillResult(
                success=True,
                data=input_data,
                debug={
                    "rescued": 0,
                    "checked": len(empty_page_indices),
                    "candidates": 0,
                    "short_circuit": False,
                },
            )

        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        model = get_model(TASK_TYPE)

        rescued_count = 0
        failed_calls = 0
        last_error = None

        # Process in reverse order so insertions at higher indices
        # don't shift the insert_pos calculation for lower indices
        for page_idx in sorted(candidate_pages, reverse=True):
            page_text = pages_text[page_idx][:8_000]

            try:
                response = await client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": page_text},
                    ],
                    max_tokens=4096,
                )

                raw_output = response.choices[0].message.content
                raw_recovered = _extract_json(raw_output)
                recovered = _normalize_recovered(raw_recovered)
            except Exception as page_exc:
                failed_calls += 1
                last_error = str(page_exc)
                continue

            if recovered:
                # Insert at the position right after all tables from pages before this one
                insert_pos = sum(tables_per_page[:page_idx])
                for j, tbl in enumerate(recovered):
                    tables.insert(insert_pos + j, tbl)
                tables_per_page[page_idx] = len(recovered)
                rescued_count += len(recovered)

        return SkillResult(
            success=True,
            data={
                "tables": tables,
                "pages_text": pages_text,
                "tables_per_page": tables_per_page,
            },
            debug={
                "rescued": rescued_count,
                "checked": len(empty_page_indices),
                "candidates": len(candidate_pages),
                "short_circuit": False,
                "failed_calls": failed_calls,
                "last_error": last_error,
            },
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"Table rescue failed: {e}")
