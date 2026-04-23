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


def exchange_code_for_tokens(
    code: str, code_verifier: Optional[str] = None
) -> dict[str, Any]:
    """Exchange the authorization code for access + refresh tokens.

    `code_verifier` is the PKCE verifier captured at `/connect` time.
    `google-auth-oauthlib` auto-generates it during `authorization_url()`
    and the caller must pass it back here, otherwise Google rejects the
    exchange with `invalid_grant: Missing code verifier`.

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
    if code_verifier is not None:
        flow.code_verifier = code_verifier
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


def list_folders(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scopes: list[str],
    search: Optional[str] = None,
    page_size: int = 100,
) -> tuple[list[dict[str, Any]], Credentials]:
    """List the folders the prospect sees in their "Mon Drive" root.

    Matches the default Drive UI view: owned folders, not trashed, sitting
    at the root of "My Drive". Third-party apps (Colab, Drive-for-Desktop
    sync) create hidden folders like `.bin` or `(auth)` via OAuth —
    invisible in the Drive UI but returned by the API; we drop them on
    ownership + hidden-name heuristics below.

    `search` filters by `name contains <search>` (case-insensitive on
    Drive's side). Returns `(items, refreshed_creds)` so the caller can
    persist any refreshed access_token back.

    Each item is `{id, name, modifiedTime, parents}`.
    """
    service, creds = _service(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scopes=scopes,
    )
    query_parts = [
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
        "'me' in owners",
        # Restrict to the root of "My Drive" — sub-folders are not
        # reachable from here but the prospect can still paste an ID
        # manually if they really want a deeper target.
        "'root' in parents",
    ]
    if search:
        safe = search.replace("\\", "\\\\").replace("'", "\\'")
        query_parts.append(f"name contains '{safe}'")
    try:
        result = (
            service.files()
            .list(
                q=" and ".join(query_parts),
                fields="files(id, name, modifiedTime, parents)",
                pageSize=page_size,
                orderBy="name",
            )
            .execute()
        )
    except Exception as exc:
        raise DriveServiceError(f"Drive folders.list failed: {exc}") from exc

    raw_items = result.get("files", [])
    # Drop hidden / app-managed folders (names starting with '.', '(' or
    # wrapped in system markers). These belong to Colab, Drive-for-Desktop,
    # third-party OAuth apps, etc.
    items: list[dict[str, Any]] = []
    for f in raw_items:
        name = (f.get("name") or "").strip()
        if not name:
            continue
        if name.startswith(".") or name.startswith("("):
            continue
        items.append(f)
    return items, creds


_GOOGLE_NATIVE_EXPORTS: dict[str, tuple[str, str]] = {
    # Google Doc → plain text + .txt so the generic text branch of
    # `extract_file_content` picks it up.
    "application/vnd.google-apps.document": ("text/plain", "text"),
    # Google Sheet → CSV (readable as text).
    "application/vnd.google-apps.spreadsheet": ("text/csv", "text"),
    # Google Slides → plain text dump of the speaker notes + slide body.
    "application/vnd.google-apps.presentation": ("text/plain", "text"),
}


def is_google_native(mime_type: Optional[str]) -> bool:
    """Google-native Docs/Sheets/Slides need `files.export`, not `get_media`."""
    return bool(mime_type) and mime_type in _GOOGLE_NATIVE_EXPORTS


def fetch_file_content(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scopes: list[str],
    file_id: str,
    mime_type: Optional[str],
) -> tuple[bytes, str, Credentials]:
    """Fetch the readable content of a Drive file.

    Returns `(bytes, file_type_hint, refreshed_creds)` where `file_type_hint`
    is one of `"pdf" | "image" | "docx" | "text" | "auto"` — ready to be
    passed as `file_type` to the `extract_file_content` skill.

    Behaviour:
      * For Google-native Docs/Sheets/Slides, calls `files.export_media`
        to an export format (text/plain, text/csv).
      * For everything else, downloads the raw bytes via `files.get_media`.
    """
    service, creds = _service(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scopes=scopes,
    )

    if is_google_native(mime_type):
        export_mime, hint = _GOOGLE_NATIVE_EXPORTS[mime_type or ""]
        try:
            request = service.files().export_media(
                fileId=file_id, mimeType=export_mime
            )
            buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            return buffer.getvalue(), hint, creds
        except Exception as exc:
            raise DriveServiceError(
                f"Drive file export ({mime_type} → {export_mime}) failed: {exc}"
            ) from exc

    try:
        request = service.files().get_media(fileId=file_id)
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return buffer.getvalue(), "auto", creds
    except Exception as exc:
        raise DriveServiceError(f"Drive file download failed: {exc}") from exc


def list_folder_files_recursive(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scopes: list[str],
    folder_id: str,
    max_files: int = 30,
    max_depth: int = 3,
) -> tuple[list[dict[str, Any]], Credentials]:
    """Breadth-first walk of a Drive folder and its sub-folders.

    Returns up to `max_files` non-folder items found in the tree, stopping
    at depth `max_depth` (the configured folder itself is depth 0). Caller
    still needs to apply ownership / trashed filters at the query level
    — this helper does, via the same clauses as `list_new_files_in_folder`.

    Used by the Rapport Client service so that a folder like
    `TEL LE PHOENIX / 2026 / Factures` is fully covered by selecting
    `TEL LE PHOENIX` at the top level.
    """
    service, creds = _service(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scopes=scopes,
    )

    files_out: list[dict[str, Any]] = []
    queue: list[tuple[str, int]] = [(folder_id, 0)]
    visited: set[str] = set()

    while queue and len(files_out) < max_files:
        current_id, depth = queue.pop(0)
        if current_id in visited:
            continue
        visited.add(current_id)

        try:
            result = (
                service.files()
                .list(
                    q=f"'{current_id}' in parents and trashed = false",
                    fields="files(id, name, mimeType, modifiedTime, parents)",
                    pageSize=100,
                    orderBy="modifiedTime desc",
                )
                .execute()
            )
        except Exception as exc:
            # A single sub-folder failing should not kill the whole walk.
            logger.warning("Drive sub-folder list failed for %s: %s", current_id, exc)
            continue

        for item in result.get("files", []):
            is_folder = (
                item.get("mimeType") == "application/vnd.google-apps.folder"
            )
            if is_folder:
                if depth < max_depth:
                    queue.append((item["id"], depth + 1))
            else:
                files_out.append(item)
                if len(files_out) >= max_files:
                    break

    return files_out, creds


def download_file_bytes(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scopes: list[str],
    file_id: str,
) -> tuple[bytes, Credentials]:
    """Download a file's raw bytes. Returns (bytes, refreshed_creds).

    Kept for Sprint 3 callers (watch_folder_scheduler) that only handle
    plain binary files. New code should use `fetch_file_content` which
    handles Google-native formats too.
    """
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
