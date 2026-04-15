"""
Skill: extract_pdf_text
Input:  bytes  (raw PDF file content)
Output: str    (extracted text, one page per paragraph)
"""
from __future__ import annotations

import io

from skills.base import SkillResult

SKILL_ID = "extract_pdf_text"
DESCRIPTION = "Extract raw text from a PDF file"


async def execute(input_data: bytes, context) -> SkillResult:
    try:
        import pypdf

        reader = pypdf.PdfReader(io.BytesIO(input_data))
        pages: list[str] = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text.strip():
                pages.append(text.strip())

        if not pages:
            return SkillResult(
                success=False,
                data=None,
                error="No text could be extracted from the PDF. It may be scanned or image-only.",
            )

        full_text = "\n\n".join(pages)
        return SkillResult(
            success=True,
            data=full_text,
            debug={"pages": len(reader.pages), "extracted_pages": len(pages), "chars": len(full_text)},
        )
    except Exception as e:
        return SkillResult(success=False, data=None, error=f"PDF extraction failed: {e}")
