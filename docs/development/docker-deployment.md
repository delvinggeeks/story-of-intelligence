# Docker Deployment

Status: Production container definition for the Numbers vertical slice
ADR impact: None

> **Superseded for the production stack (ADR-0006).** This document describes the archived
> Node/static prototype container. Every command below must be run from `prototype/`, and the
> URLs refer to that prototype server. The production `uv`/FastAPI + Next.js stack has no
> container definition yet; it arrives with Phase C. Retained as migration reference.

## Scope

The image serves the approved full-stack Numbers experience only:
- learner lesson at `/`
- learner dashboard at `/dashboard.html`
- delivery status at `/orchestration.html`
- local API and progress persistence

## Build and run

Run from `prototype/`:

```text
docker compose up --build -d
```

Open:
- http://127.0.0.1:8765/
- http://127.0.0.1:8765/dashboard.html

Check health:

```text
docker compose ps
docker compose exec academy wget -qO- http://127.0.0.1:8765/healthz
```

Stop without deleting learner data:

```text
docker compose down
```

Delete container data only with explicit intent:

```text
docker compose down --volumes
```

## Production properties

- Node 24 Alpine base image
- non-root `node` user
- all Linux capabilities dropped by Compose
- `no-new-privileges` enabled
- bounded JSON request size (16 KiB default)
- health/readiness endpoints
- graceful SIGTERM/SIGINT shutdown
- atomic progress-file replacement
- named volume for `/app/data`
- no external services or secrets

## Environment variables

| Name | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` in production | Container bind address |
| `PORT` | `8765` | HTTP port |
| `PORT_ATTEMPTS` | `1` in production | Fail fast instead of changing container port |
| `MAX_REQUEST_BYTES` | `16384` | Maximum JSON request size |

## Validation commands

Before image creation:

```text
npm ci
npm run test:ci
```

Container validation:

```text
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Docker was not available in the implementation environment on 2026-08-02, so image build/run validation remains an explicit external prerequisite. Native Node and Playwright validation still run locally and in GitHub Actions.
