"""
SQLAlchemy models for the Synthèse persistent store.
"""
from __future__ import annotations

import json
import secrets
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
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
    # Nullable during Sprint 1 migration: legacy rows predate multi-tenant.
    # Sprint 2+ endpoints always set this via Depends(get_current_user).
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("access_tokens.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
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
    # Nullable during Sprint 1 migration; Sprint 6 (Gmail OAuth) will require it.
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("access_tokens.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
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
    # Multi-tenant owner. Nullable during Sprint 1 migration; seed emails and
    # Sprint 6 Gmail-synced emails will both populate this.
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("access_tokens.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # Gmail-only fields, nullable so the same table holds seed + Gmail rows
    # (brief §4 unified `emails` table).
    gmail_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    thread_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    connection_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("gmail_connections.id"), nullable=True
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

    # Unified schema additions (brief §4). Populated by seed emails (§10.5)
    # and by Sprint 6 Gmail sync; legacy rows default to gmail-only semantics.
    category: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # 'facture' | 'client' | 'fournisseur' | 'admin' | 'newsletter'
    is_important: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    related_client_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Cross-links used by the seed (§10.5) and by Sprint 4+ (assistant,
    # rapport client) to resolve an email back to the quote/invoice/
    # supplier it references. All SET NULL on delete — an email survives
    # the deletion of its referents as free-form text.
    related_supplier_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    related_quote_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("quotes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    related_invoice_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_seed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_from_gmail: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

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
    # Redundant with Email.user_id but simplifies isolation queries that
    # don't need to join emails. Nullable during migration.
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("access_tokens.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
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
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("access_tokens.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # Unique per tenant, not globally — each prospect can have their own
    # topic names. Legacy `unique=True` dropped during Sprint 1 migration.
    name: Mapped[str] = mapped_column(String, nullable=False)
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
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("access_tokens.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # Unique per tenant (legacy `unique=True` dropped during multi-tenant migration).
    name: Mapped[str] = mapped_column(String, nullable=False)
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
    # Denormalised from Automation.user_id to simplify isolation queries.
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("access_tokens.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
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
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("access_tokens.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # Unique per (user_id, briefing_date) — not globally — but enforced at
    # the application layer during Sprint 1 migration (legacy rows have
    # NULL user_id and their `unique=True` constraint is incompatible).
    briefing_date: Mapped[str] = mapped_column(String, nullable=False)
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


# ─────────────────────────────────────────────────────────────────────────────
# Multi-tenant domain tables (brief §4)
#
# All rows carry a non-null `user_id` FK to `access_tokens.id` with
# `ondelete="CASCADE"`: expiring or revoking an access wipes every linked row
# by the RGPD design (brief §12).
#
# IDs are UUID strings (36 chars) for cross-database portability.
# JSON payloads use the portable `JSON` type which maps to JSONB on Postgres
# and to a TEXT-backed JSON on SQLite.
# ─────────────────────────────────────────────────────────────────────────────


_USER_FK = "access_tokens.id"


def _new_uuid() -> str:
    return str(uuid.uuid4())


class OAuthConnection(Base):
    """Encrypted OAuth credentials per (user_id, provider).

    `access_token` and `refresh_token` are stored as Fernet ciphertext —
    see `services/crypto.py`. Plaintext never hits the database.
    """

    __tablename__ = "oauth_connections"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_oauth_user_provider"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # 'gmail' | 'google_drive' | 'dropbox'
    access_token: Mapped[str] = mapped_column(Text, nullable=False)  # Fernet ciphertext
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Fernet ciphertext
    scopes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as text
    account_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    connected_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        """Serialise without exposing the ciphertexts."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "provider": self.provider,
            "account_email": self.account_email,
            "scopes": json.loads(self.scopes) if self.scopes else [],
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
        }


class Client(Base):
    """Prospect's customers. Seed rows have `is_seed=True` (brief §10.2)."""

    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'particulier'|'sci'|'copro'|'mairie'|'promoteur'
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "type": self.type,
            "address": self.address,
            "email": self.email,
            "phone": self.phone,
            "notes": self.notes,
            "is_seed": self.is_seed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Supplier(Base):
    """Prospect's suppliers. Seed rows have `is_seed=True` (brief §10.1)."""

    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    siret: Mapped[Optional[str]] = mapped_column(String(14), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "category": self.category,
            "siret": self.siret,
            "city": self.city,
            "notes": self.notes,
            "is_seed": self.is_seed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Invoice(Base):
    """Supplier invoices received by the prospect (brief §4 + §5.1 Smart Extract output)."""

    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    supplier_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    invoice_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)
    amount_ht: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    vat_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    amount_vat: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    amount_ttc: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    auto_liquidation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # File tracking (Sprint 3 automation)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stored_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Structured extraction output (lines, notes, OCR metadata). Portable JSON.
    extracted_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="processed")
    is_seed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "supplier_id": self.supplier_id,
            "invoice_number": self.invoice_number,
            "invoice_date": self.invoice_date.isoformat() if self.invoice_date else None,
            "amount_ht": float(self.amount_ht) if self.amount_ht is not None else None,
            "vat_rate": float(self.vat_rate) if self.vat_rate is not None else None,
            "amount_vat": float(self.amount_vat) if self.amount_vat is not None else None,
            "amount_ttc": float(self.amount_ttc) if self.amount_ttc is not None else None,
            "auto_liquidation": self.auto_liquidation,
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "file_path": self.file_path,
            "raw_text": self.raw_text,
            "extracted_data": self.extracted_data,
            "status": self.status,
            "is_seed": self.is_seed,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }


class Quote(Base):
    """Quotes issued by the prospect to their clients (brief §5.4)."""

    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    quote_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # List of {label, quantity, unit, unit_price_ht, total_ht}. Portable JSON.
    lines: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    amount_ht: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    vat_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    amount_ttc: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")  # 'draft'|'sent'|'accepted'|'refused'
    created_from: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'manual'|'email'|'description'
    source_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "client_id": self.client_id,
            "quote_number": self.quote_number,
            "title": self.title,
            "description": self.description,
            "lines": self.lines or [],
            "amount_ht": float(self.amount_ht) if self.amount_ht is not None else None,
            "vat_rate": float(self.vat_rate) if self.vat_rate is not None else None,
            "amount_ttc": float(self.amount_ttc) if self.amount_ttc is not None else None,
            "status": self.status,
            "created_from": self.created_from,
            "source_text": self.source_text,
            "is_seed": self.is_seed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TarifGrid(Base):
    """Grille tarifaire du prospect (postes et prix unitaires).

    Sert de référence au générateur de devis (Sprint 3) pour produire des
    lignes cohérentes avec les tarifs réels du prospect. Un seed BTP est
    inséré à la création du tenant (cf. `scripts/seed_btp_data.py`).
    Le prospect peut ensuite ajouter/modifier/supprimer librement.
    """

    __tablename__ = "tarif_grids"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    unit_price_ht: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    vat_rate: Mapped[float] = mapped_column(
        Numeric(5, 4), nullable=False, default=0.20
    )
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_seed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("user_id", "key", name="uq_tarif_grids_user_key"),
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "key": self.key,
            "label": self.label,
            "unit": self.unit,
            "unit_price_ht": float(self.unit_price_ht) if self.unit_price_ht is not None else None,
            "vat_rate": float(self.vat_rate) if self.vat_rate is not None else None,
            "category": self.category,
            "is_seed": self.is_seed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Extraction(Base):
    """Smart Extract (§5.1) history: raw document → structured data."""

    __tablename__ = "extractions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'photo'|'pdf'|'text'
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stored_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    document_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'invoice'|'contract'|'note'|'other'
    target_folder: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "source_type": self.source_type,
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "raw_text": self.raw_text,
            "extracted_data": self.extracted_data,
            "document_type": self.document_type,
            "target_folder": self.target_folder,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WatchedFolder(Base):
    """Drive/Dropbox folders polled by the automation engine (brief §6.2)."""

    __tablename__ = "watched_folders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # 'google_drive' | 'dropbox'
    folder_id: Mapped[str] = mapped_column(String(255), nullable=False)
    folder_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    files_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "provider": self.provider,
            "folder_id": self.folder_id,
            "folder_name": self.folder_name,
            "last_checked_at": self.last_checked_at.isoformat() if self.last_checked_at else None,
            "files_processed": self.files_processed,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ClientReportFolder(Base):
    """Drive folders the prospect wants searched when asking questions
    about a client on the Rapport Client page (brief §5.3).

    Tenant-level: all enabled folders are searched for every client
    question. A prospect typically configures 1-3 folders that contain
    their BTP archives (devis envoyés, factures émises, scans chantier),
    on top of whatever is already ingested in the DB or polled by the
    Sprint 3 watched folder.
    """

    __tablename__ = "client_report_folders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(
        String(50), nullable=False, default="google_drive"
    )
    folder_id: Mapped[str] = mapped_column(String(255), nullable=False)
    folder_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "provider": self.provider,
            "folder_id": self.folder_id,
            "folder_name": self.folder_name,
            "is_enabled": self.is_enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ActivityLog(Base):
    """Structured activity log (brief §12 monitoring)."""

    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(_USER_FK, ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    # Free-form metadata (IDs of touched resources, input sizes, error info).
    activity_metadata: Mapped[Optional[dict]] = mapped_column(
        "metadata", JSON, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "metadata": self.activity_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AssistantConversation(Base):
    """A multi-turn conversation between a prospect and the assistant.

    Owned by a single `access_token` (the prospect) and cascade-deleted
    when the token is removed (RGPD + trial expiry cleanup).
    """

    __tablename__ = "assistant_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("access_tokens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    messages: Mapped[list["AssistantMessage"]] = relationship(
        "AssistantMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AssistantMessage.id",
    )

    def to_dict(self, include_messages: bool = False) -> dict[str, Any]:
        result: dict[str, Any] = {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_messages:
            result["messages"] = [m.to_dict() for m in self.messages]
        return result


class AssistantMessage(Base):
    """One message in an assistant conversation.

    `content_json` stores the full OpenAI-shape message dict (role, content,
    tool_calls, tool_call_id, …) so the API loop can be resumed across turns
    without re-deriving state.
    """

    __tablename__ = "assistant_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assistant_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    conversation: Mapped["AssistantConversation"] = relationship(
        "AssistantConversation", back_populates="messages"
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "role": self.role,
            "content": json.loads(self.content_json or "{}"),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
