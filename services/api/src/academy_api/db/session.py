"""Engine and session lifecycle.

The engine is created once per application and disposed on shutdown. Nothing in this
module opens a connection at import time, so the service still starts (and content still
renders) when PostgreSQL is down - readiness reports the failure instead.
"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from academy_api.core.config import Settings
from academy_api.core.exceptions import DatabaseUnavailableError
from academy_api.db import immutability as _immutability  # noqa: F401  (registers the guard)

logger = logging.getLogger(__name__)


class Database:
    """Owns the engine and hands out sessions. One instance per application."""

    def __init__(self, settings: Settings) -> None:
        self._url = settings.database_url
        self._engine: AsyncEngine = create_async_engine(
            settings.database_url,
            echo=settings.database_echo,
            pool_size=settings.database_pool_size,
            max_overflow=settings.database_max_overflow,
            pool_pre_ping=True,
        )
        self._sessionmaker = async_sessionmaker(
            self._engine, expire_on_commit=False, autoflush=False
        )

    @property
    def engine(self) -> AsyncEngine:
        return self._engine

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        """One unit of work. Commits on success, rolls back on any exception."""
        async with self._sessionmaker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def check(self) -> None:
        """Raise ``DatabaseUnavailableError`` with an actionable message if unreachable."""
        try:
            async with self._engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
        # A refused or timed-out TCP connect surfaces as a bare OSError from the driver,
        # never wrapped by SQLAlchemy, so catching SQLAlchemyError alone leaks a 500.
        except (SQLAlchemyError, OSError) as exc:
            raise DatabaseUnavailableError(
                f"Cannot reach the database at {_redact(self._url)}. "
                "Start it with `docker compose -f infra/docker-compose.local.yml up -d`, "
                "then apply migrations with "
                "`uv run --directory services/api alembic upgrade head`. "
                f"Underlying error: {type(exc).__name__}."
            ) from exc

    async def dispose(self) -> None:
        await self._engine.dispose()


def _redact(url: str) -> str:
    """Strip credentials so a connection string is safe to log or return."""
    scheme, _, remainder = url.partition("://")
    _, at, host = remainder.rpartition("@")
    return f"{scheme}://{host}" if at else url
