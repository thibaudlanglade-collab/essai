# Phase D1 — Gmail OAuth2 + Email Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Gmail OAuth2 connection, 5-minute polling sync, SQLite storage, and a Kinso-style two-pane email viewer to the Synthèse local app.

**Architecture:** Backend adds two new SQLAlchemy models (GmailConnection, Email), a gmail_service module wrapping the Google API, a gmail_sync scheduler using APScheduler, and two FastAPI routers (/api/gmail, /api/emails). Frontend adds an emailsClient, a useEmails hook, and a full EmailsView component wired into the existing mode-switching App.tsx.

**Tech Stack:** FastAPI, SQLAlchemy async + aiosqlite, google-auth-oauthlib, google-api-python-client, APScheduler 3.x, React 18, TypeScript strict, lucide-react, Tailwind CSS.

**Clarifications applied:**
- Router prefix pattern: `prefix="/gmail"` on router, registered with `prefix="/api"` in main.py (matches employees_router convention).
- PATCH endpoint: update DB in memory → call Gmail API → commit on success → 502 on failure.
- Lifespan: `init_db()` → `start_scheduler()` → yield → `stop_scheduler()`.
- Body rendering: `body_plain` in `<pre>` first, fallback to `body_html` with regex script-strip.
- `python-dotenv` already in requirements.txt — not re-added.

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `backend/requirements.txt` | Modify | Add google-auth, google-auth-oauthlib, google-api-python-client, apscheduler |
| `backend/db/models.py` | Modify | Add GmailConnection + Email models |
| `backend/services/__init__.py` | Create | Empty package marker |
| `backend/services/gmail_service.py` | Create | OAuth flow, token exchange, Gmail API client, message fetch/parse |
| `backend/services/gmail_sync.py` | Create | APScheduler setup, sync_connection, sync_all_connections |
| `backend/api/gmail_auth.py` | Create | /gmail router: status, connect, callback, disconnect, sync-now |
| `backend/api/emails.py` | Create | /emails router: list, get, patch, stats |
| `backend/main.py` | Modify | Import new routers + scheduler, update lifespan |
| `frontend/src/api/emailsClient.ts` | Create | Type definitions + all API fetch functions |
| `frontend/src/hooks/useEmails.ts` | Create | State management hook for emails feature |
| `frontend/src/components/Emails/EmailsView.tsx` | Create | Two-pane email viewer component |
| `frontend/src/components/Emails/index.ts` | Create | Barrel export |
| `frontend/src/App.tsx` | Modify | Add "emails" mode, wire EmailsView |
| `frontend/src/components/Sidebar/Sidebar.tsx` | Modify | Add Emails button + prop |

---

### Task 1: Install Python dependencies + update requirements.txt

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add deps to requirements.txt**

Append after `aiosqlite>=0.19.0`:
```
google-auth>=2.0.0
google-auth-oauthlib>=1.0.0
google-api-python-client>=2.100.0
apscheduler>=3.10.0
```

- [ ] **Step 2: Install**

```bash
cd F:\te\backend
F:\te\.venv\Scripts\pip.exe install google-auth google-auth-oauthlib google-api-python-client apscheduler
```

Expected: successful install of 4 packages (+ transitive deps like httplib2, uritemplate, cachetools, pyasn1, etc.)

- [ ] **Step 3: Verify imports**

```bash
F:\te\.venv\Scripts\python.exe -c "import google.auth; import google_auth_oauthlib; import googleapiclient; import apscheduler; print('OK')"
```

Expected: `OK`

---

### Task 2: Add GmailConnection + Email models

**Files:**
- Modify: `backend/db/models.py`

- [ ] **Step 1: Add imports at top of models.py**

After existing imports, add:
```python
from sqlalchemy import Boolean, ForeignKey, Index, Text
```
(Integer, String, DateTime, func are already imported — merge into existing import line)

- [ ] **Step 2: Append GmailConnection model**

```python
class GmailConnection(Base):
    __tablename__ = "gmail_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email_address: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    token_expiry: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    scopes: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    connected_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    history_id: Mapped[str | None] = mapped_column(String, nullable=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "email_address": self.email_address,
            "token_expiry": self.token_expiry.isoformat() if self.token_expiry else None,
            "scopes": json.loads(self.scopes or "[]"),
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
            "last_sync_at": self.last_sync_at.isoformat() if self.last_sync_at else None,
            "history_id": self.history_id,
        }
```

- [ ] **Step 3: Append Email model**

```python
class Email(Base):
    __tablename__ = "emails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    gmail_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    thread_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    connection_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("gmail_connections.id"), nullable=False
    )

    from_email: Mapped[str] = mapped_column(String, nullable=False)
    from_name: Mapped[str | None] = mapped_column(String, nullable=True)
    to_emails: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    cc_emails: Mapped[str | None] = mapped_column(Text, nullable=True)
    subject: Mapped[str | None] = mapped_column(String, nullable=True)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_plain: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_html: Mapped[str | None] = mapped_column(Text, nullable=True)

    received_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_starred: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    labels: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    priority: Mapped[str | None] = mapped_column(String, nullable=True)
    topic: Mapped[str | None] = mapped_column(String, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "gmail_id": self.gmail_id,
            "thread_id": self.thread_id,
            "connection_id": self.connection_id,
            "from_email": self.from_email,
            "from_name": self.from_name,
            "to_emails": json.loads(self.to_emails or "[]"),
            "cc_emails": json.loads(self.cc_emails or "[]") if self.cc_emails else None,
            "subject": self.subject,
            "snippet": self.snippet,
            "body_plain": self.body_plain,
            "body_html": self.body_html,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "is_read": self.is_read,
            "is_starred": self.is_starred,
            "is_archived": self.is_archived,
            "labels": json.loads(self.labels or "[]"),
            "priority": self.priority,
            "topic": self.topic,
            "ai_summary": self.ai_summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
```

