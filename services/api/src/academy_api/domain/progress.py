"""Deterministic progress projection: a pure fold over the append-only event stream.

Nothing here reads the clock, the database, or the network. Given the same Learning Object
and the same events, it always produces the same view, so the projection is a cache that can
be thrown away and rebuilt rather than a second source of truth.

Two things are deliberately kept apart:

* **completion evidence** - the learner reached the end. A fact they asserted.
* **mastery** - the LOS `masteryRubric` verdict. Reported only because `numbers.v2.json`
  defines it explicitly (threshold plus regex checks). It is a keyword match over the
  learner's own words, not a judgement of understanding, and it is labelled as such.
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Iterable, Sequence
from functools import lru_cache

from pydantic import BaseModel, ConfigDict, Field

from academy_api.domain.evidence import (
    VOCABULARY_VERSION,
    EvidenceKind,
    EvidenceRetracted,
    ExperimentPerformed,
    LessonCompleted,
    ReflectionSubmitted,
    StepViewed,
    UnreadableEvidence,
    parse_for_read,
)
from academy_api.domain.learning_object import LearningObject, MasteryRubric
from academy_api.domain.learning_record import EvidenceEventRecord


class ProgressModel(BaseModel):
    model_config = ConfigDict(frozen=True, populate_by_name=True)


class RubricCheckResult(ProgressModel):
    id: str
    label: str
    passed: bool


class MasteryAssessment(ProgressModel):
    """The LOS-defined rubric verdict. See `method` before treating this as understanding."""

    score: int
    threshold: int
    checks: list[RubricCheckResult]
    mastered: bool
    method: str = Field(
        default="los-mastery-rubric-regex",
        description=(
            "Deterministic keyword match defined by the Learning Object. Evidence that the "
            "learner named the required dimensions, not proof that they understood them."
        ),
    )


class ConceptProgress(ProgressModel):
    """A rebuildable view of one learner's evidence for one concept."""

    learner_id: uuid.UUID = Field(alias="learnerId")
    concept_id: str = Field(alias="conceptId")
    concept_version: str = Field(alias="conceptVersion")
    vocabulary_version: str = Field(alias="vocabularyVersion", default=VOCABULARY_VERSION)

    events_considered: int = Field(alias="eventsConsidered")
    events_retracted: int = Field(alias="eventsRetracted")
    events_unreadable: int = Field(alias="eventsUnreadable")
    last_sequence: int | None = Field(alias="lastSequence")

    steps_total: int = Field(alias="stepsTotal")
    steps_viewed: list[int] = Field(alias="stepsViewed")
    furthest_step_index: int | None = Field(alias="furthestStepIndex")

    experiments_total: int = Field(alias="experimentsTotal")
    experiments_performed: list[str] = Field(alias="experimentsPerformed")

    pre_reflection: str | None = Field(alias="preReflection")
    post_reflection: str | None = Field(alias="postReflection")

    completion_recorded: bool = Field(alias="completionRecorded")
    mastery: MasteryAssessment | None


def project_progress(
    learner_id: uuid.UUID,
    learning_object: LearningObject,
    events: Iterable[EvidenceEventRecord],
) -> ConceptProgress:
    """Replay evidence in `sequence` order (D5) and fold it into the current view."""
    ordered = sorted(events, key=lambda event: event.sequence)
    retracted = _retracted_ids(ordered)

    steps_viewed: set[int] = set()
    experiments: dict[str, None] = {}
    pre_reflection: str | None = None
    post_reflection: str | None = None
    completed = False
    unreadable = 0
    considered = 0

    for event in ordered:
        if event.id in retracted:
            continue
        parsed = parse_for_read(event.kind, event.payload)
        if isinstance(parsed, UnreadableEvidence):
            unreadable += 1
            continue
        if isinstance(parsed, EvidenceRetracted):
            continue

        considered += 1
        if isinstance(parsed, StepViewed):
            steps_viewed.add(parsed.step_index)
        elif isinstance(parsed, ExperimentPerformed):
            experiments[parsed.experiment_id] = None
        elif isinstance(parsed, ReflectionSubmitted):
            if parsed.phase == "pre":
                pre_reflection = parsed.response
            else:
                post_reflection = parsed.response
        elif isinstance(parsed, LessonCompleted):
            completed = True

    return ConceptProgress(
        learnerId=learner_id,
        conceptId=learning_object.id,
        conceptVersion=learning_object.version,
        eventsConsidered=considered,
        eventsRetracted=len(retracted),
        eventsUnreadable=unreadable,
        lastSequence=ordered[-1].sequence if ordered else None,
        stepsTotal=len(learning_object.learning.steps),
        stepsViewed=sorted(steps_viewed),
        furthestStepIndex=max(steps_viewed) if steps_viewed else None,
        experimentsTotal=len(learning_object.learning.experiments),
        experimentsPerformed=list(experiments),
        preReflection=pre_reflection,
        postReflection=post_reflection,
        completionRecorded=completed,
        mastery=(
            evaluate_rubric(learning_object.measurement.mastery_rubric, post_reflection)
            if post_reflection is not None
            else None
        ),
    )


def evaluate_rubric(rubric: MasteryRubric, response: str) -> MasteryAssessment:
    """Apply the Learning Object's own rubric. The patterns are content, not policy."""
    checks = [
        RubricCheckResult(
            id=check.id,
            label=check.label,
            passed=_compiled(check.pattern).search(response) is not None,
        )
        for check in rubric.checks
    ]
    score = sum(1 for check in checks if check.passed)
    return MasteryAssessment(
        score=score,
        threshold=rubric.threshold,
        checks=checks,
        mastered=score >= rubric.threshold,
    )


def _retracted_ids(events: Sequence[EvidenceEventRecord]) -> set[uuid.UUID]:
    """Collect retraction targets first, so a retraction works regardless of arrival order."""
    retracted: set[uuid.UUID] = set()
    for event in events:
        if event.kind != EvidenceKind.EVIDENCE_RETRACTED:
            continue
        parsed = parse_for_read(event.kind, event.payload)
        if isinstance(parsed, EvidenceRetracted):
            retracted.add(parsed.retracts_event_id)
    return retracted


@lru_cache(maxsize=64)
def _compiled(pattern: str) -> re.Pattern[str]:
    return re.compile(pattern, re.IGNORECASE)
