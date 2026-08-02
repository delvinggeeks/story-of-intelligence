from fastapi import APIRouter, Response
from pydantic import BaseModel

from academy_api import __version__
from academy_api.api.dependencies import CacheDep, DatabaseDep
from academy_api.core.exceptions import DatabaseUnavailableError

router = APIRouter(tags=["health"])


class HealthStatus(BaseModel):
    status: str
    version: str


class DependencyStatus(BaseModel):
    status: str
    detail: str | None = None


class ReadinessStatus(BaseModel):
    status: str
    version: str
    database: DependencyStatus
    cache: DependencyStatus


@router.get("/health/live", summary="Liveness probe")
def live() -> HealthStatus:
    """Process-only. Never touches a dependency, so it cannot flap with the database."""
    return HealthStatus(status="ok", version=__version__)


@router.get("/health/ready", summary="Readiness probe")
async def ready(database: DatabaseDep, cache: CacheDep, response: Response) -> ReadinessStatus:
    """The database is required for readiness. The cache is not - it degrades instead."""
    try:
        await database.check()
        db_status = DependencyStatus(status="ok")
    except DatabaseUnavailableError as exc:
        response.status_code = 503
        db_status = DependencyStatus(status="unavailable", detail=str(exc))

    if cache.name == "disabled":
        cache_status = DependencyStatus(
            status="disabled", detail="ACADEMY_REDIS_URL is unset; caching is off by choice."
        )
    elif await cache.ping():
        cache_status = DependencyStatus(status="ok")
    else:
        cache_status = DependencyStatus(
            status="degraded",
            detail="Cache backend unreachable. Reads miss and writes are dropped; "
            "content and persistence are unaffected.",
        )

    overall = "ready" if db_status.status == "ok" else "not-ready"
    return ReadinessStatus(
        status=overall, version=__version__, database=db_status, cache=cache_status
    )
