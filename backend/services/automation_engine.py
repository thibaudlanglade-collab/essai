"""
Phase G — AutomationEngine: executes an automation's action chain.
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

from db.database import async_session_maker
from db.models import Automation, AutomationRun

logger = logging.getLogger(__name__)


class AutomationEngine:
    """Executes an automation's ordered action chain, tracking progress in DB."""

    async def run_automation(self, automation_id: int, trigger_context: dict) -> dict:
        """
        Execute all actions of an automation and return the finished run dict.
        Opens its own DB session (safe to call from scheduler or watchdog threads).
        """
        async with async_session_maker() as db:
            automation = await db.get(Automation, automation_id)
            if automation is None:
                raise ValueError(f"Automation {automation_id} not found")

            actions: list[dict] = json.loads(automation.actions or "[]")
            on_error = automation.on_error or "stop"

            # Create the run record
            run = AutomationRun(
                automation_id=automation_id,
                started_at=datetime.now(timezone.utc),
                status="running",
                trigger_context=json.dumps(trigger_context, default=str),
                steps_log="[]",
            )
            db.add(run)
            await db.commit()
            await db.refresh(run)

            # Working state seeded with trigger context
            state: dict[str, Any] = dict(trigger_context)
            steps_log: list[dict] = []
            final_status = "success"

            # Discover skills once
            from engine.planner import skill_registry
            skill_registry.discover_skills()

            for action in actions:
                skill_id: str = action.get("skill_id", "")
                raw_args: dict = action.get("args", {})
                output_key: str = action.get("output_key", skill_id)

                resolved_args = self._resolve_args(raw_args, state)
                step_start = time.monotonic()
                step_entry: dict[str, Any] = {
                    "skill_id": skill_id,
                    "status": "error",
                    "duration_ms": 0,
                    "error": None,
                }

                try:
                    mod = skill_registry.get_skill_module(skill_id)
                    if mod is None:
                        raise ValueError(f"Skill '{skill_id}' not found")

                    result = await mod.execute(resolved_args, None)
                    duration_ms = int((time.monotonic() - step_start) * 1000)

                    if result.success:
                        state[output_key] = result.data or {}
                        step_entry["status"] = "success"
                        step_entry["duration_ms"] = duration_ms
                    else:
                        step_entry["status"] = "error"
                        step_entry["duration_ms"] = duration_ms
                        step_entry["error"] = result.error
                        steps_log.append(step_entry)
                        logger.warning("Skill %s failed: %s", skill_id, result.error)
                        if on_error == "stop":
                            final_status = "error"
                            break
                        else:
                            final_status = "partial"
                            continue

                except Exception as exc:
                    duration_ms = int((time.monotonic() - step_start) * 1000)
                    step_entry["status"] = "error"
                    step_entry["duration_ms"] = duration_ms
                    step_entry["error"] = str(exc)
                    logger.error("Skill %s raised: %s", skill_id, exc)
                    steps_log.append(step_entry)
                    if on_error == "stop":
                        final_status = "error"
                        break
                    else:
                        final_status = "partial"
                        continue

                steps_log.append(step_entry)

            # Finalize run
            now = datetime.now(timezone.utc)
            ok_count = sum(1 for s in steps_log if s["status"] == "success")
            run.finished_at = now
            run.status = final_status
            run.steps_log = json.dumps(steps_log, default=str)
            run.output_summary = (
                f"{ok_count}/{len(steps_log)} étapes réussies"
            )

            automation.last_run_at = now
            automation.last_run_status = final_status

            await db.commit()
            await db.refresh(run)

            logger.info(
                "Automation %d (%s) finished with status=%s (%d/%d steps ok)",
                automation_id,
                automation.name,
                final_status,
                ok_count,
                len(steps_log),
            )
            return run.to_dict()

    def _resolve_args(self, args: dict, state: dict) -> dict:
        """Recursively replace $state.x.y placeholders with values from state.

        Supports two forms:
        - Exact: "$state.foo.bar"  → replaced with the value directly
        - Inline: "prefix/$state.foo.bar/suffix" → each $state.X is replaced
          with its string representation, keeping the surrounding text.
        """

        def _lookup(path_str: str) -> Any:
            """Walk state by dot-separated path. Returns None if not found."""
            current: Any = state
            for key in path_str.split("."):
                if isinstance(current, dict):
                    current = current.get(key)
                    if current is None:
                        return None
                else:
                    return None
            return current

        def _resolve(val: Any) -> Any:
            if isinstance(val, str):
                # Exact match: entire string is a single $state reference
                if val.startswith("$state.") and val.count("$") == 1:
                    result = _lookup(val[7:])
                    return result if result is not None else val
                # Inline match: string contains one or more $state.x.y tokens
                if "$state." in val:
                    def _replacer(m: re.Match) -> str:
                        found = _lookup(m.group(1))
                        return str(found) if found is not None else m.group(0)
                    return re.sub(r"\$state\.([A-Za-z0-9_.]+)", _replacer, val)
            if isinstance(val, dict):
                return {k: _resolve(v) for k, v in val.items()}
            if isinstance(val, list):
                return [_resolve(item) for item in val]
            return val

        return {k: _resolve(v) for k, v in args.items()}
