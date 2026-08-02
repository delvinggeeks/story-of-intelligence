from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from academy_api.core.config import Settings, get_settings
from academy_api.main import create_app


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
