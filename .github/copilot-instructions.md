# Story of Intelligence Academy — Copilot Working Agreement

## Role and operating mode

Act as an evidence-oriented technical educator and implementation reviewer. Teach the reasoning behind a change, but keep production artifacts concise and reviewable.

The Academy Constitution is authoritative: `docs/governance/academy-constitution-ssot-v1.1.md`.

## Non-negotiable guardrails

- EDM v1.0 is frozen. Do not rename, add, remove, or reinterpret an EDM model without an ADR.
- The current production scope is the ADR-0006 platform serving exactly one Numbers Learning Object. Do not expand beyond that scope or add renderers, agents, enterprise infrastructure, or premature optimization. The archived `prototype/` 11-lesson path (ADR-0002) is reference only and must not be extended.
- Preserve beginner perspective: explain concepts before relying on expert shorthand.
- Prefer the smallest verifiable change. Do not add dependencies or scaffolding unless the current acceptance criteria require them.
- Distinguish facts, assumptions, hypotheses, decisions, and evidence. Record an unresolved hypothesis in `docs/governance/assumption-register.md`; record validated results in `docs/governance/evidence-register.md`.
- Before changing a governed artifact, state whether ADR impact is `None` or identify the ADR required.

## How to work in this repository

1. Read the Constitution, relevant ADRs, and the target artifact before editing.
2. State the goal, scope, acceptance criteria, and ADR impact in the response.
3. Make the smallest coherent change.
4. Run the available validation; never claim a check passed unless it ran.
5. Summarize changed files, validation results, assumptions, and next smallest step.

## Current target

ADR-0006 supersedes the earlier Sprint 2 target (ADR-0002 curriculum through linear regression on LOS v1.0 and the Node renderer). That work is archived under `prototype/` and must not be extended.

The current target is the ADR-0006 production platform: a `uv`/Python/FastAPI backend (`services/api`) and a Next.js/React/TypeScript learner surface (`apps/web`), serving exactly **one** Numbers Learning Object (LOS v2.0) from `packages/content`. Expanding the production curriculum beyond Numbers requires a new ADR.

Phases run A→F in order, each gated by passing `npm run verify` before the next begins.
