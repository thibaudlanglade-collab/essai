"""
Async SQLAlchemy setup for the Synthese backend.
Database file: backend/synthese.db
"""
from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

DATABASE_URL = "sqlite+aiosqlite:///./synthese.db"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"timeout": 30},
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

    # Safe migration: add classified_at to emails if it doesn't exist yet
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
