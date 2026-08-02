from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from academy_api.core.exceptions import ConfigurationError
from academy_api.core.paths import CONTENT_SUBPATH, find_repository_root, find_service_root

_SYNC_POSTGRES_SCHEME = "postgresql://"
_ASYNC_POSTGRES_SCHEME = "postgresql+asyncpg"


def _env_files() -> tuple[Path, ...]:
    """Absolute ``.env`` locations, service-local last so it wins."""
    roots = (find_repository_root(), find_service_root())
    return tuple(root / ".env" for root in roots if root is not None)


def _default_content_root() -> Path:
    root = find_repository_root()
    if root is None:
        raise ConfigurationError(
            "Could not locate packages/content. Set ACADEMY_CONTENT_ROOT to an absolute path, "
            "or to a path relative to the repository root."
        )
    return root / CONTENT_SUBPATH


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ACADEMY_",
        env_file=_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "local"
    api_v1_prefix: str = "/api/v1"
    content_root: Path = Field(default_factory=_default_content_root)
    cors_origins: list[str] = Field(default=["http://127.0.0.1:3000", "http://localhost:3000"])

    # Local-only default matching infra/docker-compose.local.yml. Real deployments must
    # supply ACADEMY_DATABASE_URL; nothing secret is committed.
    database_url: str = "postgresql+asyncpg://academy:academy_local_dev@127.0.0.1:5432/academy"
    database_pool_size: int = Field(default=5, ge=1)
    database_max_overflow: int = Field(default=5, ge=0)
    database_echo: bool = False

    # Redis is a cache only. Unset it to run without one; content rendering must not care.
    redis_url: str | None = "redis://127.0.0.1:6379/0"
    cache_required: bool = False
    cache_default_ttl_seconds: int = Field(default=300, ge=1)

    # ADR-0007 D6 erasure. Unset means the endpoint does not exist, not that it is open.
    erasure_token: str | None = None

    @field_validator("content_root")
    @classmethod
    def _anchor_content_root(cls, value: Path) -> Path:
        """Relative values are anchored to the repository root, never to the cwd."""
        if value.is_absolute():
            return value.resolve()
        root = find_repository_root()
        if root is None:
            raise ConfigurationError(
                f"ACADEMY_CONTENT_ROOT='{value}' is relative but the repository root could not "
                "be located. Provide an absolute path instead."
            )
        return (root / value).resolve()

    @field_validator("database_url")
    @classmethod
    def _require_async_driver(cls, value: str) -> str:
        """A sync driver would block the event loop, so fail at startup instead."""
        if value.startswith(_SYNC_POSTGRES_SCHEME):
            suggestion = value.replace(_SYNC_POSTGRES_SCHEME, f"{_ASYNC_POSTGRES_SCHEME}://", 1)
            raise ConfigurationError(
                f"ACADEMY_DATABASE_URL must use an async driver. Replace the scheme, e.g. "
                f"'{suggestion}'."
            )
        if not value.startswith(f"{_ASYNC_POSTGRES_SCHEME}://"):
            raise ConfigurationError(
                f"ACADEMY_DATABASE_URL must start with '{_ASYNC_POSTGRES_SCHEME}://'. "
                f"Got '{value.split('://')[0]}://'."
            )
        return value

    @field_validator("redis_url")
    @classmethod
    def _normalise_redis_url(cls, value: str | None) -> str | None:
        """An empty string is the documented way to disable the cache."""
        return value or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
