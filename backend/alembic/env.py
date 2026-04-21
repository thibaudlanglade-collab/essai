"""Alembic environment.

Runs sync migrations against the same database the app uses. DATABASE_URL is
sourced from `backend/.env` (the Postgres async URL the app consumes) and
rewritten to the sync psycopg2 driver, since Alembic drives migrations
synchronously. `target_metadata` is taken from the ORM so
`alembic revision --autogenerate` can see every model declared in
`db/models.py`.
"""
from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# ---------------------------------------------------------------------------
# Make backend/ importable so we can pull in `db.models` and load `.env`.
# ---------------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

try:
    from dotenv import load_dotenv

    load_dotenv(_BACKEND_DIR / ".env")
except ImportError:
    pass

from db.database import Base  # noqa: E402
import db.models  # noqa: E402, F401  — side-effect: registers every model on Base.metadata


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# ---------------------------------------------------------------------------
# Resolve sync URL from the app's async URL.
#
# The app connects via `postgresql+asyncpg://…`; Alembic needs a sync driver
# (psycopg2) since it uses blocking connections. We rewrite the scheme here
# so that a single DATABASE_URL env var powers both.
# ---------------------------------------------------------------------------
def _sync_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        user = os.environ.get("USER") or os.environ.get("USERNAME") or "postgres"
        return f"postgresql+psycopg2://{user}@localhost:5432/synthese_dev"

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif "+asyncpg" in url:
        url = url.replace("+asyncpg", "+psycopg2")
    elif url.startswith("postgresql://") and "+psycopg2" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


config.set_main_option("sqlalchemy.url", _sync_url())


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL to stdout)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connect + apply)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
