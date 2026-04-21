"""
Email intelligence orchestrator: classification, summarization, reply drafts, morning briefings.
"""
from __future__ import annotations

import base64
import logging
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Email, EmailTopic, GmailConnection, MorningBriefing
from services.gmail_service import GmailServiceError, get_gmail_service

logger = logging.getLogger(__name__)

# ── Sent-samples cache: keyed by connection_id, value = (timestamp, samples) ─
_sent_cache: dict[int, tuple[datetime, list[dict]]] = {}
_SENT_CACHE_TTL = timedelta(hours=1)


# ─────────────────────────────────────────────────────────────────────────────
# Classification
# ─────────────────────────────────────────────────────────────────────────────

async def classify_pending_emails(
    db: AsyncSession, batch_size: int = 10
) -> dict[str, Any]:
    """
    Classify up to batch_size unclassified emails.
    For each email: call classify_email skill, optionally summarize_email,
    then persist.
    """
    from skills.core.classify_email import execute as classify_execute
    from skills.core.summarize_email import execute as summarize_execute

    # Fetch topics once for the whole batch
    topics_result = await db.execute(
        select(EmailTopic).order_by(EmailTopic.display_order.asc())
    )
    topics = [
        {"name": t.name, "description": t.description or ""}
        for t in topics_result.scalars().all()
    ]

    if not topics:
        logger.warning("No topics found; skipping classification.")
        return {"classified_count": 0, "errors": ["No topics configured"]}

    # Fetch unclassified emails
    result = await db.execute(
        select(Email)
        .where(Email.classified_at.is_(None))
        .order_by(Email.received_at.desc())
        .limit(batch_size)
    )
    emails = result.scalars().all()

    classified_count = 0
    errors: list[str] = []

    for email in emails:
        try:
            input_data = {
                "email": {
                    "id": email.id,
                    "from_email": email.from_email,
                    "from_name": email.from_name,
                    "subject": email.subject,
                    "snippet": email.snippet,
                    "body_plain": (email.body_plain or "")[:2000],
                },
                "topics": topics,
            }

            result_cls = await classify_execute(input_data, context=None)
            if not result_cls.success:
                errors.append(f"Email {email.id}: {result_cls.error}")
                continue

            email.priority = result_cls.data["priority"]
            email.topic = result_cls.data["topic"]
            email.classified_at = datetime.now(timezone.utc)

            # Summarize if body is long enough
            body_len = len(email.body_plain or "")
            if body_len > 500:
                sum_input = {
                    "email": {
                        "subject": email.subject,
                        "from_name": email.from_name,
                        "body_plain": email.body_plain,
                    }
                }
                result_sum = await summarize_execute(sum_input, context=None)
                if result_sum.success:
                    email.ai_summary = result_sum.data["summary"]
                else:
                    logger.warning(
                        "Summarization failed for email %d: %s",
                        email.id,
                        result_sum.error,
                    )

            await db.commit()
            classified_count += 1
            logger.info(
                "Classified email %d: priority=%s topic=%s",
                email.id,
                email.priority,
                email.topic,
            )

        except Exception as exc:
            logger.error("Error classifying email %d: %s", email.id, exc)
            errors.append(f"Email {email.id}: {exc}")
            await db.rollback()

    return {"classified_count": classified_count, "errors": errors}


# ─────────────────────────────────────────────────────────────────────────────
# Reply drafts
# ─────────────────────────────────────────────────────────────────────────────

async def _get_sent_samples(connection: GmailConnection) -> list[dict]:
    """Fetch the 20 most recent sent emails with a 1-hour in-memory cache."""
    now = datetime.now(timezone.utc)
    cached = _sent_cache.get(connection.id)
    if cached is not None:
        ts, samples = cached
        if now - ts < _SENT_CACHE_TTL:
            return samples

    try:
        service = get_gmail_service(connection)
        resp = (
            service.users()
            .messages()
            .list(userId="me", q="in:sent", maxResults=20)
            .execute()
        )
        messages = resp.get("messages", [])
        samples: list[dict] = []

        for m in messages:
            try:
                msg = (
                    service.users()
                    .messages()
                    .get(userId="me", id=m["id"], format="full")
                    .execute()
                )
                payload = msg.get("payload", {})
                headers = {
                    h["name"].lower(): h["value"]
                    for h in payload.get("headers", [])
                }
                subject = headers.get("subject", "")
                to = headers.get("to", "")
                body_plain = _extract_plain_body(payload)
                samples.append(
                    {"subject": subject, "to": to, "body_plain": (body_plain or "")[:500]}
                )
            except Exception:
                continue

        _sent_cache[connection.id] = (now, samples)
        return samples

    except GmailServiceError as exc:
        logger.warning("Could not fetch sent samples: %s", exc)
        return []


