"""The single sanctioned deletion path in the codebase (ADR-0007 D6).

Erasure is deliberately awkward to reach. It lives outside the repository layer, it is not
exported to the learner-facing router, and it refuses to run without an explicitly
configured token. Everything else in the system still cannot delete an evidence event.

Why a Core `DELETE` rather than an ORM cascade: the append-only guard in
`academy_api.db.immutability` is a `before_flush` listener over ORM instances. Issuing one
statement here means no `EvidenceEvent` is ever loaded into a session for deletion, so the
guard stays globally true for every ORM path rather than being widened with an exception
that could later be reused by accident. Removal is left to the database-level
`ON DELETE CASCADE` from `learner` downward.
"""

import logging
import secrets
import uuid

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Select, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from academy_api.core.exceptions import ContentNotFoundError, ErasureNotPermittedError
from academy_api.db.models import EvidenceEvent, Learner, LearningSession

logger = logging.getLogger("academy_api.erasure")


class ErasureReceipt(BaseModel):
    """Proof of what was destroyed. The learner id is included because it no longer exists."""

    model_config = ConfigDict(frozen=True, populate_by_name=True)

    learner_id: uuid.UUID = Field(alias="learnerId")
    sessions_deleted: int = Field(alias="sessionsDeleted")
    events_deleted: int = Field(alias="eventsDeleted")


def authorise(configured_token: str | None, presented_token: str | None) -> None:
    """Constant-time check. Absent configuration means erasure is off, not open."""
    if not configured_token:
        raise ErasureNotPermittedError(
            "Erasure is not enabled. Set ACADEMY_ERASURE_TOKEN to enable it."
        )
    if not presented_token or not secrets.compare_digest(configured_token, presented_token):
        raise ErasureNotPermittedError("Erasure token is missing or incorrect.")


async def erase_learner(session: AsyncSession, learner_id: uuid.UUID) -> ErasureReceipt:
    """Delete a learner and their entire subtree in one transaction. Irreversible."""
    learner = await session.get(Learner, learner_id)
    if learner is None:
        raise ContentNotFoundError(f"No learner with id '{learner_id}'.")

    sessions_deleted = await _count(
        session,
        select(func.count())
        .select_from(LearningSession)
        .where(LearningSession.learner_id == learner_id),
    )
    events_deleted = await _count(
        session,
        select(func.count())
        .select_from(EvidenceEvent)
        .join(LearningSession, EvidenceEvent.session_id == LearningSession.id)
        .where(LearningSession.learner_id == learner_id),
    )

    session.expunge(learner)
    await session.execute(delete(Learner).where(Learner.id == learner_id))
    # Committed before the receipt is returned: a receipt that outran its own transaction
    # would claim an erasure that had not happened yet.
    await session.commit()

    logger.warning(
        "ERASURE learner=%s sessions=%d events=%d",
        learner_id,
        sessions_deleted,
        events_deleted,
    )
    return ErasureReceipt(
        learnerId=learner_id,
        sessionsDeleted=sessions_deleted,
        eventsDeleted=events_deleted,
    )


async def _count(session: AsyncSession, statement: Select[tuple[int]]) -> int:
    result = await session.execute(statement)
    return int(result.scalar_one())
