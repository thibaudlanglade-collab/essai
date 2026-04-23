"""Voice transcription router (Sprint 3 B4).

Wraps OpenAI Whisper behind an authenticated endpoint. Reused by :
  - B4 : dictée vocale d'un besoin pour générer un devis
  - Plus tard : dictée de note chantier (roadmap Sprint 6)

Endpoint :
  POST /api/transcribe   (multipart/form-data avec le champ `audio`)
"""
from __future__ import annotations

import io
import logging
import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

import config
from auth.dependencies import get_current_user
from db.models import AccessToken

logger = logging.getLogger(__name__)

transcribe_router = APIRouter(prefix="/transcribe")


_MAX_AUDIO_BYTES = 25 * 1024 * 1024  # Whisper limit : 25 MB
_ALLOWED_SUFFIXES = {
    ".wav", ".mp3", ".m4a", ".mp4", ".webm", ".ogg", ".flac", ".mpga", ".mpeg",
}


@transcribe_router.post("")
async def transcribe(
    audio: UploadFile = File(..., description="Fichier audio à transcrire (wav/mp3/m4a/webm/ogg)."),
    user: AccessToken = Depends(get_current_user),
) -> dict:
    """Transcribe the uploaded audio to text via OpenAI Whisper."""
    if not config.OPENAI_API_KEY:
        raise HTTPException(503, "Service de transcription indisponible (OPENAI_API_KEY manquante).")

    filename = audio.filename or "recording.webm"
    suffix = os.path.splitext(filename)[1].lower() or ".webm"
    if suffix not in _ALLOWED_SUFFIXES:
        raise HTTPException(
            400, f"Format audio non supporté ({suffix}). Utilisez wav, mp3, m4a, webm ou ogg."
        )

    content = await audio.read()
    if not content:
        raise HTTPException(400, "Fichier audio vide.")
    if len(content) > _MAX_AUDIO_BYTES:
        raise HTTPException(
            413, f"Fichier audio trop lourd ({len(content)} octets, maximum {_MAX_AUDIO_BYTES}).",
        )

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        buf = io.BytesIO(content)
        # Whisper expects an object with a `name` attribute for format detection.
        buf.name = filename
        result = await client.audio.transcriptions.create(
            model="whisper-1",
            file=buf,
            language="fr",
            response_format="json",
            temperature=0,
        )
    except Exception as exc:  # noqa: BLE001 — surface to caller
        logger.exception("Whisper transcription failed for user=%s: %s", user.id, exc)
        raise HTTPException(502, f"Transcription impossible : {exc}") from exc

    text = getattr(result, "text", None) or (
        result.get("text") if isinstance(result, dict) else None
    ) or ""

    return {"text": text.strip(), "bytes": len(content)}
