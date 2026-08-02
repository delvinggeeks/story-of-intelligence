"""Transport-neutral views of persisted learning records.

These are the only shapes the HTTP layer is allowed to see. ORM objects never leave the
service boundary.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RecordModel(BaseModel):
    model_config = ConfigDict(frozen=True)


class LearnerRecord(RecordModel):
    """An anonymous local identity. Carries no personal data by construction."""

    id: uuid.UUID
    created_at: datetime
    last_seen_at: datetime


class LearningSessionRecord(RecordModel):
    id: uuid.UUID
    learner_id: uuid.UUID
    concept_id: str
    started_at: datetime
    ended_at: datetime | None


class EvidenceEventRecord(RecordModel):
    """An append-only fact. Phase C assigns no meaning to ``kind`` or ``payload``."""

    id: uuid.UUID
    sequence: int
    session_id: uuid.UUID
    kind: str
    payload: dict[str, object]
    occurred_at: datetime
    recorded_at: datetime
