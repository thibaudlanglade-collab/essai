"""
Skill: parse_production_plan
Purpose: Parse a production plan / task list from any file format
         and extract a structured list of tasks for scheduling.
"""
from __future__ import annotations

import base64
import io
import json
import re
from typing import Any, Optional

from skills.base import SkillResult

SKILL_ID = "parse_production_plan"
DESCRIPTION = "Extract a structured task list from a production plan file (PDF, image, Excel, CSV, text)"
TASK_TYPE = "structuring"

TOOL_SCHEMA = {
    "name": "parse_production_plan",
    "description": (
        "Extract a structured list of tasks from a production plan, project schedule, "
        "or task list file. Handles PDFs, images, Excel spreadsheets, CSV, and plain text. "
        "Returns a list of task objects with name, estimated hours, deadline, required skills, "
        "priority, client, and description. Use this as the first step when scheduling a team."
    ),
    "when_to_use": [
        "User provides a production plan, task list, or project schedule file",
        "Need to extract structured tasks before generating a team schedule",
        "File contains tasks that need to be assigned to employees",
    ],
    "when_not_to_use": [
        "File contains employee/team information (use parse_employee_list instead)",
        "Tasks are already structured in state",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "file_ref": {
                "type": "string",
                "description": "State key reference to the file bytes (e.g. $state.tasks_file)",
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
You are a precise task extraction assistant.
Extract ALL tasks from the provided content. This content comes from a production plan, \
project schedule, or task list.

For each task, return an object with EXACTLY these fields:
- id: unique identifier like "task_1", "task_2", etc. (string)
- name: short descriptive task name (string)
- description: brief description of what the task entails (string, may be empty)
- client: client name if mentioned, otherwise null
- estimated_hours: estimated work hours as a number (make a reasonable estimate if not \
  stated — default 1)
- deadline: deadline date as "YYYY-MM-DD" if mentioned, otherwise null
- required_skills: list of skills or competences needed (array of strings, may be empty)
- priority: one of "low", "medium", or "high" (infer from context or deadline urgency)

Return a JSON array of task objects. If no tasks are found, return [].
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


def _extract_json_array(raw: str) -> Optional[list]:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            for key in ("tasks", "data", "results", "items"):
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
                    {"type": "text", "text": "Extract all tasks from this document image."},
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
                    f"parse_production_plan: 'file_ref' must resolve to bytes, "
                    f"got {type(file_bytes).__name__}"
                ),
            )

        if file_type == "auto":
            file_type = _detect_file_type(file_bytes)

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        source_format = file_type

        # ── PDF ───────────────────────────────────────────────────────────────
        if file_type == "pdf":
            try:
                import pypdf
            except ImportError:
                return SkillResult(
                    success=False,
                    data=None,
                    error="parse_production_plan: pypdf is not installed",
                )
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = [page.extract_text() or "" for page in reader.pages]
            text = "\n\n".join(pages_text)

            if not text.strip() or len(text.strip()) < 50:
                # Scanned PDF — fall back to vision on first page
                try:
                    import fitz  # type: ignore[import]
                    doc = fitz.open(stream=file_bytes, filetype="pdf")
                    pix = doc[0].get_pixmap(matrix=fitz.Matrix(150 / 72, 150 / 72))
                    img_bytes: bytes = pix.tobytes("png")
                    doc.close()
                    model = get_model("vision")
                    tasks = await _call_image(img_bytes, client, model)
                    source_format = "pdf_vision"
                except ImportError:
                    return SkillResult(
                        success=False,
                        data=None,
                        error=(
                            "parse_production_plan: PDF appears to be scanned (no text) "
                            "and pymupdf is not installed for vision fallback"
                        ),
                    )
            else:
                model = get_model(TASK_TYPE)
                tasks = await _call_text(text, client, model)

        # ── Image ─────────────────────────────────────────────────────────────
        elif file_type == "image":
            model = get_model("vision")
            tasks = await _call_image(file_bytes, client, model)

        # ── Excel ─────────────────────────────────────────────────────────────
        elif file_type == "excel":
            try:
                import openpyxl
            except ImportError:
                return SkillResult(
                    success=False,
                    data=None,
                    error="parse_production_plan: openpyxl is not installed",
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
            tasks = await _call_text("\n".join(rows_text), client, model)

        # ── CSV / plain text ──────────────────────────────────────────────────
        else:
            text = file_bytes.decode("utf-8", errors="replace")
            model = get_model(TASK_TYPE)
            tasks = await _call_text(text, client, model)

        if not tasks:
            return SkillResult(
                success=False,
                data=None,
                error="parse_production_plan: no tasks could be extracted from the file",
            )

        # Ensure each task has a stable id
        for i, task in enumerate(tasks, start=1):
            if isinstance(task, dict) and not task.get("id"):
                task["id"] = f"task_{i}"

        return SkillResult(
            success=True,
            data=tasks,
            debug={"tasks_count": len(tasks), "source_format": source_format},
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"parse_production_plan failed: {exc}",
        )
