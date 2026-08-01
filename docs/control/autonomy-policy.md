# Autonomous Delivery Policy

## Gate

The only normal human gate is a complete, demoable feature that has passed its stated validation. The current feature is the Numbers vertical slice.

## Autonomous loop

The Architect and implementation agent may autonomously scope narrow tasks, edit assigned files, run validation, review diffs, correct defects, update control records, commit local work, and advance to the next task.

## Stop conditions

Stop and notify the owner only for:

- a complete demo ready for owner validation;
- a genuine external dependency or missing authority;
- an architectural change requiring an ADR;
- a security, privacy, data-loss, or material spending decision.

## Immutable boundaries

No automatic remote push, deployment, merge to a protected remote branch, secret access, destructive Git operation, or Constitution/ADR change is permitted. All work remains within EDM v1.0 and the Numbers vertical slice.
