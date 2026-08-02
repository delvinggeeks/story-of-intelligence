import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from academy_api import __version__
from academy_api.api.v1.router import api_router
from academy_api.api.v1.routes import health
from academy_api.core.config import get_settings
from academy_api.core.exceptions import ContentIntegrityError, ContentNotFoundError

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Story of Intelligence Academy API",
        version=__version__,
        summary="Backend-owned contracts for canonical content and Knowledge Graph resolution.",
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

    app.include_router(health.router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
