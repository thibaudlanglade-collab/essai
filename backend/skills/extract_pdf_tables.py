"""
Skill: extract_pdf_tables
Input:  bytes   (raw PDF file content)
Output: dict    {
    "tables":         list[list[list[str|None]]]  — flat list of raw tables
    "pages_text":     list[str]                   — one entry per page (for rescue fallback)
    "tables_per_page":list[int]                   — index-aligned with pages_text
}
"""
from __future__ import annotations

import io

from skills.base import SkillResult

SKILL_ID = "extract_pdf_tables"
DESCRIPTION = "Extract all tables from a PDF using pdfplumber; returns raw tables + per-page text for fallback"


async def execute(input_data: bytes, context) -> SkillResult:
    try:
        import pdfplumber

        tables: list[list[list]] = []
        pages_text: list[str] = []
        tables_per_page: list[int] = []

        with pdfplumber.open(io.BytesIO(input_data)) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                pages_text.append(text)

                page_tables = page.extract_tables() or []
                tables_per_page.append(len(page_tables))
                tables.extend(page_tables)

        total_tables = len(tables)
        empty_pages = sum(1 for n in tables_per_page if n == 0)

        if total_tables == 0 and all(not t.strip() for t in pages_text):
            return SkillResult(
                success=False,
                data=None,
                error="PDF appears to be empty or image-only — no text or tables extracted.",
            )

        return SkillResult(
            success=True,
            data={
                "tables": tables,
                "pages_text": pages_text,
                "tables_per_page": tables_per_page,
            },
            debug={
                "pages": len(pages_text),
                "tables_found": total_tables,
                "empty_pages": empty_pages,
            },
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"PDF table extraction failed: {e}")
