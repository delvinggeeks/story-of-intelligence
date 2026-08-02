import logging
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from academy_api.api.dependencies import get_cache, get_database
from academy_api.cache.backends import Cache, NullCache
from academy_api.core.config import Settings, get_settings
from academy_api.core.exceptions import DatabaseUnavailableError
from academy_api.db.session import Database
from academy_api.main import create_app


class _UnavailableDatabase:
    async def check(self) -> None:
        raise DatabaseUnavailableError("Cannot reach the database at postgresql+asyncpg://host/db.")


class _WorkingDatabase:
    async def check(self) -> None:
        return None


class _DegradedCache(NullCache):
    name = "redis"


def client_with(database: object, cache: Cache) -> Iterator[TestClient]:
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_database] = lambda: database
    app.dependency_overrides[get_cache] = lambda: cache
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()


@pytest.fixture
def healthy_client() -> Iterator[TestClient]:
    yield from client_with(_WorkingDatabase(), NullCache())


def test_liveness_reports_ok(client: TestClient) -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_liveness_does_not_depend_on_the_database() -> None:
    for test_client in client_with(_UnavailableDatabase(), NullCache()):
        assert test_client.get("/health/live").status_code == 200


def test_readiness_is_ready_when_the_database_answers(healthy_client: TestClient) -> None:
    response = healthy_client.get("/health/ready")
    body = response.json()

    assert response.status_code == 200
    assert body["status"] == "ready"
    assert body["database"]["status"] == "ok"


def test_readiness_reports_a_disabled_cache_without_failing(healthy_client: TestClient) -> None:
    body = healthy_client.get("/health/ready").json()

    assert body["status"] == "ready"
    assert body["cache"]["status"] == "disabled"


def test_readiness_reports_a_degraded_cache_but_stays_ready() -> None:
    for test_client in client_with(_WorkingDatabase(), _DegradedCache()):
        response = test_client.get("/health/ready")
        body = response.json()

        assert response.status_code == 200
        assert body["status"] == "ready"
        assert body["cache"]["status"] == "degraded"


def test_readiness_is_503_with_actionable_detail_when_the_database_is_down() -> None:
    for test_client in client_with(_UnavailableDatabase(), NullCache()):
        response = test_client.get("/health/ready")
        body = response.json()

        assert response.status_code == 503
        assert body["status"] == "not-ready"
        assert body["database"]["status"] == "unavailable"
        assert "Cannot reach the database" in body["database"]["detail"]


async def test_a_real_engine_reports_a_refused_connection_as_unavailable() -> None:
    """Regression: a refused TCP connect arrives as a bare OSError, not a SQLAlchemyError.

    Catching only SQLAlchemyError here leaked a 500 from /health/ready instead of a 503.
    """
    get_settings.cache_clear()
    # Port 1 is reserved and never listening, so the connect is refused immediately.
    settings = Settings(database_url="postgresql+asyncpg://academy:pw@127.0.0.1:1/academy")  # type: ignore[call-arg]
    database = Database(settings)
    try:
        with pytest.raises(DatabaseUnavailableError) as caught:
            await database.check()
    finally:
        await database.dispose()
        get_settings.cache_clear()

    message = str(caught.value)
    assert "alembic upgrade head" in message
    assert "docker compose" in message
    # The credential must never appear in a message that reaches a client.
    assert "pw" not in message


def test_content_still_renders_while_the_database_is_down() -> None:
    """A database outage must not break read-only content delivery."""
    for test_client in client_with(_UnavailableDatabase(), NullCache()):
        response = test_client.get("/api/v1/graph")

        assert response.status_code == 200
        assert response.json()["nodes"][0]["id"] == "numbers"


def test_the_app_configures_logging_so_its_own_records_are_emitted() -> None:
    """uvicorn configures only its own loggers; without this, INFO lines vanish."""
    root = logging.getLogger()
    saved_handlers, saved_level = root.handlers[:], root.level
    for handler in saved_handlers:
        root.removeHandler(handler)

    try:
        create_app()

        assert root.handlers, "the application left the root logger without a handler"
        assert logging.getLogger("academy_api.services.tutoring").isEnabledFor(logging.INFO)
    finally:
        for handler in root.handlers[:]:
            root.removeHandler(handler)
        for handler in saved_handlers:
            root.addHandler(handler)
        root.setLevel(saved_level)
