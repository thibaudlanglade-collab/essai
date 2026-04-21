"""Poll every tenant's active Drive watched folder every 5 minutes.

Each tick:
1. Select all active `WatchedFolder` rows joined with their tenant's
   `OAuthConnection(provider="google_drive")`.
2. For each watch, list files modified since `last_checked_at`, download
   them, run Smart Extract, optionally spawn an Invoice, and copy the
   file into `attachments/{user_id}/organized/` via `file_organizer`.
3. Update `last_checked_at` + `files_processed` on the watch row.

Disabled by default. Activate via `SYNTHESE_ENABLE_DRIVE_POLLING=1`.
Requires `SYNTHESE_FERNET_KEY` (or `SYNTHESE_DEV=1`) and a valid Google
Cloud OAuth client. A failure in one tenant's watch never blocks the
others; each iteration handles its own exceptions.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import async_session_maker
from db.models import Extraction, Invoice, OAuthConnection, Supplier, WatchedFolder
from services.crypto import decrypt_token, encrypt_token
from services.drive_service import (
    DriveServiceError,
    download_file_bytes,
    list_new_files_in_folder,
)
from services.extract_service import ExtractError, extract_document
from services.file_organizer import organize_invoice_file


logger = logging.getLogger(__name__)


_scheduler: AsyncIOScheduler | None = None


_POLL_INTERVAL_SECONDS = 5 * 60
_STORAGE_ROOT = Path(__file__).resolve().parent.parent / "attachments"


async def _run_tick() -> None:
    """One scheduler tick — process every active watched folder."""
    try:
        async with async_session_maker() as db:
            watches = (
                await db.execute(
                    select(WatchedFolder).where(
                        WatchedFolder.is_active.is_(True),
                        WatchedFolder.provider == "google_drive",
                    )
                )
            ).scalars().all()

            for watch in watches:
                try:
                    await _process_watch(db, watch)
                except Exception as exc:
                    logger.exception(
                        "watched folder tick failed for user=%s folder=%s: %s",
                        watch.user_id,
                        watch.folder_id,
                        exc,
                    )
    except Exception:
        logger.exception("watch_folder_scheduler top-level tick error")


async def _process_watch(db: AsyncSession, watch: WatchedFolder) -> None:
    connection = (
        await db.execute(
            select(OAuthConnection).where(
                OAuthConnection.user_id == watch.user_id,
                OAuthConnection.provider == "google_drive",
            )
        )
    ).scalar_one_or_none()

    if connection is None:
        logger.info(
            "User %s has a watched folder but no active Drive connection — deactivating the watch.",
            watch.user_id,
        )
        watch.is_active = False
        await db.commit()
        return

    try:
        access_plain = decrypt_token(connection.access_token)
        refresh_plain = (
            decrypt_token(connection.refresh_token)
            if connection.refresh_token
            else None
        )
    except Exception as exc:
        logger.warning(
            "Could not decrypt Drive tokens for user=%s (likely a Fernet key rotation): %s",
            watch.user_id,
            exc,
        )
        return

    scopes = json.loads(connection.scopes) if connection.scopes else []
    since = watch.last_checked_at

    try:
        files, refreshed_creds = list_new_files_in_folder(
            access_token=access_plain,
            refresh_token=refresh_plain,
            expires_at=connection.expires_at,
            scopes=scopes,
            folder_id=watch.folder_id,
            since=since,
        )
    except DriveServiceError as exc:
        logger.warning("Drive listing failed for user=%s: %s", watch.user_id, exc)
        return

    # Persist any refreshed access token so we don't ping Google every tick.
    if refreshed_creds.token and refreshed_creds.token != access_plain:
        connection.access_token = encrypt_token(refreshed_creds.token)
        if refreshed_creds.expiry:
            connection.expires_at = refreshed_creds.expiry

    now = datetime.utcnow()
    processed_this_tick = 0

    for item in files:
        try:
            await _process_file(
                db=db,
                user_id=watch.user_id,
                access_token=refreshed_creds.token or access_plain,
                refresh_token=refresh_plain,
                expires_at=refreshed_creds.expiry or connection.expires_at,
                scopes=scopes,
                file_meta=item,
            )
            processed_this_tick += 1
        except Exception as exc:
            logger.exception(
                "Failed to process Drive file %s for user=%s: %s",
                item.get("id"),
                watch.user_id,
                exc,
            )

    watch.last_checked_at = now
    watch.files_processed = (watch.files_processed or 0) + processed_this_tick
    await db.commit()


async def _process_file(
    *,
    db: AsyncSession,
    user_id: str,
    access_token: str,
    refresh_token: str | None,
    expires_at: datetime | None,
    scopes: list[str],
    file_meta: dict,
) -> None:
    """Download one Drive file, extract it, persist an Extraction + optional Invoice."""
    file_id = file_meta["id"]
    filename = file_meta.get("name") or f"{file_id}.pdf"
    mime = file_meta.get("mimeType")

    try:
        raw_bytes, _ = download_file_bytes(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            scopes=scopes,
            file_id=file_id,
        )
    except DriveServiceError as exc:
        logger.warning("Could not download Drive file %s: %s", file_id, exc)
        return

    # Persist the raw upload under the tenant's sandbox.
    user_dir = _STORAGE_ROOT / user_id / "extractions"
    user_dir.mkdir(parents=True, exist_ok=True)
    safe_stem = f"{uuid.uuid4().hex[:8]}_{filename.replace('/', '_')}"
    stored_path = user_dir / safe_stem
    stored_path.write_bytes(raw_bytes)

    # Run Smart Extract. If it fails, we keep the file but log + move on —
    # the prospect can still find it under extractions/ manually.
    try:
        payload = await extract_document(
            file_bytes=raw_bytes,
            mime_type=mime,
            filename=filename,
        )
    except ExtractError as exc:
        logger.info(
            "extract_document refused Drive file %s (%s): %s",
            file_id,
            filename,
            exc,
        )
        return

    extraction = Extraction(
        user_id=user_id,
        source_type=payload.get("source_type"),
        original_filename=filename,
        stored_filename=safe_stem,
        raw_text=payload.get("raw_text"),
        extracted_data=payload.get("extracted_data"),
        document_type=payload.get("document_type"),
        target_folder=payload.get("suggested_folder"),
    )
    db.add(extraction)
    await db.flush()

    # Only auto-file invoices — other doc types require human review
    # (they'll surface in Smart Extract history next time the prospect opens the UI).
    if extraction.document_type == "invoice":
        validated = payload.get("extracted_data") or {}
        await _spawn_invoice_row(
            db=db,
            user_id=user_id,
            extraction=extraction,
            validated=validated,
        )
        organize_invoice_file(
            user_id=user_id,
            source_path=stored_path,
            target_folder=payload.get("suggested_folder") or "",
            final_filename=payload.get("suggested_filename") or filename,
            invoice_data=validated,
        )


async def _spawn_invoice_row(
    *,
    db: AsyncSession,
    user_id: str,
    extraction: Extraction,
    validated: dict,
) -> None:
    from datetime import date, time

    supplier_name = (validated.get("supplier_name") or "").strip()
    supplier_id = None
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

    def _parse_iso_date(value):
        if isinstance(value, str) and value:
            try:
                return datetime.strptime(value[:10], "%Y-%m-%d").date()
            except ValueError:
                return None
        return None

    def _to_float(value):
        if value is None or value == "":
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

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
        stored_filename=extraction.stored_filename,
        raw_text=extraction.raw_text,
        extracted_data={
            "lines": validated.get("lines") or [],
            "currency": validated.get("currency") or "EUR",
            "source_extraction_id": extraction.id,
            "source": "drive_watch",
        },
        status="processed",
        is_seed=False,
    )
    db.add(invoice)
    await db.flush()


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan hooks
# ─────────────────────────────────────────────────────────────────────────────


def start_watch_folder_scheduler() -> None:
    """Start polling. No-op when the feature flag is off or already running."""
    global _scheduler
    if os.environ.get("SYNTHESE_ENABLE_DRIVE_POLLING") != "1":
        logger.info(
            "SYNTHESE_ENABLE_DRIVE_POLLING != 1 — Drive watched folder polling disabled."
        )
        return
    if _scheduler is not None:
        return

    _scheduler = AsyncIOScheduler(timezone="Europe/Paris")
    _scheduler.add_job(
        _run_tick,
        IntervalTrigger(seconds=_POLL_INTERVAL_SECONDS),
        id="watch_folder_poll",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info(
        "Drive watched folder polling started (every %d seconds).",
        _POLL_INTERVAL_SECONDS,
    )


def stop_watch_folder_scheduler() -> None:
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.shutdown(wait=False)
    _scheduler = None
