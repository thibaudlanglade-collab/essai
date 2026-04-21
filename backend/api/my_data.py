"""Prospect-facing RGPD endpoints.

Two endpoints:
- `GET  /api/my-data/export` — JSON export of every row the prospect owns.
- `DELETE /api/my-data`       — hard-delete the access and cascade-wipe everything.

These satisfy the RGPD commitments spelled out in the welcome page (brief §8.1)
and in §12 of the brief: "Endpoint de suppression sur demande avant expiration"
and "Endpoint d'export RGPD".
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import SESSION_COOKIE_NAME, get_current_user
from db.database import get_db
from db.models import (
    AccessToken,
    ActivityLog,
    Automation,
    AutomationRun,
    Client,
    Email,
    EmailAttachment,
    EmailTopic,
    Employee,
    Extraction,
    GmailConnection,
    Invoice,
    MorningBriefing,
    OAuthConnection,
    Quote,
    Supplier,
    WatchedFolder,
)

my_data_router = APIRouter(prefix="/my-data")


# Every domain table that carries user_id. Order matters for the export,
# but not for deletion (CASCADE handles FK order). Listing them here rather
# than iterating Base.metadata keeps the export stable if we add unrelated
# tables later.
_USER_SCOPED_MODELS = [
    Client,
    Supplier,
    Invoice,
    Quote,
    Email,
    EmailAttachment,
    Extraction,
    WatchedFolder,
    ActivityLog,
    OAuthConnection,
    Employee,
    EmailTopic,
    Automation,
    AutomationRun,
    GmailConnection,
    MorningBriefing,
]


@my_data_router.get("/export")
async def export_my_data(
    user: AccessToken = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return every row linked to the prospect as a single JSON document.

    OAuth access/refresh tokens are redacted to avoid leaking encrypted
    credentials in a user-initiated export; the prospect can see that a
    connection exists but not its ciphertext.
    """
    export: dict[str, Any] = {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "access": user.to_dict(public=True),
        "data": {},
    }

    for model in _USER_SCOPED_MODELS:
        rows = await db.execute(
            select(model).where(model.user_id == user.id)
        )
        items = [row.to_dict() for row in rows.scalars().all()]
        # Extra safety: scrub OAuth ciphertexts even though to_dict() already does so.
        if model is OAuthConnection:
            for item in items:
                item.pop("access_token", None)
                item.pop("refresh_token", None)
        export["data"][model.__tablename__] = items

    return export


@my_data_router.delete("", status_code=200)
async def delete_my_data(
    response: Response,
    user: AccessToken = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Hard-delete the access token and cascade-wipe all linked rows.

    CASCADE deletes every table that references `access_tokens.id`, so a
    single DELETE is enough. Legacy rows (user_id IS NULL) are unaffected.

    The session cookie is cleared on the response so the browser stops
    presenting a now-invalid token.
    """
    user_id = user.id
    await db.execute(delete(AccessToken).where(AccessToken.id == user_id))
    await db.commit()

    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {
        "ok": True,
        "deleted_user_id": user_id,
        "deleted_at": datetime.utcnow().isoformat() + "Z",
    }
