"""HTTP routes for prospect authentication.

Three groups of endpoints live here:

1. **Activation** (`GET /app/{token}`) — the entry point for the cold-email link.
   Looks up the token, rotates a session, sets the httpOnly cookie, and
   redirects to `/welcome` (first visit) or `/dashboard` (subsequent).

2. **Expiration** (`GET /expired`) — a public page (no auth) shown once the
   access is over. Also rendered if someone hits `/app/{bad-token}`.

3. **Session API** (`POST /api/auth/logout`, `GET /api/auth/me`,
   `POST /api/welcome/seen`) — small JSON endpoints the frontend uses to
   mirror the backend state (current user, one-shot welcome flag, logout).

Mounted from `backend/main.py` **before** the SPA catch-all route so that
`/app/{token}` and `/expired` are not swallowed by `index.html`.
"""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Response, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import SESSION_COOKIE_NAME, get_current_user
from db.access_tokens import (
    close_session,
    get_by_token,
    mark_welcome_shown,
    open_session,
)
from db.database import get_db
from db.models import AccessToken


# Cookie lifetime — brief §3: 30 days so the prospect can revisit the app.
SESSION_COOKIE_MAX_AGE = 30 * 24 * 3600


def _cookie_secure() -> bool:
    """Whether the session cookie should carry the `Secure` flag.

    Disabled automatically when `SYNTHESE_DEV=1` (local http dev).
    Any other value — or the flag being unset — means production mode
    and the cookie must be HTTPS-only.
    """
    return os.environ.get("SYNTHESE_DEV") != "1"


router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Activation + expiration
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/app/{token}")
async def activate_token(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Activate a prospect's access from the cold-email URL.

    * Token unknown / revoked / expired → redirect to `/expired`.
    * Otherwise, mint a new `session_token`, set the httpOnly cookie,
      redirect to `/welcome` (first visit) or `/dashboard` (returning).
    """
    user = await get_by_token(db, token)
    if user is None or not user.is_usable():
        return RedirectResponse(url="/expired", status_code=status.HTTP_302_FOUND)

    session_token = await open_session(db, user)
    target = "/welcome" if not user.welcome_shown else "/dashboard"

    redirect = RedirectResponse(url=target, status_code=status.HTTP_302_FOUND)
    redirect.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        max_age=SESSION_COOKIE_MAX_AGE,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        path="/",
    )
    return redirect


_EXPIRED_HTML = """<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Synthèse · Essai terminé</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      color: #1a1a1a;
      background: #fafafa;
      max-width: 620px;
      margin: 80px auto;
      padding: 32px;
      line-height: 1.65;
    }
    h1 { font-size: 28px; margin: 0 0 24px; font-weight: 600; }
    p  { margin: 0 0 16px; }
    a.cta {
      display: inline-block;
      background: #111;
      color: #fff;
      padding: 14px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 16px;
      font-weight: 500;
    }
    .signature {
      color: #555;
      font-size: 14px;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
    }
  </style>
</head>
<body>
  <h1>Votre essai Synthèse est terminé</h1>
  <p>Bonjour,</p>
  <p>Votre accès test a pris fin après 14 jours.</p>
  <p>Vos données ont été supprimées définitivement comme promis.</p>
  <p>Si Synthèse vous a plu et que vous souhaitez une version construite sur
  mesure pour votre activité, je serais ravi d'en discuter avec vous, à travers
  un simple appel ou une visio, comme vous préférez.</p>
  <a class="cta" href="mailto:contact@synthese.fr?subject=Synthèse%20—%20discussion%20version%20sur-mesure">
    Prendre contact
  </a>
  <div class="signature">
    Thibaud Langlade<br>
    contact@synthese.fr<br>
    07 69 45 50 78
  </div>
</body>
</html>"""


@router.get("/expired", response_class=HTMLResponse)
async def expired_page() -> HTMLResponse:
    """Public landing page for expired or revoked accesses.

    Deliberately server-rendered (no React) so it works even if the SPA
    cannot load and regardless of session state.
    """
    return HTMLResponse(content=_EXPIRED_HTML)


# ─────────────────────────────────────────────────────────────────────────────
# Session API (JSON)
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/api/auth/me")
async def auth_me(user: AccessToken = Depends(get_current_user)) -> dict:
    """Return the current prospect's identity and expiration info.

    Used by the frontend to render the "expires in X days" banner and
    to decide whether to show `/welcome` or `/dashboard`. The raw access
    token and session token are **never** returned — `public=True` strips
    them so they cannot leak into client-side JS.
    """
    return user.to_dict(public=True)


@router.post("/api/auth/logout")
async def auth_logout(
    response: Response,
    user: AccessToken = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """End the current session. The access itself remains valid until expiration.

    Reaching this endpoint anonymously (no cookie) is a 401 via the dependency;
    we never need to "logout" someone who was not logged in.
    """
    await close_session(db, user)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"ok": True}


@router.post("/api/welcome/seen")
async def welcome_seen(
    user: AccessToken = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Flip `welcome_shown=True` so the prospect isn't shown the welcome page again."""
    await mark_welcome_shown(db, user)
    return {"ok": True}
