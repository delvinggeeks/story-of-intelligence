"""The cache must never be load-bearing: degradation has to be explicit and safe."""

import pytest

from academy_api.cache.backends import NullCache, RedisCache, build_cache
from academy_api.core.config import Settings
from academy_api.core.exceptions import ConfigurationError


def settings_with(**overrides: object) -> Settings:
    base: dict[str, object] = {"redis_url": None, "cache_required": False}
    return Settings(**(base | overrides))  # type: ignore[arg-type]


def test_no_redis_url_yields_the_disabled_cache() -> None:
    cache = build_cache(settings_with())

    assert isinstance(cache, NullCache)
    assert cache.name == "disabled"


def test_empty_redis_url_is_treated_as_unset() -> None:
    assert isinstance(build_cache(settings_with(redis_url="")), NullCache)


def test_requiring_the_cache_without_a_url_fails_with_actionable_guidance() -> None:
    with pytest.raises(ConfigurationError, match="ACADEMY_REDIS_URL"):
        build_cache(settings_with(cache_required=True))


def test_a_redis_url_yields_the_redis_adapter() -> None:
    cache = build_cache(settings_with(redis_url="redis://127.0.0.1:6379/0"))

    assert isinstance(cache, RedisCache)
    assert cache.name == "redis"


async def test_disabled_cache_always_misses_and_never_raises() -> None:
    cache = NullCache()

    assert await cache.get("anything") is None
    assert await cache.set("anything", "value") is False
    assert await cache.delete("anything") is False
    assert await cache.ping() is False
    await cache.close()


async def test_unreachable_redis_degrades_to_a_miss_instead_of_raising() -> None:
    # Port 1 is reserved and never listening, so every call must fail internally.
    cache = RedisCache("redis://127.0.0.1:1/0", default_ttl_seconds=5)
    try:
        assert await cache.ping() is False
        assert await cache.get("key") is None
        assert await cache.set("key", "value") is False
        assert await cache.delete("key") is False
    finally:
        await cache.close()
