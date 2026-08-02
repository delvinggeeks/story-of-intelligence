import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from academy_api import __version__
from academy_api.api.v1.router import api_router
from academy_api.api.v1.routes import health
from academy_api.cache.backends import build_cache
from academy_api.core.config import get_settings
from academy_api.core.exceptions import (
    ContentIntegrityError,
    ContentNotFoundError,
    DatabaseUnavailableError,
    ImmutableRecordError,
)
from academy_api.db.session import Database

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # Connections are opened lazily: a database outage must not stop the process from
        # starting, or readiness could never report why it is down.
        app.state.database = Database(settings)
        app.state.cache = build_cache(settings)
        try:
            yield
        finally:
            await app.state.cache.close()
            await app.state.database.dispose()

    app = FastAPI(
        title="Story of Intelligence Academy API",
        version=__version__,
        summary="Backend-owned contracts for canonical content and Knowledge Graph resolution.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(ContentNotFoundError)
    def _not_found(_: Request, exc: ContentNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(ContentIntegrityError)
    def _integrity(_: Request, exc: ContentIntegrityError) -> JSONResponse:
        # Contract violations are an operator problem; never echo internals to the learner surface.
        logger.error("Canonical content failed validation: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Canonical content failed validation."},
        )

    @app.exception_handler(DatabaseUnavailableError)
    def _database_down(_: Request, exc: DatabaseUnavailableError) -> JSONResponse:
        logger.error("Database unavailable: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"detail": "The database is unavailable. Content endpoints are unaffected."},
        )

    @app.exception_handler(ImmutableRecordError)
    def _immutable(_: Request, exc: ImmutableRecordError) -> JSONResponse:
        logger.error("Append-only violation: %s", exc)
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    app.include_router(health.router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
