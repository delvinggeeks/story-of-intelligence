"""Provider-neutral tutoring contracts (ADR-0006 Phase E).

This layer describes *what a tutoring exchange is* without naming who answers it. A
provider receives a `TutorRequest` plus a `TutorContext` and returns a `TutorResponse`.
Nothing here imports a repository, a database session, or an HTTP framework, and no
external model SDK exists anywhere in this package.

Two properties are load-bearing and are asserted by tests rather than left to review:

* **Grounding.** Every passage a provider emits must be traceable to a Learning Object
  field through `TutorResponse.citations`, so "the tutor said it" and "the lesson says it"
  cannot drift apart.
* **Determinism.** A response is a pure function of the request, the Learning Object, and
  the learner's already-recorded evidence. Nothing reads the clock, a random source, or
  the network, which is why elapsed time is logged but never returned in the body.

No evidence is written by tutoring. The ADR-0007 D1 vocabulary has no kind for asking for
help, and inventing one here would be exactly the ungoverned payload that ADR forbids.
See A-013 in the assumption register.
"""

from __future__ import annotations

import uuid
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from academy_api.domain.learning_object import LearningObject
from academy_api.domain.progress import ConceptProgress

MAX_QUESTION_LENGTH = 1000

DISCLAIMER = (
    "This help comes from a deterministic reader of the published lesson, not from an AI "
    "model. It can only quote and rearrange what this lesson already says, and it cannot "
    "tell whether you understand the idea."
)


class TutorTask(StrEnum):
    """The exchange the learner is asking for. Closed by design, like the D1 vocabulary."""

    EXPLANATION = "explanation"
    HINT = "hint"
    SOCRATIC_QUESTION = "socratic-question"
    FEEDBACK = "feedback"
    MISCONCEPTION_CHECK = "misconception-check"


class TutoringModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, populate_by_name=True)


class TutorRequest(TutoringModel):
    """One ask. Held in memory for the length of the request and never persisted."""

    task: TutorTask
    concept_id: str = Field(alias="conceptId", max_length=128)
    step_index: int | None = Field(alias="stepIndex", default=None, ge=0, le=512)
    learner_id: uuid.UUID | None = Field(alias="learnerId", default=None)
    question: str | None = Field(default=None, max_length=MAX_QUESTION_LENGTH)
    provider_id: str | None = Field(alias="providerId", default=None)
    """The learner's own words: a question for most tasks, or their draft for `feedback`."""


class Citation(TutoringModel):
    """Names the Learning Object field a passage came from, so grounding is checkable."""

    concept_id: str = Field(alias="conceptId")
    concept_version: str = Field(alias="conceptVersion")
    field: str


class ProviderInfo(TutoringModel):
    """What answered, stated plainly enough that a learner is never misled about it."""

    id: str
    name: str
    version: str
    determinism: Literal["deterministic", "stochastic"]
    external: bool
    model: str | None = None


class TutorTrace(TutoringModel):
    """Which rules produced this answer. Local observability, not third-party telemetry."""

    provider_id: str = Field(alias="providerId")
    concept_version: str = Field(alias="conceptVersion")
    rules_fired: list[str] = Field(alias="rulesFired")
    evidence_used: bool = Field(alias="evidenceUsed")
    """True when the learner's recorded progress narrowed the answer."""


class TutorResponse(TutoringModel):
    task: TutorTask
    concept_id: str = Field(alias="conceptId")
    supported: bool
    """False when the ask falls outside what the published lesson can answer."""

    headline: str
    body: list[str]
    follow_up: str | None = Field(alias="followUp", default=None)
    citations: list[Citation]
    provider: ProviderInfo
    trace: TutorTrace
    disclaimer: str = DISCLAIMER


class TutorContext(TutoringModel):
    """Everything a provider is allowed to see. Assembled by the router, never fetched."""

    learning_object: LearningObject = Field(alias="learningObject")
    progress: ConceptProgress | None = None


class ProviderCapability(TutoringModel):
    info: ProviderInfo
    tasks: list[TutorTask]


class TutorCapabilities(TutoringModel):
    default_provider_id: str = Field(alias="defaultProviderId")
    providers: list[ProviderCapability]
