"""
SQLAlchemy models for the Synthèse persistent store.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base

_DEFAULT_WORKING_DAYS = '["monday","tuesday","wednesday","thursday","friday"]'


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
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    position: Mapped[str | None] = mapped_column(String, nullable=True)
    hire_date: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
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
    classified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

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
    local_path: Mapped[str | None] = mapped_column(String, nullable=True)
    downloaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
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
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_id: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    trigger_type: Mapped[str] = mapped_column(String, nullable=False)
    trigger_config: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    actions: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    on_error: Mapped[str] = mapped_column(String, nullable=False, default="stop")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_run_status: Mapped[str | None] = mapped_column(String, nullable=True)

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
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="running")
    trigger_context: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    steps_log: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    output_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

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
