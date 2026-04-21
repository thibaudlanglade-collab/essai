# backend/api/execute_planner.py
"""
POST /api/execute_planner

Accepts multipart/form-data:
  - user_request: str  (required)
  - file: UploadFile   (optional)

Streams SSE events using the planner system instead of predefined pipelines.
Event format matches backend/api/execute.py exactly.
"""
from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from engine.context import PipelineContext
from engine.planner.state import PlannerState

router = APIRouter()


# ── SSE helpers ───────────────────────────────────────────────────────────────

def _format_sse(data: dict) -> str:
    """Format a dict as a single SSE message."""
    return f"data: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


def _build_final_result_event(final_output: Any) -> dict:
    """
    Build a 'final_result' event from the final pipeline output.

    - bytes  → base64-encode, content_type=application/octet-stream
    - dict/list/str/int/float/bool → include as JSON
    - None   → {"result": None}
    - other  → repr (truncated)
    """
    if final_output is None:
        return {"event": "final_result", "result": None}

    if isinstance(final_output, bytes):
        import base64
        return {
            "event": "final_result",
            "result_type": "binary",
            "content_type": "application/octet-stream",
            "result_b64": base64.b64encode(final_output).decode("ascii"),
            "size": len(final_output),
        }

    if isinstance(final_output, (dict, list, str, int, float, bool)):
        return {
            "event": "final_result",
            "result_type": "json",
            "result": final_output,
        }

    return {
        "event": "final_result",
        "result_type": "unknown",
        "result_repr": repr(final_output)[:500],
    }


# ── Event stream ──────────────────────────────────────────────────────────────

async def _event_stream(user_request: str, file_bytes: Optional[bytes], context: PipelineContext):
    try:
        # Lazy imports to avoid potential circular issues at module load time
        from engine.planner.planner import create_plan
        from engine.planner.plan_executor import execute_plan

        state = PlannerState()
        state.set("user_request", user_request)
        if file_bytes:
            state.set("uploaded_file", file_bytes)
            state.set("uploaded_file_meta", context.metadata)

        # 1. Create the plan
        plan = await create_plan(user_request, state, context)

        # 2. Emit the plan so the frontend can show it immediately
        yield _format_sse({"event": "plan_created", "plan": plan})

        # 3. Execute the plan, forwarding every event
        final_output = None
        async for event in execute_plan(plan, state, context, max_retries=1):
            yield _format_sse(event)

            if event.get("event") == "pipeline_done":
                output_key = event.get("output_key")
                if output_key and state.has(output_key):
                    final_output = state.get(output_key)

        # 4. Emit the resolved final result
        yield _format_sse(_build_final_result_event(final_output))

    except Exception as exc:
        yield _format_sse({"event": "fatal_error", "error": str(exc)})

    # Signal end of stream — matches execute.py convention
    yield "data: [DONE]\n\n"


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/execute_planner")
async def execute_planner(
    user_request: str = Form(...),
    file: Optional[UploadFile] = File(default=None),
):
    file_bytes: Optional[bytes] = None
    metadata: dict = {}

    if file is not None:
        file_bytes = await file.read()
        metadata = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(file_bytes),
        }

    context = PipelineContext(
        feature_id="planner",
        metadata=metadata,
    )

    return StreamingResponse(
        _event_stream(user_request, file_bytes, context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
