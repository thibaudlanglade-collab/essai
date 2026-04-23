"""
Gmail API service: OAuth2 flow, token management, message fetch/parse.
"""
from __future__ import annotations
from typing import Optional

import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from email.utils import parseaddr, parsedate_to_datetime

# Google adds previously-granted scopes (e.g. Drive when already linked) to
# the token response, which oauthlib rejects with a strict "scope changed"
# error. This env var tells oauthlib to accept the wider scope set.
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from db.models import GmailConnection

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]

_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/gmail/callback"
)


class GmailServiceError(Exception):
    """Raised for recoverable Gmail API or OAuth errors."""


def build_oauth_flow(state: Optional[str] = None) -> Flow:
    """Build a Google OAuth2 Flow with the correct scopes and redirect URI."""
    client_config = {
        "web": {
            "client_id": _CLIENT_ID,
            "client_secret": _CLIENT_SECRET,
            "redirect_uris": [_REDIRECT_URI],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=_REDIRECT_URI,
        state=state,
    )
    return flow


def exchange_code_for_tokens(code: str, code_verifier: Optional[str] = None) -> dict:
    """Exchange authorization code for access + refresh tokens.

    Returns dict with keys:
      access_token, refresh_token, expiry (datetime), scopes (list[str]),
      email_address (str)
    """
    flow = build_oauth_flow()
    if code_verifier is not None:
        flow.code_verifier = code_verifier
    try:
        flow.fetch_token(code=code)
    except Exception as exc:
        raise GmailServiceError(f"Token exchange failed: {exc}") from exc

    creds = flow.credentials

    # Fetch userinfo to get the email address
    try:
        service = build("oauth2", "v2", credentials=creds)
        userinfo = service.userinfo().get().execute()
        email_address: str = userinfo.get("email", "")
    except Exception as exc:
        raise GmailServiceError(f"Userinfo fetch failed: {exc}") from exc

    expiry = creds.expiry or datetime.utcnow()
    if expiry.tzinfo is not None:
        expiry = expiry.astimezone(timezone.utc).replace(tzinfo=None)

    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "expiry": expiry,
        "scopes": list(creds.scopes or SCOPES),
        "email_address": email_address,
    }


def refresh_access_token(connection: GmailConnection) -> dict:
    """Refresh the access token using the stored refresh token.

    Updates connection.access_token and connection.token_expiry in place.
    Caller is responsible for committing the DB session.

    Returns dict with updated access_token and expiry.
    """
    creds = Credentials(
        token=connection.access_token,
        refresh_token=connection.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=_CLIENT_ID,
        client_secret=_CLIENT_SECRET,
        scopes=json.loads(connection.scopes or "[]"),
    )
    try:
        from google.auth.transport.requests import Request

        creds.refresh(Request())
    except Exception as exc:
        raise GmailServiceError(f"Token refresh failed: {exc}") from exc

    connection.access_token = creds.token
    expiry = creds.expiry or datetime.utcnow()
    if expiry.tzinfo is not None:
        expiry = expiry.astimezone(timezone.utc).replace(tzinfo=None)
    connection.token_expiry = expiry

    return {
        "access_token": creds.token,
        "expiry": creds.expiry,
    }


def get_gmail_service(connection: GmailConnection):
    """Build a Gmail API service client. Auto-refreshes token if expired."""
    # Both sides naive UTC (DB stores TIMESTAMP WITHOUT TIME ZONE).
    now = datetime.utcnow()
    expiry = connection.token_expiry
    if expiry is not None and expiry.tzinfo is not None:
        expiry = expiry.astimezone(timezone.utc).replace(tzinfo=None)

    if expiry is None or expiry <= now:
        refresh_access_token(connection)

    creds = Credentials(
        token=connection.access_token,
        refresh_token=connection.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=_CLIENT_ID,
        client_secret=_CLIENT_SECRET,
        scopes=json.loads(connection.scopes or "[]"),
    )
    return build("gmail", "v1", credentials=creds)


def list_message_ids(
    service,
    max_results: int = 50,
    history_id: Optional[str] = None,
) -> tuple[list[str], str]:
    """List recent message IDs.

    If history_id is provided, performs incremental fetch via history.list.
    Otherwise performs a full messages.list.

    Returns (list_of_message_ids, new_history_id).
    """
    try:
        if history_id:
            resp = (
                service.users()
                .history()
                .list(
                    userId="me",
                    startHistoryId=history_id,
                    historyTypes=["messageAdded"],
                    maxResults=max_results,
                )
                .execute()
            )
            new_history_id: str = resp.get("historyId", history_id)
            histories = resp.get("history", [])
            ids: list[str] = []
            for h in histories:
                for m in h.get("messagesAdded", []):
                    msg_id = m.get("message", {}).get("id")
                    if msg_id and msg_id not in ids:
                        ids.append(msg_id)
            return ids, new_history_id
        else:
            # Paginate: Gmail caps each call at 500 messages. For large
            # inboxes we fetch up to `max_results` total across pages so
            # older but still-recent emails (Promotions tab, etc.) land in.
            ids: list[str] = []
            new_history_id = ""
            page_token: Optional[str] = None
            remaining = max_results
            while remaining > 0:
                page_size = min(remaining, 500)
                resp = (
                    service.users()
                    .messages()
                    .list(
                        userId="me",
                        maxResults=page_size,
                        pageToken=page_token,
                    )
                    .execute()
                )
                if not new_history_id:
                    new_history_id = resp.get("historyId", "")
                page_messages = resp.get("messages", [])
                ids.extend(m["id"] for m in page_messages)
                page_token = resp.get("nextPageToken")
                if not page_token or not page_messages:
                    break
                remaining = max_results - len(ids)
            return ids, new_history_id
    except HttpError as exc:
        raise GmailServiceError(f"Gmail API error listing messages: {exc}") from exc


