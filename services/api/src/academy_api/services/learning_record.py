"""Records learning facts and enforces the ADR-0007 write contract.

Routes call this service, it calls repositories, and no SQLAlchemy type crosses its
boundary. It validates that an event is well-formed (D1 vocabulary, D2 payload) but still
derives nothing: judgement lives in `academy_api.services.progress`, which recomputes it
from the event stream instead of freezing it into the record.
"""

import uuid
from datetime import datetime
from typing import Protocol

from academy_api.core.exceptions import ContentNotFoundError, EvidenceContractError
from academy_api.db.models import EvidenceEvent, Learner, LearningSession
from academy_api.domain.evidence import EvidenceKind, EvidenceRetracted, validate_for_write
from academy_api.domain.learning_record import (
    EvidenceEventRecord,
    LearnerRecord,
    LearningSessionRecord,
)
from academy_api.repositories.learning import (
    EvidenceRepository,
    LearnerRepository,
    LearningSessionRepository,
)


class UnitOfWork(Protocol):
    """Just enough of a session to end one. Keeps SQLAlchemy out of this module."""

    async def commit(self) -> None: ...


class LearningRecordService:
    def __init__(
        self,
        learners: LearnerRepository,
        sessions: LearningSessionRepository,
        evidence: EvidenceRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._learners = learners
        self._sessions = sessions
        self._evidence = evidence
        self._uow = unit_of_work

    async def register_learner(self) -> LearnerRecord:
        learner = await self._learners.create()
        # Committed here, not in dependency teardown: FastAPI runs teardown after the
        # response is sent, so a client that immediately used this id could race the
        # commit and be told its own learner does not exist.
        await self._uow.commit()
        return _learner_record(learner)

    async def get_learner(self, learner_id: uuid.UUID) -> LearnerRecord:
        learner = await self._learners.get(learner_id)
        if learner is None:
            raise ContentNotFoundError(f"No learner with id '{learner_id}'.")
        return _learner_record(learner)

    async def start_session(self, learner_id: uuid.UUID, concept_id: str) -> LearningSessionRecord:
        if await self._learners.get(learner_id) is None:
            raise ContentNotFoundError(f"No learner with id '{learner_id}'.")
        started = await self._sessions.start(learner_id, concept_id)
        await self._uow.commit()
        return _session_record(started)

    async def resume_or_start_session(
        self, learner_id: uuid.UUID, concept_id: str
    ) -> LearningSessionRecord:
        """Reloading the page must not fragment one sitting into many sessions."""
        if await self._learners.get(learner_id) is None:
            raise ContentNotFoundError(f"No learner with id '{learner_id}'.")
        existing = await self._sessions.find_open(learner_id, concept_id)
        if existing is not None:
            return _session_record(existing)
        started = await self._sessions.start(learner_id, concept_id)
        await self._uow.commit()
        return _session_record(started)

    async def end_session(self, session_id: uuid.UUID) -> LearningSessionRecord:
        learning_session = await self._sessions.end(session_id)
        if learning_session is None:
            raise ContentNotFoundError(f"No learning session with id '{session_id}'.")
        await self._uow.commit()
        return _session_record(learning_session)

    async def list_sessions(
        self, learner_id: uuid.UUID, concept_id: str | None = None
    ) -> list[LearningSessionRecord]:
        found = await self._sessions.list_for_learner(learner_id, concept_id)
        return [_session_record(item) for item in found]

    async def record_evidence(
        self,
        session_id: uuid.UUID,
        kind: str,
        payload: dict[str, object] | None = None,
        occurred_at: datetime | None = None,
    ) -> EvidenceEventRecord:
        """Append one immutable observation, rejecting anything the contract does not define."""
        learning_session = await self._sessions.get(session_id)
        if learning_session is None:
            raise ContentNotFoundError(f"No learning session with id '{session_id}'.")

        stored = validate_for_write(kind, payload or {})
        if kind == EvidenceKind.EVIDENCE_RETRACTED:
            await self._assert_retractable(learning_session, stored)

        event = await self._evidence.append(session_id, kind, stored, occurred_at)
        await self._uow.commit()
        return _evidence_record(event)

    async def _assert_retractable(
        self, learning_session: LearningSession, stored: dict[str, object]
    ) -> None:
        """A learner may only retract their own evidence."""
        target_id = EvidenceRetracted.model_validate(
            {**stored, "kind": EvidenceKind.EVIDENCE_RETRACTED}
        ).retracts_event_id
        target = await self._evidence.get(target_id)
        if target is None:
            raise EvidenceContractError(f"Cannot retract evidence '{target_id}': no such event.")
        owner = await self._sessions.get(target.session_id)
        if owner is None or owner.learner_id != learning_session.learner_id:
            raise EvidenceContractError(
                f"Cannot retract evidence '{target_id}': it belongs to another learner."
            )

    async def list_evidence(self, session_id: uuid.UUID) -> list[EvidenceEventRecord]:
        found = await self._evidence.list_for_session(session_id)
        return [_evidence_record(item) for item in found]

    async def list_evidence_for_concept(
        self, learner_id: uuid.UUID, concept_id: str
    ) -> list[EvidenceEventRecord]:
        found = await self._evidence.list_for_learner_concept(learner_id, concept_id)
        return [_evidence_record(item) for item in found]


def _learner_record(learner: Learner) -> LearnerRecord:
    return LearnerRecord(
        id=learner.id, created_at=learner.created_at, last_seen_at=learner.last_seen_at
    )


def _session_record(item: LearningSession) -> LearningSessionRecord:
    return LearningSessionRecord(
        id=item.id,
        learner_id=item.learner_id,
        concept_id=item.concept_id,
        started_at=item.started_at,
        ended_at=item.ended_at,
    )


def _evidence_record(item: EvidenceEvent) -> EvidenceEventRecord:
    return EvidenceEventRecord(
        id=item.id,
        sequence=item.sequence,
        session_id=item.session_id,
        kind=item.kind,
        payload=item.payload,
        occurred_at=item.occurred_at,
        recorded_at=item.recorded_at,
    )
