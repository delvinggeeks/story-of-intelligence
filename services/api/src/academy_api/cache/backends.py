"""A deliberately tiny cache port with two adapters: Redis, and a safe no-op.

Degradation is explicit, not accidental. When Redis is unset or unreachable and
``ACADEMY_CACHE_REQUIRED`` is false, the service runs on :class:`NullCache`: every read
misses, every write is dropped, and ``/health/ready`` reports the cache as ``disabled`` or
``degraded``. Callers therefore cannot rely on the cache for correctness.

Only ``get``/``set``/``delete`` are exposed. Anything richer belongs in a later phase.
"""

import logging
from typing import Protocol, runtime_checkable

from redis.asyncio import Redis
from redis.exceptions import RedisError

from academy_api.core.config import Settings
from academy_api.core.exceptions import ConfigurationError

logger = logging.getLogger(__name__)


@runtime_checkable
class Cache(Protocol):
    """Best-effort key/value cache. No method may raise on a backend failure."""

    @property
    def name(self) -> str: ...

    async def get(self, key: str) -> str | None: ...

    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool: ...

    async def delete(self, key: str) -> bool: ...

    async def ping(self) -> bool: ...

    async def close(self) -> None: ...


class NullCache:
    """Always misses. The documented degraded mode."""

    name = "disabled"

    async def get(self, key: str) -> str | None:
        return None

    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        return False

    async def delete(self, key: str) -> bool:
        return False

    async def ping(self) -> bool:
        return False

    async def close(self) -> None:
        return None


class RedisCache:
    """Redis adapter that swallows backend errors and degrades to a miss.

    ``OSError`` is caught alongside ``RedisError`` because a refused or timed-out TCP
    connect can surface raw from the socket layer, and a cache must never fail a request.
    """

    name = "redis"

    def __init__(self, url: str, default_ttl_seconds: int) -> None:
        self._client: Redis = Redis.from_url(url, decode_responses=True)
        self._default_ttl = default_ttl_seconds

    async def get(self, key: str) -> str | None:
        try:
            value = await self._client.get(key)
        except (RedisError, OSError) as exc:
            logger.warning("Cache read failed for %s; serving as a miss: %s", key, exc)
            return None
        return str(value) if value is not None else None

    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        try:
            await self._client.set(key, value, ex=ttl_seconds or self._default_ttl)
        except (RedisError, OSError) as exc:
            logger.warning("Cache write failed for %s; continuing without it: %s", key, exc)
            return False
        return True

    async def delete(self, key: str) -> bool:
        try:
            await self._client.delete(key)
        except (RedisError, OSError) as exc:
            logger.warning("Cache delete failed for %s: %s", key, exc)
            return False
        return True

    async def ping(self) -> bool:
        try:
            return bool(await self._client.ping())
        except (RedisError, OSError):
            return False

    async def close(self) -> None:
        try:
            await self._client.aclose()
        except (RedisError, OSError) as exc:
            logger.warning("Cache shutdown failed; ignoring: %s", exc)


def build_cache(settings: Settings) -> Cache:
    if settings.redis_url is None:
        if settings.cache_required:
            raise ConfigurationError(
                "ACADEMY_CACHE_REQUIRED is true but ACADEMY_REDIS_URL is unset. Either set "
                "ACADEMY_REDIS_URL (see infra/docker-compose.local.yml) or set "
                "ACADEMY_CACHE_REQUIRED=false to run degraded."
            )
        logger.info("ACADEMY_REDIS_URL is unset; running with the cache disabled.")
        return NullCache()
    return RedisCache(settings.redis_url, settings.cache_default_ttl_seconds)
