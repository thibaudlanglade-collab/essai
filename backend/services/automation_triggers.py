"""
Phase G — TriggerManager: registers/unregisters triggers for automations.
"""
from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Automation

if TYPE_CHECKING:
    from services.automation_engine import AutomationEngine

logger = logging.getLogger(__name__)


class TriggerManager:
    """
    Manages trigger registration for all active automations.
    Works with the existing APScheduler instance for cron jobs,
    and FolderWatcher instances for folder_watch triggers.
    """

    def __init__(self, scheduler, engine: "AutomationEngine"):
        self.scheduler = scheduler
        self.engine = engine
        self.folder_watchers: dict[int, object] = {}
        self.email_subscribers: list[int] = []

    async def register_automation(self, automation: Automation) -> None:
        if not automation.is_active:
            return

        config: dict = json.loads(automation.trigger_config or "{}")
        auto_id = automation.id

        if automation.trigger_type == "cron":
            hour = config.get("hour", 8)
            minute = config.get("minute", 0)

            async def _run_cron(aid: int = auto_id) -> None:
                await self._run_wrapper(aid, {})

            self.scheduler.add_job(
                _run_cron,
                trigger="cron",
                id=f"auto_{auto_id}",
                replace_existing=True,
                hour=hour,
                minute=minute,
            )
            logger.info(
                "Registered cron trigger for automation %d at %02d:%02d",
                auto_id, hour, minute,
            )

        elif automation.trigger_type == "folder_watch":
            from services.watch_folder_service import FolderWatcher

            folder_path = config.get("folder_path", "C:\\Synthese\\Inbox")
            extensions = config.get("extensions", [".pdf"])

            async def _on_file(file_path: str, aid: int = auto_id) -> None:
                await self._run_wrapper(aid, {"file_path": file_path})

            watcher = FolderWatcher(
                folder_path=folder_path,
                callback=_on_file,
                file_extensions=extensions,
            )
            watcher.start()
            self.folder_watchers[auto_id] = watcher
            logger.info(
                "Registered folder_watch trigger for automation %d on '%s'",
                auto_id, folder_path,
            )

        elif automation.trigger_type == "email_new":
            if auto_id not in self.email_subscribers:
                self.email_subscribers.append(auto_id)
            logger.info("Registered email_new trigger for automation %d", auto_id)

    async def unregister_automation(self, automation_id: int) -> None:
        # Remove cron job
        try:
            self.scheduler.remove_job(f"auto_{automation_id}")
        except Exception:
            pass

        # Stop folder watcher
        watcher = self.folder_watchers.pop(automation_id, None)
        if watcher:
            try:
                watcher.stop()  # type: ignore[attr-defined]
            except Exception:
                pass

        # Remove email subscriber
        if automation_id in self.email_subscribers:
            self.email_subscribers.remove(automation_id)

    async def refresh_all(self, db: AsyncSession) -> None:
        """Load all active automations from DB and register their triggers."""
        result = await db.execute(
            select(Automation).where(Automation.is_active.is_(True))
        )
        automations = list(result.scalars().all())
        for automation in automations:
            try:
                await self.register_automation(automation)
            except Exception as exc:
                logger.error(
                    "Failed to register automation %d: %s", automation.id, exc
                )
        logger.info(
            "TriggerManager.refresh_all: registered %d active automations",
            len(automations),
        )

    async def dispatch_email_event(self, email_dict: dict) -> None:
        """
        Called by gmail_sync after a new email is classified.
        Runs matching email_new automations (filtered by trigger_config conditions).
        """
        from db.database import async_session_maker

        for auto_id in list(self.email_subscribers):
            try:
                async with async_session_maker() as db:
                    automation = await db.get(Automation, auto_id)
                    if automation is None or not automation.is_active:
                        continue
                    config: dict = json.loads(automation.trigger_config or "{}")

                    # Apply filter conditions
                    if "filter_priority" in config:
                        if email_dict.get("priority") != config["filter_priority"]:
                            continue
                    if "filter_topic" in config:
                        if email_dict.get("topic") != config["filter_topic"]:
                            continue

                await self._run_wrapper(auto_id, {"email": email_dict})

            except Exception as exc:
                logger.error(
                    "dispatch_email_event failed for automation %d: %s", auto_id, exc
                )

    async def _run_wrapper(self, automation_id: int, context: dict) -> None:
        try:
            await self.engine.run_automation(automation_id, context)
        except Exception as exc:
            logger.error("Automation %d run failed: %s", automation_id, exc)

    def stop_all_watchers(self) -> None:
        for watcher in list(self.folder_watchers.values()):
            try:
                watcher.stop()  # type: ignore[attr-defined]
            except Exception:
                pass
        self.folder_watchers.clear()
        logger.info("TriggerManager: all folder watchers stopped")


# ── Global singleton ──────────────────────────────────────────────────────────

_trigger_manager: TriggerManager | None = None


def get_trigger_manager() -> TriggerManager | None:
    return _trigger_manager


def set_trigger_manager(manager: TriggerManager) -> None:
    global _trigger_manager
    _trigger_manager = manager
