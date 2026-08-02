# Testing Strategy

Status: Active for Numbers vertical slice
ADR impact: None
Scope: EDM v1.0, one Numbers full-stack slice only

## Goal

Provide disciplined, layered confidence for the existing Numbers feature using deterministic local tests first, then browser-level end-to-end checks.

## Layer 1: Native Node tests (required)

Location:
- test/api.integration.test.js

Execution:
- npm run test:unit

Coverage:
1. API endpoint contracts
- GET /api/graph
- GET /api/lesson/numbers
- POST /api/tutor
- POST /api/progress

2. Knowledge-graph and lesson alignment
- numbers lesson id and conceptId match graph node id

3. Tutor behavior
- deterministic response for empty reflection
- deterministic response for non-empty reflection

4. Progress persistence
- completion payload stored in data/progress.json
- server returns updatedAt and stored learner record

5. Contract failures
- method_not_allowed
- invalid_json
- learnerId is required

Design constraints:
- Offline only
- No external AI calls
- Deterministic assertions
- Fast startup with ephemeral local port

## Layer 2: Playwright E2E (required)

Location:
- tests/e2e/numbers.spec.js
- playwright.config.js

Execution:
- npm run test:e2e

Coverage:
1. App loads
2. Pre-assessment appears
3. Learner progresses through Observe/Wonder/Predict/Explain/Apply steps
4. Hint control remains explicit and gated
5. Tutor interaction returns coaching
6. Post-assessment and success criteria appear
7. Progress and reflection persist after refresh
8. Learner-facing failure state appears when lesson loading fails

Design constraints:
- No brittle sleeps
- Stable semantic selectors first (role, label, heading, visible text)
- data-testid should be added only if semantic selectors become insufficient
- Dedicated isolated webServer host/port in config

## Layer 3: TestSprite (deferred)

This repository does not install or enable TestSprite now.

Current policy:
- No TestSprite installation
- No authentication/API keys
- No paid/credit-spending integrations

See the deferred plan in:
- docs/testing/testsprite-adoption-plan.md

## Commands

Local development:
- npm run validate
- npm run test:unit
- npm run test:e2e
- npm run test
- npm run test:ci

CI:
- GitHub Actions workflow at .github/workflows/test.yml
- Uses npm ci, installs Chromium, runs npm run test:ci

## Acceptance signals for owner validation gate

The Numbers slice is considered test-ready when:
1. npm run test:ci passes locally
2. workflow test.yml passes in CI
3. learner-facing failure and recovery behavior is asserted
4. no scope expansion beyond Numbers is introduced

## Assumptions

1. Node 24 runtime is available locally and in CI.
2. The repository remains single-slice (Numbers) until owner validation closes.
3. The current deterministic tutor responses are acceptable as contract behavior for this slice.
4. Writing progress to local data/progress.json is acceptable for local and CI execution.