- [ ] **Step 4: Verify model imports**

```bash
cd F:\te\backend
F:\te\.venv\Scripts\python.exe -c "from db.models import GmailConnection, Email; print('OK')"
```

Expected: `OK`

---

### Task 3: Create gmail_service.py

**Files:**
- Create: `backend/services/__init__.py` (empty)
- Create: `backend/services/gmail_service.py`

- [ ] **Step 1: Create empty `__init__.py`**

File content: empty (just create the file)

- [ ] **Step 2: Create `backend/services/gmail_service.py`**

```python
"""
Gmail API service: OAuth2 flow, token management, message fetch/parse.
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from email.utils import parseaddr, parsedate_to_datetime

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
_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/gmail/callback")


class GmailServiceError(Exception):
    """Raised for recoverable Gmail API or OAuth errors."""


def build_oauth_flow(state: str | None = None) -> Flow:
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


def exchange_code_for_tokens(code: str) -> dict:
    """Exchange authorization code for access + refresh tokens.

    Returns dict with keys:
      access_token, refresh_token, expiry (datetime), scopes (list[str]),
      email_address (str)
    """
    flow = build_oauth_flow()
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

    expiry = creds.expiry or datetime.now(timezone.utc)

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
    connection.token_expiry = creds.expiry or datetime.now(timezone.utc)

    return {
        "access_token": creds.token,
        "expiry": creds.expiry,
    }


def get_gmail_service(connection: GmailConnection):
    """Build a Gmail API service client. Auto-refreshes token if expired."""
    now = datetime.now(timezone.utc)
    expiry = connection.token_expiry
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    if expiry <= now:
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
    history_id: str | None = None,
) -> tuple[list[str], str]:
    """List recent message IDs.

    If history_id is provided, performs incremental fetch via history.list.
    Otherwise performs a full messages.list.

    Returns (list_of_message_ids, new_history_id).
    """
    try:
        if history_id:
            # Incremental via history
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
            # Full fetch
            resp = (
                service.users()
                .messages()
                .list(userId="me", maxResults=max_results)
                .execute()
            )
            new_history_id = resp.get("historyId", "")
            messages = resp.get("messages", [])
            ids = [m["id"] for m in messages]
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


def _extract_parts(payload: dict) -> tuple[str | None, str | None]:
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

    plain: str | None = None
    html: str | None = None
    for part in parts:
        p, h = _extract_parts(part)
        if p and not plain:
            plain = p
        if h and not html:
            html = h

    return plain, html


def _parse_address(raw: str) -> tuple[str, str]:
    """Parse 'Name <email>' into (name, email). Returns ("", raw) if unparseable."""
    name, addr = parseaddr(raw)
    return name or "", addr or raw


def fetch_message_full(service, message_id: str) -> dict | None:
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
        h["name"].lower(): h["value"]
        for h in payload.get("headers", [])
    }

    # From
    from_raw = headers.get("from", "")
    from_name, from_email = _parse_address(from_raw)

    # To
    to_raw = headers.get("to", "")
    to_emails = [addr for _, addr in (parseaddr(a.strip()) for a in to_raw.split(",")) if addr]

    # Cc
    cc_raw = headers.get("cc", "")
    cc_emails: list[str] | None = None
    if cc_raw.strip():
        cc_emails = [addr for _, addr in (parseaddr(a.strip()) for a in cc_raw.split(",")) if addr]

    # Date
    date_raw = headers.get("date", "")
    try:
        received_at = parsedate_to_datetime(date_raw)
        if received_at.tzinfo is None:
            received_at = received_at.replace(tzinfo=timezone.utc)
    except Exception:
        received_at = datetime.now(timezone.utc)

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
    }
```

- [ ] **Step 3: Verify import**

```bash
cd F:\te\backend
F:\te\.venv\Scripts\python.exe -c "from services.gmail_service import build_oauth_flow, GmailServiceError; print('OK')"
```

Expected: `OK`

---

### Task 4: Create gmail_sync.py

**Files:**
- Create: `backend/services/gmail_sync.py`

- [ ] **Step 1: Create `backend/services/gmail_sync.py`**

