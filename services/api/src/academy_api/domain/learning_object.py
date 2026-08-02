"""Pydantic contracts for LOS v2.0 Learning Objects.

These models are the backend-owned production contract. The canonical JSON
artifacts under ``packages/content`` must validate against them.
"""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field


class Stability(StrEnum):
    TIMELESS = "timeless"
    MOSTLY_TIMELESS = "mostly-timeless"
    STABLE = "stable"
    RAPIDLY_EVOLVING = "rapidly-evolving"


class StepKind(StrEnum):
    OBSERVE = "observe"
    WONDER = "wonder"
    PREDICT = "predict"
    EXPERIMENT = "experiment"
    FAIL = "fail"
    DISCOVER = "discover"
    EXPLAIN = "explain"
    VISUALIZE = "visualize"
    GENERALIZE = "generalize"
    MATHEMATICS = "mathematics"
    ENGINEER = "engineer"
    OPTIMIZE = "optimize"
    PRODUCTION = "production"
    APPLY = "apply"
    REFLECT = "reflect"
    WHATS_NEXT = "whats-next"


# Canonical display copy for the ADR-0003 step taxonomy, owned by the backend so that
# no renderer has to carry its own copy of the vocabulary.
STEP_KIND_LABELS: dict[StepKind, str] = {
    StepKind.OBSERVE: "Observe",
    StepKind.WONDER: "Wonder",
    StepKind.PREDICT: "Predict",
    StepKind.EXPERIMENT: "Experiment",
    StepKind.FAIL: "Break It",
    StepKind.DISCOVER: "Discover",
    StepKind.EXPLAIN: "Explain",
    StepKind.VISUALIZE: "Visualize",
    StepKind.GENERALIZE: "Generalize",
    StepKind.MATHEMATICS: "Mathematics",
    StepKind.ENGINEER: "Engineer",
    StepKind.OPTIMIZE: "Optimize",
    StepKind.PRODUCTION: "Production",
    StepKind.APPLY: "Apply",
    StepKind.REFLECT: "Reflect",
    StepKind.WHATS_NEXT: "What's Next",
}


class ExperimentType(StrEnum):
    UNIT_COMPARE = "unit-compare"
    BALANCE_SOLVE = "balance-solve"
    FUNCTION_MACHINE = "function-machine"
    VECTOR_DRAG = "vector-drag"
    MATRIX_TRANSFORM = "matrix-transform"
    DICE_HISTOGRAM = "dice-histogram"
    SAMPLING_MEAN = "sampling-mean"
    SLOPE_EXPLORER = "slope-explorer"
    GRADIENT_DESCENT = "gradient-descent"
    OUTLIER_FIT = "outlier-fit"
    FIT_LINE = "fit-line"


class ProvenanceStatus(StrEnum):
    DRAFT = "draft"
    VALIDATED = "validated"


class LOSModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid", frozen=True)


class MentalModel(LOSModel):
    name: str
    description: str


class Analogy(LOSModel):
    analogy: str
    strength: int = Field(ge=1, le=5)
    when_to_use: str = Field(alias="whenToUse")


class Knowledge(LOSModel):
    concept_id: str = Field(alias="conceptId")
    prerequisites: list[str]
    related_concepts: list[str] = Field(alias="relatedConcepts")
    history: str
    mental_models: list[MentalModel] = Field(alias="mentalModels", min_length=1)
    analogies: list[Analogy] = Field(min_length=1)


class Step(LOSModel):
    kind: StepKind
    prompt: str
    experiment_id: str | None = Field(default=None, alias="experimentId")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def label(self) -> str:
        return STEP_KIND_LABELS[self.kind]


class Experiment(LOSModel):
    id: str
    type: ExperimentType
    title: str
    instructions: str
    config: dict[str, Any]


class Learning(LOSModel):
    objectives: list[str] = Field(min_length=1)
    estimated_minutes: int = Field(alias="estimatedMinutes", gt=0)
    steps: list[Step] = Field(min_length=1)
    experiments: list[Experiment] = Field(min_length=1)


class RubricCheck(LOSModel):
    id: str
    label: str
    pattern: str


class MasteryRubric(LOSModel):
    threshold: int = Field(ge=3)
    checks: list[RubricCheck] = Field(min_length=5)


class Measurement(LOSModel):
    pre_prompt: str = Field(alias="prePrompt")
    post_prompt: str = Field(alias="postPrompt")
    success_criteria: list[str] = Field(alias="successCriteria", min_length=1)
    mastery_rubric: MasteryRubric = Field(alias="masteryRubric")


class Reasoning(LOSModel):
    misconceptions: list[str] = Field(min_length=1)
    tutor_guidance: str = Field(alias="tutorGuidance")


class Provenance(LOSModel):
    source: str
    status: ProvenanceStatus


class LearningObject(LOSModel):
    id: str
    version: str
    title: str
    scope: str
    stability: Stability
    beginner_entry: str = Field(alias="beginnerEntry")
    next_concept: str | None = Field(default=None, alias="nextConcept")
    knowledge: Knowledge
    learning: Learning
    measurement: Measurement
    reasoning: Reasoning
    provenance: Provenance
