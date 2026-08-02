from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from academy_api.core.exceptions import ConfigurationError
from academy_api.core.paths import CONTENT_SUBPATH, find_repository_root, find_service_root


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


@lru_cache
def get_settings() -> Settings:
    return Settings()
