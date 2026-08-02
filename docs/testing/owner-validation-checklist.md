# Owner Validation Checklist - Numbers Vertical Slice

Status: Ready for owner eye-test
ADR impact: None
Scope: Numbers only

## Goal

Run a clear manual validation pass that mirrors automated checks and confirms learner-facing quality.

## Local startup

> **Superseded for the production stack (ADR-0006).** The commands below drive the archived
> Node/static prototype and must now be run from `prototype/`. The production learner surface
> is started with `npm run dev:api` and `npm run dev:web` from the repository root; see the
> root [README](../../README.md#local-run). The manual journey checks below still describe the
> prototype's 11-lesson flow, which production has not yet reimplemented.

1. Install dependencies (from `prototype/`):
- npm ci

2. Start the app (from `prototype/`):
- npm run start

If default port 8765 is in use, run with alternate port:
- PowerShell: $env:PORT="8876"; npm run start
- Open http://127.0.0.1:8876/

## Manual learner journey checks

1. Application loads
- Expect main title "Numbers"
- Expect beginner entry and estimated duration

2. Pre-assessment appears
- Expect "Before the lesson"
- Expect heading "Before we begin"

3. Step progression
- Click Continue through full flow
- Confirm sequence includes Observe, Wonder, Predict, Explain, Apply
- Confirm progress label increments and remains coherent

4. Hint control behavior
- Verify hint text is hidden by default
- Click "Show a hint"
- Verify hint appears and button toggles to "Hide hint"

5. Tutor interaction
- Enter reflection text
- Click "Ask for coaching"
- Verify coaching text appears

6. Post-assessment behavior
- Reach "After the lesson"
- Verify success criteria list appears with five criteria
- Click Finish
- Verify completion message appears
- Verify Finish transitions to disabled "Completed"

7. Persistence check
- During lesson, enter reflection at any step
- Refresh page
- Verify current step and reflection value are retained

8. Failure-state check
- Simulate lesson API failure (via Playwright route or temporary endpoint failure)
- Verify learner-facing recovery message:
  "We could not load this lesson just now. Please refresh the page and try again."
- Verify Continue is disabled in this state

## Exit criteria for owner sign-off

- Learner flow is complete and understandable from zero prior knowledge.
- Pre/post assessment experience is visible and coherent.
- Hint/tutor behavior is explicit and non-magical.
- Persistence and failure-state behavior are clear and safe.
- No scope expansion beyond Numbers is introduced.

## Supporting automated commands

- npm run validate
- npm run test:unit
- npm run test:e2e
- npm run test:ci
