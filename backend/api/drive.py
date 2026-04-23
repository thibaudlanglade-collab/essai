"""Google Drive OAuth + watched-folder router (brief §6.2).

Two groups of endpoints:

1. OAuth:
   - `GET /api/drive/connect` — produces an authorization URL the frontend
     opens in a popup. The state token is bound to the caller's user_id
     so the callback cannot land an OAuth on the wrong tenant.
   - `GET /api/drive/callback` — completes the exchange, encrypts tokens
     via Fernet, upserts `OAuthConnection(provider="google_drive")`.
   - `GET /api/drive/status` — connection state for the calling tenant.
   - `POST /api/drive/disconnect` — removes the connection and stops the
     associated watched folders.

2. Watched folder:
   - `POST /api/drive/watched-folder/setup` — register a Drive folder to
     poll every 5 min (brief §6.2 volet 2). One active folder per tenant
     for Sprint 3 — upgradable later.
   - `GET /api/drive/watched-folder` — current watched folder status.
   - `POST /api/drive/watched-folder/disconnect` — stop polling that folder.

All endpoints are strictly user-scoped.
"""
from __future__ import annotations

import json
import logging
import secrets
import time
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.database import get_db
from db.models import AccessToken, OAuthConnection, WatchedFolder
from services.crypto import CryptoConfigError, decrypt_token, encrypt_token
from services.drive_service import (
    DriveServiceError,
    build_oauth_flow,
    exchange_code_for_tokens,
    list_folders,
)

logger = logging.getLogger(__name__)


drive_router = APIRouter(prefix="/drive")


# In-memory OAuth states: same shape as `gmail_auth._oauth_states`, bound
# to `user_id` so the callback cannot mis-attribute the connection. Not a
# persistent store — ten-minute TTL, a redeploy invalidates any in-flight
# handshake and the prospect simply retries.
_oauth_states: dict[str, dict[str, Any]] = {}
_STATE_TTL_SECONDS = 600


