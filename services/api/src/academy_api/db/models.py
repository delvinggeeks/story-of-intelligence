"""Phase C persistence models.

Scope note: these tables store *facts*, not judgements. Nothing here scores an answer,
derives mastery, or assigns meaning to an evidence event. `EvidenceEvent.kind` and
`EvidenceEvent.payload` are deliberately opaque in Phase C; their vocabulary and semantics
are the subject of the proposed ADR-0007 and must not be invented in code first.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    String,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from academy_api.db.base import Base

CONCEPT_ID_LENGTH = 128
EVENT_KIND_LENGTH = 64


class Learner(Base):
    """An anonymous local identity. Holds no personal data and no credentials."""

    __tablename__ = "learner"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sessions: Mapped[list["LearningSession"]] = relationship(
        back_populates="learner", lazy="selectin", passive_deletes=True
    )


class LearningSession(Base):
    """One learner's visit to one concept. Open while ``ended_at`` is NULL."""

    __tablename__ = "learning_session"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    learner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learner.id", ondelete="CASCADE"), nullable=False
    )
    # Content is canonical on disk, so this references a concept without a foreign key.
    concept_id: Mapped[str] = mapped_column(String(CONCEPT_ID_LENGTH), nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    learner: Mapped[Learner] = relationship(back_populates="sessions")
    events: Mapped[list["EvidenceEvent"]] = relationship(
        back_populates="session",
        lazy="selectin",
        passive_deletes=True,
        order_by="EvidenceEvent.sequence",
    )

    __table_args__ = (
        Index("ix_learning_session_learner_id_concept_id", "learner_id", "concept_id"),
    )


class EvidenceEvent(Base):
    """An append-only observation about a learning session.

    Immutable by contract: the repository exposes no update or delete, and
    ``academy_api.db.immutability`` rejects any modification that reaches a flush.

    ``sequence`` is the authoritative replay order. Timestamps are not sufficient:
    PostgreSQL's ``now()`` is transaction-start time, so several events written in one
    transaction would otherwise be indistinguishable in order.
    """

    __tablename__ = "evidence_event"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    sequence: Mapped[int] = mapped_column(BigInteger, Identity(always=True), unique=True)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_session.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(EVENT_KIND_LENGTH), nullable=False)
    # Opaque in Phase C. No code may branch on its contents until ADR-0007 is accepted.
    payload: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp(), nullable=False
    )

    session: Mapped[LearningSession] = relationship(back_populates="events")

    __table_args__ = (Index("ix_evidence_event_session_id_sequence", "session_id", "sequence"),)
