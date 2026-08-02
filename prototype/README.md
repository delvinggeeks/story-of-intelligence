# Archived Node prototype

This directory is the exploratory Node/static implementation that preceded the production
platform. It is preserved as migration evidence under
[ADR-0006](../docs/governance/adr/ADR-0006-production-platform-foundation.md), decision item 10.

**It is reference only. Do not extend it and do not use it as the production backend.**

## What it contains

| Path | Contents |
| --- | --- |
| `server.mjs` | single-file Node HTTP server (static pages + JSON APIs) |
| `index.html`, `dashboard.html`, `orchestration.html`, `assets/` | static learner surface |
| `content/` | 11 LOS v2.0 Learning Objects, `v1-archive/`, Knowledge Graph v1.1.0 |
| `schemas/`, `scripts/` | LOS v1/v2 JSON Schemas and validators |
| `test/`, `tests/` | Node unit/integration tests and Playwright flows |
| `Dockerfile`, `docker-compose.yml` | container packaging for the prototype |
| `ci/prototype-test.workflow.yml` | its former CI workflow, deactivated |

## Running it

It is fully self-contained and excluded from the root npm workspace and from CI.

```powershell
cd prototype
npm ci
npm run start          # http://127.0.0.1:8765/dashboard.html
npm run test           # unit + integration + Playwright
```

## Relationship to production

- Production content lives in [`packages/content`](../packages/content) — Numbers only.
- Production contracts live in [`services/api`](../services/api).
- Production rendering lives in [`apps/web`](../apps/web).

Prototype behaviour informs production acceptance criteria; it does not define production
interfaces, persistence shape, or runtime boundaries.
