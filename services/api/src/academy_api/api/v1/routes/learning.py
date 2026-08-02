"""The learner loop: bootstrap, session resume, evidence write/read, and progress.

Every route speaks Pydantic and UUIDs. No SQLAlchemy type appears in a signature, and no
route decides what evidence means - the domain contract validates it and the projection
interprets it.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, status
from pydantic import BaseModel, ConfigDict, Field

from academy_api.api.dependencies import LearningRecordServiceDep, ProgressServiceDep
from academy_api.domain.evidence import VOCABULARY_VERSION, EvidenceEnvelope, EvidenceKind
from academy_api.domain.learning_record import (
    EvidenceEventRecord,
    LearnerRecord,
    LearningSessionRecord,
)
from academy_api.domain.progress import ConceptProgress

router = APIRouter(tags=["learning"])

CONCEPT_ID_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class RequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class SessionRequest(RequestModel):
    concept_id: str = Field(alias="conceptId", pattern=CONCEPT_ID_PATTERN, max_length=128)


class EvidenceRequest(RequestModel):
    """The discriminated union is the request body, so an invalid kind fails at parse time."""

    event: EvidenceEnvelope
    occurred_at: datetime | None = Field(alias="occurredAt", default=None)


class VocabularyResponse(BaseModel):
    version: str
    kinds: list[str]


@router.post(
    "/learners",
    status_code=status.HTTP_201_CREATED,
    summary="Create an anonymous learner",
    description=(
        "Returns a server-generated UUID. ADR-0007 D3: no account, no personal data, and no "
        "cross-device linkage. The client stores only this opaque identifier."
    ),
)
async def create_learner(records: LearningRecordServiceDep) -> LearnerRecord:
    return await records.register_learner()


@router.get(
    "/learners/{learner_id}",
    summary="Confirm an anonymous learner still exists",
    responses={404: {"description": "Unknown learner; the client should bootstrap a new one"}},
)
async def get_learner(learner_id: uuid.UUID, records: LearningRecordServiceDep) -> LearnerRecord:
    return await records.get_learner(learner_id)


@router.post(
    "/learners/{learner_id}/sessions",
    summary="Resume the learner's open session for a concept, or start one",
    responses={404: {"description": "Unknown learner"}},
)
async def resume_session(
    learner_id: uuid.UUID, body: SessionRequest, records: LearningRecordServiceDep
) -> LearningSessionRecord:
    return await records.resume_or_start_session(learner_id, body.concept_id)


@router.post(
    "/sessions/{session_id}/events",
    status_code=status.HTTP_201_CREATED,
    summary="Append one evidence event",
    description=(
        "Append-only. Events are never updated or deleted; correct a mistake by appending "
        "an `evidence.retracted` event that names the event it supersedes."
    ),
    responses={
        404: {"description": "Unknown session"},
        422: {"description": "Unknown evidence kind or payload that violates its contract"},
    },
)
async def append_evidence(
    session_id: uuid.UUID, body: EvidenceRequest, records: LearningRecordServiceDep
) -> EvidenceEventRecord:
    payload = body.event.model_dump(mode="json", by_alias=True, exclude={"kind"})
    return await records.record_evidence(session_id, body.event.kind, payload, body.occurred_at)


@router.get(
    "/sessions/{session_id}/events",
    summary="Read a session's evidence in replay order",
    description="Ordered by `sequence`, the only authoritative replay order (ADR-0007 D5).",
)
async def list_evidence(
    session_id: uuid.UUID, records: LearningRecordServiceDep
) -> list[EvidenceEventRecord]:
    return await records.list_evidence(session_id)


@router.get(
    "/learners/{learner_id}/progress/{concept_id}",
    summary="Project current progress from the event stream",
    description=(
        "Recomputed on every request from every event across every session for this "
        "concept. `completionRecorded` is a fact the learner asserted; `mastery` is the "
        "Learning Object's own rubric verdict and is a keyword match, not a judgement of "
        "understanding."
    ),
    responses={404: {"description": "Unknown learner or concept"}},
)
async def get_progress(
    learner_id: uuid.UUID,
    concept_id: str,
    progress: ProgressServiceDep,
) -> ConceptProgress:
    return await progress.for_concept(learner_id, concept_id)


@router.get(
    "/evidence-vocabulary",
    summary="The closed evidence vocabulary accepted for new writes",
    description="ADR-0007 D1. Clients should not hard-code this list.",
)
def get_vocabulary() -> VocabularyResponse:
    return VocabularyResponse(
        version=VOCABULARY_VERSION, kinds=sorted(kind.value for kind in EvidenceKind)
    )
