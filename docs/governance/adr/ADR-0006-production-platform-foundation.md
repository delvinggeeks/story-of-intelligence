# ADR-0006 — Adopt uv/FastAPI + Next.js/React/TypeScript as the production platform foundation while retaining the Node prototype as exploratory reference

- **Status:** Accepted
- **Date:** 2026-08-02
- **Decision owner:** Product owner
- **EDM impact:** None proposed. EDM v1.0 remains frozen.
- **Supersedes:** Nothing
- **Related ADRs:** ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005

## Context

The preserved source exports establish a model-driven platform vision in which canonical Learning Objects, a Knowledge Graph, renderers, experimentation, reasoning, and evidence all serve one governed learning system. They also establish a frozen implementation order: EDM -> LOS -> Knowledge Graph -> Learning Objects -> first renderer -> Numbers -> Interactive Engine -> AI Tutor -> production platform. The sources repeatedly require that one complete proof be validated before scale.

The current repository does not yet match the target production stack. The live implementation is an exploratory Node/static prototype:

- `package.json` defines a Node-only runtime and validation flow.
- `server.mjs` is a single-file Node HTTP server that serves static pages and JSON APIs, loads the Knowledge Graph from `content/knowledge-graph.v1.json`, reads Learning Objects directly from disk, stores learner progress in `data/progress.json`, and embeds lesson/tutor/progress behavior in one service.
- `Dockerfile` and `docker-compose.yml` package that Node runtime as the current local/container run path.
- Browser behavior lives in static HTML/CSS/JS files such as `index.html`, `dashboard.html`, and `assets/app.js`.

The prototype has also grown beyond the original Numbers-only baseline:

- ADR-0002 expanded the prototype scope from Numbers to an 11-lesson path through linear regression.
- ADR-0003 adopted LOS v2.0 and archived LOS v1 objects for provenance.
- ADR-0004 added a zero-dependency interactive experiment engine.
- ADR-0005 added rubric-driven reasoning and mastery-gated completion.
- The active Knowledge Graph in `content/knowledge-graph.v1.json` now references 11 active `*.v2.json` Learning Objects.

At the same time, the target production stack called for by the current repository audit is different:

- modern Python managed only by `uv`
- FastAPI and Pydantic for backend/runtime contracts
- Next.js, React, TypeScript, and Tailwind for the learner surface
- PostgreSQL-backed persistence with migrations
- Redis and storage abstractions only when required
- provider-neutral multi-model abstractions with deterministic local behavior first

EDM v1.0 remains frozen under ADR-0001. This ADR does not propose changing EDM. It proposes changing the production implementation foundation while preserving the current Node prototype as evidence and reference only.

The original vertical-slice discipline must be restored for the production migration. The current prototype may preserve 11 lessons as exploratory artifacts, but the first production proof returns to exactly one Numbers Learning Object until the new stack demonstrates an end-to-end governed slice.

## Decision proposal

Adopt the following as the proposed production platform foundation:

1. **Production backend:** modern Python managed exclusively through `uv`, using FastAPI and Pydantic for application and domain contracts.
2. **Production frontend:** Next.js, React, TypeScript, and Tailwind CSS for the learner surface.
3. **Production persistence:** PostgreSQL with migrations. Redis and object-storage interfaces are introduced only when required by a demonstrated use case in the production slice.
4. **Prototype preservation:** the current Node/static implementation is retained as an exploratory prototype and reference implementation. It must not be extended as the production backend.
5. **Initial production curriculum scope:** exactly one Numbers Learning Object, even though the prototype currently contains 11 active lessons.
6. **Production seed contract:** LOS v2.0 is the accepted production seed for the first Numbers slice.
7. **Backend-owned contracts:** canonical content access, Knowledge Graph resolution, learner progress, assessment evidence, tutor/session state, and multi-model abstractions become backend-owned contracts rather than frontend- or file-layout-owned assumptions.
8. **Multi-model runtime:** the initial production multi-model system uses only a deterministic local provider. No external model API, secret, paid provider, latency target, privacy target, or provider commitment is introduced by this ADR.
9. **Testing baseline:** Playwright and Python tests are required. TestSprite remains deferred and documented only; it is not installed, configured, authenticated, or used as a required validation layer.
10. **Prototype handling:** the current Node/static implementation is preserved in place until a clean migration checkpoint exists; after that checkpoint it is archived as an explicit prototype reference rather than continued as the production path.

