"""
FastAPI router: /gmail — OAuth2 connect flow + connection management.
Registered with prefix="/api" in main.py → final paths are /api/gmail/...
"""
from __future__ import annotations

import json
import logging
import secrets
import time
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.database import async_session_maker, get_db
from db.models import AccessToken, Email, GmailConnection
from services.gmail_service import (
    GmailServiceError,
    build_oauth_flow,
    exchange_code_for_tokens,
)
from services.gmail_sync import sync_connection

logger = logging.getLogger(__name__)

gmail_auth_router = APIRouter(prefix="/gmail")

# In-memory state store: {state_token: {"expiry": float, "code_verifier": Optional[str]}}
_oauth_states: dict[str, dict] = {}
_STATE_TTL_SECONDS = 600  # 10 minutes


def _generate_state(user_id: str) -> str:
    """Mint a fresh OAuth state, bound to the calling tenant's user_id.

    Binding the state to `user_id` protects the callback from storing a
    GmailConnection against the wrong tenant even if something weird happens
    with the session cookie between `/connect` and `/callback`.
    """
    token = secrets.token_urlsafe(32)
    _oauth_states[token] = {
        "expiry": time.time() + _STATE_TTL_SECONDS,
        "code_verifier": None,
        "user_id": user_id,
    }
    return token


def _validate_and_pop_state(state: str) -> Optional[dict]:
    """Remove and return the state entry if valid, else None."""
    entry = _oauth_states.pop(state, None)
    if entry is None:
        return None
    if time.time() >= entry["expiry"]:
        return None
    return entry


# Multi-tenant: isolated to user.id (Sprint 1).
@gmail_auth_router.get("/status")
async def gmail_status(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Return current Gmail connection status for the calling tenant."""
    result = await db.execute(
        select(GmailConnection).where(GmailConnection.user_id == user.id)
    )
    connection = result.scalar_one_or_none()

    if connection is None:
        return {
            "connected": False,
            "email_address": None,
            "last_sync_at": None,
            "emails_count": 0,
        }

    count_result = await db.execute(
        select(func.count(Email.id)).where(
            Email.connection_id == connection.id,
            Email.user_id == user.id,
        )
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


# Multi-tenant: isolated to user.id (Sprint 1).
@gmail_auth_router.get("/connect")
async def gmail_connect(
    user: AccessToken = Depends(get_current_user),
) -> dict[str, str]:
    """Generate and return the Google OAuth2 authorization URL."""
    state = _generate_state(user_id=user.id)
    flow = build_oauth_flow(state=state)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    # Persist the PKCE code_verifier so the callback can restore it
    _oauth_states[state]["code_verifier"] = getattr(flow, "code_verifier", None)
    return {"auth_url": auth_url}


# The callback is reached via Google's redirect after user consent. The state
# token binds this request to the tenant that initiated `/connect`, so we
# do NOT rely solely on the session cookie here (some browsers may drop it
# on cross-site redirects even with SameSite=lax). We still recommend it be
# present — but the state is the authoritative link to the user_id.
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

    user_id = state_entry.get("user_id")
    if not user_id:
        # Legacy or malformed state — refuse rather than risk a mis-attributed
        # GmailConnection.
        return _html_error("État OAuth invalide (user non identifié).")

    try:
        token_data = exchange_code_for_tokens(code, state_entry["code_verifier"])
    except GmailServiceError as exc:
        return _html_error(str(exc))

    # Upsert the tenant's GmailConnection. Lookup is user-scoped, not by
    # global email_address, so two tenants who happen to connect the same
    # Gmail are each tied to their own row.
    result = await db.execute(
        select(GmailConnection).where(GmailConnection.user_id == user_id)
    )
    connection = result.scalar_one_or_none()

    if connection is None:
        connection = GmailConnection(
            user_id=user_id,
            email_address=token_data["email_address"],
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            token_expiry=token_data["expiry"],
            scopes=json.dumps(token_data["scopes"]),
        )
        db.add(connection)
    else:
        connection.email_address = token_data["email_address"]
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


# Multi-tenant: isolated to user.id (Sprint 1).
@gmail_auth_router.post("/disconnect")
async def gmail_disconnect(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, bool]:
    """Remove the Gmail connection and all associated emails for this tenant."""
    result = await db.execute(
        select(GmailConnection).where(GmailConnection.user_id == user.id)
    )
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(status_code=404, detail="Aucune connexion Gmail trouvée.")

    # Delete associated emails first — scoped to user AND connection.
    emails_result = await db.execute(
        select(Email).where(
            Email.connection_id == connection.id,
            Email.user_id == user.id,
        )
    )
    for email in emails_result.scalars().all():
        await db.delete(email)

    await db.delete(connection)
    await db.commit()

    return {"success": True}


# Multi-tenant: isolated to user.id (Sprint 1).
@gmail_auth_router.post("/sync-now")
async def gmail_sync_now(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    """Trigger an immediate sync for the calling tenant's Gmail connection."""
    result = await db.execute(
        select(GmailConnection).where(GmailConnection.user_id == user.id)
    )
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(status_code=404, detail="Aucune connexion Gmail trouvée.")

    # Manual refresh: force a wide full-list fetch (no history_id incremental)
    # so emails the user sees in Gmail but that were missed on first sync
    # (older than the initial 50, in a Promotions tab, etc.) are pulled in.
    connection.history_id = None
    await db.commit()

    try:
        sync_result = await sync_connection(connection.id, db, max_messages=500)
    except GmailServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return sync_result
