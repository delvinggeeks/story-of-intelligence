"""Persistence access for learners, sessions, and evidence.

Routes must never see SQLAlchemy. Phase D consumes the protocols in this module, so the
storage engine can change without touching the HTTP layer.

Deliberate omissions: there is no update and no delete anywhere here. Evidence is
append-only, and retention/erasure policy is deferred to the proposed ADR-0007.
"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from academy_api.db.models import EvidenceEvent, Learner, LearningSession


class LearnerRepository(Protocol):
    async def create(self) -> Learner: ...
    async def get(self, learner_id: uuid.UUID) -> Learner | None: ...
    async def touch(self, learner_id: uuid.UUID) -> Learner | None: ...


class LearningSessionRepository(Protocol):
    async def start(self, learner_id: uuid.UUID, concept_id: str) -> LearningSession: ...
    async def get(self, session_id: uuid.UUID) -> LearningSession | None: ...
    async def end(self, session_id: uuid.UUID) -> LearningSession | None: ...
    async def list_for_learner(
        self, learner_id: uuid.UUID, concept_id: str | None = None
    ) -> Sequence[LearningSession]: ...


class EvidenceRepository(Protocol):
    async def append(
        self,
        session_id: uuid.UUID,
        kind: str,
        payload: dict[str, object],
        occurred_at: datetime | None = None,
    ) -> EvidenceEvent: ...
    async def list_for_session(self, session_id: uuid.UUID) -> Sequence[EvidenceEvent]: ...


class SqlLearnerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self) -> Learner:
        learner = Learner()
        self._session.add(learner)
        await self._session.flush()
        return learner

    async def get(self, learner_id: uuid.UUID) -> Learner | None:
        return await self._session.get(Learner, learner_id)

    async def touch(self, learner_id: uuid.UUID) -> Learner | None:
        learner = await self._session.get(Learner, learner_id)
        if learner is None:
            return None
        learner.last_seen_at = datetime.now(UTC)
        await self._session.flush()
        return learner


class SqlLearningSessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def start(self, learner_id: uuid.UUID, concept_id: str) -> LearningSession:
        learning_session = LearningSession(learner_id=learner_id, concept_id=concept_id)
        self._session.add(learning_session)
        await self._session.flush()
        return learning_session

    async def get(self, session_id: uuid.UUID) -> LearningSession | None:
        return await self._session.get(LearningSession, session_id)

    async def end(self, session_id: uuid.UUID) -> LearningSession | None:
        learning_session = await self._session.get(LearningSession, session_id)
        if learning_session is None:
            return None
        # Ending is idempotent: the first end time is the one that counts.
        if learning_session.ended_at is None:
            learning_session.ended_at = datetime.now(UTC)
            await self._session.flush()
        return learning_session

    async def list_for_learner(
        self, learner_id: uuid.UUID, concept_id: str | None = None
    ) -> Sequence[LearningSession]:
        statement = select(LearningSession).where(LearningSession.learner_id == learner_id)
        if concept_id is not None:
            statement = statement.where(LearningSession.concept_id == concept_id)
        result = await self._session.execute(statement.order_by(LearningSession.started_at))
        return result.scalars().all()


class SqlEvidenceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def append(
        self,
        session_id: uuid.UUID,
        kind: str,
        payload: dict[str, object],
        occurred_at: datetime | None = None,
    ) -> EvidenceEvent:
        event = EvidenceEvent(
            session_id=session_id,
            kind=kind,
            payload=payload,
            occurred_at=occurred_at or datetime.now(UTC),
        )
        self._session.add(event)
        await self._session.flush()
        return event

    async def list_for_session(self, session_id: uuid.UUID) -> Sequence[EvidenceEvent]:
        statement = (
            select(EvidenceEvent)
            .where(EvidenceEvent.session_id == session_id)
            .order_by(EvidenceEvent.sequence)
        )
        result = await self._session.execute(statement)
        return result.scalars().all()
