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
  domain/              LOS v2.0, Knowledge Graph, evidence, progress, tutoring contracts
  providers/           tutoring providers behind a Protocol
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
| GET | `/api/v1/evidence-vocabulary` | The accepted evidence kinds and their version |
| POST | `/api/v1/learners` | Mint an anonymous learner. No input, no personal data |
| GET | `/api/v1/learners/{learner_id}` | Confirm a stored learner id still exists; `404` if not |
| POST | `/api/v1/learners/{learner_id}/sessions` | Resume the open session for a concept, or start one |
| POST | `/api/v1/sessions/{session_id}/events` | Append one validated evidence event |
| GET | `/api/v1/sessions/{session_id}/events` | Replay one session's events in `sequence` order |
| GET | `/api/v1/learners/{learner_id}/progress/{concept_id}` | The derived progress projection |
| GET | `/api/v1/tutor/capabilities` | Registered tutoring providers and the tasks each supports |
| POST | `/api/v1/tutor` | Ask for help. Reads only; writes nothing |
| DELETE | `/internal/learners/{learner_id}` | Privileged erasure. Registered only when `ACADEMY_ERASURE_TOKEN` is set |

Step display labels are part of the API contract. `STEP_KIND_LABELS` in
[`domain/learning_object.py`](src/academy_api/domain/learning_object.py) is the single
source of truth, serialised as `steps[].label`. Renderers must not define their own.

## Configuration

Settings are read from `ACADEMY_`-prefixed environment variables, or from `.env` files.

| Variable | Default | Meaning |
| --- | --- | --- |
| `ACADEMY_ENVIRONMENT` | `local` | Free-form deployment label |
| `ACADEMY_LOG_LEVEL` | `INFO` | Root log level. Applied by the app factory; uvicorn configures only its own loggers |
| `ACADEMY_CONTENT_ROOT` | `<repo>/packages/content` | Canonical content directory |
| `ACADEMY_CORS_ORIGINS` | localhost:3000 pair | JSON list of allowed browser origins |
| `ACADEMY_DATABASE_URL` | local Compose DSN | **Must** use the `postgresql+asyncpg://` driver |
| `ACADEMY_DATABASE_POOL_SIZE` | `5` | Pooled connections |
| `ACADEMY_DATABASE_MAX_OVERFLOW` | `5` | Extra connections above the pool |
| `ACADEMY_DATABASE_ECHO` | `false` | Log every statement |
| `ACADEMY_REDIS_URL` | local Compose DSN | Empty disables the cache entirely |
| `ACADEMY_CACHE_REQUIRED` | `false` | Make a missing cache URL a startup error |
| `ACADEMY_CACHE_DEFAULT_TTL_SECONDS` | `300` | Default entry lifetime |
| `ACADEMY_ERASURE_TOKEN` | unset | Shared secret for the erasure route. Unset means the route does not exist |
| `ACADEMY_TUTOR_PROVIDER` | `deterministic-los` | Default tutoring provider. Only one is registered |

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

