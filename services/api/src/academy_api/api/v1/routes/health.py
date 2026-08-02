from fastapi import APIRouter
from pydantic import BaseModel

from academy_api import __version__

router = APIRouter(tags=["health"])


class HealthStatus(BaseModel):
    status: str
    version: str


@router.get("/health/live", summary="Liveness probe")
def live() -> HealthStatus:
    return HealthStatus(status="ok", version=__version__)


@router.get("/health/ready", summary="Readiness probe")
def ready() -> HealthStatus:
    return HealthStatus(status="ready", version=__version__)
