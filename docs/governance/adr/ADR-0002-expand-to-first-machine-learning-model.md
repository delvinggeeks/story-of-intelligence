# ADR-0002: Expand to the First Machine-Learning Model

- **Status:** Accepted
- **Date:** 2026-08-02
- **Decision owner:** Product owner
- **Supersedes:** The Numbers-only implementation scope in Academy Constitution SSOT v1.0, Section 5
- **Does not change:** EDM v1.0 model names or responsibilities; LOS v1.0 fields or semantics

## Context

The Numbers vertical slice has demonstrated a working Learning Object, Knowledge Graph node, renderer, adaptive coaching interaction, assessment flow, persistence API, learner dashboard, automated tests, and production container. The product owner has directed the Academy to become a real multi-lesson learning site and approved staged expansion through the first machine-learning model.

The pedagogical effectiveness assumptions for Numbers remain open until learner evidence closes them. Technical readiness is sufficient to test whether the same frozen model and schema can support a coherent prerequisite path.

## Decision

Expand the current implementation in one governed stage from Numbers through linear regression built from scratch. Use one renderer and LOS v1.0 for every Learning Object. Preserve the existing Knowledge, Learning, Reasoning, Measurement, Platform, and Execution model boundaries.

The first expanded curriculum is:

1. Numbers and quantities
2. Variables and algebra
3. Functions and graphs
4. Coordinates and vectors
5. Matrices and transformations
6. Probability and uncertainty
7. Statistics and distributions
8. Derivatives and gradients
9. Loss and optimization
10. Data, features, and targets
11. Linear regression from scratch

The Knowledge Graph must encode this prerequisite order. The dashboard must show every lesson, lock lessons whose prerequisites are incomplete, and provide a direct resume/start action. The lesson renderer must select a Learning Object by concept ID without adding a second renderer.

## Acceptance criteria

- All 11 Learning Objects conform to LOS v1.0 and preserve beginner entry, pre/post measurement, misconceptions, and tutor guidance.
- Every graph node resolves to exactly one Learning Object and every prerequisite resolves to an earlier graph node.
- The API serves the curriculum and any approved lesson without path traversal or arbitrary file access.
- Progress is stored independently per learner and concept.
- The dashboard presents curriculum order, completion state, prerequisite state, and direct lesson navigation.
- The final lesson derives and implements univariate linear regression without an ML library.
- Native integration/contract tests, Playwright learner journeys, and production container smoke checks pass.

## Consequences

- Academy Constitution SSOT v1.0 must be versioned to reflect the expanded implementation scope.
- Content quality and learning-effectiveness assumptions remain evidence questions; technical completion does not close them.
- Breadth beyond linear regression, additional renderers, new EDM models, deep learning, and production ML remain out of scope.
- Curriculum generation is not autonomous publication: each Learning Object must pass schema, graph, runtime, and learner-flow validation.