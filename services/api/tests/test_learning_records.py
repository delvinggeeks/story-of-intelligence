"""Repository and service behaviour against a real PostgreSQL instance."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from academy_api.core.exceptions import (
    ContentNotFoundError,
    EvidenceContractError,
    ImmutableRecordError,
)
from academy_api.domain.evidence import EvidenceKind
from academy_api.repositories.learning import (
    SqlEvidenceRepository,
    SqlLearnerRepository,
    SqlLearningSessionRepository,
)
from academy_api.services.learning_record import LearningRecordService

pytestmark = pytest.mark.database

CONCEPT = "numbers"
VERSION = "2.0.0"


def started_payload() -> dict[str, object]:
    return {"conceptVersion": VERSION}


def build_service(session: AsyncSession) -> LearningRecordService:
    return LearningRecordService(
        SqlLearnerRepository(session),
        SqlLearningSessionRepository(session),
        SqlEvidenceRepository(session),
    )


async def test_learner_is_anonymous_and_carries_no_personal_data(db_session: AsyncSession) -> None:
    learner = await build_service(db_session).register_learner()

    assert isinstance(learner.id, uuid.UUID)
    assert set(learner.model_dump()) == {"id", "created_at", "last_seen_at"}


async def test_unknown_learner_is_reported_as_not_found(db_session: AsyncSession) -> None:
    with pytest.raises(ContentNotFoundError):
        await build_service(db_session).get_learner(uuid.uuid4())


async def test_session_starts_open_and_ends_once(db_session: AsyncSession) -> None:
    service = build_service(db_session)
    learner = await service.register_learner()

    started = await service.start_session(learner.id, CONCEPT)
    assert started.ended_at is None
    assert started.concept_id == CONCEPT

    ended = await service.end_session(started.id)
    assert ended.ended_at is not None

    # Ending twice must not move the recorded end time.
    again = await service.end_session(started.id)
    assert again.ended_at == ended.ended_at


async def test_session_cannot_be_started_for_an_unknown_learner(db_session: AsyncSession) -> None:
    with pytest.raises(ContentNotFoundError):
        await build_service(db_session).start_session(uuid.uuid4(), CONCEPT)


async def test_sessions_are_listed_per_learner_and_concept(db_session: AsyncSession) -> None:
    service = build_service(db_session)
    learner = await service.register_learner()
    other = await service.register_learner()

    await service.start_session(learner.id, CONCEPT)
    await service.start_session(learner.id, "something-else")
    await service.start_session(other.id, CONCEPT)

    assert len(await service.list_sessions(learner.id)) == 2
    assert len(await service.list_sessions(learner.id, CONCEPT)) == 1
    assert len(await service.list_sessions(other.id, CONCEPT)) == 1


async def test_evidence_is_appended_in_order_with_a_typed_payload(
    db_session: AsyncSession,
) -> None:
    service = build_service(db_session)
    learner = await service.register_learner()
    learning_session = await service.start_session(learner.id, CONCEPT)

    first = await service.record_evidence(
        learning_session.id, EvidenceKind.STEP_VIEWED, {"stepIndex": 0}
    )
    second = await service.record_evidence(
        learning_session.id,
        EvidenceKind.REFLECTION_SUBMITTED,
        {"phase": "pre", "response": "Same unit first."},
    )

    events = await service.list_evidence(learning_session.id)
    assert [event.id for event in events] == [first.id, second.id]
    assert first.sequence < second.sequence
    # The kind lives in its own column and is not duplicated into the payload.
    assert events[1].payload == {"phase": "pre", "response": "Same unit first."}


async def test_replay_order_survives_a_burst_written_in_one_transaction(
    db_session: AsyncSession,
) -> None:
    """Timestamps alone cannot order these: PostgreSQL now() is transaction-start time."""
    service = build_service(db_session)
    learner = await service.register_learner()
    learning_session = await service.start_session(learner.id, CONCEPT)

    written = [
        await service.record_evidence(
            learning_session.id, EvidenceKind.STEP_VIEWED, {"stepIndex": index}
        )
        for index in range(25)
    ]

    events = await service.list_evidence(learning_session.id)
    assert [event.id for event in events] == [event.id for event in written]
    sequences = [event.sequence for event in events]
    assert sequences == sorted(sequences)
    assert len(set(sequences)) == len(sequences)


async def test_evidence_accepts_a_caller_supplied_occurrence_time(
    db_session: AsyncSession,
) -> None:
    service = build_service(db_session)
    learner = await service.register_learner()
    learning_session = await service.start_session(learner.id, CONCEPT)
    earlier = datetime.now(UTC) - timedelta(hours=2)

    event = await service.record_evidence(
        learning_session.id, EvidenceKind.LESSON_STARTED, started_payload(), occurred_at=earlier
    )

    assert event.occurred_at == earlier
    # recorded_at is server-assigned and independent of the claimed occurrence time.
    assert event.recorded_at > earlier


async def test_evidence_requires_an_existing_session(db_session: AsyncSession) -> None:
    with pytest.raises(ContentNotFoundError):
        await build_service(db_session).record_evidence(
            uuid.uuid4(), EvidenceKind.LESSON_STARTED, started_payload()
        )


async def test_evidence_of_an_unknown_kind_is_rejected(db_session: AsyncSession) -> None:
    service = build_service(db_session)
    learner = await service.register_learner()
    learning_session = await service.start_session(learner.id, CONCEPT)

    with pytest.raises(EvidenceContractError, match="Unknown evidence kind"):
        await service.record_evidence(learning_session.id, "answer-submitted", {})


async def test_evidence_with_an_invalid_payload_is_rejected(db_session: AsyncSession) -> None:
    service = build_service(db_session)
    learner = await service.register_learner()
    learning_session = await service.start_session(learner.id, CONCEPT)

    with pytest.raises(EvidenceContractError, match="does not match the contract"):
        await service.record_evidence(
            learning_session.id, EvidenceKind.STEP_VIEWED, {"stepIndex": -1}
        )


async def test_evidence_cannot_be_updated(db_session: AsyncSession) -> None:
    service = build_service(db_session)
    learner = await service.register_learner()
    learning_session = await service.start_session(learner.id, CONCEPT)
    await service.record_evidence(
        learning_session.id, EvidenceKind.LESSON_STARTED, started_payload()
    )

    stored = (await SqlEvidenceRepository(db_session).list_for_session(learning_session.id))[0]
    stored.kind = "tampered"

    with pytest.raises(ImmutableRecordError, match="append-only"):
        await db_session.flush()


async def test_evidence_cannot_be_deleted(db_session: AsyncSession) -> None:
    service = build_service(db_session)
    learner = await service.register_learner()
    learning_session = await service.start_session(learner.id, CONCEPT)
    await service.record_evidence(
        learning_session.id, EvidenceKind.LESSON_STARTED, started_payload()
    )

    stored = (await SqlEvidenceRepository(db_session).list_for_session(learning_session.id))[0]
    await db_session.delete(stored)

    with pytest.raises(ImmutableRecordError, match="append-only"):
        await db_session.flush()


async def test_touch_updates_last_seen_without_changing_identity(
    db_session: AsyncSession,
) -> None:
    repository = SqlLearnerRepository(db_session)
    learner = await repository.create()
    original_id, original_created = learner.id, learner.created_at

    touched = await repository.touch(original_id)

    assert touched is not None
    assert touched.id == original_id
    assert touched.created_at == original_created
    assert touched.last_seen_at >= original_created


async def test_touch_of_an_unknown_learner_returns_none(db_session: AsyncSession) -> None:
    assert await SqlLearnerRepository(db_session).touch(uuid.uuid4()) is None
