"""
Skill: structure_tables
Input:  list[list[list[str]]]   — cleaned tables (rows of cells)
Output: list[list[dict]]        — each table as a list of row dicts

For each table:
  - If first row passes the header heuristic → direct conversion, no LLM
  - Otherwise → one LLM call per table to infer column names and return list[dict]

LLM is only called for tables where headers are ambiguous.
"""
from __future__ import annotations

import json
import re

from skills.base import SkillResult

SKILL_ID = "structure_tables"
DESCRIPTION = "Convert cleaned table rows to list[dict] per table; uses LLM only for ambiguous headers"
TASK_TYPE = "structuring"

_SYSTEM_PROMPT = """\
You are given raw rows from a PDF table as a JSON array of arrays.
Convert it to a JSON array of objects where the keys are column names.
If the first row looks like headers, use it.
If the first row looks like data, infer sensible column names (col_1, col_2, ...).
Return ONLY a valid JSON array of objects — no prose, no markdown fences.
"""


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


def _header_looks_valid(row: list[str]) -> bool:
    """
    A valid header row has mostly non-numeric, non-empty strings.
    Threshold: ≥60% of cells must look like label text.
    """
    if not row:
        return False
    label_cells = 0
    for cell in row:
        stripped = cell.replace(".", "").replace(",", "").replace("-", "").replace(" ", "")
        if cell and not stripped.isnumeric():
            label_cells += 1
    return label_cells >= max(1, len(row) * 0.6)


def _safe_key(raw: str, index: int, seen: dict[str, int]) -> str:
    key = re.sub(r"\s+", "_", raw.lower().strip()) or f"col_{index + 1}"
    key = re.sub(r"[^\w]", "", key) or f"col_{index + 1}"
    if key in seen:
        seen[key] += 1
        key = f"{key}_{seen[key]}"
    else:
        seen[key] = 0
    return key


def _rows_to_dicts(rows: list[list[str]]) -> list[dict] | None:
    """
    Attempt direct conversion using first row as header.
    Returns None if the header looks ambiguous (triggers LLM fallback).
    """
    if len(rows) < 2:
        return None
    if not _header_looks_valid(rows[0]):
        return None

    seen: dict[str, int] = {}
    headers = [_safe_key(cell, i, seen) for i, cell in enumerate(rows[0])]
    ncols = len(headers)

    result = []
    for row in rows[1:]:
        # Pad or truncate row to match header length
        padded = (list(row) + [""] * ncols)[:ncols]
        result.append(dict(zip(headers, padded)))
    return result


async def execute(input_data: list, context) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        structured_tables: list[list[dict]] = []
        llm_calls = 0
        direct_conversions = 0
        failed_llm_calls = 0
        last_llm_error = None
        client = None  # lazy-initialise — avoid creating if no LLM calls needed
        model = None

        for table in input_data:
            direct = _rows_to_dicts(table)
            if direct is not None:
                structured_tables.append(direct)
                direct_conversions += 1
            else:
                # Ambiguous header — one LLM call for this table
                if client is None:
                    client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
                    model = get_model(TASK_TYPE)

                table_json = json.dumps(table)[:6_000]
                try:
                    response = await client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": _SYSTEM_PROMPT},
                            {"role": "user", "content": table_json},
                        ],
                        max_tokens=4096,
                    )
                    rows_dicts = _extract_json(response.choices[0].message.content)
                    structured_tables.append(rows_dicts if isinstance(rows_dicts, list) else [])
                except Exception as tbl_exc:
                    failed_llm_calls += 1
                    last_llm_error = str(tbl_exc)
                    structured_tables.append([])  # preserve list-index invariance
                llm_calls += 1

        # Remove tables that came out empty after structuring
        non_empty = [t for t in structured_tables if t]
        dropped_empty = len(structured_tables) - len(non_empty)

        if not non_empty:
            return SkillResult(
                success=False,
                data=None,
                error="All tables were empty after structuring.",
            )

        return SkillResult(
            success=True,
            data=non_empty,
            debug={
                "tables_in": len(input_data),
                "tables_out": len(non_empty),
                "dropped_empty": dropped_empty,
                "direct_conversions": direct_conversions,
                "llm_calls": llm_calls,
                "failed_llm_calls": failed_llm_calls,
                "last_llm_error": last_llm_error,
            },
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"Table structuring failed: {e}")
