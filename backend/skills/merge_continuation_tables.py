"""
Skill: merge_continuation_tables
Input:  list[list[dict]]   — structured tables (N tables)
Output: list[list[dict]]   — merged tables (≤N tables)

Merges table[i+1] into table[i] if and only if both have exactly the same
keys in the same order. This handles logical tables split across PDF pages.
Pure function — no LLM, deterministic.
"""
from __future__ import annotations

from skills.base import SkillResult

SKILL_ID = "merge_continuation_tables"
DESCRIPTION = "Merge consecutive tables with identical column schemas (handles page-split tables)"


def _column_key(table: list[dict]) -> tuple[str, ...]:
    """Return the ordered tuple of column names, or empty tuple for empty tables."""
    if not table:
        return ()
    return tuple(table[0].keys())


async def execute(input_data: list, context) -> SkillResult:
    try:
        if not input_data:
            return SkillResult(
                success=False,
                data=None,
                error="No tables to process — input is empty.",
            )

        tables_before = len(input_data)
        merged: list[list[dict]] = [list(input_data[0])]
        merges_performed = 0

        for i in range(1, len(input_data)):
            current = input_data[i]
            previous = merged[-1]
            current_key = _column_key(current)
            previous_key = _column_key(previous)

            if (
                current_key == previous_key
                and current_key != ()       # don't merge two empty tables
            ):
                merged[-1] = previous + list(current)
                merges_performed += 1
            else:
                merged.append(list(current))

        return SkillResult(
            success=True,
            data=merged,
            debug={
                "tables_before": tables_before,
                "tables_after": len(merged),
                "merges_performed": merges_performed,
            },
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"Table merge failed: {e}")
