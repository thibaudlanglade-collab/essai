"""
Skill: clean_tables
Input:  dict  (extract_pdf_tables / rescue_missed_tables output shape)
Output: list[list[list[str]]]  — flat list of cleaned tables (metadata dropped)

Operates only on the "tables" key. Drops the rescue metadata — downstream
skills only need the cleaned table list.
"""
from __future__ import annotations

from skills.base import SkillResult

SKILL_ID = "clean_tables"
DESCRIPTION = "Normalise raw pdfplumber tables: coerce None to empty string, strip whitespace, drop fully-empty rows"


def _clean_cell(cell: object) -> str:
    if cell is None:
        return ""
    return str(cell).strip()


def _clean_table(raw_table: list[list]) -> list[list[str]]:
    cleaned = []
    for row in raw_table:
        cleaned_row = [_clean_cell(cell) for cell in row]
        # Keep row only if at least one cell is non-empty
        if any(cleaned_row):
            cleaned.append(cleaned_row)
    return cleaned


async def execute(input_data: dict, context) -> SkillResult:
    try:
        # Accept either the full metadata dict or a bare list (defensive)
        if isinstance(input_data, dict):
            raw_tables: list = input_data.get("tables", [])
        elif isinstance(input_data, list):
            raw_tables = input_data
        else:
            return SkillResult(
                success=False,
                data=None,
                error=f"Unexpected input type: {type(input_data).__name__}",
            )

        if not raw_tables:
            return SkillResult(
                success=False,
                data=None,
                error="No tables in input — nothing to clean.",
            )

        cleaned_tables = [_clean_table(t) for t in raw_tables]

        # A table needs at least a header row + 1 data row to be useful
        non_empty = [t for t in cleaned_tables if len(t) >= 2]

        if not non_empty:
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"All {len(cleaned_tables)} table(s) were empty or had only one row after cleaning."
                ),
            )

        return SkillResult(
            success=True,
            data=non_empty,
            debug={
                "tables_in": len(raw_tables),
                "tables_out": len(non_empty),
                "dropped_empty": len(cleaned_tables) - len(non_empty),
            },
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"Table cleaning failed: {e}")