def _generate_state(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    _oauth_states[token] = {
        "expiry": time.time() + _STATE_TTL_SECONDS,
        "user_id": user_id,
        "code_verifier": None,
    }
    return token


def _pop_state(state: str) -> Optional[dict[str, Any]]:
    entry = _oauth_states.pop(state, None)
    if entry is None:
        return None
    if time.time() >= entry["expiry"]:
        return None
    return entry


# ─────────────────────────────────────────────────────────────────────────────
# OAuth endpoints
# ─────────────────────────────────────────────────────────────────────────────


# Multi-tenant: isolated to user.id (Sprint 3).
@drive_router.get("/connect")
async def drive_connect(
    user: AccessToken = Depends(get_current_user),
) -> dict[str, str]:
    """Produce the Google OAuth authorization URL for Drive."""
    try:
        state = _generate_state(user.id)
        flow = build_oauth_flow(state=state)
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        # Persist the PKCE code_verifier so the callback can restore it
        # on the fresh Flow used for `fetch_token`. google-auth-oauthlib
        # (1.2+) auto-generates it during `authorization_url()`.
        _oauth_states[state]["code_verifier"] = getattr(flow, "code_verifier", None)
        return {"auth_url": auth_url}
    except DriveServiceError as exc:
        raise HTTPException(500, str(exc)) from exc


# Google posts back here with `code` + `state`. No auth cookie assumption
# because some browsers drop cookies on cross-site redirects — we rely on
# the `state` being bound to user_id at `/connect` time.
@drive_router.get("/callback")
async def drive_callback(
    code: str = "",
    state: str = "",
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    def _error_html(message: str, status: int = 400) -> HTMLResponse:
        return HTMLResponse(
            content=_error_page(message),
            status_code=status,
        )

    entry = _pop_state(state) if state else None
    if entry is None:
        return _error_html("État OAuth invalide ou expiré. Merci de réessayer la connexion.")

    if not code:
        return _error_html("Code d'autorisation manquant.")

    user_id = entry.get("user_id")
    if not user_id:
        return _error_html("État OAuth mal formé (user introuvable).")

    try:
        token_payload = exchange_code_for_tokens(
            code, code_verifier=entry.get("code_verifier")
        )
    except DriveServiceError as exc:
        return _error_html(str(exc), status=502)

    try:
        await _upsert_drive_connection(
            db=db,
            user_id=user_id,
            token_payload=token_payload,
        )
    except CryptoConfigError as exc:
        logger.exception("Drive OAuth encryption misconfigured")
        return _error_html(f"Configuration de chiffrement manquante : {exc}", status=500)

    return HTMLResponse(_success_page())


# Multi-tenant: isolated to user.id (Sprint 3).
@drive_router.get("/status")
async def drive_status(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    connection = await _get_connection(db, user.id)
    if connection is None:
        return {"connected": False, "account_email": None, "connected_at": None}
    return {
        "connected": True,
        "account_email": connection.account_email,
        "connected_at": connection.connected_at.isoformat() if connection.connected_at else None,
        "scopes": json.loads(connection.scopes) if connection.scopes else [],
    }


# Multi-tenant: isolated to user.id (Sprint 3).
@drive_router.post("/disconnect")
async def drive_disconnect(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, bool]:
    """Drop the Drive connection + every watched folder attached to it."""
    await db.execute(
        delete(WatchedFolder).where(
            WatchedFolder.user_id == user.id,
            WatchedFolder.provider == "google_drive",
        )
    )
    await db.execute(
        delete(OAuthConnection).where(
            OAuthConnection.user_id == user.id,
            OAuthConnection.provider == "google_drive",
        )
    )
    await db.commit()
    return {"success": True}


# ─────────────────────────────────────────────────────────────────────────────
# Folder picker (Sprint 4 bonus)
# ─────────────────────────────────────────────────────────────────────────────


# Multi-tenant: isolated to user.id.
@drive_router.get("/folders")
async def list_drive_folders(
    search: str = "",
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """List the prospect's Drive folders (flat, max 100).

    Powers the folder picker combobox on `/dashboard/clients` and
    `/dashboard/automations`. Optional `search` query filters by
    `name contains`.
    """
    connection = await _get_connection(db, user.id)
    if connection is None:
        raise HTTPException(400, "Google Drive n'est pas connecté.")

    try:
        access_plain = decrypt_token(connection.access_token)
        refresh_plain = (
            decrypt_token(connection.refresh_token)
            if connection.refresh_token
            else None
        )
    except Exception as exc:
        logger.warning("Drive token decrypt failed for user=%s: %s", user.id, exc)
        raise HTTPException(500, "Jetons Drive illisibles, reconnectez votre Drive.") from exc

    scopes = json.loads(connection.scopes) if connection.scopes else []

    try:
        folders, refreshed = list_folders(
            access_token=access_plain,
            refresh_token=refresh_plain,
            expires_at=connection.expires_at,
            scopes=scopes,
            search=search.strip() or None,
        )
    except DriveServiceError as exc:
        raise HTTPException(502, str(exc)) from exc

    # Persist refreshed access token if Google rotated it mid-call.
    if refreshed.token and refreshed.token != access_plain:
        connection.access_token = encrypt_token(refreshed.token)
        if refreshed.expiry:
            connection.expires_at = refreshed.expiry
        await db.commit()

    return folders


# ─────────────────────────────────────────────────────────────────────────────
# Watched folder endpoints
# ─────────────────────────────────────────────────────────────────────────────


# Multi-tenant: isolated to user.id (Sprint 3).
@drive_router.post("/watched-folder/setup")
async def setup_watched_folder(
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Register a Drive folder to poll every 5 minutes.

    Expected body: `{"folder_id": "...", "folder_name": "Factures reçues"}`.
    Sprint 3 tolerates exactly one active watched folder per tenant — a
    second call replaces it rather than stacking.
    """
    folder_id = (body.get("folder_id") or "").strip()
    folder_name = (body.get("folder_name") or "").strip() or None
    if not folder_id:
        raise HTTPException(400, "`folder_id` est requis.")

    # Make sure the tenant has an active Drive connection.
    connection = await _get_connection(db, user.id)
    if connection is None:
        raise HTTPException(
            400,
            "Connectez d'abord votre Google Drive avant de choisir un dossier à surveiller.",
        )

    # Replace any prior active folder for this tenant.
    await db.execute(
        delete(WatchedFolder).where(
            WatchedFolder.user_id == user.id,
            WatchedFolder.provider == "google_drive",
        )
    )

    watched = WatchedFolder(
        user_id=user.id,
        provider="google_drive",
        folder_id=folder_id,
        folder_name=folder_name,
        is_active=True,
    )
    db.add(watched)
    await db.commit()
    await db.refresh(watched)
    return watched.to_dict()


# Multi-tenant: isolated to user.id (Sprint 3).
@drive_router.get("/watched-folder")
async def get_watched_folder(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> Optional[dict[str, Any]]:
    result = await db.execute(
        select(WatchedFolder).where(
            WatchedFolder.user_id == user.id,
            WatchedFolder.provider == "google_drive",
        )
    )
    watched = result.scalar_one_or_none()
    return watched.to_dict() if watched else None


# Multi-tenant: isolated to user.id (Sprint 3).
@drive_router.post("/watched-folder/disconnect")
async def disconnect_watched_folder(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, bool]:
    await db.execute(
        delete(WatchedFolder).where(
            WatchedFolder.user_id == user.id,
            WatchedFolder.provider == "google_drive",
        )
    )
    await db.commit()
    return {"success": True}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


async def _get_connection(
    db: AsyncSession, user_id: str
) -> Optional[OAuthConnection]:
    result = await db.execute(
        select(OAuthConnection).where(
            OAuthConnection.user_id == user_id,
            OAuthConnection.provider == "google_drive",
        )
    )
    return result.scalar_one_or_none()


async def _upsert_drive_connection(
    *,
    db: AsyncSession,
    user_id: str,
    token_payload: dict[str, Any],
) -> OAuthConnection:
    existing = await _get_connection(db, user_id)

    access_ct = encrypt_token(token_payload["access_token"])
    refresh_ct = (
        encrypt_token(token_payload["refresh_token"])
        if token_payload.get("refresh_token")
        else None
    )
    scopes_json = json.dumps(token_payload.get("scopes") or [])

    if existing is None:
        connection = OAuthConnection(
            user_id=user_id,
            provider="google_drive",
            access_token=access_ct,
            refresh_token=refresh_ct,
            scopes=scopes_json,
            account_email=token_payload.get("account_email"),
            expires_at=token_payload.get("expires_at"),
        )
        db.add(connection)
    else:
        existing.access_token = access_ct
        # Only overwrite refresh_token if Google sent one (they don't on every grant).
        if refresh_ct:
            existing.refresh_token = refresh_ct
        existing.scopes = scopes_json
        existing.account_email = token_payload.get("account_email") or existing.account_email
        existing.expires_at = token_payload.get("expires_at") or existing.expires_at
        connection = existing

    await db.commit()
    await db.refresh(connection)
    return connection


def _success_page() -> str:
    return """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Synthèse · Drive connecté</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#1a1a1a;
      display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
    .box{max-width:440px;text-align:center;padding:32px;background:#fff;border:1px solid #e5e5e5;border-radius:10px;}
    h1{font-size:20px;margin:0 0 12px;font-weight:600;}
    p{color:#555;margin:0;font-size:14px;line-height:1.6;}
  </style>
</head>
<body>
  <div class="box">
    <h1>Connexion Google Drive réussie</h1>
    <p>Vous pouvez fermer cette fenêtre et retourner dans Synthèse pour choisir le dossier à surveiller.</p>
  </div>
</body>
</html>"""


def _error_page(message: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Synthèse · Connexion Drive impossible</title>
  <style>
    body{{font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#1a1a1a;
      display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}}
    .box{{max-width:440px;text-align:center;padding:32px;background:#fff;border:1px solid #fecaca;border-radius:10px;}}
    h1{{font-size:18px;margin:0 0 12px;font-weight:600;color:#b91c1c;}}
    p{{color:#555;margin:0;font-size:14px;line-height:1.6;}}
  </style>
</head>
<body>
  <div class="box">
    <h1>Connexion Google Drive impossible</h1>
    <p>{message}</p>
  </div>
</body>
</html>"""
