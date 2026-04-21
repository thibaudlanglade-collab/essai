# backend/api/execute_team_planner.py
"""
POST /api/execute_team_planner

Accepts multipart/form-data:
  - user_request: str   (optional — used as constraints text)
  - tasks_file: UploadFile  (required — production plan / task list)
  - employees_file: UploadFile  (optional — team / employee list)
  - employee_ids: str   (optional — comma-separated DB employee IDs)
  - week_start: str     (optional — "YYYY-MM-DD", defaults to next Monday)

Either employees_file OR employee_ids must be provided.

When employee_ids is used, employees are fetched from the DB and a
2-step plan (parse_production_plan → generate_team_schedule) is
executed directly, bypassing parse_employee_list.
"""
from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from engine.context import PipelineContext
from engine.planner.state import PlannerState

execute_team_planner_router = APIRouter()

_DEFAULT_REQUEST = (
    "Génère un planning de la semaine en assignant les tâches aux employés "
    "en respectant leurs disponibilités et compétences."
)


# ── SSE helpers ───────────────────────────────────────────────────────────────

def _format_sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


def _build_final_result_event(final_output: Any) -> dict:
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


# ── Event stream — file upload mode (original behaviour) ─────────────────────

async def _event_stream(
    user_request: str,
    tasks_bytes: bytes,
    tasks_meta: dict,
    employees_bytes: bytes,
    employees_meta: dict,
    week_start: Optional[str],
    context: PipelineContext,
):
    try:
        from engine.planner.planner import create_plan
        from engine.planner.plan_executor import execute_plan

        state = PlannerState()
        state.set("user_request", user_request)
        state.set("tasks_file", tasks_bytes)
        state.set("tasks_file_meta", tasks_meta)
        state.set("employees_file", employees_bytes)
        state.set("employees_file_meta", employees_meta)
        if week_start:
            state.set("week_start", week_start)

        plan = await create_plan(user_request, state, context)
        yield _format_sse({"event": "plan_created", "plan": plan})

        final_output = None
        async for event in execute_plan(plan, state, context, max_retries=1):
            yield _format_sse(event)
            if event.get("event") == "pipeline_done":
                output_key = event.get("output_key")
                if output_key and state.has(output_key):
                    final_output = state.get(output_key)

        yield _format_sse(_build_final_result_event(final_output))

    except Exception as exc:
        yield _format_sse({"event": "fatal_error", "error": str(exc)})

    yield "data: [DONE]\n\n"


# ── Event stream — DB employees mode ─────────────────────────────────────────

async def _event_stream_db_employees(
    user_request: str,
    tasks_bytes: bytes,
    tasks_meta: dict,
    employees_list: list[dict],
    week_start: Optional[str],
    context: PipelineContext,
):
    """
    2-step plan: parse_production_plan → generate_team_schedule.
    Employees are pre-loaded from the DB and injected into state.
    """
    try:
        from engine.planner.plan_executor import execute_plan

        state = PlannerState()
        state.set("user_request", user_request)
        state.set("tasks_file", tasks_bytes)
        state.set("tasks_file_meta", tasks_meta)
        state.set("employees", employees_list)
        if week_start:
            state.set("week_start", week_start)

        # Build generate_team_schedule args conditionally
        gen_args: dict[str, str] = {
            "tasks_ref": "$state.tasks",
            "employees_ref": "$state.employees",
            "constraints_text": "$state.user_request",
        }
        if week_start:
            gen_args["week_start"] = "$state.week_start"

        plan: dict = {
            "reasoning": (
                "Les employés sont chargés depuis la base de données. "
                "Seule l'analyse du plan de production est nécessaire "
                "avant la génération du planning."
            ),
            "steps": [
                {
                    "skill": "parse_production_plan",
                    "args": {
                        "file_ref": "$state.tasks_file",
                        "file_type": "auto",
                    },
                    "output_key": "tasks",
                },
                {
                    "skill": "generate_team_schedule",
                    "args": gen_args,
                    "output_key": "schedule",
                },
            ],
        }

        yield _format_sse({"event": "plan_created", "plan": plan})

        final_output = None
        async for event in execute_plan(plan, state, context, max_retries=1):
            yield _format_sse(event)
            if event.get("event") == "pipeline_done":
                output_key = event.get("output_key")
                if output_key and state.has(output_key):
                    final_output = state.get(output_key)

        yield _format_sse(_build_final_result_event(final_output))

    except Exception as exc:
        yield _format_sse({"event": "fatal_error", "error": str(exc)})

    yield "data: [DONE]\n\n"


# ── Route ─────────────────────────────────────────────────────────────────────

@execute_team_planner_router.post("/execute_team_planner")
async def execute_team_planner(
    user_request: str = Form(default=""),
    tasks_file: UploadFile = File(...),
    employees_file: Optional[UploadFile] = File(default=None),
    employee_ids: Optional[str] = Form(default=None),
    week_start: Optional[str] = Form(default=None),
):
    tasks_bytes = await tasks_file.read()
    tasks_meta = {
        "filename": tasks_file.filename,
        "content_type": tasks_file.content_type,
        "size": len(tasks_bytes),
    }
    effective_request = user_request.strip() or _DEFAULT_REQUEST

    # ── Mode 1: file upload ───────────────────────────────────────────────────
    if employees_file is not None:
        employees_bytes = await employees_file.read()
        employees_meta = {
            "filename": employees_file.filename,
            "content_type": employees_file.content_type,
            "size": len(employees_bytes),
        }
        context = PipelineContext(
            feature_id="team_planner",
            metadata={"tasks_file": tasks_meta, "employees_file": employees_meta},
        )
        return StreamingResponse(
            _event_stream(
                effective_request,
                tasks_bytes,
                tasks_meta,
                employees_bytes,
                employees_meta,
                week_start,
                context,
            ),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # ── Mode 2: DB employees ──────────────────────────────────────────────────
    if employee_ids is not None and employee_ids.strip():
        from db.database import async_session_maker
        from db.models import Employee as EmployeeModel
        from sqlalchemy import select

        try:
            ids = [int(x.strip()) for x in employee_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="employee_ids doit être une liste d'entiers séparés par des virgules.",
            )

        async with async_session_maker() as session:
            result = await session.execute(
                select(EmployeeModel).where(EmployeeModel.id.in_(ids))
            )
            db_employees = result.scalars().all()

        # Convert to list of dicts with string IDs for LLM compatibility
        employees_list: list[dict] = []
        for emp in db_employees:
            d = emp.to_dict()
            d["id"] = str(d["id"])  # string ID so LLM matches employee_id in assignments
            employees_list.append(d)

        context = PipelineContext(
            feature_id="team_planner",
            metadata={"tasks_file": tasks_meta, "employee_ids": ids},
        )
        return StreamingResponse(
            _event_stream_db_employees(
                effective_request,
                tasks_bytes,
                tasks_meta,
                employees_list,
                week_start,
                context,
            ),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # ── Neither provided ──────────────────────────────────────────────────────
    raise HTTPException(
        status_code=400,
        detail="employees_file ou employee_ids doit être fourni.",
    )
