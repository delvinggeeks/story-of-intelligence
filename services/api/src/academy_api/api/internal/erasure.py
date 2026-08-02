"""The privileged erasure surface (ADR-0007 D6).

Mounted at `/internal`, not under the versioned learner API, so it is not reachable from
the ordinary event routes and is not part of the client contract. It is registered only
when a token is configured: with no token there is no endpoint to probe.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Header, status

from academy_api.api.dependencies import DbSessionDep, SettingsDep
from academy_api.services.erasure import ErasureReceipt, authorise, erase_learner

router = APIRouter(prefix="/internal", tags=["internal"], include_in_schema=False)

ERASURE_TOKEN_HEADER = "X-Academy-Erasure-Token"


@router.delete(
    "/learners/{learner_id}",
    status_code=status.HTTP_200_OK,
    summary="Erase a learner and their entire evidence subtree",
)
async def erase(
    learner_id: uuid.UUID,
    session: DbSessionDep,
    settings: SettingsDep,
    x_academy_erasure_token: Annotated[str | None, Header()] = None,
) -> ErasureReceipt:
    authorise(settings.erasure_token, x_academy_erasure_token)
    return await erase_learner(session, learner_id)
