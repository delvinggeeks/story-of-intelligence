"""The ADR-0007 evidence contract: a closed, versioned vocabulary with typed payloads.

D1 puts enforcement here rather than in PostgreSQL, so adding an observation is a code
change instead of a migration. `evidence_event.kind` stays a plain `String(64)` column.

D2 makes each kind's payload a Pydantic model, gathered into a union discriminated by
`kind`. Writes are validated strictly; reads never raise, because events already written
cannot be retro-validated and a read path that refused historical data would fail exactly
when the record matters most.
"""

from __future__ import annotations

import uuid
from collections.abc import Mapping
from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError

from academy_api.core.exceptions import EvidenceContractError

VOCABULARY_VERSION = "1.0.0"

MAX_STEP_INDEX = 512
MAX_RESPONSE_LENGTH = 4000
MAX_REASON_LENGTH = 200


class EvidenceKind(StrEnum):
    """Every kind accepted for new writes. Adding one is a deliberate contract change."""

    LESSON_STARTED = "lesson.started"
    STEP_VIEWED = "step.viewed"
    EXPERIMENT_PERFORMED = "experiment.performed"
    REFLECTION_SUBMITTED = "reflection.submitted"
    LESSON_COMPLETED = "lesson.completed"
    EVIDENCE_RETRACTED = "evidence.retracted"


RETIRED_EVIDENCE_KINDS: frozenset[str] = frozenset()
"""Kinds that stay readable for replay but are refused for new writes (D1).

Empty at vocabulary 1.0.0. A kind whose meaning must change is renamed, and the old name
is listed here rather than redefined.
"""


class EvidencePayload(BaseModel):
    """Base for every payload model. Unknown fields are a contract violation, not a nuance."""

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        populate_by_name=True,
    )


class LessonStarted(EvidencePayload):
    """The learner opened a Learning Object. Records which version they were shown."""

    kind: Literal[EvidenceKind.LESSON_STARTED]
    concept_version: str = Field(alias="conceptVersion", min_length=1, max_length=32)


class StepViewed(EvidencePayload):
    """The learner reached a step. Position only; nothing is inferred about understanding."""

    kind: Literal[EvidenceKind.STEP_VIEWED]
    step_index: int = Field(alias="stepIndex", ge=0, le=MAX_STEP_INDEX)


class ExperimentPerformed(EvidencePayload):
    """The learner ran an experiment. `normalized` is the one interaction unit-compare offers."""

    kind: Literal[EvidenceKind.EXPERIMENT_PERFORMED]
    experiment_id: str = Field(alias="experimentId", min_length=1, max_length=64)
    normalized: bool


class ReflectionSubmitted(EvidencePayload):
    """The learner's own words, stored verbatim.

    No score is stored here. A rubric result is a judgement derived at projection time from
    this text plus the current Learning Object, so it stays rebuildable and never freezes a
    verdict into the append-only record.
    """

    kind: Literal[EvidenceKind.REFLECTION_SUBMITTED]
    phase: Literal["pre", "post"]
    response: str = Field(min_length=1, max_length=MAX_RESPONSE_LENGTH)


class LessonCompleted(EvidencePayload):
    """The learner reached the end of the lesson. Completion is a fact, not a mastery claim."""

    kind: Literal[EvidenceKind.LESSON_COMPLETED]
    concept_version: str = Field(alias="conceptVersion", min_length=1, max_length=32)


class EvidenceRetracted(EvidencePayload):
    """The D4 compensating event: the only way to correct the record.

    Retraction appends; it never updates or deletes. Replay must honour it, which is why a
    consumer that reads only the latest event will be wrong.
    """

    kind: Literal[EvidenceKind.EVIDENCE_RETRACTED]
    retracts_event_id: uuid.UUID = Field(alias="retractsEventId")
    reason: str = Field(min_length=1, max_length=MAX_REASON_LENGTH)


type EvidenceEnvelope = Annotated[
    LessonStarted
    | StepViewed
    | ExperimentPerformed
    | ReflectionSubmitted
    | LessonCompleted
    | EvidenceRetracted,
    Field(discriminator="kind"),
]

_ENVELOPE_ADAPTER: TypeAdapter[EvidenceEnvelope] = TypeAdapter(EvidenceEnvelope)


class UnreadableEvidence(BaseModel):
    """A stored event that the current contract cannot parse.

    Returned instead of raising so that historical, retired, or malformed events stay
    visible. Projections count these and ignore them rather than guessing.
    """

    model_config = ConfigDict(frozen=True)

    kind: str
    payload: dict[str, Any]
    reason: str


def validate_for_write(kind: str, payload: Mapping[str, Any]) -> dict[str, Any]:
    """Validate an event against the contract and return the payload to store.

    `kind` is stored in its own column, so it is stripped from the returned payload rather
    than duplicated into JSONB.
    """
    if kind in RETIRED_EVIDENCE_KINDS:
        raise EvidenceContractError(
            f"Evidence kind '{kind}' is retired at vocabulary {VOCABULARY_VERSION} and is "
            "readable for replay only. Use a current kind for new writes."
        )
    if kind not in set(EvidenceKind):
        raise EvidenceContractError(
            f"Unknown evidence kind '{kind}'. Vocabulary {VOCABULARY_VERSION} accepts: "
            f"{', '.join(sorted(EvidenceKind))}."
        )

    try:
        envelope = _ENVELOPE_ADAPTER.validate_python({**payload, "kind": kind})
    except ValidationError as exc:
        raise EvidenceContractError(
            f"Payload does not match the contract for evidence kind '{kind}': "
            f"{exc.error_count()} problem(s). {_first_error(exc)}"
        ) from exc

    return envelope.model_dump(mode="json", by_alias=True, exclude={"kind"})


def parse_for_read(kind: str, payload: Mapping[str, Any]) -> EvidenceEnvelope | UnreadableEvidence:
    """Best-effort read. Never raises: an unparseable event is still part of the record."""
    try:
        return _ENVELOPE_ADAPTER.validate_python({**payload, "kind": kind})
    except ValidationError as exc:
        return UnreadableEvidence(
            kind=kind,
            payload=dict(payload),
            reason=f"Not readable under vocabulary {VOCABULARY_VERSION}: {_first_error(exc)}",
        )


def _first_error(exc: ValidationError) -> str:
    errors = exc.errors()
    if not errors:
        return "no detail available"
    first = errors[0]
    location = ".".join(str(part) for part in first["loc"]) or "payload"
    return f"{location}: {first['msg']}"