```python
"""
Gmail sync scheduler: polls all connected Gmail accounts every 5 minutes.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import async_session_maker
from db.models import Email, GmailConnection
from services.gmail_service import GmailServiceError, fetch_message_full, get_gmail_service, list_message_ids

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def sync_connection(connection_id: int, db: AsyncSession) -> dict:
    """Sync emails for a single GmailConnection.

    Returns: {new_emails_count, total_fetched, errors}
    """
    connection = await db.get(GmailConnection, connection_id)
    if connection is None:
        return {"new_emails_count": 0, "total_fetched": 0, "errors": [f"Connection {connection_id} not found"]}

    errors: list[str] = []
    new_emails_count = 0

    try:
        service = get_gmail_service(connection)
        message_ids, new_history_id = list_message_ids(
            service,
            max_results=50,
            history_id=connection.history_id,
        )
    except GmailServiceError as exc:
        return {"new_emails_count": 0, "total_fetched": 0, "errors": [str(exc)]}

    total_fetched = len(message_ids)

    for msg_id in message_ids:
        # Skip if already stored
        existing = await db.execute(
            select(Email).where(Email.gmail_id == msg_id)
        )
        if existing.scalar_one_or_none() is not None:
            continue

        parsed = fetch_message_full(service, msg_id)
        if parsed is None:
            errors.append(f"Failed to fetch message {msg_id}")
            continue

        email = Email(
            gmail_id=parsed["gmail_id"],
            thread_id=parsed["thread_id"],
            connection_id=connection_id,
            from_email=parsed["from_email"],
            from_name=parsed["from_name"],
            to_emails=parsed["to_emails"],
            cc_emails=parsed["cc_emails"],
            subject=parsed["subject"],
            snippet=parsed["snippet"],
            body_plain=parsed["body_plain"],
            body_html=parsed["body_html"],
            received_at=parsed["received_at"],
            labels=parsed["labels"],
            is_read=parsed["is_read"],
            is_starred=parsed["is_starred"],
        )
        db.add(email)
        new_emails_count += 1

    connection.last_sync_at = datetime.now(timezone.utc)
    if new_history_id:
        connection.history_id = new_history_id

    await db.commit()

    logger.info(
        "Sync complete for %s: %d new emails, %d fetched, %d errors",
        connection.email_address,
        new_emails_count,
        total_fetched,
        len(errors),
    )

    return {
        "new_emails_count": new_emails_count,
        "total_fetched": total_fetched,
        "errors": errors,
    }


async def sync_all_connections() -> None:
    """Sync all GmailConnections. Errors per connection are logged but don't stop others."""
    async with async_session_maker() as db:
        result = await db.execute(select(GmailConnection))
        connections = result.scalars().all()

    for conn in connections:
        try:
            async with async_session_maker() as db:
                await sync_connection(conn.id, db)
        except Exception as exc:
            logger.error("Unhandled error syncing connection %d: %s", conn.id, exc)


async def start_scheduler() -> None:
    """Start the APScheduler that polls Gmail every 5 minutes."""
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        sync_all_connections,
        trigger="interval",
        minutes=5,
        id="gmail_sync",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Gmail sync scheduler started (interval: 5 minutes)")


async def stop_scheduler() -> None:
    """Gracefully stop the scheduler on app shutdown."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Gmail sync scheduler stopped")
```

- [ ] **Step 2: Verify import**

```bash
cd F:\te\backend
F:\te\.venv\Scripts\python.exe -c "from services.gmail_sync import start_scheduler, stop_scheduler, sync_connection; print('OK')"
```

Expected: `OK`

---

### Task 5: Create gmail_auth.py router

**Files:**
- Create: `backend/api/gmail_auth.py`

- [ ] **Step 1: Create `backend/api/gmail_auth.py`**

```python
"""
FastAPI router: /gmail — OAuth2 connect flow + connection management.
Registered with prefix="/api" in main.py → final paths are /api/gmail/...
"""
from __future__ import annotations

import logging
import secrets
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Email, GmailConnection
from services.gmail_service import (
    GmailServiceError,
    build_oauth_flow,
    exchange_code_for_tokens,
)
from services.gmail_sync import sync_connection

logger = logging.getLogger(__name__)

gmail_auth_router = APIRouter(prefix="/gmail")

# In-memory state store: {state_token: expiry_timestamp}
_oauth_states: dict[str, float] = {}
_STATE_TTL_SECONDS = 600  # 10 minutes


def _generate_state() -> str:
    token = secrets.token_urlsafe(32)
    _oauth_states[token] = time.time() + _STATE_TTL_SECONDS
    return token


def _validate_state(state: str) -> bool:
    expiry = _oauth_states.pop(state, None)
    if expiry is None:
        return False
    return time.time() < expiry


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
        "last_sync_at": connection.last_sync_at.isoformat() if connection.last_sync_at else None,
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
<style>body{{background:#09090b;color:#ef4444;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}}
.box{{text-align:center;padding:2rem;}}</style></head>
<body><div class="box"><h2>Erreur de connexion</h2><p>{message}</p></div></body>
</html>""",
            status_code=400,
        )

    if not state or not _validate_state(state):
        return _html_error("Paramètre state invalide ou expiré.")

    if not code:
        return _html_error("Code d'autorisation manquant.")

    try:
        token_data = exchange_code_for_tokens(code)
    except GmailServiceError as exc:
        return _html_error(str(exc))

    # Upsert GmailConnection
    result = await db.execute(
        select(GmailConnection).where(
            GmailConnection.email_address == token_data["email_address"]
        )
    )
    connection = result.scalar_one_or_none()

    import json
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

    # Trigger immediate first sync
    try:
        async with __import__("db.database", fromlist=["async_session_maker"]).async_session_maker() as sync_db:
            await sync_connection(connection.id, sync_db)
    except Exception as exc:
        logger.warning("Initial sync failed (non-fatal): %s", exc)

    return HTMLResponse(
        content="""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Connexion réussie</title>
<style>body{background:#09090b;color:#fafafa;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.box{text-align:center;padding:2rem;border:1px solid #1f1f23;border-radius:12px;background:#0f0f12;}
h2{margin:0 0 0.5rem;font-size:1.25rem;}
p{color:#a1a1aa;margin:0;font-size:0.875rem;}
</style></head>
<body><div class="box"><h2>✓ Connexion réussie !</h2>
<p>Vous pouvez fermer cette fenêtre.</p></div></body>
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
```

- [ ] **Step 2: Fix the async_session_maker import in callback (cleaner approach)**

The `__import__` pattern in the callback is ugly. Replace that block in the callback with:

```python
    # Trigger immediate first sync
    try:
        from db.database import async_session_maker
        async with async_session_maker() as sync_db:
            await sync_connection(connection.id, sync_db)
    except Exception as exc:
        logger.warning("Initial sync failed (non-fatal): %s", exc)
```

