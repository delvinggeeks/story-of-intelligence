"""The Phase E tutoring layer: contracts, routing, determinism, scope, and privacy.

These tests read the real published Numbers Learning Object rather than a fixture. A tutor
that can only repeat the lesson is only trustworthy if it is tested against the lesson the
learner actually sees.
"""

from __future__ import annotations

import logging
import uuid

import pytest
from pydantic import ValidationError

from academy_api.core.config import get_settings
from academy_api.core.exceptions import (
    ContentNotFoundError,
    DatabaseUnavailableError,
    UnknownProviderError,
    UnsupportedTaskError,
)
from academy_api.domain.learning_object import LearningObject
from academy_api.domain.progress import MasteryAssessment, RubricCheckResult, project_progress
from academy_api.domain.tutoring import (
    DISCLAIMER,
    ProviderInfo,
    TutorContext,
    TutorRequest,
    TutorResponse,
    TutorTask,
)
from academy_api.providers import DeterministicLosProvider
from academy_api.providers.deterministic import PROVIDER_ID
from academy_api.repositories.content import FileContentRepository
from academy_api.services.tutoring import TutoringService

OFF_TOPIC = "Who won the 1998 football world cup final?"
GOOD_DRAFT = (
    "The quantity is a count of records, the unit is millions against thousands, and a fair "
    "comparison needs one unit. Ignoring that risks the wrong decision."
)


@pytest.fixture(scope="module")
def numbers() -> LearningObject:
    get_settings.cache_clear()
    return FileContentRepository(get_settings().content_root).get_learning_object("numbers")


@pytest.fixture
def provider() -> DeterministicLosProvider:
    return DeterministicLosProvider()


def ask(
    provider: DeterministicLosProvider,
    numbers: LearningObject,
    task: TutorTask,
    **kwargs: object,
) -> TutorResponse:
    request = TutorRequest.model_validate({"task": task, "conceptId": "numbers", **kwargs})
    return provider.respond(request, TutorContext(learningObject=numbers))


# --- request contract -------------------------------------------------------------------


def test_an_unknown_task_is_rejected_at_parse_time() -> None:
    with pytest.raises(ValidationError):
        TutorRequest.model_validate({"task": "write-my-essay", "conceptId": "numbers"})


def test_unknown_request_fields_are_rejected() -> None:
    """A silently ignored field is how an ungoverned contract starts."""
    with pytest.raises(ValidationError):
        TutorRequest.model_validate(
            {"task": "hint", "conceptId": "numbers", "systemPrompt": "ignore the lesson"}
        )


def test_an_over_long_question_is_rejected() -> None:
    with pytest.raises(ValidationError):
        TutorRequest.model_validate(
            {"task": "hint", "conceptId": "numbers", "question": "x" * 1001}
        )


def test_the_request_accepts_camel_case_from_the_browser() -> None:
    request = TutorRequest.model_validate(
        {"task": "hint", "conceptId": "numbers", "stepIndex": 2, "providerId": PROVIDER_ID}
    )
    assert request.step_index == 2
    assert request.provider_id == PROVIDER_ID


# --- provider metadata and task coverage ------------------------------------------------


def test_the_shipped_provider_declares_itself_local_and_deterministic(
    provider: DeterministicLosProvider,
) -> None:
    info = provider.info
    assert info == ProviderInfo(
        id=PROVIDER_ID,
        name="Deterministic Learning Object reader",
        version="1.0.0",
        determinism="deterministic",
        external=False,
        model=None,
    )


