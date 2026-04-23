"""
Agent Rapport client — wizard endpoints.

Two routes mirror the 2 wizard stages on the frontend:

  POST /api/agent-rapport/ingest   (sync JSON)
      Body: { source_type, text?, csv?, pdf_chunks?, client_hint? }
      → runs `ingest_data` skill
      → returns { client_name, summary, entities, raw_text } so the user
        can review before describing their intent.

  POST /api/agent-rapport/compose  (SSE)
      Body: { client_name, summary, entities, raw_text, intent_text }
      → runs `interpret_intent` then `compose_report`
      → streams step_start / step_done / step_error events, ends with
        pipeline_done carrying the final flexible report payload.

Auth: both routes require a valid prospect session. The user_id is
threaded into the pipeline context so future skills can reach the DB if
needed (current skills are stateless — no DB hit).
"""
from __future__ import annotations

import json
from typing import Any, AsyncIterator

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from auth.dependencies import get_current_user
from db.models import AccessToken
from engine.context import PipelineContext
from skills.agent_rapport import compose_report, ingest_data, interpret_intent

router = APIRouter()

_FEATURE_ID = "agent_rapport_client"


def _format_sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False, default=str)}\n\n"


# ── PDF extraction (server-side, pypdf is already a backend dep) ─────────────


@router.post("/agent-rapport/extract-pdf")
async def extract_pdf(
    files: list[UploadFile] = File(...),
    user: AccessToken = Depends(get_current_user),  # noqa: ARG001 — auth gate only
):
    """Extract text from one or more uploaded PDFs.

    Used by the wizard's "Uploader des PDFs" tab so the browser doesn't have
    to bundle pdfjs-dist. Returns one entry per file with the extracted text
    (empty string if the PDF is image-only / scanned).
    """
    chunks: list[dict] = []
    for f in files:
        raw = await f.read()
        if not raw:
            chunks.append({"name": f.filename or "(sans nom)", "text": "", "error": "Fichier vide."})
            continue
        try:
            import io

            import pypdf

            reader = pypdf.PdfReader(io.BytesIO(raw))
            pages = [(p.extract_text() or "").strip() for p in reader.pages]
            text = "\n\n".join(p for p in pages if p)
            chunks.append({"name": f.filename or "(sans nom)", "text": text})
        except Exception as e:
            chunks.append({"name": f.filename or "(sans nom)", "text": "", "error": str(e)})
    return {"chunks": chunks}


# ── Stage 1 ──────────────────────────────────────────────────────────────────


@router.post("/agent-rapport/ingest")
async def ingest(
    payload: dict = Body(...),
    user: AccessToken = Depends(get_current_user),
):
    """Synchronously ingest the user-provided source(s) into a ClientContext."""
    source_type = payload.get("source_type")
    if source_type not in ("text", "csv", "pdf"):
        raise HTTPException(status_code=400, detail="source_type doit être 'text', 'csv' ou 'pdf'.")

    context = PipelineContext(feature_id=_FEATURE_ID, metadata={"user_id": user.id})
    result = await ingest_data.execute(payload, context)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error or "Échec de l'ingestion.")

    return {"event": "ingest_done", **result.data, "debug": result.debug}


# ── Stage 2 ──────────────────────────────────────────────────────────────────


async def _compose_stream(payload: dict, user_id: str) -> AsyncIterator[str]:
    """Run the 2-step compose pipeline and stream SSE events."""
    pipeline = [interpret_intent, compose_report]
    context = PipelineContext(feature_id=_FEATURE_ID, metadata={"user_id": user_id})

    data: Any = payload
    for i, skill in enumerate(pipeline):
        step_id = skill.SKILL_ID
        yield _format_sse({"event": "step_start", "step": step_id, "index": i})

        try:
            result = await skill.execute(data, context)
        except Exception as e:
            yield _format_sse({"event": "step_error", "step": step_id, "error": f"Erreur inattendue : {e}"})
            yield "data: [DONE]\n\n"
            return

        context.step_log.append({
            "step": step_id,
            "success": result.success,
            "debug": result.debug,
            "error": result.error,
        })

        if not result.success:
            yield _format_sse({"event": "step_error", "step": step_id, "error": result.error})
            yield "data: [DONE]\n\n"
            return

        yield _format_sse({"event": "step_done", "step": step_id, "debug": result.debug})
        data = result.data

    yield _format_sse({"event": "pipeline_done", "output": data})
    yield "data: [DONE]\n\n"


@router.post("/agent-rapport/compose")
async def compose(
    payload: dict = Body(...),
    user: AccessToken = Depends(get_current_user),
):
    """Stream the interpret_intent → compose_report pipeline."""
    intent_text = (payload.get("intent_text") or "").strip()
    if not intent_text:
        raise HTTPException(status_code=400, detail="intent_text est requis.")
    if not payload.get("client_name"):
        raise HTTPException(status_code=400, detail="client_name manquant — relancez l'ingestion.")

    return StreamingResponse(
        _compose_stream(payload, user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
