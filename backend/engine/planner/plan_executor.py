"""
Plan executor — runs a validated plan step-by-step and streams SSE events.

Public API:
    async for event in execute_plan(plan, state, context, max_retries=1):
        ...

Event types emitted (superset of pipeline.py for frontend compatibility):
    plan_empty    {"event": "plan_empty",    "reasoning": str}
    step_start    {"event": "step_start",    "step": str, "index": int, "args_preview": ...}
    step_done     {"event": "step_done",     "step": str, "index": int, "output_key": str, "debug": dict}
    step_error    {"event": "step_error",    "step": str, "index": int, "error": str}
    replanning    {"event": "replanning",    "reason": str}
    pipeline_done {"event": "pipeline_done", "output_key": Optional[str]}
"""
from __future__ import annotations

from typing import Any, AsyncIterator, Optional

from engine.planner.state import PlannerState
from engine.planner import skill_registry


# ── Module-level helpers ──────────────────────────────────────────────────────

def _safe_preview(value: Any) -> Any:
    """
    Recursively sanitise a value for safe SSE inclusion.
      str   → truncated to 200 chars
      bytes → "<bytes len=N>"
      dict  → recurse on values
      list  → recurse on items
      other → pass through unchanged
    """
    if isinstance(value, bytes):
        return f"<bytes len={len(value)}>"
    if isinstance(value, str):
        return value[:200] + ("…" if len(value) > 200 else "")
    if isinstance(value, dict):
        return {k: _safe_preview(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_safe_preview(item) for item in value]
    return value


def _resolve_args(args: Any, state: PlannerState) -> Any:
    """
    Recursively walk *args* and replace every "$state.<key>" string with
    the corresponding value from *state*.

    Raises KeyError (with a descriptive message) if a referenced key is
    absent — the caller is responsible for catching and emitting step_error.
    """
    if isinstance(args, str):
        if args.startswith("$state."):
            key = args[len("$state."):]
            if not state.has(key):
                raise KeyError(
                    f"State reference '{args}' could not be resolved: "
                    f"key '{key}' not found. "
                    f"Available keys: {state.list_keys()}"
                )
            return state.get(key)
        return args

    if isinstance(args, dict):
        return {k: _resolve_args(v, state) for k, v in args.items()}

    if isinstance(args, list):
        return [_resolve_args(item, state) for item in args]

    # Scalars (int, float, bool, None, …) — unchanged.
    return args


# ── Executor ──────────────────────────────────────────────────────────────────

async def execute_plan(
    plan: dict,
    state: PlannerState,
    context,          # PipelineContext
    max_retries: int = 1,
) -> AsyncIterator[dict]:
    """
    Execute the plan step by step. Yields SSE event dicts.

    Uses the shared PlannerState to thread data between skills.
    On a recoverable failure, retries the whole plan once (max_retries=1)
    by asking the planner LLM for an alternative approach.
    """
    steps: list[dict] = plan.get("steps", [])

    # ── Empty plan ────────────────────────────────────────────────────────────
    if not steps:
        yield {"event": "plan_empty", "reasoning": plan.get("reasoning", "")}
        yield {"event": "pipeline_done", "output_key": None}
        return

    # ── Step-by-step execution ────────────────────────────────────────────────
    failed_skill: Optional[str] = None
    failure_error: Optional[str] = None
    recoverable: bool = False

    for i, step in enumerate(steps):
        skill_name: str = step["skill"]

        # (a) Resolve $state. references ── NON-recoverable on missing key
        try:
            resolved_args = _resolve_args(step.get("args", {}), state)
        except KeyError as exc:
            yield {
                "event": "step_error",
                "step": skill_name,
                "index": i,
                "error": str(exc),
            }
            # Planner wrote a bad reference — retrying the same plan won't help.
            return

        # (b) Look up skill module ── NON-recoverable if missing
        try:
            skill_module = skill_registry.get_skill_module(skill_name)
        except KeyError as exc:
            yield {
                "event": "step_error",
                "step": skill_name,
                "index": i,
                "error": str(exc),
            }
            # Planner invented an unknown skill — structural bug, don't retry.
            return

        # (c) Announce start
        yield {
            "event": "step_start",
            "step": skill_name,
            "index": i,
            "args_preview": _safe_preview(resolved_args),
        }

        # (d) Execute skill ── RECOVERABLE on exception
        try:
            result = await skill_module.execute(resolved_args, context)
        except Exception as exc:
            error_msg = f"Unexpected error in skill '{skill_name}': {exc}"
            yield {
                "event": "step_error",
                "step": skill_name,
                "index": i,
                "error": error_msg,
            }
            failed_skill = skill_name
            failure_error = error_msg
            recoverable = True
            break

        # (e) Skill signalled failure ── RECOVERABLE
        if not result.success:
            yield {
                "event": "step_error",
                "step": skill_name,
                "index": i,
                "error": result.error,
            }
            failed_skill = skill_name
            failure_error = result.error
            recoverable = True
            break

        # (f) Persist result and log
        state.set(step["output_key"], result.data)
        context.step_log.append(
            {
                "step": skill_name,
                "success": True,
                "output_key": step["output_key"],
                "debug": result.debug,
            }
        )

        # (g) Announce completion
        yield {
            "event": "step_done",
            "step": skill_name,
            "index": i,
            "output_key": step["output_key"],
            "debug": result.debug,
        }

    else:
        # for/else: loop completed without hitting break → all steps succeeded
        final_output_key = steps[-1]["output_key"] if steps else None
        yield {"event": "pipeline_done", "output_key": final_output_key}
        return

    # ── Retry branch ─────────────────────────────────────────────────────────
    # Reached only when a `break` fired above (recoverable failure).
    # Non-recoverable paths already issued `return` before this point.
    if not recoverable or max_retries <= 0:
        return

    reason = f"Previous plan failed at step '{failed_skill}': {failure_error}"
    yield {"event": "replanning", "reason": reason}

    user_request = (
        state.get("user_request") if state.has("user_request") else "(unknown)"
    )
    augmented = (
        f"Previous plan failed at step '{failed_skill}': {failure_error}. "
        f"Original request: {user_request}. "
        f"Please propose an alternative approach."
    )

    # Lazy import — must stay here to avoid a circular import at module load
    # (plan_executor ← planner ← skill_registry, and planner imports nothing
    # from plan_executor, so the cycle only exists if we import at the top).
    from engine.planner.planner import create_plan  # noqa: PLC0415

    new_plan = await create_plan(augmented, state, context)

    async for event in execute_plan(new_plan, state, context, max_retries=0):
        yield event
