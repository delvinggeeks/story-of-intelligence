from typing import Annotated

from fastapi import Depends

from academy_api.core.config import Settings, get_settings
from academy_api.repositories.content import ContentRepository, FileContentRepository

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_content_repository(settings: SettingsDep) -> ContentRepository:
    return FileContentRepository(settings.content_root)


ContentRepositoryDep = Annotated[ContentRepository, Depends(get_content_repository)]
