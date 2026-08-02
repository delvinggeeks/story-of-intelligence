from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from academy_api.cache.backends import Cache
from academy_api.core.config import Settings, get_settings
from academy_api.db.session import Database
from academy_api.repositories.content import ContentRepository, FileContentRepository
from academy_api.repositories.learning import (
    SqlEvidenceRepository,
    SqlLearnerRepository,
    SqlLearningSessionRepository,
)
from academy_api.services.learning_record import LearningRecordService
from academy_api.services.progress import ProgressService

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_content_repository(settings: SettingsDep) -> ContentRepository:
    return FileContentRepository(settings.content_root)


ContentRepositoryDep = Annotated[ContentRepository, Depends(get_content_repository)]


def get_database(request: Request) -> Database:
    database: Database = request.app.state.database
    return database


DatabaseDep = Annotated[Database, Depends(get_database)]


def get_cache(request: Request) -> Cache:
    cache: Cache = request.app.state.cache
    return cache


CacheDep = Annotated[Cache, Depends(get_cache)]


async def get_db_session(database: DatabaseDep) -> AsyncIterator[AsyncSession]:
    """One request, one transaction."""
    async with database.session() as session:
        yield session


DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


def get_learning_record_service(session: DbSessionDep) -> LearningRecordService:
    return LearningRecordService(
        SqlLearnerRepository(session),
        SqlLearningSessionRepository(session),
        SqlEvidenceRepository(session),
    )


LearningRecordServiceDep = Annotated[LearningRecordService, Depends(get_learning_record_service)]


def get_progress_service(
    records: LearningRecordServiceDep, content: ContentRepositoryDep
) -> ProgressService:
    return ProgressService(records, content)


ProgressServiceDep = Annotated[ProgressService, Depends(get_progress_service)]
