# Active Task: CR-001

**Status:** Approved for Copilot execution  
**Type:** Read-only implementation review  
**Branch:** `copilot/cr-001-numbers-renderer`  
**Model preference:** `claude-sonnet-4.6` (only if available to the signed-in Copilot plan)

## Objective

Review the current Numbers static renderer against the Constitution and LOS v1.0. Do not modify product files.

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

- `docs/control/copilot-report.md` only

## Required checks

```text
node --check assets/app.js
node scripts/validate-learning-object.mjs schemas/learning-object.schema.v1.json content/learning-objects/numbers.v1.json
git diff main...HEAD -- index.html assets
```

## Acceptance criteria

- Report the exact checks run and their result.
- Identify only concrete defects or risks, with file and line references where possible.
- Confirm whether the renderer stays within the Numbers vertical slice and has ADR impact `None`.
- Make no product changes, commits, pushes, merges, deployments, or external requests.