def _decode_body(data: str) -> str:
    """Decode a base64url-encoded Gmail body part."""
    try:
        padded = data + "=" * (4 - len(data) % 4)
        return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")
    except Exception:
        return ""


def _extract_parts(payload: dict) -> Optional[tuple[str], Optional[str]]:
    """Recursively extract plain and HTML body parts from a Gmail payload."""
    mime_type: str = payload.get("mimeType", "")
    body = payload.get("body", {})
    parts = payload.get("parts", [])

    if mime_type == "text/plain":
        data = body.get("data", "")
        return _decode_body(data) if data else None, None

    if mime_type == "text/html":
        data = body.get("data", "")
        return None, _decode_body(data) if data else None

    plain: Optional[str] = None
    html: Optional[str] = None
    for part in parts:
        p, h = _extract_parts(part)
        if p and not plain:
            plain = p
        if h and not html:
            html = h

    return plain, html


def _parse_address(raw: str) -> tuple[str, str]:
    """Parse 'Name <email>' into (name, email). Returns ('', raw) if unparseable."""
    name, addr = parseaddr(raw)
    return name or "", addr or raw


def _extract_attachments(payload: dict) -> list[dict]:
    """Recursively walk message parts and collect attachment metadata.

    Returns a list of dicts with keys:
      filename, mime_type, size, gmail_attachment_id
    """
    results: list[dict] = []
    mime_type = payload.get("mimeType", "")
    body = payload.get("body", {})
    parts = payload.get("parts", [])
    filename = payload.get("filename", "")

    attachment_id = body.get("attachmentId")
    if attachment_id and filename:
        results.append(
            {
                "filename": filename,
                "mime_type": mime_type or "application/octet-stream",
                "size": body.get("size", 0),
                "gmail_attachment_id": attachment_id,
            }
        )

    for part in parts:
        results.extend(_extract_attachments(part))

    return results


def download_attachment_bytes(service, message_id: str, attachment_id: str) -> bytes:
    """Fetch attachment bytes from the Gmail API.

    The API returns base64url-encoded data; this decodes and returns raw bytes.
    """
    try:
        resp = (
            service.users()
            .messages()
            .attachments()
            .get(userId="me", messageId=message_id, id=attachment_id)
            .execute()
        )
    except HttpError as exc:
        raise GmailServiceError(
            f"Failed to download attachment {attachment_id}: {exc}"
        ) from exc

    data: str = resp.get("data", "")
    # Fix base64url padding
    padded = data + "=" * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(padded)


def fetch_message_full(service, message_id: str) -> Optional[dict]:
    """Fetch and parse a full Gmail message.

    Returns a dict with keys:
      gmail_id, thread_id, from_email, from_name, to_emails, cc_emails,
      subject, snippet, body_plain, body_html, received_at, labels,
      is_read, is_starred

    Returns None on error (logs the error).
    """
    try:
        msg = (
            service.users()
            .messages()
            .get(userId="me", id=message_id, format="full")
            .execute()
        )
    except HttpError as exc:
        logger.error("Failed to fetch message %s: %s", message_id, exc)
        return None

    payload = msg.get("payload", {})
    headers: dict[str, str] = {
        h["name"].lower(): h["value"] for h in payload.get("headers", [])
    }

    # From
    from_raw = headers.get("from", "")
    from_name, from_email = _parse_address(from_raw)

    # To
    to_raw = headers.get("to", "")
    to_emails = [
        addr
        for _, addr in (parseaddr(a.strip()) for a in to_raw.split(","))
        if addr
    ]

    # Cc
    cc_raw = headers.get("cc", "")
    cc_emails: Optional[list[str]] = None
    if cc_raw.strip():
        cc_emails = [
            addr
            for _, addr in (parseaddr(a.strip()) for a in cc_raw.split(","))
            if addr
        ]

    # Date — Postgres column is TIMESTAMP WITHOUT TIME ZONE, so we store
    # naive UTC (tz-aware datetimes crash asyncpg's codec).
    date_raw = headers.get("date", "")
    try:
        received_at = parsedate_to_datetime(date_raw)
        if received_at.tzinfo is not None:
            received_at = received_at.astimezone(timezone.utc).replace(tzinfo=None)
    except Exception:
        received_at = datetime.utcnow()

    # Body
    body_plain, body_html = _extract_parts(payload)

    # Labels → read/starred
    label_ids: list[str] = msg.get("labelIds", [])
    is_read = "UNREAD" not in label_ids
    is_starred = "STARRED" in label_ids

    return {
        "gmail_id": msg["id"],
        "thread_id": msg.get("threadId", ""),
        "from_email": from_email,
        "from_name": from_name or None,
        "to_emails": json.dumps(to_emails),
        "cc_emails": json.dumps(cc_emails) if cc_emails is not None else None,
        "subject": headers.get("subject") or None,
        "snippet": msg.get("snippet") or None,
        "body_plain": body_plain,
        "body_html": body_html,
        "received_at": received_at,
        "labels": json.dumps(label_ids),
        "is_read": is_read,
        "is_starred": is_starred,
        "attachments": _extract_attachments(payload),
    }
