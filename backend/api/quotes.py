"""Devis router (Sprint 3 B2).

Endpoints (tous strictement scopés par `user_id`) :
  GET    /api/quotes                 → liste les devis
  GET    /api/quotes/{id}            → détail
  POST   /api/quotes/generate        → génère des lignes via le skill (ne sauve pas)
  POST   /api/quotes                 → crée et sauve un devis
  PUT    /api/quotes/{id}            → met à jour un devis
  DELETE /api/quotes/{id}            → supprime
  GET    /api/quotes/{id}/pdf        → exporte en PDF
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import base64

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.database import get_db
from db.models import AccessToken, Client, Quote, TarifGrid
from services.quote_service import (
    compute_totals,
    next_quote_number,
    render_quote_pdf,
    sanitize_lines,
)
from skills.core import describe_site_photo as describe_site_photo_skill
from skills.core import generate_quote as generate_quote_skill

logger = logging.getLogger(__name__)


quotes_router = APIRouter(prefix="/quotes")


_VALID_STATUSES = {"draft", "sent", "accepted", "refused"}
_VALID_SOURCES = {"manual", "text", "email", "voice", "photo"}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


async def _get_owned_quote(db: AsyncSession, user_id: str, quote_id: str) -> Optional[Quote]:
    res = await db.execute(
        select(Quote).where(
            Quote.id == quote_id,
            Quote.user_id == user_id,
        )
    )
    return res.scalar_one_or_none()


async def _load_client_if_owned(
    db: AsyncSession, user_id: str, client_id: Optional[str]
) -> Optional[Client]:
    if not client_id:
        return None
    res = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.user_id == user_id,
        )
    )
    return res.scalar_one_or_none()


async def _load_tarif_grid(db: AsyncSession, user_id: str) -> list[dict[str, Any]]:
    res = await db.execute(
        select(TarifGrid)
        .where(TarifGrid.user_id == user_id)
        .order_by(TarifGrid.category.asc().nulls_last(), TarifGrid.label.asc())
    )
    return [t.to_dict() for t in res.scalars().all()]


def _sanitize_write_payload(body: dict[str, Any]) -> dict[str, Any]:
    """Sanitise the fields accepted on create and update.

    `lines` is sanitised via `sanitize_lines`; totals are recomputed from
    the lines and VAT rate, so the client cannot spoof them.
    """
    title = (body.get("title") or "").strip()
    if title and len(title) > 255:
        raise HTTPException(400, "Le titre doit faire moins de 255 caractères.")

    description = (body.get("description") or "").strip() or None

    try:
        vat_rate = float(body.get("vat_rate") if body.get("vat_rate") is not None else 0.10)
    except (TypeError, ValueError):
        raise HTTPException(400, "Le taux de TVA doit être un nombre entre 0 et 1.")
    if not 0 <= vat_rate <= 1:
        raise HTTPException(400, "Le taux de TVA doit être compris entre 0 et 1.")

    status = (body.get("status") or "draft").strip().lower()
    if status not in _VALID_STATUSES:
        raise HTTPException(
            400, f"Statut invalide. Statuts acceptés : {', '.join(sorted(_VALID_STATUSES))}."
        )

    created_from = body.get("created_from")
    if created_from is not None:
        created_from = str(created_from).strip().lower()
        if created_from not in _VALID_SOURCES:
            raise HTTPException(
                400, f"Source invalide. Sources acceptées : {', '.join(sorted(_VALID_SOURCES))}."
            )

    lines = sanitize_lines(body.get("lines"))
    amount_ht, amount_ttc = compute_totals(lines, vat_rate)

    client_id = body.get("client_id")
    if client_id is not None:
        client_id = str(client_id).strip() or None

    source_text = body.get("source_text")
    if source_text is not None:
        source_text = str(source_text).strip() or None

    return {
        "title": title or None,
        "description": description,
        "status": status,
        "vat_rate": vat_rate,
        "lines": lines,
        "amount_ht": amount_ht,
        "amount_ttc": amount_ttc,
        "client_id": client_id,
        "source_text": source_text,
        "created_from": created_from,
    }


# ─────────────────────────────────────────────────────────────────────────────
# List + detail
# ─────────────────────────────────────────────────────────────────────────────


@quotes_router.get("")
async def list_quotes(
    status: Optional[str] = Query(None, description="Filtre par statut (draft|sent|accepted|refused)"),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> list[dict[str, Any]]:
    stmt = select(Quote).where(Quote.user_id == user.id)
    if status:
        status = status.strip().lower()
        if status not in _VALID_STATUSES:
            raise HTTPException(400, "Statut invalide.")
        stmt = stmt.where(Quote.status == status)
    stmt = stmt.order_by(Quote.created_at.desc())

    res = await db.execute(stmt)
    return [q.to_dict() for q in res.scalars().all()]


@quotes_router.get("/{quote_id}")
async def get_quote(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    quote = await _get_owned_quote(db, user.id, quote_id)
    if quote is None:
        raise HTTPException(404, "Devis introuvable.")
    return quote.to_dict()


# ─────────────────────────────────────────────────────────────────────────────
# Generate (pure — does not persist)
# ─────────────────────────────────────────────────────────────────────────────


@quotes_router.post("/generate")
async def generate_quote(
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    source_text = (body.get("source_text") or "").strip()
    if not source_text:
        raise HTTPException(400, "La description du besoin est requise.")
    if len(source_text) > 5000:
        raise HTTPException(400, "La description doit faire moins de 5 000 caractères.")

    client = await _load_client_if_owned(db, user.id, body.get("client_id"))
    grid = await _load_tarif_grid(db, user.id)

    client_context: dict[str, Any] = {}
    if client is not None:
        client_context = {
            "name": client.name,
            "type": client.type,
            "notes": client.notes,
        }

    suggested_vat_raw = body.get("suggested_vat_rate")
    if suggested_vat_raw is None:
        suggested_vat = 0.10
    else:
        try:
            suggested_vat = float(suggested_vat_raw)
        except (TypeError, ValueError):
            raise HTTPException(400, "Le taux de TVA suggéré doit être un nombre.")
        if not 0 <= suggested_vat <= 1:
            raise HTTPException(400, "Le taux de TVA suggéré doit être entre 0 et 1.")

    result = await generate_quote_skill.execute(
        {
            "source_text": source_text,
            "tarif_grid": grid,
            "client_context": client_context or None,
            "suggested_vat_rate": suggested_vat,
        },
        context=None,
    )

    if not result.success or not result.data:
        raise HTTPException(502, f"Génération impossible : {result.error or 'erreur inconnue'}")

    data = result.data
    return {
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "assumptions": data.get("assumptions", ""),
        "vat_rate": data.get("vat_rate", suggested_vat),
        "lines": data.get("lines", []),
        "amount_ht": data.get("amount_ht", 0),
        "amount_ttc": data.get("amount_ttc", 0),
        "client_id": client.id if client else None,
        "source_text": source_text,
        "created_from": body.get("created_from") or "text",
    }


@quotes_router.post("/generate-lines")
async def generate_quote_lines(
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Generate ONLY additional lines to append to an existing draft.

    Used by the editor's "Ajouter depuis un texte" surface: the artisan
    describes extra postes in prose, we return the matching lines without
    touching the rest of the devis.
    """
    source_text = (body.get("source_text") or "").strip()
    if not source_text:
        raise HTTPException(400, "La description des prestations à ajouter est requise.")
    if len(source_text) > 3000:
        raise HTTPException(400, "La description doit faire moins de 3 000 caractères.")

    existing_lines_raw = body.get("existing_lines") or []
    if not isinstance(existing_lines_raw, list):
        existing_lines_raw = []

    grid = await _load_tarif_grid(db, user.id)
    client = await _load_client_if_owned(db, user.id, body.get("client_id"))

    client_context: dict[str, Any] = {}
    if client is not None:
        client_context = {"name": client.name, "type": client.type, "notes": client.notes}

    result = await generate_quote_skill.execute(
        {
            "source_text": source_text,
            "tarif_grid": grid,
            "client_context": client_context or None,
            "existing_lines": existing_lines_raw,
            "mode": "append",
        },
        context=None,
    )
    if not result.success or not result.data:
        raise HTTPException(502, f"Génération impossible : {result.error or 'erreur inconnue'}")

    return {"lines": result.data.get("lines", [])}


