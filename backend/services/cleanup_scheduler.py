"""Daily cron that wipes access tokens past their expiration + grace period.

RGPD commitment (brief §12): prospect data is deleted shortly after the
14-day trial ends. This job runs daily at 03:00 Europe/Paris and calls
`cleanup_expired(grace_days=7)` — giving us one week of safety to handle
a prospect who asks "can I get my data back?" before it's actually gone.

Disabled via `SYNTHESE_DISABLE_CLEANUP=1` (useful for local dev where we
want to keep a freshly-created token around even if we set it to 0-day
duration for testing).
"""
from __future__ import annotations

import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from db.access_tokens import cleanup_expired
from db.database import async_session_maker

logger = logging.getLogger(__name__)


_scheduler: AsyncIOScheduler | None = None

_GRACE_DAYS = 7


async def _run_cleanup() -> None:
    """Wrapper invoked by APScheduler — handles its own DB session."""
    async with async_session_maker() as db:
        try:
            deleted = await cleanup_expired(db, grace_days=_GRACE_DAYS)
            if deleted:
                logger.info(
                    "cleanup_expired: deleted %d access token(s) past grace period.",
                    deleted,
                )
            else:
                logger.debug("cleanup_expired: nothing to delete.")
        except Exception:
            # Log but don't propagate — a failed cleanup run should not
            # knock over the scheduler.
            logger.exception("cleanup_expired: unexpected error, will retry tomorrow.")


def start_cleanup_scheduler() -> None:
    """Boot the daily cleanup job. No-op if disabled or already running."""
    global _scheduler
    if os.environ.get("SYNTHESE_DISABLE_CLEANUP") == "1":
        logger.info("SYNTHESE_DISABLE_CLEANUP=1 — skipping cleanup scheduler.")
        return
    if _scheduler is not None:
        return

    _scheduler = AsyncIOScheduler(timezone="Europe/Paris")
    _scheduler.add_job(
        _run_cleanup,
        CronTrigger(hour=3, minute=0),
        id="cleanup_expired_daily",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("cleanup_expired cron scheduled: daily at 03:00 Europe/Paris.")


def stop_cleanup_scheduler() -> None:
    """Shut the scheduler down cleanly (called from FastAPI lifespan)."""
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.shutdown(wait=False)
    _scheduler = None
