"""Google Drive integration (brief §6.2).

Two entry points:

- `build_oauth_flow()` + `exchange_code_for_tokens()` — Drive's OAuth2
  handshake, mirror image of `gmail_service.build_oauth_flow` (scopes
  are different, callback route is separate).
- `list_new_files_in_folder(connection, folder_id, after)` — poll a
  Drive folder for new files since a given timestamp. Used by the
  `watch_folder_scheduler` every 5 minutes.

Encryption of access/refresh tokens is handled at the router layer
(`api/drive.py`) via `services/crypto.py` — this module only ever sees
plaintext tokens and never persists them itself.
"""
from __future__ import annotations

import io
import logging
import os
from datetime import datetime
from typing import Any, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload


logger = logging.getLogger(__name__)


DRIVE_SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
]


class DriveServiceError(RuntimeError):
    """Wraps any upstream Google error into a stable exception."""


# ─────────────────────────────────────────────────────────────────────────────
# OAuth
# ─────────────────────────────────────────────────────────────────────────────


def _client_config() -> dict[str, Any]:
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    redirect = os.environ.get(
        "GOOGLE_DRIVE_REDIRECT_URI",
        "http://localhost:8000/api/drive/callback",
    ).strip()
    if not client_id or not client_secret:
        raise DriveServiceError(
            "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET must be set to initiate Drive OAuth."
        )
    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect],
        }
    }


def build_oauth_flow(state: str) -> Flow:
    """Return a configured `Flow` ready to produce the authorization URL."""
    flow = Flow.from_client_config(
        _client_config(),
        scopes=DRIVE_SCOPES,
        state=state,
    )
    flow.redirect_uri = _client_config()["web"]["redirect_uris"][0]
    return flow


def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    """Exchange the authorization code for access + refresh tokens.

    Returns a dict ready to be stored after encryption:
        {
          "access_token": "...",
          "refresh_token": "..." | None,
          "expires_at": datetime,
          "scopes": [...],
          "account_email": "user@gmail.com" | None,
        }
    """
    flow = build_oauth_flow(state="")  # state already validated by caller
    try:
        flow.fetch_token(code=code)
    except Exception as exc:
        raise DriveServiceError(f"Failed to exchange Drive OAuth code: {exc}") from exc

    creds: Credentials = flow.credentials
    account_email: Optional[str] = None

    # Try to fetch the connected account's primary email (nice-to-have).
    try:
        oauth2_service = build("oauth2", "v2", credentials=creds, cache_discovery=False)
        account_email = oauth2_service.userinfo().get().execute().get("email")
    except Exception as exc:
        logger.info("Could not resolve connected Drive account email: %s", exc)

    return {
        "access_token": creds.token or "",
        "refresh_token": creds.refresh_token or None,
        "expires_at": creds.expiry,
        "scopes": list(creds.scopes or []),
        "account_email": account_email,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Drive calls
# ─────────────────────────────────────────────────────────────────────────────


def _creds_from_plaintext(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scopes: list[str],
) -> Credentials:
    """Rehydrate a `Credentials` from a row + plaintext tokens."""
    return Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ.get("GOOGLE_CLIENT_ID"),
        client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
        scopes=scopes,
        expiry=expires_at,
    )


def _refresh_if_needed(creds: Credentials) -> Credentials:
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception as exc:
            raise DriveServiceError(
                f"Refresh token rejected by Google: {exc}. "
                "The prospect may need to reconnect their Drive."
            ) from exc
    return creds


def _service(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scopes: list[str],
):
    creds = _refresh_if_needed(
        _creds_from_plaintext(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            scopes=scopes,
        )
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False), creds


def list_new_files_in_folder(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scopes: list[str],
    folder_id: str,
    since: Optional[datetime],
    page_size: int = 50,
) -> tuple[list[dict[str, Any]], Credentials]:
    """List files in `folder_id` created or modified after `since`.

    Excludes subfolders and trashed files. Returns `(items, refreshed_creds)`
    so the caller can persist any refreshed access_token back.
    """
    service, creds = _service(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scopes=scopes,
    )
    query_parts = [
        f"'{folder_id}' in parents",
        "trashed = false",
        "mimeType != 'application/vnd.google-apps.folder'",
    ]
    if since is not None:
        query_parts.append(f"modifiedTime > '{since.isoformat()}Z'")
    try:
        result = (
            service.files()
            .list(
                q=" and ".join(query_parts),
                fields="files(id, name, mimeType, modifiedTime, size)",
                pageSize=page_size,
                orderBy="modifiedTime",
            )
            .execute()
        )
    except Exception as exc:
        raise DriveServiceError(f"Drive files.list failed: {exc}") from exc

    return result.get("files", []), creds


def download_file_bytes(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scopes: list[str],
    file_id: str,
) -> tuple[bytes, Credentials]:
    """Download a file's raw bytes. Returns (bytes, refreshed_creds)."""
    service, creds = _service(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scopes=scopes,
    )
    try:
        request = service.files().get_media(fileId=file_id)
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return buffer.getvalue(), creds
    except Exception as exc:
        raise DriveServiceError(f"Drive file download failed: {exc}") from exc


def get_file_metadata(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scopes: list[str],
    file_id: str,
) -> tuple[dict[str, Any], Credentials]:
    """Fetch a single file's metadata (used mainly for integration tests)."""
    service, creds = _service(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scopes=scopes,
    )
    try:
        meta = (
            service.files()
            .get(fileId=file_id, fields="id, name, mimeType, modifiedTime")
            .execute()
        )
        return meta, creds
    except Exception as exc:
        raise DriveServiceError(f"Drive file.get failed: {exc}") from exc