# ─────────────────────────────────────────────────────────────────────────────
# Photo de chantier → description + postes suggérés (B5)
# ─────────────────────────────────────────────────────────────────────────────


_MAX_PHOTO_BYTES = 8 * 1024 * 1024  # 8 MB, suffisant pour une photo iPhone compressée
_ALLOWED_PHOTO_MIMES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"}


@quotes_router.post("/describe-photo")
async def describe_photo(
    photo: UploadFile = File(..., description="Photo de chantier (jpg/png/webp)."),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    content = await photo.read()
    if not content:
        raise HTTPException(400, "Photo vide.")
    if len(content) > _MAX_PHOTO_BYTES:
        raise HTTPException(413, f"Photo trop lourde (max {_MAX_PHOTO_BYTES // (1024*1024)} Mo).")

    mime = (photo.content_type or "").lower()
    if mime not in _ALLOWED_PHOTO_MIMES:
        raise HTTPException(400, "Format non supporté. Utilisez JPEG, PNG ou WEBP.")

    # HEIC ne passe pas chez OpenAI : on le refuse tôt.
    if mime == "image/heic":
        raise HTTPException(400, "Le format HEIC n'est pas supporté. Exportez en JPEG avant l'envoi.")

    data_url = f"data:{mime};base64,{base64.b64encode(content).decode('ascii')}"
    grid = await _load_tarif_grid(db, user.id)

    result = await describe_site_photo_skill.execute(
        {"image_data_url": data_url, "tarif_grid": grid},
        context=None,
    )
    if not result.success or not result.data:
        raise HTTPException(502, f"Analyse de la photo impossible : {result.error or 'erreur inconnue'}")

    # On renvoie aussi la grille du prospect pour que le calculateur du frontend
    # puisse afficher TOUS les postes, pas seulement ceux suggérés.
    return {
        **result.data,
        "tarif_grid": grid,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Create / update / delete
# ─────────────────────────────────────────────────────────────────────────────


@quotes_router.post("")
async def create_quote(
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    payload = _sanitize_write_payload(body)

    if payload["client_id"]:
        owned = await _load_client_if_owned(db, user.id, payload["client_id"])
        if owned is None:
            raise HTTPException(400, "Client inconnu ou non accessible.")

    quote_number = (body.get("quote_number") or "").strip()
    if not quote_number:
        quote_number = await next_quote_number(db, user.id)

    quote = Quote(
        user_id=user.id,
        is_seed=False,
        quote_number=quote_number,
        **payload,
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return quote.to_dict()


@quotes_router.put("/{quote_id}")
async def update_quote(
    quote_id: str,
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    quote = await _get_owned_quote(db, user.id, quote_id)
    if quote is None:
        raise HTTPException(404, "Devis introuvable.")

    payload = _sanitize_write_payload(body)

    if payload["client_id"]:
        owned = await _load_client_if_owned(db, user.id, payload["client_id"])
        if owned is None:
            raise HTTPException(400, "Client inconnu ou non accessible.")

    for field, value in payload.items():
        setattr(quote, field, value)
    await db.commit()
    await db.refresh(quote)
    return quote.to_dict()


@quotes_router.delete("/{quote_id}")
async def delete_quote(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, bool]:
    quote = await _get_owned_quote(db, user.id, quote_id)
    if quote is None:
        raise HTTPException(404, "Devis introuvable.")
    await db.delete(quote)
    await db.commit()
    return {"success": True}


# ─────────────────────────────────────────────────────────────────────────────
# PDF export
# ─────────────────────────────────────────────────────────────────────────────


@quotes_router.get("/{quote_id}/pdf")
async def export_quote_pdf(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> Response:
    quote = await _get_owned_quote(db, user.id, quote_id)
    if quote is None:
        raise HTTPException(404, "Devis introuvable.")

    client = await _load_client_if_owned(db, user.id, quote.client_id)
    try:
        pdf_bytes = render_quote_pdf(quote, issuer=user, client=client)
    except Exception as exc:  # noqa: BLE001 — surface to caller
        logger.exception("render_quote_pdf failed for quote=%s", quote_id)
        raise HTTPException(500, f"Génération PDF impossible : {exc}") from exc

    filename = f"{(quote.quote_number or 'devis').replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
