from collections.abc import AsyncIterator, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from academy_api.core.config import Settings, get_settings
from academy_api.db.base import Base
from academy_api.main import create_app

SKIP_REASON = (
    "PostgreSQL is not reachable. Start it with "
    "`docker compose -f infra/docker-compose.local.yml up -d`."
)


@pytest.fixture
def client() -> Iterator[TestClient]:
    get_settings.cache_clear()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()


@pytest.fixture
def settings() -> Settings:
    get_settings.cache_clear()
    return get_settings()


@pytest.fixture
def database_url() -> str:
    get_settings.cache_clear()
    return get_settings().database_url


@pytest.fixture
async def db_session(database_url: str) -> AsyncIterator[AsyncSession]:
    """A real PostgreSQL session wrapped in a transaction that is always rolled back.

    Nothing a test writes survives it. Skips rather than fails when PostgreSQL is absent,
    so a checkout without Docker can still run the rest of the suite.
    """
    engine = create_async_engine(database_url, poolclass=NullPool)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    # A refused connect arrives as a bare OSError that SQLAlchemy never wraps, so
    # catching SQLAlchemyError alone turns "no database" into 14 errors instead of skips.
    except (SQLAlchemyError, OSError):
        await engine.dispose()
        pytest.skip(SKIP_REASON)

    connection = await engine.connect()
    transaction = await connection.begin()
    session = AsyncSession(bind=connection, expire_on_commit=False, autoflush=False)
    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()