- [ ] **Step 3: Verify import**

```bash
cd F:\te\backend
F:\te\.venv\Scripts\python.exe -c "from api.gmail_auth import gmail_auth_router; print('OK')"
```

Expected: `OK`

---

### Task 6: Create emails.py router

**Files:**
- Create: `backend/api/emails.py`

- [ ] **Step 1: Create `backend/api/emails.py`**

```python
"""
FastAPI router: /emails — list, get, update email records.
Registered with prefix="/api" in main.py → final paths are /api/emails/...
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Email, GmailConnection
from services.gmail_service import GmailServiceError, get_gmail_service

logger = logging.getLogger(__name__)

emails_router = APIRouter(prefix="/emails")


@emails_router.get("")
async def list_emails(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = Query(default=False),
    starred_only: bool = Query(default=False),
    search: str = Query(default=""),
    sort: str = Query(default="received_desc"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List emails with pagination and optional filters."""
    conditions = [Email.is_archived.is_(False)]

    if unread_only:
        conditions.append(Email.is_read.is_(False))
    if starred_only:
        conditions.append(Email.is_starred.is_(True))
    if search.strip():
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Email.subject.ilike(term),
                Email.snippet.ilike(term),
                Email.from_email.ilike(term),
                Email.from_name.ilike(term),
            )
        )

    where_clause = and_(*conditions)

    count_result = await db.execute(
        select(func.count(Email.id)).where(where_clause)
    )
    total: int = count_result.scalar_one() or 0

    order_col = (
        Email.received_at.desc() if sort == "received_desc" else Email.received_at.asc()
    )
    result = await db.execute(
        select(Email).where(where_clause).order_by(order_col).limit(limit).offset(offset)
    )
    emails = result.scalars().all()

    return {
        "emails": [e.to_dict() for e in emails],
        "total": total,
        "has_more": (offset + limit) < total,
    }


@emails_router.get("/stats/summary")
async def email_stats(db: AsyncSession = Depends(get_db)) -> dict[str, int]:
    """Return email count summary."""
    from datetime import date, datetime, timezone

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    total = (await db.execute(select(func.count(Email.id)))).scalar_one() or 0
    unread = (
        await db.execute(select(func.count(Email.id)).where(Email.is_read.is_(False)))
    ).scalar_one() or 0
    starred = (
        await db.execute(select(func.count(Email.id)).where(Email.is_starred.is_(True)))
    ).scalar_one() or 0
    today = (
        await db.execute(
            select(func.count(Email.id)).where(Email.received_at >= today_start)
        )
    ).scalar_one() or 0

    return {"total": total, "unread": unread, "starred": starred, "today": today}


@emails_router.get("/{email_id}")
async def get_email(email_id: int, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Return full email details including body."""
    email = await db.get(Email, email_id)
    if email is None:
        raise HTTPException(status_code=404, detail=f"Email {email_id} introuvable.")
    return email.to_dict()


@emails_router.patch("/{email_id}")
async def update_email(
    email_id: int,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Update email read/starred/archived state locally and in Gmail.

    Strategy: update DB row in memory → call Gmail API → commit on success → 502 on failure.
    """
    email = await db.get(Email, email_id)
    if email is None:
        raise HTTPException(status_code=404, detail=f"Email {email_id} introuvable.")

    # Track label changes for Gmail API
    labels_to_add: list[str] = []
    labels_to_remove: list[str] = []

    if "is_read" in body:
        new_val = bool(body["is_read"])
        if new_val != email.is_read:
            email.is_read = new_val
            if new_val:
                labels_to_remove.append("UNREAD")
            else:
                labels_to_add.append("UNREAD")

    if "is_starred" in body:
        new_val = bool(body["is_starred"])
        if new_val != email.is_starred:
            email.is_starred = new_val
            if new_val:
                labels_to_add.append("STARRED")
            else:
                labels_to_remove.append("STARRED")

    if "is_archived" in body:
        new_val = bool(body["is_archived"])
        if new_val != email.is_archived:
            email.is_archived = new_val
            if new_val:
                labels_to_remove.append("INBOX")
            else:
                labels_to_add.append("INBOX")

    # Sync to Gmail API if there are label changes
    if labels_to_add or labels_to_remove:
        connection = await db.get(GmailConnection, email.connection_id)
        if connection is None:
            raise HTTPException(status_code=404, detail="Connexion Gmail introuvable.")
        try:
            service = get_gmail_service(connection)
            service.users().messages().modify(
                userId="me",
                id=email.gmail_id,
                body={
                    "addLabelIds": labels_to_add,
                    "removeLabelIds": labels_to_remove,
                },
            ).execute()
        except GmailServiceError as exc:
            raise HTTPException(status_code=502, detail=f"Gmail API error: {exc}") from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Gmail API error: {exc}") from exc

    await db.commit()
    await db.refresh(email)
    return email.to_dict()
```

- [ ] **Step 2: Verify import**

```bash
cd F:\te\backend
F:\te\.venv\Scripts\python.exe -c "from api.emails import emails_router; print('OK')"
```

Expected: `OK`

---

### Task 7: Modify main.py

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Add new imports**

After `from api.employees import employees_router`, add:
```python
from api.gmail_auth import gmail_auth_router
from api.emails import emails_router
from services.gmail_sync import start_scheduler, stop_scheduler
```

- [ ] **Step 2: Update lifespan**

Replace the existing lifespan body with:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await start_scheduler()
    registry.load_all()
    yield
    await stop_scheduler()
