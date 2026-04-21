"""
POST /api/execute/{feature_id}

Accepts a multipart/form-data upload with a single `file` field.
Streams Server-Sent Events (SSE) back to the client:
  - step_start / step_done / step_error events as the pipeline runs
  - pipeline_done event with base64-encoded output (for file downloads) or plain text

The frontend connects via EventSource or fetch+ReadableStream and updates
the progress UI in real-time.
"""
from __future__ import annotations

import base64
import json
from typing import AsyncIterator

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from engine.context import PipelineContext
from engine.pipeline import run_pipeline
from features import registry

router = APIRouter()


async def _sse_stream(feature: dict, file_bytes: bytes, filename: str, content_type: str) -> AsyncIterator[str]:
    context = PipelineContext(
        feature_id=feature["id"],
        metadata={"filename": filename, "content_type": content_type},
    )

    async for event in run_pipeline(feature["pipeline"], file_bytes, context):
        # Serialise bytes output as base64 for file downloads
        if event.get("event") == "pipeline_done" and isinstance(event.get("output"), bytes):
            event = {**event, "output": base64.b64encode(event["output"]).decode()}

        yield f"data: {json.dumps(event)}\n\n"

    # Signal end of stream to the client
    yield "data: [DONE]\n\n"


@router.post("/execute/{feature_id}")
async def execute_feature(feature_id: str, file: UploadFile = File(...)):
    feature = registry.get(feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail=f"Feature '{feature_id}' not found.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    return StreamingResponse(
        _sse_stream(feature, file_bytes, file.filename or "upload", file.content_type or "application/octet-stream"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering for SSE
        },
    )