## Alternatives considered

### 1. Continue extending the Node/static prototype

Rejected as the proposed production direction.

Evidence: the current repository audit shows a single-file Node server, static HTML/JS rendering, file-backed JSON persistence, and Node-only tests/CI. That stack is useful as an exploratory proof but does not match the production target technology stack the owner provided. Continuing to extend it would deepen implementation in the wrong foundation.

### 2. Rewrite all 11 prototype lessons immediately in the production stack

Rejected for the first production migration stage.

Evidence: the preserved sources and constitutional principles require Vertical Slice Before Scale and Evidence Before Elegance. Rewriting all 11 lessons before one Numbers proof would repeat the exact scale-first pattern the project explicitly rejected.

### 3. Build the full production stack for all subjects before one Numbers proof

Rejected.

Evidence: the preserved sources define Numbers as the first executable proof and repeatedly state that one end-to-end slice must be validated before scaling content, renderers, or architecture. Building the full stack for all subjects first would violate the frozen learning-engineering workflow.

### 4. Use a single external AI provider immediately

Rejected for the initial production foundation.

Evidence: the target stack and the current prototype audit both support deterministic/local behavior first, with no provider keys committed and no paid service or external AI dependency introduced by default. Immediate provider lock-in would create avoidable cost, security, governance, and reproducibility risk before the first production Numbers proof exists.

## Consequences

### Positive

- Aligns the production foundation with the owner-specified target stack: `uv`, Python, FastAPI, Pydantic, Next.js, React, TypeScript, Tailwind, PostgreSQL, and governed test layers.
- Restores the Numbers-first vertical-slice discipline for the production migration without deleting the exploratory prototype.
- Separates exploratory proof artifacts from production contracts, which reduces the risk of accidental long-term commitment to prototype transport, storage, or rendering assumptions.
- Creates a clean path for backend ownership of Learning Object runtime, Knowledge Graph access, progress/evidence, tutoring/session state, and multi-model abstractions.
- Keeps external-model integration deferred until the platform proves that the local deterministic slice is valuable and stable.

### Negative

- Introduces migration work while the current prototype already functions locally and in Docker.
- Requires parallel coexistence of two implementation surfaces for some period: the current Node prototype and the proposed production foundation.
- Defers broader prototype curriculum migration even though the 11-lesson path already exists and is technically validated in the prototype.

### Migration risks

- **Content-contract risk:** the prototype currently has both LOS v1 and LOS v2 artifacts. This ADR does not decide which one becomes the production seed contract.
- **Behavior-coupling risk:** current prototype behavior is partly encoded in `server.mjs` and `assets/app.js`, not only in canonical content or a backend contract.
- **Evidence-transfer risk:** current Node tests and Playwright tests prove real behavior in the prototype, but they are evidence of behavior, not automatic production contracts.
- **Dirty-worktree risk:** the current Git status is ahead of origin and contains modified and untracked files. A clean migration checkpoint is required before Phase A starts.

### Local development impact

- Local development becomes multi-runtime: `uv`-managed Python plus a Node-based Next.js frontend.
- Docker remains available only when reproducibility requires it; this ADR does not require Docker for every development action.
- The prototype remains locally runnable for comparison and migration reference until an explicit later decision retires or relocates it.

### Cost impact

- No paid services are introduced by this ADR.
- No external model-provider cost is introduced.
- PostgreSQL and Redis are proposed first as local development services, not managed cloud commitments.

