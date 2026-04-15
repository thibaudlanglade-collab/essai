"""
Skill: generate_excel
Input:  list[dict] | dict  (structured data)
Output: bytes              (raw .xlsx file content)
"""
from __future__ import annotations

import io
from typing import Any

from skills.base import SkillResult

SKILL_ID = "generate_excel"
DESCRIPTION = "Convert structured JSON data into a downloadable Excel (.xlsx) file"


async def execute(input_data: Any, context) -> SkillResult:
    try:
        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active

        # Normalise to a list of rows
        if isinstance(input_data, dict):
            # Single object: try to unwrap a common "data" / "rows" / "items" wrapper
            for key in ("data", "rows", "items", "results", "records"):
                if key in input_data and isinstance(input_data[key], list):
                    input_data = input_data[key]
                    break
            else:
                # Flat dict → single-row table
                input_data = [input_data]

        if not isinstance(input_data, list) or len(input_data) == 0:
            return SkillResult(success=False, data=None, error="No rows to write to Excel.")

        rows = input_data

        # Write header from first row keys (works for list[dict])
        if isinstance(rows[0], dict):
            headers = list(rows[0].keys())
            ws.append(headers)
            for row in rows:
                ws.append([row.get(h) for h in headers])
        else:
            # list[list] fallback
            for row in rows:
                ws.append(row if isinstance(row, list) else [row])

        buf = io.BytesIO()
        wb.save(buf)
        xlsx_bytes = buf.getvalue()

        return SkillResult(
            success=True,
            data=xlsx_bytes,
            debug={"rows": len(rows), "columns": len(rows[0]) if isinstance(rows[0], dict) else "?"},
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"Excel generation failed: {e}")
