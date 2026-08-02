"""Records learning facts. Interprets none of them.

This service is the Phase D seam: routes call it, it calls repositories, and no
SQLAlchemy type crosses its boundary. It deliberately contains no scoring, no mastery
policy, and no progress derivation - those require the proposed ADR-0007 to be accepted
first.
"""

import uuid
from datetime import datetime

from academy_api.core.exceptions import ContentNotFoundError
from academy_api.db.models import EvidenceEvent, Learner, LearningSession
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

MAX_PAYLOAD_KEYS = 64


class LearningRecordService:
    def __init__(
        self,
        learners: LearnerRepository,
        sessions: LearningSessionRepository,
        evidence: EvidenceRepository,
    ) -> None:
        self._learners = learners
        self._sessions = sessions
        self._evidence = evidence

    async def register_learner(self) -> LearnerRecord:
        return _learner_record(await self._learners.create())

    async def get_learner(self, learner_id: uuid.UUID) -> LearnerRecord:
        learner = await self._learners.get(learner_id)
        if learner is None:
            raise ContentNotFoundError(f"No learner with id '{learner_id}'.")
        return _learner_record(learner)

    async def start_session(self, learner_id: uuid.UUID, concept_id: str) -> LearningSessionRecord:
        if await self._learners.get(learner_id) is None:
            raise ContentNotFoundError(f"No learner with id '{learner_id}'.")
        return _session_record(await self._sessions.start(learner_id, concept_id))

    async def end_session(self, session_id: uuid.UUID) -> LearningSessionRecord:
        learning_session = await self._sessions.end(session_id)
        if learning_session is None:
            raise ContentNotFoundError(f"No learning session with id '{session_id}'.")
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
        """Append one immutable observation. The payload is stored, never interpreted."""
        if await self._sessions.get(session_id) is None:
            raise ContentNotFoundError(f"No learning session with id '{session_id}'.")
        body = payload or {}
        if len(body) > MAX_PAYLOAD_KEYS:
            raise ValueError(
                f"Evidence payload has {len(body)} keys; the limit is {MAX_PAYLOAD_KEYS}."
            )
        event = await self._evidence.append(session_id, kind, body, occurred_at)
        return _evidence_record(event)

    async def list_evidence(self, session_id: uuid.UUID) -> list[EvidenceEventRecord]:
        found = await self._evidence.list_for_session(session_id)
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
