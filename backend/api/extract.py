"""Smart Extract router (brief §5.1).

Three endpoints:

- `POST /api/extract/upload` — accepts a multipart file OR pasted text,
  runs the extract service, persists an `extractions` row, returns the
  extraction + suggested folder/filename for the prospect to edit.

- `POST /api/extract/save` — commits the prospect's validated data back
  onto the extraction. When `document_type == "invoice"`, also creates
  (or updates) an `invoices` row so the document flows into the rest of
  the app (Assistant, Rapport Client…).

- `GET /api/extract/history` — the 30 most recent extractions for the
  calling tenant.

All three are Depends(get_current_user) and strictly scoped to the caller's
`user_id`. No extraction leaks across tenants.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.database import get_db
from db.models import AccessToken, Extraction, Invoice, Supplier
from services.extract_service import ExtractError, extract_document
from services.file_organizer import organize_invoice_file

logger = logging.getLogger(__name__)

extract_router = APIRouter(prefix="/extract")


_STORAGE_ROOT = Path(__file__).resolve().parent.parent / "attachments"
_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


_MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _user_storage(user_id: str) -> Path:
    """Per-tenant attachment directory, created lazily."""
    path = _STORAGE_ROOT / user_id / "extractions"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _safe_basename(name: str) -> str:
    """Strip path traversal + keep a filesystem-safe basename."""
    import re

    base = Path(name).name or "document"
    base = re.sub(r"[^\w.\-]+", "_", base)
    return base.lstrip(".") or "document"


async def _save_upload(
    user_id: str, upload: UploadFile
) -> tuple[bytes, Path, str]:
    """Read the upload into memory (size-capped) and persist it to disk.

    Returns (bytes, stored_path, stored_filename).
    """
    raw = await upload.read()
    if len(raw) > _MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux (max {_MAX_FILE_BYTES // (1024 * 1024)} Mo).",
        )
    if not raw:
        raise HTTPException(status_code=400, detail="Fichier vide.")

    user_dir = _user_storage(user_id)
    basename = _safe_basename(upload.filename or "document")
    stored_filename = f"{uuid.uuid4().hex[:8]}_{basename}"
    stored_path = user_dir / stored_filename
    stored_path.write_bytes(raw)
    return raw, stored_path, stored_filename


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


# Multi-tenant: isolated to user.id (Sprint 2).
@extract_router.post("/upload")
async def upload_and_extract(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Run Smart Extract on a file (photo/PDF) or pasted text.

    Exactly one of `file` or `text` must be provided.
    """
    if (file is None) == (text is None or not text.strip()):
        raise HTTPException(
            status_code=400,
            detail="Fournir un fichier OU du texte (l'un des deux, pas les deux).",
        )

    stored_filename: Optional[str] = None
    original_filename: Optional[str] = None

    try:
        if file is not None:
            raw, stored_path, stored_filename = await _save_upload(user.id, file)
            original_filename = file.filename
            payload = await extract_document(
                file_bytes=raw,
                mime_type=file.content_type,
                filename=original_filename,
            )
        else:
            assert text is not None
            payload = await extract_document(raw_text=text, filename=None)
    except ExtractError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Persist the extraction row. `extracted_data` stores the model output
    # as-is so the prospect can edit each field before /save.
    extraction = Extraction(
        user_id=user.id,
        source_type=payload.get("source_type"),
        original_filename=original_filename,
        stored_filename=stored_filename,
        raw_text=payload.get("raw_text"),
        extracted_data=payload.get("extracted_data"),
        document_type=payload.get("document_type"),
        target_folder=payload.get("suggested_folder"),
    )
    db.add(extraction)
    await db.commit()
    await db.refresh(extraction)

    # Return the model payload + the DB row identifiers the UI needs to
    # round-trip back via /save.
    result = extraction.to_dict()
    result["summary"] = payload.get("summary")
    result["suggested_folder"] = payload.get("suggested_folder")
    result["suggested_filename"] = payload.get("suggested_filename")
    result["confidence"] = payload.get("confidence")
    return result