### Preservation of existing evidence and prototype assets

The following prototype artifacts remain valuable and should be preserved as reference or migration evidence without becoming production contracts by default:

- Node/API tests and Playwright flows as behavioral evidence of what the prototype currently does.
- Learning Object content and Knowledge Graph data as candidate source material for the production Numbers slice.
- Prototype experiment behavior as evidence for required interactivity.
- Docker-based local reproducibility as a proven pattern for packaging the exploratory implementation.

Preserving these as evidence/reference means:

- they may be compared against the production build,
- they may inform production acceptance criteria,
- they may be mined for content or interaction behavior,
- but they do not automatically define final production interfaces, file layout, persistence shape, or runtime boundaries.

## Required follow-on decisions

This ADR intentionally leaves several decisions open because the current repository contains evidence for more than one path:

1. **Persistence boundaries for the first production Numbers slice:** what is persisted in PostgreSQL for learner progress, mastery evidence, and tutor/session state in the first proof.
2. **Redis necessity threshold:** when a cache or short-lived state store becomes necessary rather than merely possible.
3. **Object storage necessity threshold:** when media/export/generated-asset storage becomes necessary.
4. **Docker necessity threshold:** when the production foundation requires Docker in local development beyond optional reproducibility.
5. **External model-provider threshold:** when deterministic local tutoring/evaluation is no longer sufficient and a governed provider integration is justified.

Unsupported statements beyond current repository and preserved-source evidence should remain assumptions until resolved by later ADRs or evidence.

## Acceptance criteria before Phase A starts

1. ADR-0006 is accepted.
2. The repository has a clean migration checkpoint.
3. Production scope is explicitly limited to exactly one Numbers Learning Object.
4. No prototype files are deleted.
5. No paid service or external AI provider is configured.

## Migration phases

Each phase requires validation before the next begins. No phase should be treated as complete by structure alone.

### Phase A — `uv` Python/FastAPI repository foundation

Create the production backend foundation under `uv` with FastAPI/Pydantic contracts and repository-level documentation for the new production path, while preserving the prototype untouched.

### Phase B — Next.js/TypeScript frontend foundation

Create the production learner-surface foundation in Next.js/React/TypeScript/Tailwind with typed API boundaries and no hard-coded final lesson architecture.

### Phase C — local PostgreSQL/Redis services

Introduce local persistence/caching services for the production path only, with validation and migrations, and only to the extent needed for the Numbers proof.

### Phase D — LOS + Knowledge Graph + Numbers runtime

Implement the backend-owned production runtime for exactly one Numbers Learning Object, including Knowledge Graph resolution, progress/evidence recording, and API retrieval contracts.

### Phase E — deterministic multi-model abstraction

Introduce a provider-neutral tutoring/runtime abstraction using deterministic local behavior only, with no external provider commitment by default.

### Phase F — pytest, Playwright, CI

Implement Python tests, production learner-flow Playwright coverage, and CI validation for the new stack. Validation evidence is required before broader content migration.

## Assumptions and open decisions

- **Assumption:** the current Node prototype contains useful content, graph, test, and interaction evidence worth preserving during migration.
- **Decision recorded:** LOS v2 is the governed production seed for the first Numbers slice.
- **Decision recorded:** the active 11-lesson Node prototype remains exploratory content during the first production phase; after a clean migration checkpoint it is archived as explicit prototype reference.
- **Assumption:** PostgreSQL is the correct durable persistence target because it is part of the owner-specified target stack; this ADR does not yet define exact schema boundaries.
- **Assumption:** Redis and object-storage abstractions should remain deferred until demonstrated by the first production slice.

## Owner decisions required

1. Confirm the clean migration checkpoint criteria before Phase A starts.
2. Confirm the persistence boundary for the first production Numbers slice.
3. Confirm the thresholds for introducing Redis, object storage, Docker-required local workflows, and any external model provider.
