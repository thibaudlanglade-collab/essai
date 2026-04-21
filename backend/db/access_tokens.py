"""Database helpers for the `access_tokens` table.

All prospect-facing logic around creating, resolving, opening, and closing
sessions lives here, so API routes and the seeding script can share it.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import AccessToken


async def create_token(
    db: AsyncSession,
    *,
    prospect_name: Optional[str] = None,
    prospect_email: Optional[str] = None,
    company_name: Optional[str] = None,
    company_sector: str = "BTP",
    duration_days: int = 14,
) -> AccessToken:
    """Create and persist a new access token.

    The token is valid for `duration_days` days. Data seeding (factures,
    devis, clients BTP) is not done here — callers invoke their own seeder
    against the returned token's `id`.
    """
    token = AccessToken(
        token=AccessToken.generate_token(),
        prospect_name=prospect_name,
        prospect_email=prospect_email,
        company_name=company_name,
        company_sector=company_sector,
        expires_at=datetime.utcnow() + timedelta(days=duration_days),
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return token


async def get_by_token(db: AsyncSession, token: str) -> Optional[AccessToken]:
    """Look up an access token by the URL token (not the cookie)."""
    result = await db.execute(
        select(AccessToken).where(AccessToken.token == token)
    )
    return result.scalar_one_or_none()


async def get_by_session_token(
    db: AsyncSession, session_token: str
) -> Optional[AccessToken]:
    """Look up an access token by its active session token (the cookie value)."""
    result = await db.execute(
        select(AccessToken).where(AccessToken.session_token == session_token)
    )
    return result.scalar_one_or_none()


async def open_session(db: AsyncSession, access_token: AccessToken) -> str:
    """Rotate the session token on the given access and mark it active.

    Increments `session_count`, sets `first_seen_at` (first activation only),
    and updates `last_seen_at`. Returns the new session token — caller is
    responsible for setting it as an httpOnly cookie on the response.
    """
    session_token = AccessToken.generate_session_token()
    now = datetime.utcnow()
    access_token.session_token = session_token
    if access_token.first_seen_at is None:
        access_token.first_seen_at = now
    access_token.last_seen_at = now
    access_token.session_count = (access_token.session_count or 0) + 1
    await db.commit()
    return session_token


async def close_session(db: AsyncSession, access_token: AccessToken) -> None:
    """Clear the active session token (on logout). Access itself remains valid."""
    access_token.session_token = None
    await db.commit()


async def touch_activity(
    db: AsyncSession,
    access_token: AccessToken,
    *,
    throttle_seconds: int = 300,
) -> None:
    """Update `last_seen_at`, at most once every `throttle_seconds`.

    Throttling avoids a write on every API call. 5 minutes is enough
    granularity for tracking prospect engagement.
    """
    now = datetime.utcnow()
    if access_token.last_seen_at and (
        now - access_token.last_seen_at
    ).total_seconds() < throttle_seconds:
        return
    access_token.last_seen_at = now
    await db.commit()


async def revoke(db: AsyncSession, access_token: AccessToken) -> None:
    """Disable an access (no more logins). Data is preserved until `cleanup_expired`."""
    access_token.is_active = False
    access_token.session_token = None
    await db.commit()


async def mark_welcome_shown(db: AsyncSession, access_token: AccessToken) -> None:
    """Flip `welcome_shown` after the prospect has seen the first-visit page."""
    access_token.welcome_shown = True
    await db.commit()


async def cleanup_expired(db: AsyncSession, *, grace_days: int = 7) -> int:
    """Delete access tokens that have been expired for more than `grace_days`.

    CASCADE deletes wipe all linked rows (clients, invoices, quotes, emails, etc.).
    Returns the number of deleted tokens.
    """
    cutoff = datetime.utcnow() - timedelta(days=grace_days)
    result = await db.execute(
        delete(AccessToken).where(AccessToken.expires_at < cutoff)
    )
    await db.commit()
    return result.rowcount or 0
