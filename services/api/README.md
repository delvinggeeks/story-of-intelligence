# Academy API

Production backend for the Story of Intelligence Academy. Governed by
[ADR-0006](../../docs/governance/adr/ADR-0006-production-platform-foundation.md).

The API owns canonical content resolution, Knowledge Graph resolution, and the contracts
consumed by [`apps/web`](../../apps/web). The learner surface never reads content files.

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Python >= 3.12, managed exclusively by `uv` |
| Framework | FastAPI |
| Contracts | Pydantic v2 (`domain/`) |
| Content source | File-backed repository over `packages/content` |
| Tests | pytest + FastAPI `TestClient` |

## Layout

```
src/academy_api/
  main.py              application factory, CORS, error mapping
  api/dependencies.py  dependency-injection wiring
  api/v1/              versioned HTTP surface
  core/                settings and domain-neutral errors
  domain/              LOS v2.0 and Knowledge Graph contracts
  repositories/        content access behind a Protocol
tests/                 contract and behaviour tests
```

## Commands

```powershell
uv sync --all-groups                       # install runtime + dev dependencies
uv run uvicorn academy_api.main:app --reload --port 8000
uv run pytest                              # tests
uv run ruff check .                        # lint
uv run mypy                                # type check
```

OpenAPI is served at `/docs` and `/openapi.json` while the server runs.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |
| GET | `/api/v1/graph` | Canonical Knowledge Graph |
| GET | `/api/v1/learning-objects/{concept_id}` | One canonical Learning Object |

Step display labels are part of the API contract. `STEP_KIND_LABELS` in
[`domain/learning_object.py`](src/academy_api/domain/learning_object.py) is the single
source of truth, serialised as `steps[].label`. Renderers must not define their own.

## Configuration

Settings are read from `ACADEMY_`-prefixed environment variables, or from `.env` files.

| Variable | Default | Meaning |
| --- | --- | --- |
| `ACADEMY_ENVIRONMENT` | `local` | Free-form deployment label |
| `ACADEMY_CONTENT_ROOT` | `<repo>/packages/content` | Canonical content directory |
| `ACADEMY_CORS_ORIGINS` | localhost:3000 pair | JSON list of allowed browser origins |

`.env` resolution is **absolute and working-directory independent**. Files are read in
this order, later winning: repository root `.env`, then `services/api/.env`. Both paths
are discovered at import time by [`core/paths.py`](src/academy_api/core/paths.py), which
walks up from the current working directory and from the installed package location
looking for `packages/content/knowledge-graph.json` (repository root) or a
`pyproject.toml` beside `src/academy_api/` (service root).

A relative `ACADEMY_CONTENT_ROOT` is anchored to the **repository root**, never to the
process working directory. This is what makes the documented launch command work:

```powershell
uv run --directory services/api uvicorn academy_api.main:app --reload --port 8000
```

If the content root cannot be discovered — for example when the package is installed
non-editable outside a checkout — the service raises `ConfigurationError` at startup and
asks for an explicit absolute `ACADEMY_CONTENT_ROOT`. Set that variable in any deployment
that does not ship the repository layout. See [`.env.example`](../../.env.example) at the
repository root. No secrets are committed.

## Local environment notes

This checkout lives under a OneDrive-synced path, where `uv`'s default hardlink
installation strategy fails with `os error 396`. `[tool.uv] link-mode = "copy"` in
[`pyproject.toml`](pyproject.toml) makes every `uv sync` / `uv run` portable without
needing a shell variable. CI sets the equivalent `UV_LINK_MODE=copy`. If OneDrive is
actively syncing `.venv`, an install can still fail with `Access is denied (os error 5)`;
re-running the command succeeds.

[`.python-version`](.python-version) pins the interpreter `uv` provisions so local and CI
runs agree.

## Scope

Production scope is exactly one Numbers Learning Object (ADR-0006 acceptance criterion 3).
Progress, mastery evidence, and tutoring contracts arrive in Phase D; PostgreSQL and
migrations arrive in Phase C. Nothing here depends on the archived Node prototype.
