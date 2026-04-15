"""
Skill: extract_tables_smart
Purpose: Extract tables from PDFs or images using GPT-4o vision.
         Replaces rigid pdfplumber pipelines with an LLM-first approach.
"""
from __future__ import annotations

import base64
import json
import re
from typing import Any

from skills.base import SkillResult

SKILL_ID = "extract_tables_smart"
DESCRIPTION = "Extract tables from PDF or image using GPT-4o vision"
TASK_TYPE = "vision"

TOOL_SCHEMA = {
    "name": "extract_tables_smart",
    "description": (
        "Extract all tables from a PDF or image using GPT-4o vision. "
        "Handles complex layouts, merged cells, borderless tables, and multi-table "
        "pages. Returns a list of tables, each with name, columns, and rows."
    ),
    "when_to_use": [
        "User wants to extract tabular data from a PDF or image",
        "Document contains multiple tables that need to be separated",
        "Tables have complex layout that text-only extraction would fail on",
    ],
    "when_not_to_use": [
        "User wants specific named fields, not tables (use extract_structured_data)",
        "Content is already extracted as structured data",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "file_ref": {
                "type": "string",
                "description": "State key reference to the file bytes (PDF or image)",
            },
            "file_type": {
                "type": "string",
                "enum": ["pdf", "image"],
                "description": "File format",
            },
        },
        "required": ["file_ref", "file_type"],
    },
}

_SYSTEM_PROMPT = """\
You are a precise table extraction assistant.
Extract ALL tables visible in this image.

For each table, return an object with:
- name: a short descriptive name (infer from context, or "table_N")
- columns: list of column header strings (snake_case)
- rows: list of row dicts where keys are column names

Return a JSON array of tables. If no tables are present, return [].
Return ONLY valid JSON, no markdown, no commentary.\
"""


def _extract_json_list(raw: str) -> list:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            for key in ("tables", "data", "results"):
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
    return []


def _pdf_to_page_images(file_bytes: bytes) -> list[tuple[int, bytes]]:
    """Convert each PDF page to a PNG using pymupdf (fitz). 150 DPI."""
    import fitz  # type: ignore[import]

    pages: list[tuple[int, bytes]] = []
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        for page_num, page in enumerate(doc, start=1):
            mat = fitz.Matrix(150 / 72, 150 / 72)  # 150 DPI
            pixmap = page.get_pixmap(matrix=mat)
            png_bytes: bytes = pixmap.tobytes("png")
            pages.append((page_num, png_bytes))
    finally:
        doc.close()
    return pages


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        file_bytes: Any = input_data.get("file_ref")
        file_type: str = input_data.get("file_type", "image")

        if not isinstance(file_bytes, bytes):
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"extract_tables_smart: 'file_ref' must resolve to bytes, "
                    f"got {type(file_bytes).__name__}"
                ),
            )

        # ── Build list of (page_num, image_bytes) ────────────────────────────
        if file_type == "pdf":
            try:
                page_images = _pdf_to_page_images(file_bytes)
            except ImportError:
                return SkillResult(
                    success=False,
                    data=None,
                    error=(
                        "extract_tables_smart: pymupdf (fitz) is not installed. "
                        "Install it with: pip install pymupdf"
                    ),
                )
        else:
            page_images = [(1, file_bytes)]

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        model = get_model(TASK_TYPE)

        all_tables: list[dict] = []
        tables_per_page: list[int] = []

        for page_num, image_bytes in page_images:
            b64 = base64.b64encode(image_bytes).decode("ascii")
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Extract all tables from page {page_num}.",
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{b64}"},
                            },
                        ],
                    },
                ],
                max_tokens=8192,
            )

            raw_output = response.choices[0].message.content or ""
            page_tables = _extract_json_list(raw_output)
            # Tag each table with its source page
            for tbl in page_tables:
                if isinstance(tbl, dict):
                    tbl.setdefault("source_page", page_num)
            all_tables.extend(page_tables)
            tables_per_page.append(len(page_tables))

        if not all_tables:
            return SkillResult(
                success=False,
                data=None,
                error=(
                    "extract_tables_smart: no tables found across "
                    f"{len(page_images)} page(s). "
                    "The document may contain only text or unsupported layouts."
                ),
            )

        return SkillResult(
            success=True,
            data=all_tables,
            debug={
                "pages_processed": len(page_images),
                "total_tables": len(all_tables),
                "tables_per_page": tables_per_page,
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"extract_tables_smart failed: {exc}",
        )
