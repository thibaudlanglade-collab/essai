"""
Gmail sync scheduler: polls all connected Gmail accounts every 5 minutes,
classifies pending emails every 10 minutes, and generates morning briefings at 08:00.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import async_session_maker
from db.models import Email, EmailAttachment, GmailConnection
from services.gmail_service import (
    GmailServiceError,
    fetch_message_full,
    get_gmail_service,
    list_message_ids,
)

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def sync_connection(connection_id: int, db: AsyncSession) -> dict:
    """Sync emails for a single GmailConnection.

    Returns: {new_emails_count, total_fetched, errors}
    """
    connection = await db.get(GmailConnection, connection_id)
    if connection is None:
        return {
            "new_emails_count": 0,
            "total_fetched": 0,
            "errors": [f"Connection {connection_id} not found"],
        }

    errors: list[str] = []
    new_emails_count = 0

    try:
        service = get_gmail_service(connection)
        message_ids, new_history_id = list_message_ids(
            service,
            max_results=50,
            history_id=connection.history_id,
        )
    except GmailServiceError as exc:
        return {"new_emails_count": 0, "total_fetched": 0, "errors": [str(exc)]}

    total_fetched = len(message_ids)

    for msg_id in message_ids:
        # Skip if already stored
        existing = await db.execute(select(Email).where(Email.gmail_id == msg_id))
        if existing.scalar_one_or_none() is not None:
            continue

        parsed = fetch_message_full(service, msg_id)
        if parsed is None:
            errors.append(f"Failed to fetch message {msg_id}")
            continue

        email = Email(
            gmail_id=parsed["gmail_id"],
            thread_id=parsed["thread_id"],
            connection_id=connection_id,
            from_email=parsed["from_email"],
            from_name=parsed["from_name"],
            to_emails=parsed["to_emails"],
            cc_emails=parsed["cc_emails"],
            subject=parsed["subject"],
            snippet=parsed["snippet"],
            body_plain=parsed["body_plain"],
            body_html=parsed["body_html"],
            received_at=parsed["received_at"],
            labels=parsed["labels"],
            is_read=parsed["is_read"],
            is_starred=parsed["is_starred"],
        )
        db.add(email)
        await db.flush()  # Populate email.id before creating attachments

        for att_data in parsed.get("attachments", []):
            att = EmailAttachment(
                email_id=email.id,
                gmail_attachment_id=att_data["gmail_attachment_id"],
                filename=att_data["filename"],
                mime_type=att_data["mime_type"],
                size_bytes=att_data["size"],
            )
            db.add(att)

        new_emails_count += 1

    connection.last_sync_at = datetime.now(timezone.utc)
    if new_history_id:
        connection.history_id = new_history_id

    await db.commit()

    logger.info(
        "Sync complete for %s: %d new, %d fetched, %d errors",
        connection.email_address,
        new_emails_count,
        total_fetched,
        len(errors),
    )

    return {
        "new_emails_count": new_emails_count,
        "total_fetched": total_fetched,
        "errors": errors,
    }


async def sync_all_connections() -> None:
    """Sync all GmailConnections. Errors per connection are logged but don't stop others."""
    async with async_session_maker() as db:
        result = await db.execute(select(GmailConnection))
        connections = list(result.scalars().all())

    for conn in connections:
        try:
            async with async_session_maker() as db:
                await sync_connection(conn.id, db)
        except Exception as exc:
            logger.error("Unhandled error syncing connection %d: %s", conn.id, exc)


async def classify_all_pending() -> None:
    """Classify pending emails in batches. Called every 10 minutes by scheduler."""
    try:
        from services.email_intelligence import classify_pending_emails
        from services.automation_triggers import get_trigger_manager
        import asyncio
        from sqlalchemy import and_

        before = datetime.now(timezone.utc)

        async with async_session_maker() as db:
            result = await classify_pending_emails(db, batch_size=10)
            if result["classified_count"] > 0 or result["errors"]:
                logger.info(
                    "Classification job: classified=%d errors=%d",
                    result["classified_count"],
                    len(result["errors"]),
                )

            # Dispatch email events for newly classified emails
            mgr = get_trigger_manager()
            if mgr and mgr.email_subscribers and result["classified_count"] > 0:
                from db.models import Email as EmailModel
                from sqlalchemy import select
                newly_classified = await db.execute(
                    select(EmailModel).where(
                        and_(
                            EmailModel.classified_at >= before,
                            EmailModel.priority.is_not(None),
                        )
                    )
                )
                for email in newly_classified.scalars().all():
                    asyncio.create_task(mgr.dispatch_email_event(email.to_dict()))

    except Exception as exc:
        logger.error("Classification job failed: %s", exc)


async def generate_daily_briefing() -> None:
    """Generate today's morning briefing. Called every day at 08:00 by scheduler."""
    try:
        from services.email_intelligence import generate_today_briefing

        async with async_session_maker() as db:
            briefing = await generate_today_briefing(db)
            logger.info(
                "Morning briefing generated for %s (id=%d)",
                briefing["briefing_date"],
                briefing["id"],
            )
    except Exception as exc:
        logger.error("Morning briefing job failed: %s", exc)


async def start_scheduler() -> None:
    """Start the APScheduler with Gmail sync, classification, and briefing jobs."""
    global _scheduler
    _scheduler = AsyncIOScheduler()

    # Gmail sync every 5 minutes
    _scheduler.add_job(
        sync_all_connections,
        trigger="interval",
        minutes=5,
        id="gmail_sync",
        replace_existing=True,
    )

    # Email classification every 10 minutes
    _scheduler.add_job(
        classify_all_pending,
        trigger="interval",
        minutes=10,
        id="email_classify",
        replace_existing=True,
    )

    # Morning briefing every day at 08:00
    _scheduler.add_job(
        generate_daily_briefing,
        trigger="cron",
        hour=8,
        minute=0,
        id="morning_briefing",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        "Scheduler started: gmail_sync(5m), email_classify(10m), morning_briefing(08:00)"
    )


async def stop_scheduler() -> None:
    """Gracefully stop the scheduler on app shutdown."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Gmail sync scheduler stopped")
