# TestSprite Adoption Plan (Deferred)

Status: Deferred
ADR impact: None
Scope: Supplementary QA only, after deterministic suites are stable

## Current decision

TestSprite is not enabled now.

Explicitly not done in this phase:
- No package installation
- No authentication or API keys
- No paid credits usage
- No GitHub integration setup

Reason:
- Native Node and Playwright suites are mandatory baseline coverage and must remain the primary quality gate for the Numbers vertical slice.

## Activation prerequisites

Only consider TestSprite after all of the following:
1. npm run test:ci is consistently green in local runs and CI.
2. The full-stack Numbers feature has a stable local and/or preview URL.
3. The owner validation gate for Numbers is complete.
4. Existing deterministic tests remain authoritative and passing.

## Future small-scope TestSprite regression plan

Use TestSprite as AI-assisted exploratory/supplementary QA for exactly three passes:

1. Learner journey pass
- Run one end-to-end Numbers learner flow from pre-assessment through completion.
- Focus on UX regressions, copy clarity, and unexpected state transitions.

2. API chain pass
- Exercise graph -> lesson -> tutor -> progress chain for error handling and response consistency.
- Cross-check anomalies against deterministic Node integration tests.

3. Accessibility/exploration pass
- Scan keyboard navigation, focus order, and high-level interaction discoverability.
- Convert confirmed issues into deterministic Playwright assertions where feasible.

## Governance rules for future adoption

1. TestSprite results never replace deterministic Node and Playwright checks.
2. Any discovered regression must be reproducible locally.
3. New recurring regressions should be converted into deterministic tests.
4. No architecture expansion or new feature scope is introduced through testing tooling.

## Assumptions

1. A future stable preview URL will be available when owner approves expansion.
2. Budget and policy approval will be explicitly granted before any paid tool use.
3. Security/privacy review will be completed before uploading any non-public test data.
