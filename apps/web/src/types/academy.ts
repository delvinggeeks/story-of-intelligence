/**
 * Mirrors the backend Pydantic contracts in `services/api/src/academy_api/domain`.
 * The API is the source of truth; regenerate from `/openapi.json` when it changes.
 */

export type Stability = "timeless" | "mostly-timeless" | "stable" | "rapidly-evolving";

/**
 * Step kinds and their display labels are owned by the API. The frontend
 * deliberately does not enumerate the taxonomy or carry its own label copy.
 */
export type StepKind = string;

export type ExperimentType =
  | "unit-compare"
  | "balance-solve"
  | "function-machine"
  | "vector-drag"
  | "matrix-transform"
  | "dice-histogram"
  | "sampling-mean"
  | "slope-explorer"
  | "gradient-descent"
  | "outlier-fit"
  | "fit-line";

export interface KnowledgeGraphNode {
  id: string;
  learningObject: string;
  prerequisites: string[];
  relatedConcepts: string[];
}

export interface KnowledgeGraph {
  version: string;
  nodes: KnowledgeGraphNode[];
}

export interface MentalModel {
  name: string;
  description: string;
}

export interface Analogy {
  analogy: string;
  strength: number;
  whenToUse: string;
}

export interface Knowledge {
  conceptId: string;
  prerequisites: string[];
  relatedConcepts: string[];
  history: string;
  mentalModels: MentalModel[];
  analogies: Analogy[];
}

export interface Step {
  kind: StepKind;
  label: string;
  prompt: string;
  experimentId: string | null;
}

export interface Experiment {
  id: string;
  type: ExperimentType;
  title: string;
  instructions: string;
  config: Record<string, unknown>;
}

export interface Learning {
  objectives: string[];
  estimatedMinutes: number;
  steps: Step[];
  experiments: Experiment[];
}

export interface RubricCheck {
  id: string;
  label: string;
  pattern: string;
}

export interface Measurement {
  prePrompt: string;
  postPrompt: string;
  successCriteria: string[];
  masteryRubric: {
    threshold: number;
    checks: RubricCheck[];
  };
}

export interface Reasoning {
  misconceptions: string[];
  tutorGuidance: string;
}

export interface LearningObject {
  id: string;
  version: string;
  title: string;
  scope: string;
  stability: Stability;
  beginnerEntry: string;
  nextConcept: string | null;
  knowledge: Knowledge;
  learning: Learning;
  measurement: Measurement;
  reasoning: Reasoning;
  provenance: {
    source: string;
    status: "draft" | "validated";
  };
}
