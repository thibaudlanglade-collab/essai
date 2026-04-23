"""
FastAPI router: /emails — list, get, update email records.
Registered with prefix="/api" in main.py → final paths are /api/emails/...
"""
from __future__ import annotations

import logging
import os
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth.dependencies import get_current_user, get_current_user_optional
from db.database import get_db
from db.models import AccessToken, Email, EmailAttachment, GmailConnection, MorningBriefing
from services.gmail_service import (
    GmailServiceError,
    download_attachment_bytes,
    get_gmail_service,
)

logger = logging.getLogger(__name__)

_ATTACHMENTS_ROOT = Path(__file__).parent.parent / "attachments"
os.makedirs(_ATTACHMENTS_ROOT, exist_ok=True)

emails_router = APIRouter(prefix="/emails")


def _sanitize_filename(name: str) -> str:
    """Strip path traversal characters and ensure the filename is safe."""
    safe = re.sub(r"[^\w.\-]", "_", name)
    safe = safe.lstrip(".")
    return safe or "attachment"


# ─────────────────────────────────────────────────────────────────────────────
# Briefing endpoints (must come before /{email_id} to avoid routing conflict)
# ─────────────────────────────────────────────────────────────────────────────

# PUBLIC demo surface: the LegacyLanding polls this to show a "briefing of the day"
# card on its marketing mailbox demo. The underlying service does not yet know
# how to scope by tenant — that's a Sprint 6 refactor once Gmail is fully
# multi-tenant. For now the briefing it generates is a global snapshot of any
# emails present in the DB (legacy rows with user_id IS NULL). Prospects'
# per-user briefings will be served from a separate endpoint once wired up.
@emails_router.get("/briefing/today")
async def get_today_briefing(
    db: AsyncSession = Depends(get_db),
    user: Optional[AccessToken] = Depends(get_current_user_optional),
) -> dict[str, Any]:
    """Return today's morning briefing, generating one on the fly if needed."""
    from services.email_intelligence import generate_today_briefing

    try:
        return await generate_today_briefing(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# Multi-tenant: isolated to user.id (Sprint 1).
# Delete is scoped so that one tenant forcing a regeneration does not
# evict another tenant's briefing for the same date.
@emails_router.post("/briefing/generate")
async def force_generate_briefing(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Force-regenerate today's briefing (deletes existing if any)."""
    from services.email_intelligence import generate_today_briefing

    today = datetime.utcnow().strftime("%Y-%m-%d")
    await db.execute(
        delete(MorningBriefing).where(
            MorningBriefing.briefing_date == today,
            MorningBriefing.user_id == user.id,
        )
    )
    await db.commit()

    try:
        return await generate_today_briefing(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# Multi-tenant: isolated to user.id (Sprint 1).
@emails_router.patch("/briefing/{briefing_id}/mark-read")
async def mark_briefing_read(
    briefing_id: int,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Mark a morning briefing as read."""
    result = await db.execute(
        select(MorningBriefing).where(
            MorningBriefing.id == briefing_id,
            MorningBriefing.user_id == user.id,
        )
    )
    briefing = result.scalar_one_or_none()
    if briefing is None:
        raise HTTPException(status_code=404, detail=f"Briefing {briefing_id} introuvable.")
    briefing.is_read = True
    await db.commit()
    await db.refresh(briefing)
    return briefing.to_dict()


# ─────────────────────────────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────────────────────────────

# Multi-tenant: isolated to user.id (Sprint 1).
# Every count here was previously cross-tenant — a prospect hitting this
# endpoint could infer the size of other tenants' inboxes. Now every
# count filters by user.id.
@emails_router.get("/stats/summary")
async def email_stats(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, int]:
    """Return email count summary."""
    # Naive UTC — Postgres column is TIMESTAMP WITHOUT TIME ZONE.
    today_start = datetime.combine(date.today(), datetime.min.time())

    total = (
        await db.execute(
            select(func.count(Email.id)).where(Email.user_id == user.id)
        )
    ).scalar_one() or 0
    unread = (
        await db.execute(
            select(func.count(Email.id)).where(
                Email.user_id == user.id, Email.is_read.is_(False)
            )
        )
    ).scalar_one() or 0
    starred = (
        await db.execute(
            select(func.count(Email.id)).where(
                Email.user_id == user.id, Email.is_starred.is_(True)
            )
        )
    ).scalar_one() or 0
    today = (
        await db.execute(
            select(func.count(Email.id)).where(
                Email.user_id == user.id, Email.received_at >= today_start
            )
        )
    ).scalar_one() or 0

    return {"total": total, "unread": unread, "starred": starred, "today": today}


# ─────────────────────────────────────────────────────────────────────────────
# List + get
# ─────────────────────────────────────────────────────────────────────────────

# Multi-tenant: isolated to user.id (Sprint 1).
@emails_router.get("")
async def list_emails(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = Query(default=False),
    starred_only: bool = Query(default=False),
    search: str = Query(default=""),
    sort: str = Query(default="received_desc"),
    priority: Optional[str] = Query(default=None),
    topic: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """List emails with pagination and optional filters."""
    conditions = [Email.user_id == user.id, Email.is_archived.is_(False)]

    # Once Gmail is connected, seed (demo) emails are hidden so the prospect
    # only sees their real inbox. Before connection, seeds remain visible as
    # a discovery sample.
    gmail_exists = (
        await db.execute(
            select(func.count(GmailConnection.id)).where(
                GmailConnection.user_id == user.id
            )
        )
    ).scalar_one() or 0
    if gmail_exists > 0:
        conditions.append(Email.is_seed.is_(False))

    if unread_only:
        conditions.append(Email.is_read.is_(False))
    if starred_only:
        conditions.append(Email.is_starred.is_(True))
    if search.strip():
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Email.subject.ilike(term),
                Email.snippet.ilike(term),
                Email.from_email.ilike(term),
                Email.from_name.ilike(term),
            )
        )
    if priority:
        conditions.append(Email.priority == priority)
    if topic:
        conditions.append(Email.topic == topic)

    where_clause = and_(*conditions)

    count_result = await db.execute(
        select(func.count(Email.id)).where(where_clause)
    )
    total: int = count_result.scalar_one() or 0

    order_col = (
        Email.received_at.desc() if sort == "received_desc" else Email.received_at.asc()
    )

    att_count_sq = (
        select(func.count(EmailAttachment.id))
        .where(EmailAttachment.email_id == Email.id)
        .correlate(Email)
        .scalar_subquery()
    )

    result = await db.execute(
        select(Email, att_count_sq.label("attachments_count"))
        .where(where_clause)
        .order_by(order_col)
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()

    emails_dicts: list[dict[str, Any]] = []
    for row in rows:
        d = row[0].to_dict()
        d["attachments_count"] = row[1] or 0
        emails_dicts.append(d)

    return {
        "emails": emails_dicts,
        "total": total,
        "has_more": (offset + limit) < total,
    }


# Multi-tenant: isolated to user.id (Sprint 1).
@emails_router.get("/{email_id}")
async def get_email(
    email_id: int,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Return full email details including body and attachments."""
    result = await db.execute(
        select(Email)
        .options(selectinload(Email.attachments))
        .where(Email.id == email_id, Email.user_id == user.id)
    )
    email = result.scalar_one_or_none()
    if email is None:
        raise HTTPException(status_code=404, detail=f"Email {email_id} introuvable.")
    return email.to_dict(include_attachments=True)


# ─────────────────────────────────────────────────────────────────────────────
# Update (patch) — label changes call Gmail API
# ─────────────────────────────────────────────────────────────────────────────

# Multi-tenant: isolated to user.id (Sprint 1).
@emails_router.patch("/{email_id}")
async def update_email(
    email_id: int,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Update email read/starred/archived state locally and in Gmail."""
    result = await db.execute(
        select(Email).where(Email.id == email_id, Email.user_id == user.id)
    )
    email = result.scalar_one_or_none()
    if email is None:
        raise HTTPException(status_code=404, detail=f"Email {email_id} introuvable.")

    labels_to_add: list[str] = []
    labels_to_remove: list[str] = []

    if "is_read" in body:
        new_val = bool(body["is_read"])
        if new_val != email.is_read:
            email.is_read = new_val
            if new_val:
                labels_to_remove.append("UNREAD")
            else:
                labels_to_add.append("UNREAD")

    if "is_starred" in body:
        new_val = bool(body["is_starred"])
        if new_val != email.is_starred:
            email.is_starred = new_val
            if new_val:
                labels_to_add.append("STARRED")
            else:
                labels_to_remove.append("STARRED")

    if "is_archived" in body:
        new_val = bool(body["is_archived"])
        if new_val != email.is_archived:
            email.is_archived = new_val
            if new_val:
                labels_to_remove.append("INBOX")
            else:
                labels_to_add.append("INBOX")

    if labels_to_add or labels_to_remove:
        connection = await db.get(GmailConnection, email.connection_id)
        if connection is None:
            raise HTTPException(status_code=404, detail="Connexion Gmail introuvable.")
        try:
            service = get_gmail_service(connection)
            service.users().messages().modify(
                userId="me",
                id=email.gmail_id,
                body={
                    "addLabelIds": labels_to_add,
                    "removeLabelIds": labels_to_remove,
                },
            ).execute()
        except (GmailServiceError, Exception) as exc:
            raise HTTPException(
                status_code=502, detail=f"Gmail API error: {exc}"
            ) from exc

    await db.commit()
    await db.refresh(email)
    return email.to_dict()


# ─────────────────────────────────────────────────────────────────────────────
# AI endpoints
# ─────────────────────────────────────────────────────────────────────────────

# Multi-tenant: isolated to user.id (Sprint 1).
@emails_router.post("/{email_id}/classify-now")
async def classify_now(
    email_id: int,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Manually trigger classification for a single email."""
    from skills.core.classify_email import execute as classify_execute
    from skills.core.summarize_email import execute as summarize_execute
    from db.models import EmailTopic

    result = await db.execute(
        select(Email).where(Email.id == email_id, Email.user_id == user.id)
    )
    email = result.scalar_one_or_none()
    if email is None:
        raise HTTPException(status_code=404, detail=f"Email {email_id} introuvable.")

    topics_result = await db.execute(
        select(EmailTopic)
        .where(EmailTopic.user_id == user.id)
        .order_by(EmailTopic.display_order.asc())
    )
    topics = [
        {"name": t.name, "description": t.description or ""}
        for t in topics_result.scalars().all()
    ]

    cls_result = await classify_execute(
        {
            "email": {
                "id": email.id,
                "from_email": email.from_email,
                "from_name": email.from_name,
                "subject": email.subject,
                "snippet": email.snippet,
                "body_plain": (email.body_plain or "")[:2000],
            },
            "topics": topics,
        },
        context=None,
    )

    if not cls_result.success:
        raise HTTPException(status_code=500, detail=cls_result.error)

    email.priority = cls_result.data["priority"]
    email.topic = cls_result.data["topic"]
    email.classified_at = datetime.utcnow()

    if len(email.body_plain or "") > 500:
        sum_result = await summarize_execute(
            {"email": {"subject": email.subject, "from_name": email.from_name, "body_plain": email.body_plain}},
            context=None,
        )
        if sum_result.success:
            email.ai_summary = sum_result.data["summary"]

    await db.commit()
    await db.refresh(email)
    return email.to_dict()


# Multi-tenant: ownership check precedes the service call so the downstream
# `generate_draft_for_email` cannot be coaxed into producing a draft against
# an email that belongs to another tenant.
@emails_router.post("/{email_id}/generate-draft")
async def generate_draft(
    email_id: int,
    body: Optional[dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, str]:
    """Generate an AI reply draft for the given email."""
    from services.email_intelligence import generate_draft_for_email

    owns = await db.execute(
        select(Email.id).where(Email.id == email_id, Email.user_id == user.id)
    )
    if owns.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail=f"Email {email_id} introuvable.")

    user_instructions = (body or {}).get("user_instructions", "")

    try:
        return await generate_draft_for_email(db, email_id, user_instructions)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Attachment endpoints (must be defined before /{email_id} catch-all variants)
# ─────────────────────────────────────────────────────────────────────────────

@emails_router.get("/admin/backfill-attachments")
async def backfill_attachments_check(
    user: AccessToken = Depends(get_current_user),
) -> dict[str, str]:
    """Health check for the backfill endpoint."""
    return {"status": "Use POST to run backfill"}


# Multi-tenant: backfill only scans the calling tenant's emails.
@emails_router.post("/admin/backfill-attachments")
async def backfill_attachments(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, int]:
    """Re-fetch Gmail metadata for the calling tenant's emails and create missing EmailAttachment rows."""
    from services.gmail_service import fetch_message_full
    from sqlalchemy import select as sa_select

    emails_result = await db.execute(
        sa_select(Email).where(Email.user_id == user.id)
    )
    all_emails = emails_result.scalars().all()

    processed = 0
    attachments_added = 0
    connections_cache: dict[int, Any] = {}

    for email in all_emails:
        try:
            conn = connections_cache.get(email.connection_id)
            if conn is None:
                conn = await db.get(GmailConnection, email.connection_id)
                if conn is None:
                    continue
                connections_cache[email.connection_id] = conn

            service = get_gmail_service(conn)
            parsed = fetch_message_full(service, email.gmail_id)
            if parsed is None:
                continue

            for att_data in parsed.get("attachments", []):
                existing = await db.execute(
                    sa_select(EmailAttachment).where(
                        EmailAttachment.email_id == email.id,
                        EmailAttachment.gmail_attachment_id == att_data["gmail_attachment_id"],
                    )
                )
                if existing.scalar_one_or_none() is not None:
                    continue
                att = EmailAttachment(
                    user_id=user.id,
                    email_id=email.id,
                    gmail_attachment_id=att_data["gmail_attachment_id"],
                    filename=att_data["filename"],
                    mime_type=att_data["mime_type"],
                    size_bytes=att_data["size"],
                )
                db.add(att)
                attachments_added += 1

            processed += 1
        except Exception as exc:
            logger.warning("Backfill failed for email %d: %s", email.id, exc)

    await db.commit()
    return {"processed": processed, "attachments_added": attachments_added}


# Multi-tenant: isolated to user.id (Sprint 1).
@emails_router.get("/{email_id}/attachments")
async def list_attachments(
    email_id: int,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Return the list of attachment metadata for an email."""
    # Verify the email itself belongs to the caller before listing attachments.
    owns = await db.execute(
        select(Email.id).where(Email.id == email_id, Email.user_id == user.id)
    )
    if owns.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail=f"Email {email_id} introuvable.")

    result = await db.execute(
        select(EmailAttachment).where(
            EmailAttachment.email_id == email_id,
            EmailAttachment.user_id == user.id,
        )
    )
    return [a.to_dict() for a in result.scalars().all()]


# Multi-tenant: isolated to user.id (Sprint 1).
@emails_router.get("/{email_id}/attachments/{attachment_id}/download")
async def download_attachment(
    email_id: int,
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> FileResponse:
    """Download (or serve cached) an email attachment."""
    att_result = await db.execute(
        select(EmailAttachment).where(
            EmailAttachment.id == attachment_id,
            EmailAttachment.email_id == email_id,
            EmailAttachment.user_id == user.id,
        )
    )
    att = att_result.scalar_one_or_none()
    if att is None:
        raise HTTPException(status_code=404, detail="Pièce jointe introuvable.")

    # Serve from cache if already downloaded
    if att.is_downloaded and att.local_path:
        cached = Path(att.local_path)
        if cached.exists():
            disposition = "inline" if att.mime_type in {
                "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"
            } else "attachment"
            return FileResponse(
                path=str(cached),
                media_type=att.mime_type,
                headers={"Content-Disposition": f'{disposition}; filename="{att.filename}"'},
            )

    # Fetch from Gmail API — ownership already enforced via the EmailAttachment lookup.
    email_result = await db.execute(
        select(Email).where(Email.id == email_id, Email.user_id == user.id)
    )
    email = email_result.scalar_one_or_none()
    if email is None:
        raise HTTPException(status_code=404, detail="Email introuvable.")
    conn = await db.get(GmailConnection, email.connection_id)
    if conn is None or conn.user_id != user.id:
        raise HTTPException(status_code=404, detail="Connexion Gmail introuvable.")

    try:
        service = get_gmail_service(conn)
        raw_bytes = download_attachment_bytes(service, email.gmail_id, att.gmail_attachment_id)
    except GmailServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Save to cache
    safe_name = _sanitize_filename(att.filename)
    att_dir = _ATTACHMENTS_ROOT / str(email_id)
    att_dir.mkdir(parents=True, exist_ok=True)
    file_path = att_dir / safe_name
    file_path.write_bytes(raw_bytes)

    att.is_downloaded = True
    att.local_path = str(file_path)
    att.downloaded_at = datetime.utcnow()
    await db.commit()

    disposition = "inline" if att.mime_type in {
        "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"
    } else "attachment"
    return FileResponse(
        path=str(file_path),
        media_type=att.mime_type,
        headers={"Content-Disposition": f'{disposition}; filename="{att.filename}"'},
    )


# Multi-tenant: isolated to user.id (Sprint 1).
@emails_router.post("/{email_id}/attachments/{attachment_id}/extract")
async def extract_attachment(
    email_id: int,
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Run Smart Extract on a PDF attachment."""
    from skills.core.extract_file_content import execute as extract_execute

    att_result = await db.execute(
        select(EmailAttachment).where(
            EmailAttachment.id == attachment_id,
            EmailAttachment.email_id == email_id,
            EmailAttachment.user_id == user.id,
        )
    )
    att = att_result.scalar_one_or_none()
    if att is None:
        raise HTTPException(status_code=404, detail="Pièce jointe introuvable.")
    if att.mime_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Seuls les PDF peuvent être extraits.")

    # Ensure the file is downloaded first
    if not (att.is_downloaded and att.local_path and Path(att.local_path).exists()):
        email_result = await db.execute(
            select(Email).where(Email.id == email_id, Email.user_id == user.id)
        )
        email = email_result.scalar_one_or_none()
        if email is None:
            raise HTTPException(status_code=404, detail="Email introuvable.")
        conn = await db.get(GmailConnection, email.connection_id)
        if conn is None or conn.user_id != user.id:
            raise HTTPException(status_code=404, detail="Connexion Gmail introuvable.")
        try:
            service = get_gmail_service(conn)
            raw_bytes = download_attachment_bytes(service, email.gmail_id, att.gmail_attachment_id)
        except GmailServiceError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        safe_name = _sanitize_filename(att.filename)
        att_dir = _ATTACHMENTS_ROOT / str(email_id)
        att_dir.mkdir(parents=True, exist_ok=True)
        file_path = att_dir / safe_name
        file_path.write_bytes(raw_bytes)
        att.is_downloaded = True
        att.local_path = str(file_path)
        att.downloaded_at = datetime.utcnow()
        await db.commit()

    result = await extract_execute(
        {"file_path": att.local_path, "file_type": "pdf"}, context=None
    )
    return {"success": result.success, "data": result.data, "error": result.error}


# Multi-tenant: isolated to user.id (Sprint 1).
@emails_router.post("/{email_id}/send-reply")
async def send_reply(
    email_id: int,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Send a reply to an email via Gmail API."""
    from services.email_intelligence import build_reply_raw

    reply_body: str = body.get("body", "")
    if not reply_body.strip():
        raise HTTPException(status_code=400, detail="Le corps de la réponse est requis.")

    email_result = await db.execute(
        select(Email).where(Email.id == email_id, Email.user_id == user.id)
    )
    email = email_result.scalar_one_or_none()
    if email is None:
        raise HTTPException(status_code=404, detail=f"Email {email_id} introuvable.")

    connection = await db.get(GmailConnection, email.connection_id)
    if connection is None or connection.user_id != user.id:
        raise HTTPException(status_code=404, detail="Connexion Gmail introuvable.")

    # Build subject
    original_subject = email.subject or ""
    reply_subject = body.get("subject") or (
        f"Re: {original_subject}" if not original_subject.lower().startswith("re:") else original_subject
    )

    # Fetch original message headers for In-Reply-To and References
    try:
        service = get_gmail_service(connection)
        orig_msg = (
            service.users()
            .messages()
            .get(userId="me", id=email.gmail_id, format="metadata", metadataHeaders=["Message-Id", "References"])
            .execute()
        )
        orig_headers = {
            h["name"].lower(): h["value"]
            for h in orig_msg.get("payload", {}).get("headers", [])
        }
        message_id_header = orig_headers.get("message-id")
        references_header = orig_headers.get("references")

        # Build references chain
        if references_header and message_id_header:
            new_references = f"{references_header} {message_id_header}"
        elif message_id_header:
            new_references = message_id_header
        else:
            new_references = None

        raw = build_reply_raw(
            to=email.from_email,
            subject=reply_subject,
            body=reply_body,
            thread_id=email.thread_id,
            in_reply_to=message_id_header,
            references=new_references,
        )

        sent = (
            service.users()
            .messages()
            .send(
                userId="me",
                body={"raw": raw, "threadId": email.thread_id},
            )
            .execute()
        )

        return {"success": True, "sent_message_id": sent.get("id", "")}

    except (GmailServiceError, Exception) as exc:
        raise HTTPException(status_code=502, detail=f"Gmail API error: {exc}") from exc