These tables store **facts, not judgements**. `evidence_event.kind` is drawn from the
closed vocabulary accepted in
[ADR-0007](../../docs/governance/adr/ADR-0007-learner-evidence-semantics.md) and its
`payload` is validated against a typed model per kind, but nothing about mastery is
stored: judgement is recomputed on read (see [Progress](#progress)).

`evidence_event` is **immutable by contract**. The repository exposes no update and no
delete, and [`db/immutability.py`](src/academy_api/db/immutability.py) rejects any
modification that reaches a flush with `ImmutableRecordError` (surfaced as HTTP `409`).
Correct a mistake by appending an `evidence.retracted` event naming the event it retracts.

`evidence_event.sequence`, a database identity column, is the authoritative replay order.
Timestamps are not sufficient: PostgreSQL `now()` is transaction-start time, so events
written inside one transaction share a `recorded_at`.

Routes never see SQLAlchemy. [`repositories/learning.py`](src/academy_api/repositories/learning.py)
and [`services/learning_record.py`](src/academy_api/services/learning_record.py) return frozen
DTOs, so progress is persisted without coupling routes to SQL.

Writes commit inside the request handler, not in dependency teardown. FastAPI runs a
`yield` dependency's teardown *after* the response is sent, so committing there lets a
client act on an id that is not yet durable and be told the record does not exist.

## Evidence contract

[`domain/evidence.py`](src/academy_api/domain/evidence.py) defines vocabulary version
`1.0.0`. `GET /api/v1/evidence-vocabulary` publishes it.

| Kind | Payload |
| --- | --- |
| `lesson.started` | `conceptVersion` |
| `step.viewed` | `stepIndex` |
| `experiment.performed` | `experimentId`, `normalized` |
| `reflection.submitted` | `phase` (`pre` or `post`), `response` |
| `lesson.completed` | `conceptVersion` |
| `evidence.retracted` | `retractsEventId`, `reason` |

On **write** an unknown kind or a payload that does not match its model is rejected with
HTTP `422`; extra fields are forbidden. On **read** an unrecognised historical kind is
returned as `UnreadableEvidence` and counted, never raised, so a future vocabulary change
cannot make old data unreadable.

## Progress

`GET /api/v1/learners/{learner_id}/progress/{concept_id}` replays the learner's events for
that concept in `sequence` order and derives the view in
[`domain/progress.py`](src/academy_api/domain/progress.py). The projection is pure and
rebuildable: nothing it returns is stored.

It distinguishes **completion evidence captured** from **mastery judgement**.
`completionRecorded` means the learner said they finished. `mastery` is only present once a
post-reflection exists, and it reports the Learning Object's own rubric — a keyword match
defined in the content — with the score, threshold, and per-check results shown. It is not
a claim about understanding.

## Tutoring

`POST /api/v1/tutor` answers one help request. The architecture is provider-neutral:
[`domain/tutoring.py`](src/academy_api/domain/tutoring.py) owns the typed contracts,
[`providers/base.py`](src/academy_api/providers/base.py) defines the `TutorProvider`
Protocol, [`services/tutoring.py`](src/academy_api/services/tutoring.py) routes to a
provider, and the route layer only translates HTTP. Adding a provider means implementing
the Protocol and registering it in `api/dependencies.py`; nothing else changes.

| Task | Answers |
| --- | --- |
| `explanation` | What the current step is asking, in the lesson's own words, plus its mental models |
| `hint` | The lesson's coaching guidance and its strongest analogy. Never the answer |
| `socratic-question` | One question drawn from the next mastery-rubric check the learner has not matched |
| `feedback` | Which rubric points the learner's draft already names, and which it does not |
| `misconception-check` | The misconceptions the lesson records, with its correctives |

### What this is, and is not

The one shipped provider, `deterministic-los`, is **not an LLM**. It is a set of explicit
rules over LOS v2 content. There is no model, no API key, no network call, and no external
dependency; `GET /api/v1/tutor/capabilities` reports `determinism` and `external` so a
client can say so to the learner. Every response carries a disclaimer and a `citations`
list naming the Learning Object fields it drew from, and tests assert that the text is
traceable to those fields.

Its limits are real, and stated rather than hidden:

- It can only quote and rearrange the published lesson. A question outside the lesson's own
  vocabulary returns `supported: false` and redirects to the objectives; it does not guess.
- It makes **no adaptive-mastery claim**. Its only use of evidence is choosing which rubric
  check to ask about next. Rubric feedback is a regex keyword match defined in the content,
  and the response says in as many words that matching it is not proof of understanding.
- It has no memory. The same request always produces the same response, byte for byte.

### Evidence and privacy

Tutoring writes **nothing**. ADR-0007 defines no evidence kind for asking for help, and
rather than inventing one this phase records the interaction nowhere; whether it should
become governed evidence is open as **A-013** in the assumption register. The learner's
question or draft is held for the duration of the request, is never persisted, and is never
logged. Observability is one structured line per request carrying the task, concept,
provider, support flag, rules fired, and elapsed time — and no learner text. Elapsed time
is logged but never returned, so the response stays a pure function of its inputs.

## Erasure

`DELETE /internal/learners/{learner_id}` deletes a learner and their whole subtree in one
transaction, and logs a warning receipt. It is the only path that may remove evidence.
It is excluded from the OpenAPI schema, requires the `X-Academy-Erasure-Token` header
compared with `secrets.compare_digest`, and **is not registered at all** unless
`ACADEMY_ERASURE_TOKEN` is set. Individual evidence events remain un-updatable and
un-deletable through every ordinary route.

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
Phase C added the persistence foundation; Phase D added the learner loop on top of it under
accepted [ADR-0007](../../docs/governance/adr/ADR-0007-learner-evidence-semantics.md): a
typed evidence vocabulary, a replayable progress projection, compensating retractions, and
the privileged erasure route, and the Phase E tutoring layer described below.
Nothing here depends on the archived Node prototype.
