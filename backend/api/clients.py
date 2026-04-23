"""Rapport Client router (brief §5.3 / Sprint 4).

Two endpoint groups, all strictly scoped to the calling tenant:

1. Clients
   - `GET /api/clients` — list the prospect's clients.
   - `POST /api/clients/{id}/ask` — ask a free-form question about a client;
     the service aggregates devis, emails, invoices, extractions + the
     configured Drive folders, calls the `answer_client_question` skill
     and returns the answer + resolved sources.

2. Drive folders the prospect wants searched on every question
   - `GET /api/client-report/folders`
   - `POST /api/client-report/folders`   body: {folder_id, folder_name?}
   - `DELETE /api/client-report/folders/{id}`
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.database import get_db
from db.models import AccessToken, Client, ClientReportFolder, OAuthConnection
from services.client_report_service import (
    ask_client_question,
    get_client,
    list_clients,
)

logger = logging.getLogger(__name__)


clients_router = APIRouter(prefix="/clients")
client_report_router = APIRouter(prefix="/client-report")


# ─────────────────────────────────────────────────────────────────────────────
# Clients
# ─────────────────────────────────────────────────────────────────────────────


@clients_router.get("")
async def get_clients(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return await list_clients(db, user.id)


_VALID_CLIENT_TYPES = {
    "particulier", "sci", "copro", "mairie", "promoteur", "autre",
}


def _sanitize_client_payload(body: dict[str, Any]) -> dict[str, Any]:
    """Normalise the fields of a client create/update body."""
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Le nom du client est requis.")
    if len(name) > 255:
        raise HTTPException(400, "Le nom doit faire moins de 255 caractères.")

    client_type = (body.get("type") or "").strip().lower() or None
    if client_type is not None and client_type not in _VALID_CLIENT_TYPES:
        raise HTTPException(
            400,
            "Type invalide. Types acceptés : particulier, sci, copro, mairie, promoteur, autre.",
        )

    def _opt(field: str, max_len: int) -> Any:
        value = body.get(field)
        if value is None:
            return None
        value = str(value).strip()
        if not value:
            return None
        if len(value) > max_len:
            raise HTTPException(
                400, f"Le champ `{field}` dépasse {max_len} caractères."
            )
        return value

    return {
        "name": name,
        "type": client_type,
        "address": _opt("address", 500),
        "email": _opt("email", 255),
        "phone": _opt("phone", 50),
        "notes": _opt("notes", 2000),
    }


@clients_router.post("")
async def create_client(
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    payload = _sanitize_client_payload(body)
    client = Client(user_id=user.id, is_seed=False, **payload)
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client.to_dict()


@clients_router.put("/{client_id}")
async def update_client(
    client_id: str,
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    client = await get_client(db, user.id, client_id)
    if client is None:
        raise HTTPException(404, "Client introuvable.")

    payload = _sanitize_client_payload(body)
    for field, value in payload.items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return client.to_dict()


@clients_router.delete("/{client_id}")
async def delete_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, bool]:
    """Delete a client. Their devis keep their history rows but detach
    (FK ON DELETE SET NULL on Quote.client_id + Email.related_client_id)
    — the prospect can still see the devis and emails, just without the
    client link.
    """
    client = await get_client(db, user.id, client_id)
    if client is None:
        raise HTTPException(404, "Client introuvable.")
    await db.delete(client)
    await db.commit()
    return {"success": True}


@clients_router.post("/{client_id}/ask")
async def ask_about_client(
    client_id: str,
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    question = (body.get("question") or "").strip()
    if not question:
        raise HTTPException(400, "La question est requise.")
    if len(question) > 500:
        raise HTTPException(400, "La question doit faire moins de 500 caractères.")

    client = await get_client(db, user.id, client_id)
    if client is None:
        raise HTTPException(404, "Client introuvable.")

    try:
        result = await ask_client_question(
            db=db,
            user_id=user.id,
            client=client,
            question=question,
        )
    except Exception as exc:
        logger.exception(
            "ask_client_question failed for user=%s client=%s: %s",
            user.id,
            client_id,
            exc,
        )
        raise HTTPException(500, f"L'analyse n'a pas abouti : {exc}") from exc

    return {
        "client": client.to_dict(),
        "question": question,
        **result,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Client report folders
# ─────────────────────────────────────────────────────────────────────────────


@client_report_router.get("/folders")
async def list_folders(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """List the Drive folders the prospect has whitelisted for client search.

    Also reports whether a Drive connection exists, so the UI can tell the
    prospect to connect first instead of silently finding nothing.
    """
    folders = (
        await db.execute(
            select(ClientReportFolder)
            .where(ClientReportFolder.user_id == user.id)
            .order_by(ClientReportFolder.created_at.asc())
        )
    ).scalars().all()

    connection = (
        await db.execute(
            select(OAuthConnection).where(
                OAuthConnection.user_id == user.id,
                OAuthConnection.provider == "google_drive",
            )
        )
    ).scalar_one_or_none()

    return {
        "drive_connected": connection is not None,
        "folders": [f.to_dict() for f in folders],
    }


@client_report_router.post("/folders")
async def add_folder(
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    folder_id = (body.get("folder_id") or "").strip()
    folder_name = (body.get("folder_name") or "").strip() or None
    if not folder_id:
        raise HTTPException(400, "`folder_id` est requis.")
    if len(folder_id) > 255:
        raise HTTPException(400, "`folder_id` trop long.")

    connection = (
        await db.execute(
            select(OAuthConnection).where(
                OAuthConnection.user_id == user.id,
                OAuthConnection.provider == "google_drive",
            )
        )
    ).scalar_one_or_none()
    if connection is None:
        raise HTTPException(
            400,
            "Connectez d'abord votre Google Drive avant d'ajouter un dossier à fouiller.",
        )

    # Soft dedup: same folder_id twice is a no-op update.
    existing = (
        await db.execute(
            select(ClientReportFolder).where(
                ClientReportFolder.user_id == user.id,
                ClientReportFolder.folder_id == folder_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        if folder_name:
            existing.folder_name = folder_name
        existing.is_enabled = True
        await db.commit()
        await db.refresh(existing)
        return existing.to_dict()

    folder = ClientReportFolder(
        user_id=user.id,
        provider="google_drive",
        folder_id=folder_id,
        folder_name=folder_name,
        is_enabled=True,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder.to_dict()


@client_report_router.delete("/folders/{folder_row_id}")
async def remove_folder(
    folder_row_id: str,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, bool]:
    result = await db.execute(
        delete(ClientReportFolder).where(
            ClientReportFolder.user_id == user.id,
            ClientReportFolder.id == folder_row_id,
        )
    )
    await db.commit()
    if (result.rowcount or 0) == 0:
        raise HTTPException(404, "Dossier introuvable.")
    return {"success": True}
