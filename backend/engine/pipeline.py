"""
Pipeline engine — the core execution loop.

Runs a list of skill modules sequentially, chaining output → input.
Yields Server-Sent Events dicts at each step so the API can stream progress.

Event types:
  step_start   {"event": "step_start",   "step": <id>, "index": <n>}
  step_done    {"event": "step_done",    "step": <id>, "debug": {...}}
  step_error   {"event": "step_error",   "step": <id>, "error": "..."}
  pipeline_done{"event": "pipeline_done","output": <final_data>}
"""
from __future__ import annotations

from typing import Any, AsyncIterator

from engine.context import PipelineContext
from skills.base import SkillResult


async def run_pipeline(
    pipeline: list,
    initial_input: Any,
    context: PipelineContext,
) -> AsyncIterator[dict]:
    data = initial_input

    for i, skill_module in enumerate(pipeline):
        step_id = skill_module.SKILL_ID

        yield {"event": "step_start", "step": step_id, "index": i}

        try:
            result: SkillResult = await skill_module.execute(data, context)
        except Exception as e:
            error_msg = f"Unexpected error in skill '{step_id}': {e}"
            context.step_log.append({"step": step_id, "success": False, "error": error_msg})
            yield {"event": "step_error", "step": step_id, "error": error_msg}
            return  # abort pipeline — do not continue with bad state

        context.step_log.append(
            {
                "step": step_id,
                "success": result.success,
                "debug": result.debug,
                "error": result.error,
            }
        )

        if not result.success:
            yield {"event": "step_error", "step": step_id, "error": result.error}
            return  # abort — never pass None/bad data to the next skill

        yield {"event": "step_done", "step": step_id, "debug": result.debug}
        data = result.data  # chain: this step's output becomes the next step's input

    yield {"event": "pipeline_done", "output": data}
