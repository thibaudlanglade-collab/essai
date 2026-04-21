"""
Skill: generate_excel_multi
Input:  list[list[dict]]   — N tables as row dicts
Output: bytes              — .xlsx file with one sheet per table

Sheet names: table_1, table_2, ... (extendable later for smart naming).
"""
from __future__ import annotations

import io
import re

from skills.base import SkillResult

SKILL_ID = "generate_excel_multi"
DESCRIPTION = "Write each list[dict] table to its own named sheet in a single .xlsx file"

_FORBIDDEN = re.compile(r"[:\\/?\*\[\]]")


def _sanitize_sheet_name(raw: str, used: set[str]) -> str:
    name = _FORBIDDEN.sub("_", raw).strip()
    if not name:
        name = "sheet"
    # Truncate base to leave room for a potential suffix (_NN = up to 3 chars)
    base = name[:28]
    candidate = name[:31]
    counter = 2
    while candidate.lower() in used:
        suffix = f"_{counter}"
        candidate = base[: 31 - len(suffix)] + suffix
        counter += 1
    used.add(candidate.lower())
    return candidate


async def execute(input_data: list, context) -> SkillResult:
    try:
        import openpyxl

        if not input_data:
            return SkillResult(
                success=False,
                data=None,
                error="No tables to write — input is empty.",
            )

        wb = openpyxl.Workbook()
        wb.remove(wb.active)  # remove the default blank sheet

        sheets_written = 0
        empty_tables = 0
        total_rows = 0

        used_names: set[str] = set()

        for i, table in enumerate(input_data):
            # For now, default name is table_N. Later we can pass a real name
            # from upstream skills via a richer input shape.
            raw_name = f"table_{i + 1}"
            sheet_name = _sanitize_sheet_name(raw_name, used_names)
            ws = wb.create_sheet(title=sheet_name)
            sheets_written += 1  # count EVERY created sheet, empty or not

            if not table:
                empty_tables += 1
                continue

            if isinstance(table[0], dict):
                headers = list(table[0].keys())
                ws.append(headers)
                for row in table:
                    ws.append([row.get(h, "") for h in headers])
                total_rows += len(table)
            elif isinstance(table[0], list):
                # Fallback: raw list-of-lists
                for row in table:
                    ws.append(row)
                total_rows += len(table)

        if total_rows == 0:
            return SkillResult(
                success=False,
                data=None,
                error="All tables were empty — no data written to Excel.",
            )

        buf = io.BytesIO()
        wb.save(buf)

        return SkillResult(
            success=True,
            data=buf.getvalue(),
            debug={
                "sheets_written": sheets_written,
                "empty_tables": empty_tables,
                "total_rows": total_rows,
            },
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"Excel generation failed: {e}")
