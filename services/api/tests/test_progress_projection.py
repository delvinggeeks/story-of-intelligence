"""The progress projection: deterministic, replayable, and never stored.

Uses the real Numbers Learning Object rather than a fixture, so a content change that
breaks the projection fails here instead of in the browser.
"""

import random
import uuid
from datetime import UTC, datetime

import pytest

from academy_api.core.config import get_settings
from academy_api.domain.evidence import EvidenceKind
from academy_api.domain.learning_object import LearningObject
from academy_api.domain.learning_record import EvidenceEventRecord
from academy_api.domain.progress import project_progress
from academy_api.repositories.content import FileContentRepository

LEARNER = uuid.UUID("00000000-0000-4000-8000-000000000001")
SESSION = uuid.UUID("00000000-0000-4000-8000-000000000002")

GOOD_ANSWER = (
    "The quantity is a count of records, the unit is millions versus thousands, and a fair "
    "comparison needs one unit. Ignoring that risks a wrong decision."
)


@pytest.fixture(scope="module")
def numbers() -> LearningObject:
    return FileContentRepository(get_settings().content_root).get_learning_object("numbers")


def event(sequence: int, kind: str, payload: dict[str, object]) -> EvidenceEventRecord:
    moment = datetime.now(UTC)
    return EvidenceEventRecord(
        id=uuid.uuid4(),
        session_id=SESSION,
        sequence=sequence,
        kind=kind,
        payload=payload,
        occurred_at=moment,
        recorded_at=moment,
    )


def test_an_empty_stream_projects_an_empty_but_valid_view(numbers: LearningObject) -> None:
    progress = project_progress(LEARNER, numbers, [])

    assert progress.events_considered == 0
    assert progress.steps_viewed == []
    assert progress.furthest_step_index is None
    assert progress.last_sequence is None
    assert progress.completion_recorded is False
    assert progress.mastery is None
    # Totals come from the content, so the denominator exists before any evidence does.
    assert progress.steps_total == len(numbers.learning.steps)
    assert progress.experiments_total == len(numbers.learning.experiments)


def test_the_projection_folds_evidence_into_current_state(numbers: LearningObject) -> None:
    events = [
        event(1, EvidenceKind.LESSON_STARTED, {"conceptVersion": numbers.version}),
        event(2, EvidenceKind.STEP_VIEWED, {"stepIndex": 0}),
        event(3, EvidenceKind.STEP_VIEWED, {"stepIndex": 5}),
        event(4, EvidenceKind.STEP_VIEWED, {"stepIndex": 5}),
        event(
            5,
            EvidenceKind.EXPERIMENT_PERFORMED,
            {"experimentId": "numbers-unit-compare", "normalized": True},
        ),
        event(6, EvidenceKind.LESSON_COMPLETED, {"conceptVersion": numbers.version}),
    ]

    progress = project_progress(LEARNER, numbers, events)

    assert progress.steps_viewed == [0, 5]
    assert progress.furthest_step_index == 5
    assert progress.experiments_performed == ["numbers-unit-compare"]
    assert progress.completion_recorded is True
    assert progress.last_sequence == 6


def test_the_projection_is_order_independent_given_the_same_sequences(
    numbers: LearningObject,
) -> None:
    """Arrival order must not matter: `sequence` is the only replay key (ADR-0007 D5)."""
    events = [
        event(1, EvidenceKind.STEP_VIEWED, {"stepIndex": 0}),
        event(2, EvidenceKind.REFLECTION_SUBMITTED, {"phase": "post", "response": "first"}),
        event(3, EvidenceKind.REFLECTION_SUBMITTED, {"phase": "post", "response": "second"}),
        event(4, EvidenceKind.STEP_VIEWED, {"stepIndex": 2}),
    ]

    baseline = project_progress(LEARNER, numbers, events)
    shuffled = list(events)
    random.Random(7).shuffle(shuffled)

    assert project_progress(LEARNER, numbers, shuffled) == baseline
    # The later sequence wins regardless of the order the events were handed over in.
    assert baseline.post_reflection == "second"


