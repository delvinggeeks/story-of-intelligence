"""Configuration must resolve identically regardless of working directory or install mode."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from academy_api.core import paths
from academy_api.core.config import Settings, get_settings
from academy_api.core.exceptions import ConfigurationError
from academy_api.main import create_app

REPO_ROOT = paths.find_repository_root()
assert REPO_ROOT is not None


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> None:
    get_settings.cache_clear()


def test_env_files_are_absolute_so_the_working_directory_is_irrelevant() -> None:
    env_files = Settings.model_config["env_file"]
    assert env_files
    assert all(Path(env_file).is_absolute() for env_file in env_files)


def test_documented_relative_content_root_anchors_to_the_repository_root(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    # The documented launch path is `uv run --directory services/api`, so cwd is not the repo root.
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("ACADEMY_CONTENT_ROOT", "packages/content")

    assert Settings().content_root == REPO_ROOT / "packages" / "content"


def test_absolute_content_root_is_honoured_verbatim(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("ACADEMY_CONTENT_ROOT", str(tmp_path))

    assert Settings().content_root == tmp_path.resolve()


def test_discovery_survives_a_non_editable_install(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """With the package in site-packages, the __file__ anchor is useless."""
    site_packages = tmp_path / "site-packages" / "academy_api" / "core"
    site_packages.mkdir(parents=True)
    monkeypatch.setattr(paths, "_PACKAGE_ANCHOR", site_packages)
    monkeypatch.chdir(REPO_ROOT / "services" / "api")

    assert paths.find_repository_root() == REPO_ROOT
    assert Settings().content_root == REPO_ROOT / "packages" / "content"


def test_undiscoverable_content_root_fails_with_actionable_guidance(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(paths, "_PACKAGE_ANCHOR", tmp_path)
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("ACADEMY_CONTENT_ROOT", raising=False)

    with pytest.raises(ConfigurationError, match="ACADEMY_CONTENT_ROOT"):
        Settings()


def test_api_serves_content_under_the_documented_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.chdir(REPO_ROOT / "services" / "api")
    monkeypatch.setenv("ACADEMY_CONTENT_ROOT", "packages/content")

    with TestClient(create_app()) as client:
        assert client.get("/api/v1/graph").json()["nodes"][0]["id"] == "numbers"


def test_a_sync_postgres_driver_is_rejected_with_the_exact_replacement(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ACADEMY_DATABASE_URL", "postgresql://academy@127.0.0.1:5432/academy")

    with pytest.raises(ConfigurationError, match="postgresql\\+asyncpg://academy@"):
        Settings()


def test_a_foreign_database_scheme_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ACADEMY_DATABASE_URL", "mysql+aiomysql://academy@127.0.0.1/academy")

    with pytest.raises(ConfigurationError, match="must start with"):
        Settings()


def test_the_default_database_url_targets_local_compose_and_holds_no_real_secret() -> None:
    url = Settings().database_url

    assert url.startswith("postgresql+asyncpg://")
    assert "127.0.0.1:5432" in url


def test_an_empty_redis_url_disables_the_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ACADEMY_REDIS_URL", "")

    assert Settings().redis_url is None