# Multi-tenant: isolated to user.id (Sprint 2).
@extract_router.post("/save")
async def save_extraction(
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Commit the prospect's validated edits + optionally spawn an invoice.

    Expected body shape:
    {
      "extraction_id": "<uuid>",
      "validated_data": { ... prospect-edited extracted_data ... },
      "target_folder": "Factures/Point_P/Avril_2026/",
      "final_filename": "2026-04-12_Point_P_FacN672_1247-50EUR.pdf",
      "commit_to_invoices": true   // only honoured when document_type == "invoice"
    }
    """
    extraction_id = body.get("extraction_id")
    if not extraction_id:
        raise HTTPException(400, "`extraction_id` manquant.")

    result = await db.execute(
        select(Extraction).where(
            Extraction.id == extraction_id, Extraction.user_id == user.id
        )
    )
    extraction = result.scalar_one_or_none()
    if extraction is None:
        raise HTTPException(404, "Extraction introuvable.")

    validated: dict[str, Any] = body.get("validated_data") or {}
    if not isinstance(validated, dict):
        raise HTTPException(400, "`validated_data` doit être un objet JSON.")

    target_folder = body.get("target_folder") or extraction.target_folder
    final_filename = body.get("final_filename")

    # Keep the original upload basename BEFORE we rename anything — the file
    # organizer below needs it to locate the actual file on disk.
    original_stored = extraction.stored_filename

    extraction.extracted_data = validated
    extraction.target_folder = target_folder

    commit_to_invoices = bool(body.get("commit_to_invoices"))
    invoice_id: Optional[str] = None
    organize_result: Optional[dict[str, Any]] = None

    if commit_to_invoices and extraction.document_type == "invoice":
        invoice_id = await _spawn_invoice(
            db=db,
            user_id=user.id,
            extraction=extraction,
            validated=validated,
            target_folder=target_folder,
            final_filename=final_filename,
        )

        # File classement + Excel (brief §6.1, volet 1). Best-effort: never
        # fails the save, just surfaces "impossible" steps to the UI.
        original_source = (
            _STORAGE_ROOT / user.id / "extractions" / original_stored
            if original_stored
            else None
        )
        organize_result = await organize_invoice_file(
            user_id=user.id,
            source_path=original_source,
            target_folder=target_folder or "",
            final_filename=final_filename or original_stored or "document.pdf",
            invoice_data=validated,
        )

    # Keep `stored_filename` pointing at where the file actually lives. If
    # organize moved it, use that new basename; otherwise honour the
    # prospect's chosen filename; else keep the upload basename.
    if organize_result and organize_result.get("final_path"):
        extraction.stored_filename = Path(organize_result["final_path"]).name
    elif final_filename:
        extraction.stored_filename = final_filename

    await db.commit()
    await db.refresh(extraction)

    return {
        "saved": True,
        "extraction": extraction.to_dict(),
        "invoice_id": invoice_id,
        "organize": organize_result,
    }


# Multi-tenant: isolated to user.id (Sprint 2).
@extract_router.get("/history")
async def list_history(
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Return the N most recent extractions for the calling tenant."""
    limit = max(1, min(int(limit), 100))
    result = await db.execute(
        select(Extraction)
        .where(Extraction.user_id == user.id)
        .order_by(desc(Extraction.created_at))
        .limit(limit)
    )
    return [e.to_dict() for e in result.scalars().all()]


# ─────────────────────────────────────────────────────────────────────────────
# Invoice spawn
# ─────────────────────────────────────────────────────────────────────────────


def _parse_iso_date(value: Any) -> Optional[date]:
    if isinstance(value, str) and value:
        try:
            return datetime.strptime(value[:10], "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


async def _spawn_invoice(
    *,
    db: AsyncSession,
    user_id: str,
    extraction: Extraction,
    validated: dict[str, Any],
    target_folder: Optional[str],
    final_filename: Optional[str],
) -> str:
    """Insert an `Invoice` for the prospect, resolving or creating the supplier.

    Supplier matching is a case-insensitive name equality scoped to the
    caller's `user_id`. If no match, we create a new Supplier row with
    the provided name + siret; this keeps the downstream Assistant /
    Rapport Client able to join on `supplier_id`.
    """
    supplier_name = (validated.get("supplier_name") or "").strip()
    supplier_id: Optional[str] = None

    if supplier_name:
        existing = await db.execute(
            select(Supplier).where(
                Supplier.user_id == user_id,
                Supplier.name.ilike(supplier_name),
            )
        )
        supplier = existing.scalar_one_or_none()
        if supplier is None:
            supplier = Supplier(
                user_id=user_id,
                name=supplier_name,
                siret=validated.get("supplier_siret") or None,
            )
            db.add(supplier)
            await db.flush()
        supplier_id = supplier.id

    invoice = Invoice(
        user_id=user_id,
        supplier_id=supplier_id,
        invoice_number=validated.get("invoice_number") or None,
        invoice_date=_parse_iso_date(validated.get("invoice_date")),
        amount_ht=_to_float(validated.get("amount_ht")),
        vat_rate=_to_float(validated.get("vat_rate")),
        amount_vat=_to_float(validated.get("amount_vat")),
        amount_ttc=_to_float(validated.get("amount_ttc")),
        auto_liquidation=bool(validated.get("auto_liquidation", False)),
        original_filename=extraction.original_filename,
        stored_filename=final_filename or extraction.stored_filename,
        file_path=str(
            _STORAGE_ROOT / user_id / "extractions" / (extraction.stored_filename or "")
        )
        if extraction.stored_filename
        else None,
        raw_text=extraction.raw_text,
        extracted_data={
            "lines": validated.get("lines") or [],
            "currency": validated.get("currency") or "EUR",
            "source_extraction_id": extraction.id,
            "target_folder": target_folder,
        },
        status="processed",
        is_seed=False,
    )
    db.add(invoice)
    await db.flush()
    return invoice.id