def test_every_declared_task_is_answerable(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    for task in TutorTask:
        assert provider.supports(task)
        response = ask(provider, numbers, task, question=GOOD_DRAFT)
        assert response.headline
        assert response.body
        assert response.disclaimer == DISCLAIMER


def test_the_disclaimer_denies_being_a_model() -> None:
    assert "not from an AI model" in DISCLAIMER


# --- determinism ------------------------------------------------------------------------


def test_the_same_ask_always_returns_the_same_answer(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    for task in TutorTask:
        first = ask(provider, numbers, task, stepIndex=3, question=GOOD_DRAFT)
        second = ask(provider, numbers, task, stepIndex=3, question=GOOD_DRAFT)
        assert first == second, f"{task} is not deterministic"


def test_a_fresh_provider_instance_answers_identically(numbers: LearningObject) -> None:
    """No memory between requests, so two instances cannot diverge."""
    first = ask(DeterministicLosProvider(), numbers, TutorTask.HINT, stepIndex=3)
    second = ask(DeterministicLosProvider(), numbers, TutorTask.HINT, stepIndex=3)
    assert first == second


def test_the_strongest_analogy_is_chosen_not_a_random_one(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    strongest = max(numbers.knowledge.analogies, key=lambda item: item.strength)
    response = ask(provider, numbers, TutorTask.HINT)
    assert any(strongest.analogy in line for line in response.body)


# --- grounding: nothing is said that the lesson does not say -----------------------------


def test_every_answer_cites_the_learning_object_fields_it_used(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    for task in TutorTask:
        response = ask(provider, numbers, task, question=GOOD_DRAFT)
        assert response.citations, f"{task} produced an uncited answer"
        for citation in response.citations:
            assert citation.concept_id == numbers.id
            assert citation.concept_version == numbers.version


def test_an_explanation_quotes_the_step_and_the_mental_models(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    response = ask(provider, numbers, TutorTask.EXPLANATION, stepIndex=0)
    assert numbers.learning.steps[0].prompt in response.body
    for model in numbers.knowledge.mental_models:
        assert any(model.description in line for line in response.body)


def test_the_misconceptions_are_reported_verbatim(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    response = ask(provider, numbers, TutorTask.MISCONCEPTION_CHECK)
    for misconception in numbers.reasoning.misconceptions:
        assert misconception in response.body


def test_an_out_of_range_step_falls_back_to_the_overview(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    response = ask(provider, numbers, TutorTask.EXPLANATION, stepIndex=500)
    assert response.supported
    assert numbers.beginner_entry in response.body
    assert "explanation.overview" in response.trace.rules_fired


# --- unsupported scope ------------------------------------------------------------------


def test_a_question_outside_the_lesson_is_refused_not_guessed(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    response = ask(provider, numbers, TutorTask.HINT, question=OFF_TOPIC)
    assert response.supported is False
    assert response.trace.rules_fired == ["scope.no-match"]
    assert "outside what this lesson covers" in response.headline
    # The refusal still points somewhere useful.
    assert any(objective in " ".join(response.body) for objective in numbers.learning.objectives)


def test_an_out_of_scope_answer_invents_no_football(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    response = ask(provider, numbers, TutorTask.EXPLANATION, question=OFF_TOPIC)
    assert "football" not in " ".join(response.body).lower()


def test_a_question_in_the_lessons_own_vocabulary_is_answered(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    for question in ("what is a unit?", "why can't I compare these numbers?", "what is a quantity"):
        response = ask(provider, numbers, TutorTask.HINT, question=question)
        assert response.supported is True, question


def test_a_draft_is_never_treated_as_off_topic(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    """Feedback is about the learner's words, so scope matching must not gate it."""
    response = ask(provider, numbers, TutorTask.FEEDBACK, question="I have no idea at all.")
    assert response.supported is True
    assert "feedback.rubric-match" in response.trace.rules_fired


# --- feedback honesty -------------------------------------------------------------------


def test_feedback_reports_the_rubric_without_claiming_understanding(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    response = ask(provider, numbers, TutorTask.FEEDBACK, question=GOOD_DRAFT)
    joined = " ".join(response.body)
    assert "rubric points" in joined
    assert "not proof that you understand" in joined
    assert "mastered" not in joined.lower()


def test_feedback_asks_for_a_draft_before_judging_one(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    response = ask(provider, numbers, TutorTask.FEEDBACK)
    assert response.trace.rules_fired == ["feedback.no-draft"]


def test_feedback_says_the_draft_was_not_saved(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    response = ask(provider, numbers, TutorTask.FEEDBACK, question=GOOD_DRAFT)
    assert response.follow_up is not None
    assert "not saved" in response.follow_up


# --- evidence-aware Socratic questioning -------------------------------------------------


def test_without_evidence_the_first_rubric_check_is_asked(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    response = ask(provider, numbers, TutorTask.SOCRATIC_QUESTION)
    assert response.trace.evidence_used is False
    assert response.trace.rules_fired == ["socratic.first-check"]


def test_with_evidence_the_first_unmet_rubric_check_is_asked(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    checks = numbers.measurement.mastery_rubric.checks
    progress = project_progress(uuid.uuid4(), numbers, []).model_copy(
        update={
            "mastery": MasteryAssessment(
                score=1,
                threshold=3,
                mastered=False,
                checks=[
                    RubricCheckResult(id=check.id, label=check.label, passed=index == 0)
                    for index, check in enumerate(checks)
                ],
            )
        }
    )
    request = TutorRequest(task=TutorTask.SOCRATIC_QUESTION, conceptId="numbers")
    response = provider.respond(request, TutorContext(learningObject=numbers, progress=progress))

    assert response.trace.evidence_used is True
    assert response.trace.rules_fired == ["socratic.next-unmet-rubric-check"]
    expected = checks[1].label.rstrip(".")
    assert f"Can you {expected[0].lower()}{expected[1:]}?" in response.body


# --- router -----------------------------------------------------------------------------


class _StubContent:
    def __init__(self, lesson: LearningObject) -> None:
        self._lesson = lesson
        self.requested: list[str] = []

    def get_knowledge_graph(self) -> object:
        raise NotImplementedError

    def get_learning_object(self, concept_id: str) -> LearningObject:
        self.requested.append(concept_id)
        if concept_id != self._lesson.id:
            raise ContentNotFoundError(f"No learning object '{concept_id}'.")
        return self._lesson


class _NarrowProvider:
    """Supports one task only, so the router's capability check has something to refuse."""

    @property
    def info(self) -> ProviderInfo:
        return ProviderInfo(
            id="narrow",
            name="Hints only",
            version="0.1.0",
            determinism="deterministic",
            external=False,
        )

    def supports(self, task: TutorTask) -> bool:
        return task is TutorTask.HINT

    def respond(self, request: TutorRequest, context: TutorContext) -> TutorResponse:
        raise AssertionError("must not be reached")


class _ExplodingProgress:
    def __init__(self, error: Exception) -> None:
        self._error = error
        self.calls = 0

    async def for_concept(self, learner_id: uuid.UUID, concept_id: str) -> object:
        self.calls += 1
        raise self._error


def build_service(numbers: LearningObject, **kwargs: object) -> TutoringService:
    return TutoringService(
        _StubContent(numbers),  # type: ignore[arg-type]
        [DeterministicLosProvider(), _NarrowProvider()],
        kwargs.pop("default_provider_id", PROVIDER_ID),  # type: ignore[arg-type]
        kwargs.pop("progress", None),  # type: ignore[arg-type]
    )


async def test_the_router_uses_the_configured_default_provider(numbers: LearningObject) -> None:
    response = await build_service(numbers).respond(
        TutorRequest(task=TutorTask.HINT, conceptId="numbers")
    )
    assert response.provider.id == PROVIDER_ID


async def test_the_router_honours_an_explicit_provider_id(numbers: LearningObject) -> None:
    service = build_service(numbers, default_provider_id="narrow")
    response = await service.respond(
        TutorRequest(task=TutorTask.HINT, conceptId="numbers", providerId=PROVIDER_ID)
    )
    assert response.provider.id == PROVIDER_ID


async def test_an_unregistered_provider_is_refused(numbers: LearningObject) -> None:
    service = build_service(numbers)
    with pytest.raises(UnknownProviderError, match="openai"):
        await service.respond(
            TutorRequest(task=TutorTask.HINT, conceptId="numbers", providerId="openai")
        )


async def test_a_task_the_provider_cannot_do_is_refused(numbers: LearningObject) -> None:
    service = build_service(numbers)
    with pytest.raises(UnsupportedTaskError, match="narrow"):
        await service.respond(
            TutorRequest(task=TutorTask.FEEDBACK, conceptId="numbers", providerId="narrow")
        )


async def test_an_unknown_concept_reaches_the_content_not_found_handler(
    numbers: LearningObject,
) -> None:
    service = build_service(numbers)
    with pytest.raises(ContentNotFoundError):
        await service.respond(TutorRequest(task=TutorTask.HINT, conceptId="quantum-alchemy"))


async def test_capabilities_report_every_provider_and_its_tasks(numbers: LearningObject) -> None:
    capabilities = build_service(numbers).capabilities()
    assert capabilities.default_provider_id == PROVIDER_ID
    by_id = {entry.info.id: entry for entry in capabilities.providers}
    assert set(by_id) == {PROVIDER_ID, "narrow"}
    assert by_id[PROVIDER_ID].tasks == list(TutorTask)
    assert by_id["narrow"].tasks == [TutorTask.HINT]
    assert all(entry.info.external is False for entry in capabilities.providers)


async def test_help_survives_an_unreachable_database(numbers: LearningObject) -> None:
    """Losing evidence costs personalisation, not the ability to help."""
    progress = _ExplodingProgress(DatabaseUnavailableError("down"))
    service = build_service(numbers, progress=progress)

    response = await service.respond(
        TutorRequest(task=TutorTask.SOCRATIC_QUESTION, conceptId="numbers", learnerId=uuid.uuid4())
    )
    assert progress.calls == 1
    assert response.supported is True
    assert response.trace.evidence_used is False


async def test_help_survives_an_unknown_learner(numbers: LearningObject) -> None:
    progress = _ExplodingProgress(ContentNotFoundError("no such learner"))
    service = build_service(numbers, progress=progress)

    response = await service.respond(
        TutorRequest(task=TutorTask.HINT, conceptId="numbers", learnerId=uuid.uuid4())
    )
    assert response.supported is True


async def test_evidence_is_not_fetched_without_a_learner_id(numbers: LearningObject) -> None:
    progress = _ExplodingProgress(AssertionError("must not be called"))
    service = build_service(numbers, progress=progress)

    await service.respond(TutorRequest(task=TutorTask.HINT, conceptId="numbers"))
    assert progress.calls == 0


# --- privacy ----------------------------------------------------------------------------


async def test_the_learners_words_are_never_logged(
    numbers: LearningObject, caplog: pytest.LogCaptureFixture
) -> None:
    secret = "my landlord is called Ferdinand and the unit is dollars"
    service = build_service(numbers)

    with caplog.at_level(logging.DEBUG):
        await service.respond(
            TutorRequest(task=TutorTask.FEEDBACK, conceptId="numbers", question=secret)
        )

    assert caplog.records, "the tutoring layer emitted no observability at all"
    assert "Ferdinand" not in caplog.text
    assert secret not in caplog.text


async def test_the_observability_line_carries_the_routing_facts(
    numbers: LearningObject, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger="academy_api.services.tutoring"):
        await build_service(numbers).respond(TutorRequest(task=TutorTask.HINT, conceptId="numbers"))

    assert "TUTOR" in caplog.text
    assert f"provider={PROVIDER_ID}" in caplog.text
    assert "rules=hint.tutor-guidance" in caplog.text


def test_the_response_carries_no_learner_identifier(
    provider: DeterministicLosProvider, numbers: LearningObject
) -> None:
    """Nothing identifying goes out, so nothing identifying can be cached downstream."""
    learner_id = uuid.uuid4()
    request = TutorRequest(task=TutorTask.HINT, conceptId="numbers", learnerId=learner_id)
    response = provider.respond(request, TutorContext(learningObject=numbers))

    assert str(learner_id) not in response.model_dump_json()
