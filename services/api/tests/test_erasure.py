"""Privileged learner-subtree erasure (ADR-0007 D6).

Erasure must remove a learner and everything beneath them in one transaction, while
individual evidence deletion stays impossible on every ordinary path.
"""

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from academy_api.core.exceptions import (
    ContentNotFoundError,
    ErasureNotPermittedError,
    ImmutableRecordError,
)
from academy_api.db.models import EvidenceEvent, Learner, LearningSession
from academy_api.domain.evidence import EvidenceKind
from academy_api.repositories.learning import (
    SqlEvidenceRepository,
    SqlLearnerRepository,
    SqlLearningSessionRepository,
)
from academy_api.services.erasure import authorise, erase_learner
from academy_api.services.learning_record import LearningRecordService

CONCEPT = "numbers"


def build_service(session: AsyncSession) -> LearningRecordService:
    return LearningRecordService(
        SqlLearnerRepository(session),
        SqlLearningSessionRepository(session),
        SqlEvidenceRepository(session),
        session,
    )


def test_erasure_is_refused_when_no_token_is_configured() -> None:
    """An unset token means disabled, never open."""
    with pytest.raises(ErasureNotPermittedError, match="not enabled"):
        authorise(None, "anything")
    with pytest.raises(ErasureNotPermittedError, match="not enabled"):
        authorise("", "anything")


def test_erasure_is_refused_when_the_token_does_not_match() -> None:
    with pytest.raises(ErasureNotPermittedError):
        authorise("correct-token", "wrong-token")
    with pytest.raises(ErasureNotPermittedError):
        authorise("correct-token", None)
    # A prefix must not be accepted, which a naive startswith check would allow.
    with pytest.raises(ErasureNotPermittedError):
        authorise("correct-token", "correct")


def test_a_matching_token_is_accepted() -> None:
    authorise("correct-token", "correct-token")


@pytest.mark.database
async def test_erasure_removes_the_whole_learner_subtree(db_session: AsyncSession) -> None:
    service = build_service(db_session)
    learner = await service.register_learner()
    learning_session = await service.start_session(learner.id, CONCEPT)
    await service.record_evidence(learning_session.id, EvidenceKind.STEP_VIEWED, {"stepIndex": 0})
    await service.record_evidence(learning_session.id, EvidenceKind.STEP_VIEWED, {"stepIndex": 1})

    receipt = await erase_learner(db_session, learner.id)

    assert receipt.learner_id == learner.id
    assert receipt.sessions_deleted == 1
    assert receipt.events_deleted == 2
    assert await db_session.get(Learner, learner.id) is None
    remaining_sessions = await db_session.execute(
        select(LearningSession.id).where(LearningSession.learner_id == learner.id)
    )
    assert remaining_sessions.all() == []
    remaining_events = await db_session.execute(
        select(EvidenceEvent.id).where(EvidenceEvent.session_id == learning_session.id)
    )
    assert remaining_events.all() == []


@pytest.mark.database
async def test_erasure_leaves_other_learners_untouched(db_session: AsyncSession) -> None:
    service = build_service(db_session)
    doomed = await service.register_learner()
    keeper = await service.register_learner()
    doomed_session = await service.start_session(doomed.id, CONCEPT)
    keeper_session = await service.start_session(keeper.id, CONCEPT)
    await service.record_evidence(doomed_session.id, EvidenceKind.STEP_VIEWED, {"stepIndex": 0})
    await service.record_evidence(keeper_session.id, EvidenceKind.STEP_VIEWED, {"stepIndex": 0})

    await erase_learner(db_session, doomed.id)

    assert await db_session.get(Learner, keeper.id) is not None
    assert len(await service.list_evidence(keeper_session.id)) == 1


@pytest.mark.database
async def test_erasing_an_unknown_learner_is_reported_as_not_found(
    db_session: AsyncSession,
) -> None:
    with pytest.raises(ContentNotFoundError):
        await erase_learner(db_session, uuid.uuid4())


@pytest.mark.database
async def test_erasure_does_not_widen_the_append_only_guard(db_session: AsyncSession) -> None:
    """The narrow bypass must not make single-event deletion possible anywhere else."""
    service = build_service(db_session)
    learner = await service.register_learner()
    learning_session = await service.start_session(learner.id, CONCEPT)
    await service.record_evidence(learning_session.id, EvidenceKind.STEP_VIEWED, {"stepIndex": 0})
    await erase_learner(db_session, learner.id)

    survivor = await service.register_learner()
    survivor_session = await service.start_session(survivor.id, CONCEPT)
    await service.record_evidence(survivor_session.id, EvidenceKind.STEP_VIEWED, {"stepIndex": 0})
    stored = (await SqlEvidenceRepository(db_session).list_for_session(survivor_session.id))[0]

    await db_session.delete(stored)
    with pytest.raises(ImmutableRecordError, match="append-only"):
        await db_session.flush()
