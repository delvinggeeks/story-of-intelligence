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
| GET | `/health/live` | Liveness probe. Process-only, so it cannot flap with the database |
| GET | `/health/ready` | Readiness probe. Reports database and cache separately; `503` when the database is unreachable |
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
| `ACADEMY_DATABASE_URL` | local Compose DSN | **Must** use the `postgresql+asyncpg://` driver |
| `ACADEMY_DATABASE_POOL_SIZE` | `5` | Pooled connections |
| `ACADEMY_DATABASE_MAX_OVERFLOW` | `5` | Extra connections above the pool |
| `ACADEMY_DATABASE_ECHO` | `false` | Log every statement |
| `ACADEMY_REDIS_URL` | local Compose DSN | Empty disables the cache entirely |
| `ACADEMY_CACHE_REQUIRED` | `false` | Make a missing cache URL a startup error |
| `ACADEMY_CACHE_DEFAULT_TTL_SECONDS` | `300` | Default entry lifetime |

A plain `postgresql://` URL is rejected at startup with the exact corrected URL in the
error message, because the sync driver would deadlock the async engine rather than fail
visibly.

## Persistence

Three tables, created by [`migrations/`](migrations) and mapped in
[`db/models.py`](src/academy_api/db/models.py):

| Table | Holds |
| --- | --- |
| `learner` | An anonymous, server-generated UUID. No credential and no personal data |
| `learning_session` | One learner working on one concept, with start and optional end |
| `evidence_event` | An append-only observation about a session |

These tables store **facts, not judgements**. `evidence_event.kind` and `payload` are
opaque: nothing branches on their contents. Their meaning, the retention policy, and the
identity model are deliberately undecided and are raised in proposed
[ADR-0007](../../docs/governance/adr/ADR-0007-learner-evidence-semantics.md).

`evidence_event` is **immutable by contract**. The repository exposes no update and no
delete, and [`db/immutability.py`](src/academy_api/db/immutability.py) rejects any
modification that reaches a flush with `ImmutableRecordError` (surfaced as HTTP `409`).
Correct a mistake by appending a compensating event.

`evidence_event.sequence`, a database identity column, is the authoritative replay order.
Timestamps are not sufficient: PostgreSQL `now()` is transaction-start time, so events
written inside one transaction share a `recorded_at`.

Routes never see SQLAlchemy. [`repositories/learning.py`](src/academy_api/repositories/learning.py)
and [`services/learning_record.py`](src/academy_api/services/learning_record.py) return frozen
DTOs, so Phase D can persist progress without coupling routes to SQL.

### Migrations

```powershell
uv run --directory services/api alembic upgrade head
uv run --directory services/api alembic current
uv run --directory services/api alembic check          # fails on model/migration drift
uv run --directory services/api alembic downgrade base
```

`alembic.ini` stores no URL; it is injected from `ACADEMY_DATABASE_URL` at runtime.

## Cache

Redis is a cache and never a source of truth, so content rendering must work without it.
[`cache/backends.py`](src/academy_api/cache/backends.py) exposes only `get`/`set`/`delete`
behind a `Cache` protocol, and **no method may raise on a backend failure**: an
unreachable Redis logs a warning, reports `degraded` on `/health/ready`, and turns every
read into a miss and every write into a no-op.

Set `ACADEMY_CACHE_REQUIRED=true` only where a missing cache should be a startup error.

## Tests

Tests marked `database` need a reachable PostgreSQL and otherwise skip with the exact
command to start one. Each database test runs inside a transaction that is always rolled
back, so runs do not leak state.

```powershell
docker compose -f ../../infra/docker-compose.local.yml up -d
uv run --directory services/api pytest
```

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
Phase C added the persistence foundation only: the tables exist and are exercised by tests,
but no route writes evidence yet. Progress, mastery evidence, and tutoring contracts arrive
in Phase D and are blocked on proposed ADR-0007. Nothing here depends on the archived Node
prototype.
