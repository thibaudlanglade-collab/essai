"""
Async SQLAlchemy setup for the Synthese backend.

DATABASE_URL is read from the environment. Defaults to a local Postgres
database `synthese_dev` on the current user. During the migration period
a SQLite fallback remains available via `SYNTHESE_USE_SQLITE=1`.
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
    """Resolve the async SQLAlchemy DATABASE_URL from the environment.

    - Honours `DATABASE_URL` when set (Railway injects this automatically).
    - Normalises sync URLs (`postgresql://`, `postgres://`) to the async driver.
    - Falls back to a local Postgres `synthese_dev` database by default.
    - If `SYNTHESE_USE_SQLITE=1`, falls back to the legacy SQLite file.
    """
    if os.environ.get("SYNTHESE_USE_SQLITE") == "1":
        return "sqlite+aiosqlite:///./synthese.db"

    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        user = os.environ.get("USER") or os.environ.get("USERNAME") or "postgres"
        return f"postgresql+asyncpg://{user}@localhost:5432/synthese_dev"

    # Normalise to the async driver
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


DATABASE_URL = _resolve_database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# connect_args is SQLite-specific (timeout); avoid passing it to asyncpg
_connect_args: dict = {"timeout": 30} if IS_SQLITE else {}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=_connect_args,
    pool_pre_ping=not IS_SQLITE,
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
    """Create all tables on startup (no-op if they already exist).

    On Postgres, schema changes are managed by Alembic (once configured).
    This bootstrap path remains useful for SQLite dev fallback and for
    brand-new Postgres databases that have not yet been migrated.
    """
    # Import models so SQLAlchemy registers them on Base.metadata
    import db.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Legacy SQLite-only migration (no-op on Postgres)
    if IS_SQLITE:
        await _add_column_if_missing("emails", "classified_at", "DATETIME")


async def _add_column_if_missing(table: str, column: str, col_type: str) -> None:
    """Add a column to an existing SQLite table if it doesn't already exist.

    SQLite-only — Postgres uses Alembic for schema migrations.
    """
    if not IS_SQLITE:
        return
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