def test_replaying_the_same_stream_twice_is_identical(numbers: LearningObject) -> None:
    events = [
        event(1, EvidenceKind.STEP_VIEWED, {"stepIndex": 1}),
        event(2, EvidenceKind.REFLECTION_SUBMITTED, {"phase": "pre", "response": "no idea"}),
    ]

    assert project_progress(LEARNER, numbers, events) == project_progress(LEARNER, numbers, events)


def test_a_retraction_removes_the_event_it_names(numbers: LearningObject) -> None:
    reflection = event(2, EvidenceKind.REFLECTION_SUBMITTED, {"phase": "post", "response": "oops"})
    retraction = event(
        3,
        EvidenceKind.EVIDENCE_RETRACTED,
        {"retractsEventId": str(reflection.id), "reason": "wrong box"},
    )

    progress = project_progress(LEARNER, numbers, [reflection, retraction])

    assert progress.post_reflection is None
    assert progress.mastery is None
    assert progress.events_retracted == 1
    # The retraction itself is not counted as learner evidence.
    assert progress.events_considered == 0


def test_a_retraction_applies_even_if_it_is_replayed_before_its_target(
    numbers: LearningObject,
) -> None:
    reflection = event(5, EvidenceKind.REFLECTION_SUBMITTED, {"phase": "pre", "response": "oops"})
    retraction = event(
        6,
        EvidenceKind.EVIDENCE_RETRACTED,
        {"retractsEventId": str(reflection.id), "reason": "wrong box"},
    )

    assert project_progress(LEARNER, numbers, [retraction, reflection]).pre_reflection is None


def test_unreadable_events_are_counted_and_never_crash_the_projection(
    numbers: LearningObject,
) -> None:
    """Phase C wrote kinds this vocabulary does not know. They must not break a reload."""
    events = [
        event(1, "answer-submitted", {"a": 1}),
        event(2, EvidenceKind.STEP_VIEWED, {"stepIndex": "third"}),
        event(3, EvidenceKind.STEP_VIEWED, {"stepIndex": 4}),
    ]

    progress = project_progress(LEARNER, numbers, events)

    assert progress.events_unreadable == 2
    assert progress.events_considered == 1
    assert progress.steps_viewed == [4]


def test_mastery_is_only_assessed_once_an_explanation_exists(numbers: LearningObject) -> None:
    started = [event(1, EvidenceKind.STEP_VIEWED, {"stepIndex": 0})]
    assert project_progress(LEARNER, numbers, started).mastery is None

    answered = [
        *started,
        event(2, EvidenceKind.REFLECTION_SUBMITTED, {"phase": "post", "response": GOOD_ANSWER}),
    ]
    mastery = project_progress(LEARNER, numbers, answered).mastery

    assert mastery is not None
    assert mastery.threshold == numbers.measurement.mastery_rubric.threshold
    assert len(mastery.checks) == len(numbers.measurement.mastery_rubric.checks)
    assert mastery.score >= mastery.threshold
    assert mastery.mastered is True


def test_an_empty_explanation_does_not_reach_the_threshold(numbers: LearningObject) -> None:
    events = [
        event(1, EvidenceKind.REFLECTION_SUBMITTED, {"phase": "post", "response": "dunno"}),
    ]

    mastery = project_progress(LEARNER, numbers, events).mastery

    assert mastery is not None
    assert mastery.mastered is False


def test_completion_evidence_is_separate_from_mastery(numbers: LearningObject) -> None:
    """Marking a lesson finished is a learner assertion, not a rubric verdict."""
    events = [event(1, EvidenceKind.LESSON_COMPLETED, {"conceptVersion": numbers.version})]

    progress = project_progress(LEARNER, numbers, events)

    assert progress.completion_recorded is True
    assert progress.mastery is None
