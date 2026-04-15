"""
Skill: parse_employee_list
Purpose: Parse a team/employee list from any file format and extract
         a structured list of employees with their availability.
"""
from __future__ import annotations

import base64
import io
import json
import re
from typing import Any

from skills.base import SkillResult

SKILL_ID = "parse_employee_list"
DESCRIPTION = "Extract a structured employee list from a team file (PDF, image, Excel, CSV, text)"
TASK_TYPE = "structuring"

TOOL_SCHEMA = {
    "name": "parse_employee_list",
    "description": (
        "Extract a structured list of employees and their availability from a team file. "
        "Handles PDFs, images, Excel spreadsheets, CSV, and plain text. "
        "Returns a list of employee objects with name, working hours, working days, "
        "skills, and unavailability dates. Use this before generating a team schedule."
    ),
    "when_to_use": [
        "User provides a team list, employee roster, or availability file",
        "Need to extract employee data before generating a team schedule",
        "File contains staff/employee information",
    ],
    "when_not_to_use": [
        "File contains task/project information (use parse_production_plan instead)",
        "Employees are already structured in state",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "file_ref": {
                "type": "string",
                "description": "State key reference to the file bytes (e.g. $state.employees_file)",
            },
            "file_type": {
                "type": "string",
                "enum": ["pdf", "image", "text", "csv", "excel", "auto"],
                "description": (
                    "File format. Use 'auto' to detect automatically from magic bytes "
                    "(default when omitted)."
                ),
            },
        },
        "required": ["file_ref"],
    },
}

_SYSTEM_PROMPT = """\
You are a precise employee data extraction assistant.
Extract ALL employees from the provided content. This content describes a team and their availability.

For each employee, return an object with EXACTLY these fields:
- id: unique identifier like "emp_1", "emp_2", etc. (string)
- name: full name (string)
- hours_per_week: total working hours per week as a number (default 35 if not stated)
- working_days: list of lowercase day names they work, e.g. ["monday", "tuesday", \
"wednesday", "thursday", "friday"]. Default to Mon-Fri if not specified.
- skills: list of skills or competences they have (array of strings, may be empty)
- unavailable_dates: list of dates they cannot work as "YYYY-MM-DD" strings \
(array, may be empty)
- notes: any additional constraints or notes (string or null)

Return a JSON array of employee objects. If no employees are found, return [].
Return ONLY valid JSON — no markdown fences, no commentary.\
"""


def _detect_file_type(data: bytes) -> str:
    if data[:4] == b"%PDF":
        return "pdf"
    if data[:8] == b"\x89PNG\r\n\x1a\n" or data[:2] == b"\xff\xd8":
        return "image"
    if data[:4] == b"PK\x03\x04":
        return "excel"
    return "text"


def _extract_json_array(raw: str) -> list | None:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            for key in ("employees", "team", "staff", "data", "results", "items"):
                if key in parsed and isinstance(parsed[key], list):
                    return parsed[key]
    except json.JSONDecodeError:
        pass
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass
    return None


async def _call_text(text: str, client: Any, model: str) -> list:
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": text[:50_000]},
        ],
        max_tokens=8192,
    )
    raw = response.choices[0].message.content or ""
    return _extract_json_array(raw) or []


async def _call_image(image_bytes: bytes, client: Any, model: str) -> list:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all employees from this document image."},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}"},
                    },
                ],
            },
        ],
        max_tokens=8192,
    )
    raw = response.choices[0].message.content or ""
    return _extract_json_array(raw) or []


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        file_bytes: Any = input_data.get("file_ref")
        file_type: str = input_data.get("file_type", "auto")

        if not isinstance(file_bytes, bytes):
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"parse_employee_list: 'file_ref' must resolve to bytes, "
                    f"got {type(file_bytes).__name__}"
                ),
            )

        if file_type == "auto":
            file_type = _detect_file_type(file_bytes)

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)

        # ── PDF ───────────────────────────────────────────────────────────────
        if file_type == "pdf":
            try:
                import pypdf
            except ImportError:
                return SkillResult(
                    success=False,
                    data=None,
                    error="parse_employee_list: pypdf is not installed",
                )
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = [page.extract_text() or "" for page in reader.pages]
            text = "\n\n".join(pages_text)

            if not text.strip() or len(text.strip()) < 50:
                try:
                    import fitz  # type: ignore[import]
                    doc = fitz.open(stream=file_bytes, filetype="pdf")
                    pix = doc[0].get_pixmap(matrix=fitz.Matrix(150 / 72, 150 / 72))
                    img_bytes: bytes = pix.tobytes("png")
                    doc.close()
                    model = get_model("vision")
                    employees = await _call_image(img_bytes, client, model)
                except ImportError:
                    return SkillResult(
                        success=False,
                        data=None,
                        error=(
                            "parse_employee_list: PDF appears to be scanned (no text) "
                            "and pymupdf is not installed for vision fallback"
                        ),
                    )
            else:
                model = get_model(TASK_TYPE)
                employees = await _call_text(text, client, model)

        # ── Image ─────────────────────────────────────────────────────────────
        elif file_type == "image":
            model = get_model("vision")
            employees = await _call_image(file_bytes, client, model)

        # ── Excel ─────────────────────────────────────────────────────────────
        elif file_type == "excel":
            try:
                import openpyxl
            except ImportError:
                return SkillResult(
                    success=False,
                    data=None,
                    error="parse_employee_list: openpyxl is not installed",
                )
            wb = openpyxl.load_workbook(
                io.BytesIO(file_bytes), read_only=True, data_only=True
            )
            rows_text: list[str] = []
            for sheet in wb.worksheets:
                rows_text.append(f"[Feuille: {sheet.title}]")
                for row in sheet.iter_rows(values_only=True):
                    row_str = "\t".join("" if v is None else str(v) for v in row)
                    if row_str.strip():
                        rows_text.append(row_str)
            wb.close()
            model = get_model(TASK_TYPE)
            employees = await _call_text("\n".join(rows_text), client, model)

        # ── CSV / plain text ──────────────────────────────────────────────────
        else:
            text = file_bytes.decode("utf-8", errors="replace")
            model = get_model(TASK_TYPE)
            employees = await _call_text(text, client, model)

        if not employees:
            return SkillResult(
                success=False,
                data=None,
                error="parse_employee_list: no employees could be extracted from the file",
            )

        # Ensure each employee has a stable id
        for i, emp in enumerate(employees, start=1):
            if isinstance(emp, dict) and not emp.get("id"):
                emp["id"] = f"emp_{i}"

        return SkillResult(
            success=True,
            data=employees,
            debug={"employees_count": len(employees)},
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"parse_employee_list failed: {exc}",
        )
