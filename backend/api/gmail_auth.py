"""
FastAPI router: /gmail — OAuth2 connect flow + connection management.
Registered with prefix="/api" in main.py → final paths are /api/gmail/...
"""
from __future__ import annotations

import json
import logging
import secrets
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import async_session_maker, get_db
from db.models import Email, GmailConnection
from services.gmail_service import (
    GmailServiceError,
    build_oauth_flow,
    exchange_code_for_tokens,
)
from services.gmail_sync import sync_connection

logger = logging.getLogger(__name__)

gmail_auth_router = APIRouter(prefix="/gmail")

# In-memory state store: {state_token: {"expiry": float, "code_verifier": str|None}}
_oauth_states: dict[str, dict] = {}
_STATE_TTL_SECONDS = 600  # 10 minutes


def _generate_state() -> str:
    token = secrets.token_urlsafe(32)
    _oauth_states[token] = {"expiry": time.time() + _STATE_TTL_SECONDS, "code_verifier": None}
    return token


def _validate_and_pop_state(state: str) -> dict | None:
    """Remove and return the state entry if valid, else None."""
    entry = _oauth_states.pop(state, None)
    if entry is None:
        return None
    if time.time() >= entry["expiry"]:
        return None
    return entry


@gmail_auth_router.get("/status")
async def gmail_status(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Return current Gmail connection status."""
    result = await db.execute(select(GmailConnection))
    connection = result.scalar_one_or_none()

    if connection is None:
        return {
            "connected": False,
            "email_address": None,
            "last_sync_at": None,
            "emails_count": 0,
        }

    count_result = await db.execute(
        select(func.count(Email.id)).where(Email.connection_id == connection.id)
    )
    emails_count: int = count_result.scalar_one() or 0

    return {
        "connected": True,
        "email_address": connection.email_address,
        "last_sync_at": (
            connection.last_sync_at.isoformat() if connection.last_sync_at else None
        ),
        "emails_count": emails_count,
    }


@gmail_auth_router.get("/connect")
async def gmail_connect() -> dict[str, str]:
    """Generate and return the Google OAuth2 authorization URL."""
    state = _generate_state()
    flow = build_oauth_flow(state=state)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    # Persist the PKCE code_verifier so the callback can restore it
    _oauth_states[state]["code_verifier"] = getattr(flow, "code_verifier", None)
    return {"auth_url": auth_url}


@gmail_auth_router.get("/callback")
async def gmail_callback(
    code: str = "",
    state: str = "",
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Handle the Google OAuth2 callback after user consent."""

    def _html_error(message: str) -> HTMLResponse:
        return HTMLResponse(
            content=f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Erreur</title>
<style>
body{{background:#09090b;color:#ef4444;font-family:Inter,sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}}
.box{{text-align:center;padding:2rem;}}
</style></head>
<body><div class="box"><h2>Erreur de connexion</h2><p>{message}</p></div></body>
</html>""",
            status_code=400,
        )

    state_entry = None if not state else _validate_and_pop_state(state)
    if state_entry is None:
        return _html_error("Paramètre state invalide ou expiré.")

    if not code:
        return _html_error("Code d'autorisation manquant.")

    try:
        token_data = exchange_code_for_tokens(code, state_entry["code_verifier"])
    except GmailServiceError as exc:
        return _html_error(str(exc))

    # Upsert GmailConnection
    result = await db.execute(
        select(GmailConnection).where(
            GmailConnection.email_address == token_data["email_address"]
        )
    )
    connection = result.scalar_one_or_none()

    if connection is None:
        connection = GmailConnection(
            email_address=token_data["email_address"],
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            token_expiry=token_data["expiry"],
            scopes=json.dumps(token_data["scopes"]),
        )
        db.add(connection)
    else:
        connection.access_token = token_data["access_token"]
        connection.refresh_token = token_data["refresh_token"]
        connection.token_expiry = token_data["expiry"]
        connection.scopes = json.dumps(token_data["scopes"])

    await db.commit()
    await db.refresh(connection)

    # Trigger immediate first sync (non-fatal if it fails)
    try:
        async with async_session_maker() as sync_db:
            await sync_connection(connection.id, sync_db)
    except Exception as exc:
        logger.warning("Initial sync failed (non-fatal): %s", exc)

    return HTMLResponse(
        content="""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Connexion réussie</title>
<style>
body{background:#09090b;color:#fafafa;font-family:Inter,sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.box{text-align:center;padding:2rem;border:1px solid #1f1f23;border-radius:12px;background:#0f0f12;}
h2{margin:0 0 0.5rem;font-size:1.25rem;}
p{color:#a1a1aa;margin:0;font-size:0.875rem;}
</style></head>
<body>
<div class="box">
  <h2>✓ Connexion réussie !</h2>
  <p>Vous pouvez fermer cette fenêtre.</p>
</div>
</body>
</html>""",
        status_code=200,
    )


@gmail_auth_router.post("/disconnect")
async def gmail_disconnect(db: AsyncSession = Depends(get_db)) -> dict[str, bool]:
    """Remove the Gmail connection and all associated emails."""
    result = await db.execute(select(GmailConnection))
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(status_code=404, detail="Aucune connexion Gmail trouvée.")

    # Delete associated emails first
    emails_result = await db.execute(
        select(Email).where(Email.connection_id == connection.id)
    )
    for email in emails_result.scalars().all():
        await db.delete(email)

    await db.delete(connection)
    await db.commit()

    return {"success": True}


@gmail_auth_router.post("/sync-now")
async def gmail_sync_now(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Trigger an immediate sync for the current Gmail connection."""
    result = await db.execute(select(GmailConnection))
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(status_code=404, detail="Aucune connexion Gmail trouvée.")

    try:
        sync_result = await sync_connection(connection.id, db)
    except GmailServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return sync_result
