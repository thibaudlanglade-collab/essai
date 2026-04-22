"""
Async SQLAlchemy setup for the Synthese backend.

Uses Railway's `DATABASE_URL` when present (Postgres managed plugin). Falls
back to a local SQLite file for dev. SQLite on Railway is a trap — the
container filesystem is ephemeral, so every redeploy wipes the tokens and
any other persisted state.
"""
from __future__ import annotations

import logging
import os

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)


def _resolve_database_url() -> str:
    """Return an async SQLAlchemy URL, preferring Railway's DATABASE_URL.

    Railway's Postgres plugin injects a sync-driver URL (`postgresql://…`).
    SQLAlchemy's async engine needs an explicit async driver, so we rewrite
    it to `postgresql+asyncpg://…`. Also handles the older `postgres://`
    scheme Heroku-style DBs sometimes use.
    """
    raw = os.environ.get("DATABASE_URL")
    if not raw:
        return "sqlite+aiosqlite:///./synthese.db"

    if raw.startswith("postgres://"):
        raw = "postgresql://" + raw[len("postgres://"):]
    if raw.startswith("postgresql://"):
        raw = "postgresql+asyncpg://" + raw[len("postgresql://"):]
    return raw


DATABASE_URL = _resolve_database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    # `timeout` is a SQLite-only connect arg — it would crash asyncpg.
    connect_args={"timeout": 30} if IS_SQLITE else {},
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency — yields an AsyncSession and closes it after the request."""
    async with async_session_maker() as session:
        yield session


async def init_db() -> None:
    """Create all tables on startup (no-op if they already exist)."""
    # Import models so SQLAlchemy registers them on Base.metadata
    import db.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Safe SQLite-only migration. Postgres gets the column from
    # Base.metadata.create_all on first boot; there's no legacy table to
    # amend, and `PRAGMA` would fail.
    if IS_SQLITE:
        await _add_column_if_missing("emails", "classified_at", "DATETIME")


async def _add_column_if_missing(table: str, column: str, col_type: str) -> None:
    """Add a column to an existing SQLite table if it doesn't already exist."""
    async with engine.begin() as conn:
        result = await conn.execute(
            __import__("sqlalchemy").text(f"PRAGMA table_info({table})")
        )
        existing_cols = [row[1] for row in result.fetchall()]
        if column not in existing_cols:
            await conn.execute(
                __import__("sqlalchemy").text(
                    f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
                )
            )
            logger.info("Migration: added column %s.%s", table, column)