def _extract_plain_body(payload: dict) -> Optional[str]:
    """Minimal plain-text body extractor (no import cycle)."""
    import base64 as _b64

    def _decode(data: str) -> str:
        try:
            padded = data + "=" * (4 - len(data) % 4)
            return _b64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")
        except Exception:
            return ""

    mime = payload.get("mimeType", "")
    body = payload.get("body", {})
    parts = payload.get("parts", [])

    if mime == "text/plain":
        data = body.get("data", "")
        return _decode(data) if data else None

    for part in parts:
        result = _extract_plain_body(part)
        if result:
            return result

    return None


async def generate_draft_for_email(
    db: AsyncSession, email_id: int, user_instructions: str = ""
) -> dict[str, str]:
    """Generate a reply draft for the given email."""
    from skills.core.generate_reply_draft import execute as draft_execute

    email = await db.get(Email, email_id)
    if email is None:
        raise ValueError(f"Email {email_id} introuvable.")

    connection = await db.get(GmailConnection, email.connection_id)
    if connection is None:
        raise ValueError("Connexion Gmail introuvable.")

    sent_samples = await _get_sent_samples(connection)

    input_data = {
        "email_to_reply": {
            "subject": email.subject,
            "from_name": email.from_name,
            "body_plain": email.body_plain,
        },
        "sent_samples": sent_samples,
        "user_instructions": user_instructions,
    }

    result = await draft_execute(input_data, context=None)
    if not result.success:
        raise RuntimeError(result.error or "Draft generation failed")

    return {"draft_body": result.data["draft_body"]}


# ─────────────────────────────────────────────────────────────────────────────
# Morning briefing
# ─────────────────────────────────────────────────────────────────────────────

async def generate_today_briefing(db: AsyncSession) -> dict[str, Any]:
    """Generate (or return cached) today's morning briefing."""
    from skills.core.generate_morning_briefing import execute as briefing_execute

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Return existing briefing if already generated today
    existing = (
        await db.execute(
            select(MorningBriefing).where(MorningBriefing.briefing_date == today)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing.to_dict()

    # Fetch emails from the last 24 hours
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    result = await db.execute(
        select(Email)
        .where(Email.received_at >= since)
        .order_by(Email.received_at.desc())
    )
    emails = result.scalars().all()

    if not emails:
        fallback_md = (
            f"## 🌅 Briefing du {today}\n\n"
            "Aucun email reçu dans les dernières 24 heures."
        )
        briefing = MorningBriefing(
            briefing_date=today,
            content_markdown=fallback_md,
            emails_analyzed_count=0,
            urgent_count=0,
            is_read=False,
        )
        db.add(briefing)
        await db.commit()
        await db.refresh(briefing)
        return briefing.to_dict()

    email_dicts = [
        {
            "from_name": e.from_name or e.from_email,
            "subject": e.subject,
            "snippet": e.snippet,
            "priority": e.priority,
            "topic": e.topic,
            "received_at": e.received_at.isoformat() if e.received_at else None,
        }
        for e in emails
    ]

    skill_result = await briefing_execute(
        {"emails": email_dicts, "briefing_date": today},
        context=None,
    )

    if not skill_result.success:
        raise RuntimeError(skill_result.error or "Briefing generation failed")

    data = skill_result.data
    briefing = MorningBriefing(
        briefing_date=today,
        content_markdown=data["content_markdown"],
        emails_analyzed_count=data["emails_analyzed_count"],
        urgent_count=data["urgent_count"],
        is_read=False,
    )
    db.add(briefing)
    await db.commit()
    await db.refresh(briefing)
    return briefing.to_dict()


# ─────────────────────────────────────────────────────────────────────────────
# Send reply via Gmail
# ─────────────────────────────────────────────────────────────────────────────

def build_reply_raw(
    to: str,
    subject: str,
    body: str,
    thread_id: str,
    in_reply_to: Optional[str] = None,
    references: Optional[str] = None,
) -> str:
    """Construct a base64url-encoded RFC 2822 reply message."""
    msg = MIMEText(body, "plain", "utf-8")
    msg["To"] = to
    msg["Subject"] = subject
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
    if references:
        msg["References"] = references
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("ascii")
    return raw
