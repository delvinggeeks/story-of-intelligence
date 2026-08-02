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

/** Mirrors `academy_api.domain.learning_record`. */
export interface Learner {
  id: string;
  created_at: string;
  last_seen_at: string;
}

export interface LearningSession {
  id: string;
  learner_id: string;
  concept_id: string;
  started_at: string;
  ended_at: string | null;
}

export interface EvidenceEventRecord {
  id: string;
  session_id: string;
  sequence: number;
  kind: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  recorded_at: string;
}

/**
 * Evidence kinds are owned by the API vocabulary (ADR-0007 D1). These constants exist so
 * the client can name what it is writing; the server is still the only validator.
 */
export const EVIDENCE_KIND = {
  lessonStarted: "lesson.started",
  stepViewed: "step.viewed",
  experimentPerformed: "experiment.performed",
  reflectionSubmitted: "reflection.submitted",
  lessonCompleted: "lesson.completed",
  evidenceRetracted: "evidence.retracted",
} as const;

export type EvidenceEnvelope =
  | { kind: typeof EVIDENCE_KIND.lessonStarted; conceptVersion: string }
  | { kind: typeof EVIDENCE_KIND.stepViewed; stepIndex: number }
  | {
      kind: typeof EVIDENCE_KIND.experimentPerformed;
      experimentId: string;
      normalized: boolean;
    }
  | {
      kind: typeof EVIDENCE_KIND.reflectionSubmitted;
      phase: "pre" | "post";
      response: string;
    }
  | { kind: typeof EVIDENCE_KIND.lessonCompleted; conceptVersion: string }
  | {
      kind: typeof EVIDENCE_KIND.evidenceRetracted;
      retractsEventId: string;
      reason: string;
    };

export interface RubricCheckResult {
  id: string;
  label: string;
  passed: boolean;
}

export interface MasteryAssessment {
  score: number;
  threshold: number;
  checks: RubricCheckResult[];
  mastered: boolean;
  method: string;
}

/** Mirrors `academy_api.domain.progress.ConceptProgress`. Derived, never stored. */
export interface ConceptProgress {
  learnerId: string;
  conceptId: string;
  conceptVersion: string;
  vocabularyVersion: string;
  eventsConsidered: number;
  eventsRetracted: number;
  eventsUnreadable: number;
  lastSequence: number | null;
  stepsTotal: number;
  stepsViewed: number[];
  furthestStepIndex: number | null;
  experimentsTotal: number;
  experimentsPerformed: string[];
  preReflection: string | null;
  postReflection: string | null;
  completionRecorded: boolean;
  mastery: MasteryAssessment | null;
}