```

- [ ] **Step 3: Register new routers**

After `app.include_router(employees_router, prefix="/api")`, add:
```python
app.include_router(gmail_auth_router, prefix="/api")
app.include_router(emails_router, prefix="/api")
```

- [ ] **Step 4: Verify full import**

```bash
cd F:\te\backend
F:\te\.venv\Scripts\python.exe -c "
from api.gmail_auth import gmail_auth_router
from api.emails import emails_router
from services.gmail_sync import start_scheduler, stop_scheduler
from db.models import GmailConnection, Email
print('All imports OK')
"
```

Expected: `All imports OK`

---

### Task 8: Create emailsClient.ts

**Files:**
- Create: `frontend/src/api/emailsClient.ts`

- [ ] **Step 1: Create `frontend/src/api/emailsClient.ts`**

```typescript
const API = "http://localhost:8000/api";

export type Email = {
  id: number;
  gmail_id: string;
  thread_id: string;
  connection_id: number;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[] | null;
  subject: string | null;
  snippet: string | null;
  body_plain: string | null;
  body_html: string | null;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  labels: string[];
  priority: string | null;
  topic: string | null;
  ai_summary: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type GmailStatus = {
  connected: boolean;
  email_address: string | null;
  last_sync_at: string | null;
  emails_count: number;
};

export type EmailsListResponse = {
  emails: Email[];
  total: number;
  has_more: boolean;
};

export type EmailStats = {
  total: number;
  unread: number;
  starred: number;
  today: number;
};

export type ListEmailsParams = {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
  starred_only?: boolean;
  search?: string;
  sort?: "received_desc" | "received_asc";
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export function getGmailStatus(): Promise<GmailStatus> {
  return request<GmailStatus>("/gmail/status");
}

export function getConnectUrl(): Promise<{ auth_url: string }> {
  return request<{ auth_url: string }>("/gmail/connect");
}

export function disconnectGmail(): Promise<void> {
  return request<void>("/gmail/disconnect", { method: "POST" });
}

export function syncNow(): Promise<{
  new_emails_count: number;
  total_fetched: number;
  errors: string[];
}> {
  return request("/gmail/sync-now", { method: "POST" });
}

export function listEmails(params: ListEmailsParams = {}): Promise<EmailsListResponse> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  if (params.unread_only) qs.set("unread_only", "true");
  if (params.starred_only) qs.set("starred_only", "true");
  if (params.search) qs.set("search", params.search);
  if (params.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  return request<EmailsListResponse>(`/emails${query ? `?${query}` : ""}`);
}

export function getEmail(id: number): Promise<Email> {
  return request<Email>(`/emails/${id}`);
}

export function updateEmail(
  id: number,
  updates: { is_read?: boolean; is_starred?: boolean; is_archived?: boolean }
): Promise<Email> {
  return request<Email>(`/emails/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export function getEmailStats(): Promise<EmailStats> {
  return request<EmailStats>("/emails/stats/summary");
}
```

---

### Task 9: Create useEmails.ts hook

**Files:**
- Create: `frontend/src/hooks/useEmails.ts`

- [ ] **Step 1: Create `frontend/src/hooks/useEmails.ts`**

```typescript
import { useCallback, useEffect, useState } from "react";
import {
  type Email,
  type EmailStats,
  type GmailStatus,
  disconnectGmail,
  getConnectUrl,
  getEmail,
  getEmailStats,
  getGmailStatus,
  listEmails,
  syncNow,
  updateEmail,
} from "../api/emailsClient";

type Filters = {
  unreadOnly: boolean;
  starredOnly: boolean;
  search: string;
};

type UseEmailsReturn = {
  status: GmailStatus | null;
  emails: Email[];
  selectedEmail: Email | null;
  stats: EmailStats | null;
  loading: boolean;
  error: string | null;
  selectedEmailId: number | null;
  filters: Filters;
  refreshStatus: () => Promise<void>;
  refreshList: () => Promise<void>;
  refreshStats: () => Promise<void>;
  setFilter: (key: keyof Filters, value: boolean | string) => void;
  selectEmail: (id: number | null) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  toggleStarred: (id: number) => Promise<void>;
  archive: (id: number) => Promise<void>;
  triggerSync: () => Promise<void>;
  connectGmail: () => Promise<void>;
  disconnectGmail: () => Promise<void>;
};

export function useEmails(): UseEmailsReturn {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    unreadOnly: false,
    starredOnly: false,
    search: "",
  });

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getGmailStatus();
      setStatus(s);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listEmails({
        limit: 100,
        unread_only: filters.unreadOnly,
        starred_only: filters.starredOnly,
        search: filters.search || undefined,
      });
      setEmails(resp.emails);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const refreshStats = useCallback(async () => {
    try {
      const s = await getEmailStats();
      setStats(s);
    } catch {
      // non-fatal
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshStatus().then((s) => {
      if ((s as unknown as void) === undefined) {
        // status fetched — check via state in next render
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When status becomes connected, load list + stats
  useEffect(() => {
    if (status?.connected) {
      refreshList();
      refreshStats();
    }
  }, [status?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch list when filters change (only if connected)
  useEffect(() => {
    if (status?.connected) {
      refreshList();
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = useCallback((key: keyof Filters, value: boolean | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const selectEmail = useCallback(async (id: number | null) => {
    setSelectedEmailId(id);
    if (id === null) {
      setSelectedEmail(null);
      return;
    }
    try {
      const email = await getEmail(id);
      setSelectedEmail(email);
      // Mark as read in list optimistically
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, is_read: true } : e))
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await updateEmail(id, { is_read: true });
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, is_read: true } : e)));
      if (selectedEmail?.id === id) setSelectedEmail((e) => e ? { ...e, is_read: true } : e);
    } catch (err) {
      setError(String(err));
    }
  }, [selectedEmail]);

  const toggleStarred = useCallback(async (id: number) => {
    const email = emails.find((e) => e.id === id);
    if (!email) return;
    const newVal = !email.is_starred;
    try {
      await updateEmail(id, { is_starred: newVal });
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, is_starred: newVal } : e)));
      if (selectedEmail?.id === id) setSelectedEmail((e) => e ? { ...e, is_starred: newVal } : e);
    } catch (err) {
      setError(String(err));
    }
  }, [emails, selectedEmail]);

  const archive = useCallback(async (id: number) => {
    try {
      await updateEmail(id, { is_archived: true });
      setEmails((prev) => prev.filter((e) => e.id !== id));
      if (selectedEmailId === id) {
        setSelectedEmailId(null);
        setSelectedEmail(null);
      }
    } catch (err) {
      setError(String(err));
    }
  }, [selectedEmailId]);

  const triggerSync = useCallback(async () => {
    setLoading(true);
    try {
      await syncNow();
      await refreshList();
      await refreshStats();
      await refreshStatus();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [refreshList, refreshStats, refreshStatus]);

  const connectGmail = useCallback(async () => {
    try {
      const { auth_url } = await getConnectUrl();
      const win = window.open(auth_url, "_blank", "width=600,height=700");
      // Poll for connection every 2s for up to 2 minutes
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        await refreshStatus();
        if (status?.connected || attempts >= 60) {
          clearInterval(interval);
          win?.close();
          if (status?.connected) {
            await refreshList();
            await refreshStats();
          }
        }
      }, 2000);
    } catch (err) {
      setError(String(err));
    }
  }, [status, refreshStatus, refreshList, refreshStats]);

  const doDisconnect = useCallback(async () => {
    try {
      await disconnectGmail();
      setStatus(null);
      setEmails([]);
      setStats(null);
      setSelectedEmailId(null);
      setSelectedEmail(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  return {
    status,
    emails,
    selectedEmail,
    stats,
    loading,
    error,
    selectedEmailId,
    filters,
    refreshStatus,
    refreshList,
    refreshStats,
    setFilter,
    selectEmail,
    markAsRead,
    toggleStarred,
    archive,
    triggerSync,
    connectGmail,
    disconnectGmail: doDisconnect,
  };
}
```

---

### Task 10: Create EmailsView.tsx

**Files:**
- Create: `frontend/src/components/Emails/EmailsView.tsx`
- Create: `frontend/src/components/Emails/index.ts`

- [ ] **Step 1: Create `frontend/src/components/Emails/EmailsView.tsx`**

```tsx
import {
  Archive,
  ArrowLeft,
  Inbox,
  Mail,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import { useEmails } from "../../hooks/useEmails";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

function stripScripts(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

type Props = { onExit: () => void };

export default function EmailsView({ onExit }: Props) {
  const {
    status,
    emails,
    selectedEmail,
    stats,
    loading,
    error,
    selectedEmailId,
    filters,
    setFilter,
    selectEmail,
    toggleStarred,
    archive,
    triggerSync,
    connectGmail,
    disconnectGmail,
    markAsRead,
  } = useEmails();

  return (
    <div className="min-h-screen bg-[#09090b] bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_50%)] flex flex-col">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="h-12 shrink-0 border-b border-[#1f1f23] flex items-center px-4 gap-4">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Mail className="h-4 w-4 text-[#fafafa]/60" />
          <span className="text-sm font-medium text-[#fafafa]">Emails</span>
        </div>
        {status?.connected && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#52525b]">
              {status.email_address}
              {status.last_sync_at && (
                <> · Synchro {timeAgo(status.last_sync_at)}</>
              )}
            </span>
            <button
              onClick={triggerSync}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#1f1f23] border border-[#2f2f35] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f47] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        )}
      </div>

      {/* ── ERROR BANNER ────────────────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* ── NOT CONNECTED ───────────────────────────────────────────────── */}
      {!status?.connected && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1f1f23] border border-[#2f2f35] flex items-center justify-center">
              <Mail className="h-8 w-8 text-[#52525b]" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-[#fafafa] mb-1">
                Connectez votre Gmail
              </h2>
              <p className="text-sm text-[#a1a1aa]">
                Synthèse va lire vos emails, les classer et vous aider à répondre plus vite.
              </p>
            </div>
            <button
              onClick={connectGmail}
              className="bg-white text-[#09090b] hover:bg-white/90 hover:shadow-[0_0_32px_rgba(255,255,255,0.12)] transition-all duration-300 px-6 py-2.5 rounded-lg font-medium text-sm"
            >
              Connecter Gmail
            </button>
            <p className="text-xs text-[#52525b]">
              Vos données restent locales sur votre machine.
            </p>
          </div>
        </div>
      )}

      {/* ── TWO-PANE LAYOUT ─────────────────────────────────────────────── */}
      {status?.connected && (
        <div className="flex flex-1 min-h-0">

          {/* LEFT PANE */}
          <div className="w-96 min-w-80 border-r border-[#1f1f23] flex flex-col min-h-0">

            {/* Stats row */}
            {stats && (
              <div className="flex gap-1.5 px-3 pt-3 pb-2 shrink-0 flex-wrap">
                {(
                  [
                    { label: "Total", value: stats.total },
                    { label: "Non lus", value: stats.unread },
                    { label: "Étoilés", value: stats.starred },
                    { label: "Aujourd'hui", value: stats.today },
                  ] as const
                ).map(({ label, value }) => (
                  <span
                    key={label}
                    className="text-xs px-2 py-0.5 rounded-full bg-[#1f1f23] border border-[#2f2f35] text-[#a1a1aa]"
                  >
                    {label} <span className="text-[#fafafa] font-medium">{value}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Filter row */}
            <div className="flex items-center gap-2 px-3 pb-2 shrink-0">
              <div className="flex-1 flex items-center gap-2 bg-[#1f1f23] border border-[#2f2f35] rounded-lg px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-[#52525b] shrink-0" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={filters.search}
                  onChange={(e) => setFilter("search", e.target.value)}
                  className="bg-transparent text-xs text-[#fafafa] placeholder:text-[#52525b] outline-none flex-1 min-w-0"
                />
              </div>
              <button
                onClick={() => setFilter("unreadOnly", !filters.unreadOnly)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  filters.unreadOnly
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-[#1f1f23] border-[#2f2f35] text-[#a1a1aa] hover:text-[#fafafa]"
                }`}
              >
                Non lus
              </button>
              <button
                onClick={() => setFilter("starredOnly", !filters.starredOnly)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  filters.starredOnly
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-[#1f1f23] border-[#2f2f35] text-[#a1a1aa] hover:text-[#fafafa]"
                }`}
              >
                Étoilés
              </button>
            </div>

            {/* Email list */}
            <div className="flex-1 overflow-y-auto">
              {emails.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
                  <Inbox className="h-8 w-8 text-[#52525b]" />
                  <p className="text-sm text-[#52525b]">
                    Aucun email. Cliquez sur Actualiser pour synchroniser.
                  </p>
                </div>
              )}
              {emails.map((email) => (
                <button
                  key={email.id}
                  onClick={async () => {
                    await selectEmail(email.id);
                    if (!email.is_read) await markAsRead(email.id);
                  }}
                  className={`w-full text-left px-3 py-3 border-b border-[#1f1f23] hover:bg-[#1f1f23]/60 transition-colors flex gap-2 ${
                    selectedEmailId === email.id ? "bg-[#1f1f23]" : ""
                  }`}
                >
                  {/* Unread dot */}
                  <div className="pt-1 shrink-0 w-2">
                    {!email.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-sm truncate ${
                          email.is_read ? "text-[#a1a1aa]" : "text-[#fafafa] font-semibold"
                        }`}
                      >
                        {email.from_name || email.from_email}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {email.is_starred && (
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        )}
                        <span className="text-xs text-[#52525b]">
                          {timeAgo(email.received_at)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#fafafa]/80 truncate">
                      {email.subject || "(sans objet)"}
                    </p>
                    <p className="text-xs text-[#52525b] truncate mt-0.5">
                      {email.snippet}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT PANE */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {!selectedEmail && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Mail className="h-8 w-8 text-[#52525b]" />
                  <p className="text-sm text-[#52525b]">Sélectionnez un email à gauche</p>
                </div>
              </div>
            )}

            {selectedEmail && (
              <>
                {/* Email header */}
                <div className="shrink-0 border-b border-[#1f1f23] px-6 py-4">
                  <h2 className="text-xl font-medium text-[#fafafa] mb-2">
                    {selectedEmail.subject || "(sans objet)"}
                  </h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1aa]">
                        <span className="text-[#fafafa]">
                          {selectedEmail.from_name || selectedEmail.from_email}
                        </span>
                        {selectedEmail.from_name && (
                          <span className="ml-1 text-[#52525b]">
                            &lt;{selectedEmail.from_email}&gt;
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#52525b] mt-0.5">
                        {new Date(selectedEmail.received_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleStarred(selectedEmail.id)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          selectedEmail.is_starred
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                            : "bg-[#1f1f23] border-[#2f2f35] text-[#52525b] hover:text-amber-400"
                        }`}
                        title="Étoile"
                      >
                        <Star
                          className={`h-4 w-4 ${selectedEmail.is_starred ? "fill-amber-400" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => archive(selectedEmail.id)}
                        className="p-1.5 rounded-lg border bg-[#1f1f23] border-[#2f2f35] text-[#52525b] hover:text-[#fafafa] transition-all"
                        title="Archiver"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => markAsRead(selectedEmail.id)}
                        className="p-1.5 rounded-lg border bg-[#1f1f23] border-[#2f2f35] text-[#52525b] hover:text-[#fafafa] transition-all text-xs px-2.5"
                        title="Marquer non lu"
                      >
                        Non lu
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {selectedEmail.body_plain ? (
                    <pre className="whitespace-pre-wrap text-sm text-[#a1a1aa] font-sans leading-relaxed">
                      {selectedEmail.body_plain}
                    </pre>
                  ) : selectedEmail.body_html ? (
                    <div
                      className="prose prose-invert prose-sm max-w-none text-[#a1a1aa]"
                      dangerouslySetInnerHTML={{
                        __html: stripScripts(selectedEmail.body_html),
                      }}
                    />
                  ) : (
                    <p className="text-sm text-[#52525b]">Corps du message non disponible.</p>
                  )}
                </div>

                {/* Reply footer */}
                <div className="shrink-0 border-t border-[#1f1f23] px-6 py-3">
                  <button
                    disabled
                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-[#1f1f23] border border-[#2f2f35] text-[#52525b] cursor-not-allowed opacity-60"
                  >
                    Répondre
                    <span className="text-xs text-[#3f3f47] ml-1">
                      — Brouillons IA disponibles en Phase D2
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/Emails/index.ts`**

```typescript
export { default as EmailsView } from "./EmailsView";
```

---

### Task 11: Modify App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add "emails" to activeMode type and import EmailsView**

Replace:
```typescript
const [activeMode, setActiveMode] = useState<"classic" | "smart" | "planner">("classic");
```
With:
```typescript
const [activeMode, setActiveMode] = useState<"classic" | "smart" | "planner" | "emails">("classic");
```

Add import after existing imports:
```typescript
import { EmailsView } from "./components/Emails";
```

- [ ] **Step 2: Add handleEmailsClick function**

After `handlePlannerClick`, add:
```typescript
  function handleEmailsClick() {
    reset();
    setSelected(null);
    setActiveMode("emails");
  }
```

- [ ] **Step 3: Add onEmailsClick prop to Sidebar**

In the `<Sidebar>` JSX, add:
```typescript
        onEmailsClick={handleEmailsClick}
        emailsModeActive={activeMode === "emails"}
```

- [ ] **Step 4: Add EmailsView render**

After the planner mode block and before the classic mode block, add:
```tsx
        {/* Emails mode */}
        {activeMode === "emails" && (
          <div className="flex-1 overflow-hidden bg-[#09090b]">
            <EmailsView onExit={() => setActiveMode("classic")} />
          </div>
        )}
```

---

### Task 12: Modify Sidebar.tsx

**Files:**
- Modify: `frontend/src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Add Mail import**

Replace:
```typescript
import { Zap, Sparkles, Calendar } from "lucide-react";
```
With:
```typescript
import { Zap, Sparkles, Calendar, Mail } from "lucide-react";
```

- [ ] **Step 2: Add onEmailsClick and emailsModeActive to Props interface**

Replace:
```typescript
interface Props {
  features: Feature[];
  selectedId: string | null;
  onSelect: (feature: Feature) => void;
  onSmartExtractClick?: () => void;
  smartModeActive?: boolean;
  onPlannerClick?: () => void;
  plannerModeActive?: boolean;
}
```
With:
```typescript
interface Props {
  features: Feature[];
  selectedId: string | null;
  onSelect: (feature: Feature) => void;
  onSmartExtractClick?: () => void;
  smartModeActive?: boolean;
  onPlannerClick?: () => void;
  plannerModeActive?: boolean;
  onEmailsClick?: () => void;
  emailsModeActive?: boolean;
}
```

- [ ] **Step 3: Destructure new props**

Replace:
```typescript
export function Sidebar({
  features,
  selectedId,
  onSelect,
  onSmartExtractClick,
  smartModeActive,
  onPlannerClick,
  plannerModeActive,
}: Props) {
```
With:
```typescript
export function Sidebar({
  features,
  selectedId,
  onSelect,
  onSmartExtractClick,
  smartModeActive,
  onPlannerClick,
  plannerModeActive,
  onEmailsClick,
  emailsModeActive,
}: Props) {
```

- [ ] **Step 4: Add Emails button after Planificateur button**

After the closing `</button>` of the Planificateur button and before the closing `</SidebarSection>`, add:
```tsx
          <button
            onClick={onEmailsClick}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md transition-colors",
              emailsModeActive
                ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            Emails
          </button>
```

---

### Task 13: Verification

- [ ] **Step 1: Python full import check**

```bash
cd F:\te\backend
F:\te\.venv\Scripts\python.exe -c "
from api.gmail_auth import gmail_auth_router
from api.emails import emails_router
from services.gmail_sync import start_scheduler, stop_scheduler
from db.models import GmailConnection, Email
print('All imports OK')
"
```

- [ ] **Step 2: Environment variables check**

```bash
F:\te\.venv\Scripts\python.exe -c "
import os
import config  # triggers load_dotenv
print('CLIENT_ID:', 'OK' if os.environ.get('GOOGLE_CLIENT_ID') else 'MISSING')
print('CLIENT_SECRET:', 'OK' if os.environ.get('GOOGLE_CLIENT_SECRET') else 'MISSING')
print('REDIRECT_URI:', os.environ.get('GOOGLE_REDIRECT_URI', 'MISSING'))
"
```

- [ ] **Step 3: Kill existing backend and restart**

```powershell
powershell.exe -Command "
Get-Process | Where-Object { \$_.ProcessName -like '*python*' } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
\$proc = Start-Process -FilePath 'F:\te\.venv\Scripts\python.exe' -ArgumentList '-m','uvicorn','main:app','--host','127.0.0.1','--port','8000' -WorkingDirectory 'F:\te\backend' -WindowStyle Hidden -PassThru -RedirectStandardOutput 'F:\te\backend\.uvicorn.log' -RedirectStandardError 'F:\te\backend\.uvicorn.err.log'
Write-Output ('BACKEND_PID: ' + \$proc.Id)
Start-Sleep -Seconds 6
curl.exe -s http://127.0.0.1:8000/docs -o NUL -w 'BACKEND: %{http_code}'
"
```

- [ ] **Step 4: Check new endpoints registered**

```powershell
powershell.exe -Command "curl.exe -s http://127.0.0.1:8000/openapi.json | Select-String -Pattern '/api/gmail|/api/emails'"
```

- [ ] **Step 5: Verify DB tables**

```powershell
powershell.exe -Command "F:\te\.venv\Scripts\python.exe -c \"import sqlite3; conn = sqlite3.connect('F:/te/backend/synthese.db'); cur = conn.cursor(); cur.execute('SELECT name FROM sqlite_master WHERE type=\\\"table\\\"'); print([r[0] for r in cur.fetchall()])\""
```

Expected: list includes `employees`, `gmail_connections`, `emails`

- [ ] **Step 6: TypeScript check**

```bash
cd F:\te\frontend
npx tsc --noEmit
```

Fix any errors (max 3 rounds).
