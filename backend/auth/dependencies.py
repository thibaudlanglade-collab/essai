"""FastAPI authentication dependency for multi-tenant access tokens.

Every data endpoint must declare `user: AccessToken = Depends(get_current_user)`
so that a missing or invalid cookie immediately short-circuits with 401/403,
and so that downstream queries can filter by `user.id`.

There is deliberately **no bypass**: an endpoint that should be public does not
declare the dependency at all. Adding an "optional" variant is provided for the
few endpoints that behave differently when called anonymously (e.g. a marketing
route that can recognise a returning prospect but does not require them).
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.access_tokens import get_by_session_token, touch_activity
from db.database import get_db
from db.models import AccessToken


# Name of the httpOnly cookie carrying the session token.
# Kept in one place so the login route, logout route, and dependency agree.
SESSION_COOKIE_NAME = "session_token"


async def get_current_user(
    session_token: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> AccessToken:
    """Resolve the current prospect from the session cookie.

    Raises:
        401 Unauthorized — no cookie, or cookie does not match any session.
        403 Forbidden    — access was revoked (`is_active=False`) or expired.

    Side effect: updates `last_seen_at` (throttled to one write per 5 min).
    Tracking failures are swallowed — we prefer serving the request over
    failing on a metric write.
    """
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié",
        )

    user = await get_by_session_token(db, session_token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalide",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès désactivé",
        )

    if user.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès expiré",
        )

    try:
        await touch_activity(db, user)
    except Exception:
        # Non-fatal — we don't want a tracking glitch to break the request.
        pass

    return user


async def get_current_user_optional(
    session_token: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> Optional[AccessToken]:
    """Same contract as `get_current_user` but returns `None` when unauthenticated.

    Intended for the rare endpoint that needs to behave differently for a logged-in
    prospect versus an anonymous visitor, without raising.
    """
    if not session_token:
        return None
    user = await get_by_session_token(db, session_token)
    if user is None or not user.is_active or user.expires_at < datetime.utcnow():
        return None
    return user
