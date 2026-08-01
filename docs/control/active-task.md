# Active Task: IR-002

**Status:** Complete — validated for owner demo  
**Type:** Narrow implementation correction  
**Branch:** `copilot/ir-002-numbers-assessment`  
**Report:** `docs/control/copilot-report-IR-002.md`  
**Model preference:** `claude-sonnet-4.6` (only if available to the signed-in Copilot plan)

## Objective

Complete the existing Numbers renderer's learner-facing assessment path and make its hint/error presentation beginner-safe. Do not change EDM v1.0, LOS v1.0, or the Numbers JSON shape.

## Allowed reads

- `.github/copilot-instructions.md`
- `docs/governance/academy-constitution-ssot-v1.0.md`
- `docs/governance/adr/ADR-0001-retain-edm-v1.md`
- `docs/schemas/learning-object-schema-v1.0.md`
- `schemas/learning-object.schema.v1.json`
- `content/learning-objects/numbers.v1.json`
- `index.html`
- `assets/app.js`
- `assets/styles.css`
- `scripts/validate-learning-object.mjs`

## Allowed writes

- `index.html`
- `assets/app.js`
- `assets/styles.css`
- `docs/control/copilot-report-IR-002.md`

## Required checks

```text
node --check assets/app.js
node scripts/validate-learning-object.mjs schemas/learning-object.schema.v1.json content/learning-objects/numbers.v1.json
git diff main...HEAD -- index.html assets docs/control/copilot-report-IR-002.md
```

## Acceptance criteria

- Present `measurement.prePrompt` before the learning steps and `measurement.postPrompt` with `successCriteria` after the final step.
- Keep progress, reflections, and assessment answers only in browser local storage.
- Do not expose `reasoning.tutorGuidance` until the learner explicitly requests a hint.
- Replace the raw fetch-failure message with a clear beginner-facing recovery message.
- Report the exact checks run, files changed, risks/assumptions, and ADR impact `None`.
- Make no commits, pushes, merges, deployments, external requests, or changes outside the allowed paths.
