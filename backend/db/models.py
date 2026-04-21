"""
SQLAlchemy models for the Synthèse persistent store.
"""
from __future__ import annotations

import json
import secrets
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base

_DEFAULT_WORKING_DAYS = '["monday","tuesday","wednesday","thursday","friday"]'


# ─────────────────────────────────────────────────────────────────────────────
# Multi-tenant access control
# ─────────────────────────────────────────────────────────────────────────────


class AccessToken(Base):
    """Prospect access token for the multi-tenant test app.

    Each prospect receives a unique URL `synthese.fr/app/{token}` via cold email.
    Clicking activates a session: a `session_token` is generated and stored in an
    httpOnly cookie (valid 30 days). The access as a whole expires at `expires_at`
    (typically 14 days after creation). Once expired or deactivated, all data
    linked via `user_id` foreign keys is removed by ON DELETE CASCADE.

    IDs are stored as UUID strings (36 chars) for cross-database portability.
    """

    __tablename__ = "access_tokens"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Token that appears in the prospect's cold-email URL. Random, crypto-safe.
    token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )

    # Session token stored in the cookie (regenerated at every activation).
    # Keeping it separate from `token` lets us rotate sessions without
    # invalidating the underlying access link.
    session_token: Mapped[Optional[str]] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )

    # Prospect identity (populated by seed_prospects.py from the CSV)
    prospect_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    prospect_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_sector: Mapped[str] = mapped_column(
        String(100), nullable=False, default="BTP"
    )

    # Lifecycle
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    first_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # State
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    welcome_shown: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    session_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def generate_token() -> str:
        """Generate a crypto-safe 43-char URL-safe token (256 bits of entropy)."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def generate_session_token() -> str:
        """Generate a fresh session token (cookie value)."""
        return secrets.token_urlsafe(32)

    def is_usable(self, now: Optional[datetime] = None) -> bool:
        """True iff the access is both active and not expired."""
        now = now or datetime.utcnow()
        return bool(self.is_active) and self.expires_at > now

    def days_left(self, now: Optional[datetime] = None) -> int:
        """Whole days remaining before expiration (0 once expired).

        Uses ceiling arithmetic: a freshly-minted 14-day access reports 14
        during its entire first day, and only drops to 13 once less than
        13 full days remain. This matches what a prospect expects to see
        after clicking their cold-email link.
        """
        now = now or datetime.utcnow()
        if not self.expires_at or self.expires_at <= now:
            return 0
        delta = self.expires_at - now
        # `timedelta.days` floors; add 1 when there's any sub-day remainder.
        return delta.days + (1 if (delta.seconds or delta.microseconds) else 0)

    # ── Serialization ───────────────────────────────────────────────────────

    def to_dict(self, public: bool = False) -> dict[str, Any]:
        """Serialize for JSON responses.

        When `public=True` (typical for `/api/auth/me`), strip secrets
        (`token`, `session_token`) so they never leak to the client.
        """
        data: dict[str, Any] = {
            "id": self.id,
            "prospect_name": self.prospect_name,
            "prospect_email": self.prospect_email,
            "company_name": self.company_name,
            "company_sector": self.company_sector,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "first_seen_at": self.first_seen_at.isoformat() if self.first_seen_at else None,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
            "is_active": self.is_active,
            "welcome_shown": self.welcome_shown,
            "session_count": self.session_count,
            "days_left": self.days_left(),
        }
        if not public:
            data["token"] = self.token
            data["session_token"] = self.session_token
        return data


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    hours_per_week: Mapped[float] = mapped_column(Float, nullable=False, default=35.0)
    working_days: Mapped[str] = mapped_column(
        String, nullable=False, default=_DEFAULT_WORKING_DAYS
    )
    skills: Mapped[str] = mapped_column(String, nullable=False, default="[]")
    unavailable_dates: Mapped[str] = mapped_column(
        String, nullable=False, default="[]"
    )
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    position: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    hire_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # ── Serialization ─────────────────────────────────────────────────────────

    def to_dict(self) -> dict[str, Any]:
        """Return a dict with JSON fields parsed into Python lists."""
        return {
            "id": self.id,
            "name": self.name,
            "hours_per_week": self.hours_per_week,
            "working_days": json.loads(self.working_days or "[]"),
            "skills": json.loads(self.skills or "[]"),
            "unavailable_dates": json.loads(self.unavailable_dates or "[]"),
            "email": self.email,
            "phone": self.phone,
            "position": self.position,
            "hire_date": self.hire_date,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Employee":  # type: ignore[override]
        """Create an Employee instance, serializing list fields to JSON strings."""

        def _as_json_list(value: Any, default: list) -> str:
            if isinstance(value, list):
                return json.dumps(value)
            if isinstance(value, str) and value.strip():
                return json.dumps([v.strip() for v in value.split(",") if v.strip()])
            return json.dumps(default)

        return cls(
            name=data["name"],
            hours_per_week=float(data.get("hours_per_week", 35.0)),
            working_days=_as_json_list(
                data.get("working_days"),
                ["monday", "tuesday", "wednesday", "thursday", "friday"],
            ),
            skills=_as_json_list(data.get("skills"), []),
            unavailable_dates=_as_json_list(data.get("unavailable_dates"), []),
            email=data.get("email") or None,
            phone=data.get("phone") or None,
            position=data.get("position") or None,
            hire_date=data.get("hire_date") or None,
            notes=data.get("notes") or None,
        )


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
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    history_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)

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


class Email(Base):
    __tablename__ = "emails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    gmail_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    thread_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    connection_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("gmail_connections.id"), nullable=False
    )

    from_email: Mapped[str] = mapped_column(String, nullable=False)
    from_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    to_emails: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    cc_emails: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    snippet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_plain: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    received_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_starred: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    labels: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    priority: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    topic: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    classified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    attachments: Mapped[list["EmailAttachment"]] = relationship(
        "EmailAttachment", back_populates="email", cascade="all, delete-orphan"
    )

    def to_dict(self, include_attachments: bool = False) -> dict[str, Any]:
        result: dict[str, Any] = {
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
            "classified_at": self.classified_at.isoformat() if self.classified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_attachments:
            result["attachments"] = [a.to_dict() for a in self.attachments]
        return result


class EmailAttachment(Base):
    __tablename__ = "email_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("emails.id", ondelete="CASCADE"), nullable=False, index=True
    )
    gmail_attachment_id: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_downloaded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    local_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    downloaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    email: Mapped["Email"] = relationship("Email", back_populates="attachments")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "email_id": self.email_id,
            "gmail_attachment_id": self.gmail_attachment_id,
            "filename": self.filename,
            "mime_type": self.mime_type,
            "size_bytes": self.size_bytes,
            "is_downloaded": self.is_downloaded,
            "local_path": self.local_path,
            "downloaded_at": self.downloaded_at.isoformat() if self.downloaded_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class EmailTopic(Base):
    __tablename__ = "email_topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String, nullable=False, default="#6b7280")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "color": self.color,
            "display_order": self.display_order,
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Automation(Base):
    __tablename__ = "automations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    template_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    trigger_type: Mapped[str] = mapped_column(String, nullable=False)
    trigger_config: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    actions: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    on_error: Mapped[str] = mapped_column(String, nullable=False, default="stop")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_run_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "template_id": self.template_id,
            "is_active": self.is_active,
            "trigger_type": self.trigger_type,
            "trigger_config": json.loads(self.trigger_config or "{}"),
            "actions": json.loads(self.actions or "[]"),
            "on_error": self.on_error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "last_run_status": self.last_run_status,
        }


class AutomationRun(Base):
    __tablename__ = "automation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    automation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("automations.id"), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="running")
    trigger_context: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    steps_log: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    output_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "automation_id": self.automation_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "status": self.status,
            "trigger_context": json.loads(self.trigger_context or "{}"),
            "steps_log": json.loads(self.steps_log or "[]"),
            "output_summary": self.output_summary,
        }


class MorningBriefing(Base):
    __tablename__ = "morning_briefings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    briefing_date: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    emails_analyzed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    urgent_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "briefing_date": self.briefing_date,
            "content_markdown": self.content_markdown,
            "emails_analyzed_count": self.emails_analyzed_count,
            "urgent_count": self.urgent_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_read": self.is_read,
        }
