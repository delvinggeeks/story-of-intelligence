"""A tutor that can only say what the Learning Object already says.

Every passage this provider emits is either a verbatim Learning Object field or fixed
template copy defined in this module. There is no generation, no paraphrase of governed
content, no external call, and no memory between requests. That is the whole point: it is
auditable, reproducible, and incapable of inventing a fact the lesson does not contain.

When a question falls outside the lesson's own vocabulary the provider says so and points
back at the material, rather than guessing. Scope is judged with the lesson's own rubric
patterns and its own words, so the boundary moves with the content instead of with code.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field

from academy_api.domain.learning_object import Analogy, LearningObject, RubricCheck, Step
from academy_api.domain.progress import evaluate_rubric
from academy_api.domain.tutoring import (
    Citation,
    ProviderInfo,
    TutorContext,
    TutorRequest,
    TutorResponse,
    TutorTask,
    TutorTrace,
)

PROVIDER_ID = "deterministic-los"

PROVIDER_INFO = ProviderInfo(
    id=PROVIDER_ID,
    name="Deterministic Learning Object reader",
    version="1.0.0",
    determinism="deterministic",
    external=False,
    model=None,
)

RUBRIC_CAVEAT = (
    "This is the keyword check the lesson defines. Matching every point is not proof that "
    "you understand the idea, and missing one does not mean you do not."
)

_WORD = re.compile(r"[a-z]{4,}")

# Words common enough that sharing one with the lesson says nothing about relevance.
_STOPWORDS = frozenset(
    {
        "about",
        "after",
        "again",
        "also",
        "back",
        "because",
        "been",
        "before",
        "being",
        "both",
        "does",
        "doing",
        "down",
        "each",
        "even",
        "ever",
        "from",
        "have",
        "here",
        "into",
        "just",
        "know",
        "like",
        "make",
        "many",
        "more",
        "most",
        "much",
        "must",
        "need",
        "only",
        "other",
        "over",
        "same",
        "should",
        "some",
        "such",
        "than",
        "that",
        "them",
        "then",
        "there",
        "these",
        "they",
        "thing",
        "things",
        "this",
        "those",
        "very",
        "want",
        "were",
        "what",
        "when",
        "where",
        "which",
        "while",
        "will",
        "with",
        "would",
        "your",
    }
)


class DeterministicLosProvider:
    """The only provider Phase E ships. Local, offline, and free of model weights."""

    @property
    def info(self) -> ProviderInfo:
        return PROVIDER_INFO

    def supports(self, task: TutorTask) -> bool:
        return task in _HANDLERS

    def respond(self, request: TutorRequest, context: TutorContext) -> TutorResponse:
        lesson = context.learning_object
        question = (request.question or "").strip()

        # Feedback is *about* the learner's own words, so it is never out of scope.
        if question and request.task is not TutorTask.FEEDBACK and not _in_scope(question, lesson):
            return _finish(request, context, _out_of_scope(lesson), supported=False)

        return _finish(request, context, _HANDLERS[request.task](request, context))


@dataclass(frozen=True)
class _Answer:
    headline: str
    body: list[str]
    rules: list[str]
    citations: list[str]
    follow_up: str | None = None
    used_evidence: bool = field(default=False)


def _finish(
    request: TutorRequest,
    context: TutorContext,
    answer: _Answer,
    supported: bool = True,
) -> TutorResponse:
    lesson = context.learning_object
    return TutorResponse(
        task=request.task,
        conceptId=lesson.id,
        supported=supported,
        headline=answer.headline,
        body=answer.body,
        followUp=answer.follow_up,
        citations=[
            Citation(conceptId=lesson.id, conceptVersion=lesson.version, field=field)
            for field in answer.citations
        ],
        provider=PROVIDER_INFO,
        trace=TutorTrace(
            providerId=PROVIDER_ID,
            conceptVersion=lesson.version,
            rulesFired=answer.rules,
            evidenceUsed=answer.used_evidence,
        ),
    )


def _step_for(request: TutorRequest, lesson: LearningObject) -> Step | None:
    index = request.step_index
    if index is None or index >= len(lesson.learning.steps):
        return None
    return lesson.learning.steps[index]


def _mental_models(lesson: LearningObject) -> list[str]:
    return [f"{model.name}: {model.description}" for model in lesson.knowledge.mental_models]


def _strongest_analogy(lesson: LearningObject) -> Analogy:
    """Highest `strength`, earliest on a tie, so the same lesson always yields the same one."""
    return min(
        enumerate(lesson.knowledge.analogies),
        key=lambda pair: (-pair[1].strength, pair[0]),
    )[1]


def _explanation(request: TutorRequest, context: TutorContext) -> _Answer:
    lesson = context.learning_object
    step = _step_for(request, lesson)
    if step is not None:
        return _Answer(
            headline=f"What this step is asking: {step.label}",
            body=[step.prompt, *_mental_models(lesson)],
            rules=["explanation.step", "explanation.mental-models"],
            citations=[f"learning.steps[{request.step_index}].prompt", "knowledge.mentalModels"],
            follow_up="Ask for a hint instead if you would rather have a nudge than an answer.",
        )
    return _Answer(
        headline=f"What {lesson.title} is about",
        body=[lesson.beginner_entry, lesson.scope, *_mental_models(lesson)],
        rules=["explanation.overview", "explanation.mental-models"],
        citations=["beginnerEntry", "scope", "knowledge.mentalModels"],
        follow_up="Ask for a hint instead if you would rather have a nudge than an answer.",
    )


def _hint(request: TutorRequest, context: TutorContext) -> _Answer:
    lesson = context.learning_object
    analogy = _strongest_analogy(lesson)
    body = [
        # Labelled because this copy is written to coach a tutor, not to address a learner.
        f"The lesson's own coaching guidance: {lesson.reasoning.tutor_guidance}",
        f"Think of it like this: {analogy.analogy}.",
        f"When that comparison helps: {analogy.when_to_use}",
    ]
    rules = ["hint.tutor-guidance", "hint.strongest-analogy"]
    citations = ["reasoning.tutorGuidance", "knowledge.analogies"]

    step = _step_for(request, lesson)
    experiment = (
        next(
            (item for item in lesson.learning.experiments if item.id == step.experiment_id),
            None,
        )
        if step is not None and step.experiment_id
        else None
    )
    if experiment is not None:
        body.append(f"On this step: {experiment.instructions}")
        rules.append("hint.experiment-instructions")
        citations.append(f"learning.experiments[{experiment.id}].instructions")

    return _Answer(
        headline="A nudge, not the answer",
        body=body,
        rules=rules,
        citations=citations,
        follow_up="Ask for an explanation if the nudge is not enough.",
    )


def _socratic_question(request: TutorRequest, context: TutorContext) -> _Answer:
    lesson = context.learning_object
    checks = lesson.measurement.mastery_rubric.checks
    target, used_evidence = _next_unmet_check(checks, context)
    asked = target.label.rstrip(".")
    return _Answer(
        headline="A question for you",
        body=[
            f"Can you {asked[0].lower()}{asked[1:]}?",
            "The lesson's own rubric looks for that idea in your final explanation.",
        ],
        rules=["socratic.next-unmet-rubric-check" if used_evidence else "socratic.first-check"],
        citations=["measurement.masteryRubric.checks"],
        follow_up="Answer it in your own words. Nothing you type here is saved.",
        used_evidence=used_evidence,
    )


def _next_unmet_check(checks: list[RubricCheck], context: TutorContext) -> tuple[RubricCheck, bool]:
    """Ask about what the learner has not said yet, when there is evidence to tell."""
    mastery = context.progress.mastery if context.progress is not None else None
    if mastery is None:
        return checks[0], False
    unmet = {result.id for result in mastery.checks if not result.passed}
    return next((check for check in checks if check.id in unmet), checks[0]), True


def _feedback(request: TutorRequest, context: TutorContext) -> _Answer:
    lesson = context.learning_object
    draft = (request.question or "").strip()
    if not draft:
        return _Answer(
            headline="I need your words first",
            body=[
                "Type or paste the explanation you are drafting, and I will tell you which "
                "of the lesson's rubric points it already names.",
            ],
            rules=["feedback.no-draft"],
            citations=[],
            follow_up="Nothing you type is saved until you submit it as your explanation.",
        )

    assessment = evaluate_rubric(lesson.measurement.mastery_rubric, draft)
    named = [result.label for result in assessment.checks if result.passed]
    missing = [result.label for result in assessment.checks if not result.passed]

    body = [
        f"Your draft matches {assessment.score} of {len(assessment.checks)} rubric points; "
        f"{assessment.threshold} are required."
    ]
    if named:
        body.append("Already named: " + " ".join(named))
    if missing:
        body.append("Not yet named: " + " ".join(missing))
    body.append(RUBRIC_CAVEAT)

    return _Answer(
        headline="Feedback on your draft",
        body=body,
        rules=["feedback.rubric-match"],
        citations=["measurement.masteryRubric"],
        follow_up=(
            "This draft was not saved. Submit it in the explanation box when you are ready."
        ),
    )


def _misconception_check(request: TutorRequest, context: TutorContext) -> _Answer:
    lesson = context.learning_object
    return _Answer(
        headline="Common ways this idea gets misread",
        body=[
            *lesson.reasoning.misconceptions,
            *(f"Corrective — {model}" for model in _mental_models(lesson)),
        ],
        rules=["misconception.list", "misconception.mental-models"],
        citations=["reasoning.misconceptions", "knowledge.mentalModels"],
        follow_up="Ask for an explanation if one of those sounds like what you were thinking.",
    )


def _out_of_scope(lesson: LearningObject) -> _Answer:
    checks = lesson.measurement.mastery_rubric.checks
    return _Answer(
        headline="That is outside what this lesson covers",
        body=[
            f"I answer only from the published {lesson.title} lesson, and I could not find "
            "your question anywhere in it. I would rather say so than guess.",
            "This lesson covers: " + " ".join(lesson.learning.objectives),
        ],
        rules=["scope.no-match"],
        citations=["learning.objectives"],
        follow_up="Try asking about: " + " ".join(check.label for check in checks[:3]),
    )


def _in_scope(question: str, lesson: LearningObject) -> bool:
    """The lesson decides its own boundary: its rubric patterns and its own vocabulary."""
    if evaluate_rubric(lesson.measurement.mastery_rubric, question).score > 0:
        return True
    return bool(_tokens(question) & _vocabulary(lesson))


def _tokens(text: str) -> set[str]:
    return {word for word in _WORD.findall(text.lower()) if word not in _STOPWORDS}


def _vocabulary(lesson: LearningObject) -> set[str]:
    sources = [
        lesson.title,
        lesson.scope,
        lesson.beginner_entry,
        lesson.knowledge.history,
        lesson.reasoning.tutor_guidance,
        *lesson.learning.objectives,
        *lesson.reasoning.misconceptions,
        *lesson.measurement.success_criteria,
        *(model.name for model in lesson.knowledge.mental_models),
        *(model.description for model in lesson.knowledge.mental_models),
        *(item.analogy for item in lesson.knowledge.analogies),
        *(step.prompt for step in lesson.learning.steps),
        *(item.instructions for item in lesson.learning.experiments),
        *(check.label for check in lesson.measurement.mastery_rubric.checks),
    ]
    return _tokens(" ".join(sources))


_HANDLERS: dict[TutorTask, Callable[[TutorRequest, TutorContext], _Answer]] = {
    TutorTask.EXPLANATION: _explanation,
    TutorTask.HINT: _hint,
    TutorTask.SOCRATIC_QUESTION: _socratic_question,
    TutorTask.FEEDBACK: _feedback,
    TutorTask.MISCONCEPTION_CHECK: _misconception_check,
}
