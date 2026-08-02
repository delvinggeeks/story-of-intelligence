from fastapi import APIRouter

from academy_api.api.v1.routes import content

api_router = APIRouter()
api_router.include_router(content.router)
