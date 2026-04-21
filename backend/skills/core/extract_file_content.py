"""
Skill: extract_file_content
Purpose: Universal file reader — PDF, image, plain text, docx.
         The first skill called for any file-based task. No LLM.
"""
from __future__ import annotations

import io
from typing import Any

from skills.base import SkillResult

SKILL_ID = "extract_file_content"
DESCRIPTION = "Universal file content extractor (PDF, image, text, docx)"

TOOL_SCHEMA = {
    "name": "extract_file_content",
    "description": (
        "Extract raw text or binary content from an uploaded file. "
        "Handles PDFs (text extraction with pypdf), images (passes bytes through "
        "for downstream vision skills), plain text files, and Word documents. "
        "Returns a dict with the extracted content and metadata."
    ),
    "when_to_use": [
        "Any task that starts with an uploaded file",
        "Need to read a document before further processing",
        "Convert bytes from state into usable text or prepare for vision",
    ],
    "when_not_to_use": [
        "The content is already extracted as text in state",
        "You need structured data extraction — use extract_structured_data after this",
        "You need table extraction — use extract_tables_smart directly",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "file_ref": {
                "type": "string",
                "description": "State key reference to the file bytes (e.g. $state.uploaded_file)",
            },
            "file_type": {
                "type": "string",
                "enum": ["pdf", "image", "text", "docx", "auto"],
                "description": "File format. Use 'auto' to detect from magic bytes.",
            },
        },
        "required": ["file_ref", "file_type"],
    },
}


def _detect_file_type(data: bytes) -> str:
    if data[:4] == b"%PDF":
        return "pdf"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image"
    if data[:2] == b"\xff\xd8":
        return "image"
    if data[:4] == b"PK\x03\x04":
        return "docx"
    return "text"


def _detect_image_format(data: bytes) -> str:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:2] == b"\xff\xd8":
        return "jpeg"
    return "unknown"


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        file_bytes: Any = input_data.get("file_ref")
        file_type: str = input_data.get("file_type", "auto")

        # Automation engine path: file_path provided instead of file_ref bytes
        if not isinstance(file_bytes, bytes):
            file_path = input_data.get("file_path")
            if file_path and isinstance(file_path, str):
                from pathlib import Path
                p = Path(file_path)
                if not p.exists():
                    return SkillResult(
                        success=False,
                        data=None,
                        error=f"extract_file_content: file not found: {file_path}",
                    )
                file_bytes = p.read_bytes()
                # Infer file_type from extension if still auto
                if file_type == "auto":
                    ext = p.suffix.lower()
                    if ext == ".pdf":
                        file_type = "pdf"
                    elif ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
                        file_type = "image"
                    elif ext in (".docx",):
                        file_type = "docx"
                    else:
                        file_type = "text"
            else:
                return SkillResult(
                    success=False,
                    data=None,
                    error=(
                        f"extract_file_content: 'file_ref' must resolve to bytes "
                        f"or 'file_path' must be a valid path, "
                        f"got file_ref={type(input_data.get('file_ref')).__name__}"
                    ),
                )

        input_size = len(file_bytes)

        if file_type == "auto":
            file_type = _detect_file_type(file_bytes)

        # ── PDF ──────────────────────────────────────────────────────────────
        if file_type == "pdf":
            try:
                import pypdf
            except ImportError:
                return SkillResult(
                    success=False,
                    data=None,
                    error="extract_file_content: pypdf is not installed",
                )
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text: list[str] = []
            for page in reader.pages:
                pages_text.append(page.extract_text() or "")
            full_text = "\n\n".join(pages_text)
            needs_vision = (not full_text.strip()) or len(full_text) < 50
            return SkillResult(
                success=True,
                data={
                    "text": full_text,
                    "page_count": len(reader.pages),
                    "needs_vision": needs_vision,
                },
                debug={"file_type_used": "pdf", "input_size_bytes": input_size},
            )

        # ── Image ─────────────────────────────────────────────────────────────
        if file_type == "image":
            fmt = _detect_image_format(file_bytes)
            return SkillResult(
                success=True,
                data={"image_bytes": file_bytes, "format": fmt},
                debug={"file_type_used": "image", "input_size_bytes": input_size},
            )

        # ── Plain text ────────────────────────────────────────────────────────
        if file_type == "text":
            decoded = file_bytes.decode("utf-8", errors="replace")
            return SkillResult(
                success=True,
                data={"text": decoded},
                debug={"file_type_used": "text", "input_size_bytes": input_size},
            )

        # ── DOCX ──────────────────────────────────────────────────────────────
        if file_type == "docx":
            try:
                from docx import Document
            except ImportError:
                return SkillResult(
                    success=False,
                    data=None,
                    error="extract_file_content: python-docx is not installed",
                )
            doc = Document(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            joined = "\n\n".join(paragraphs)
            return SkillResult(
                success=True,
                data={"text": joined, "paragraph_count": len(paragraphs)},
                debug={"file_type_used": "docx", "input_size_bytes": input_size},
            )

        return SkillResult(
            success=False,
            data=None,
            error=f"extract_file_content: unsupported file_type '{file_type}'",
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"extract_file_content failed: {exc}",
        )
