"""The ADR-0007 evidence contract: a closed vocabulary and typed payloads.

These are pure-domain tests. No database is involved, because the contract must hold
before anything is written.
"""

import uuid

import pytest
from pydantic import ValidationError

from academy_api.core.exceptions import EvidenceContractError
from academy_api.domain.evidence import (
    VOCABULARY_VERSION,
    EvidenceKind,
    LessonStarted,
    ReflectionSubmitted,
    StepViewed,
    UnreadableEvidence,
    parse_for_read,
    validate_for_write,
)


def test_the_vocabulary_is_versioned_and_closed() -> None:
    assert VOCABULARY_VERSION == "1.0.0"
    assert set(EvidenceKind) == {
        EvidenceKind.LESSON_STARTED,
        EvidenceKind.STEP_VIEWED,
        EvidenceKind.EXPERIMENT_PERFORMED,
        EvidenceKind.REFLECTION_SUBMITTED,
        EvidenceKind.LESSON_COMPLETED,
        EvidenceKind.EVIDENCE_RETRACTED,
    }


def test_an_unknown_kind_is_refused_on_write() -> None:
    with pytest.raises(EvidenceContractError, match="Unknown evidence kind"):
        validate_for_write("lesson.vibed", {})


@pytest.mark.parametrize(
    ("kind", "payload"),
    [
        (EvidenceKind.STEP_VIEWED, {"stepIndex": -1}),
        (EvidenceKind.STEP_VIEWED, {"stepIndex": 10_000}),
        (EvidenceKind.STEP_VIEWED, {}),
        (EvidenceKind.REFLECTION_SUBMITTED, {"phase": "middle", "response": "x"}),
        (EvidenceKind.REFLECTION_SUBMITTED, {"phase": "pre", "response": ""}),
        (EvidenceKind.EXPERIMENT_PERFORMED, {"experimentId": "e"}),
        (EvidenceKind.LESSON_STARTED, {"conceptVersion": "2.0.0", "extra": 1}),
    ],
)
def test_a_payload_that_violates_its_contract_is_refused(kind: str, payload: dict) -> None:  # type: ignore[type-arg]
    with pytest.raises(EvidenceContractError, match="does not match the contract"):
        validate_for_write(kind, payload)


def test_the_kind_is_not_duplicated_into_the_stored_payload() -> None:
    stored = validate_for_write(EvidenceKind.STEP_VIEWED, {"stepIndex": 3})

    assert stored == {"stepIndex": 3}
    assert "kind" not in stored


def test_write_normalises_to_the_wire_alias() -> None:
    stored = validate_for_write(EvidenceKind.LESSON_STARTED, {"conceptVersion": "2.0.0"})

    assert stored == {"conceptVersion": "2.0.0"}


def test_a_valid_event_round_trips_through_read() -> None:
    stored = validate_for_write(
        EvidenceKind.REFLECTION_SUBMITTED, {"phase": "post", "response": "Units must match."}
    )
    parsed = parse_for_read(EvidenceKind.REFLECTION_SUBMITTED, stored)

    assert isinstance(parsed, ReflectionSubmitted)
    assert parsed.response == "Units must match."


def test_reading_an_unknown_historical_kind_does_not_raise() -> None:
    """Phase C wrote opaque kinds. They must stay readable, not retro-validated."""
    parsed = parse_for_read("answer-submitted", {"a": 1})

    assert isinstance(parsed, UnreadableEvidence)
    assert parsed.kind == "answer-submitted"
    assert parsed.payload == {"a": 1}
    assert parsed.reason


def test_reading_a_malformed_payload_of_a_known_kind_does_not_raise() -> None:
    parsed = parse_for_read(EvidenceKind.STEP_VIEWED, {"stepIndex": "third"})

    assert isinstance(parsed, UnreadableEvidence)


def test_payload_models_are_frozen() -> None:
    event = StepViewed(kind=EvidenceKind.STEP_VIEWED, step_index=1)

    with pytest.raises(ValidationError):
        event.step_index = 2  # type: ignore[misc]


def test_a_retraction_must_name_the_event_it_supersedes() -> None:
    target = uuid.uuid4()
    stored = validate_for_write(
        EvidenceKind.EVIDENCE_RETRACTED,
        {"retractsEventId": str(target), "reason": "mistyped"},
    )

    assert stored == {"retractsEventId": str(target), "reason": "mistyped"}

    with pytest.raises(EvidenceContractError):
        validate_for_write(EvidenceKind.EVIDENCE_RETRACTED, {"reason": "mistyped"})


def test_lesson_started_requires_the_concept_version() -> None:
    parsed = parse_for_read(EvidenceKind.LESSON_STARTED, {"conceptVersion": "2.0.0"})

    assert isinstance(parsed, LessonStarted)
    assert parsed.concept_version == "2.0.0"
