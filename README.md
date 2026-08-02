# Story of Intelligence Academy

This repository is the authoritative, Git-first workspace for the Story of Intelligence Academy.

## Status

- Architecture baseline: Educational Domain Model (EDM) v1.0 — frozen
- Governance: ADR-based
- Production platform: `uv`/Python/FastAPI backend + Next.js/React/TypeScript frontend ([ADR-0006](docs/governance/adr/ADR-0006-production-platform-foundation.md))
- Production scope: exactly one Numbers Learning Object (LOS v2.0) — a validated full-stack slice and platform foundation, not a finished curriculum
- The former Node/static implementation is archived under [`prototype/`](prototype/) as exploratory reference only

The governing baseline is [the Academy Constitution](docs/governance/academy-constitution-ssot-v1.1.md). Original conversation exports are preserved verbatim in `docs/source/`.

## Change policy

Changes to the frozen architecture require an ADR. Hypotheses belong in an assumption register; validated findings belong in an evidence register. Do not silently reinterpret the source exports.

## Repository structure

```
apps/web/          Next.js learner surface (no static HTML, no bundled curriculum)
services/api/      FastAPI service — owns content and Knowledge Graph contracts
packages/content/  canonical LOS v2.0 artifacts and schema
docs/              constitution, ADRs, registers, control, source exports
prototype/         archived Node/static prototype (reference only, not extended)
```

Everything the learner surface renders is fetched over HTTP from the API. The frontend never
reads content files, and no page is served as static HTML.

## Prerequisites

- [`uv`](https://docs.astral.sh/uv/) (manages Python; no system Python install required)
- Node.js >= 20
- Docker Desktop (local PostgreSQL and Redis only)

## Local run

```powershell
Copy-Item .env.example .env

# terminal 1 — PostgreSQL on 127.0.0.1:5432 and Redis on 127.0.0.1:6379
docker compose -f infra/docker-compose.local.yml up -d
uv sync --directory services/api --all-groups
uv run --directory services/api alembic upgrade head

# terminal 1 — API on http://127.0.0.1:8000 (OpenAPI at /docs)
npm run dev:api

# terminal 2 — web on http://127.0.0.1:3000
npm install
npm run dev:web
```

Shut down when finished. `down` keeps the data volume; `down -v` destroys it.

```powershell
docker compose -f infra/docker-compose.local.yml down
docker compose -f infra/docker-compose.local.yml down -v   # also drop the data
```

### What needs which service

| Capability | PostgreSQL | Redis |
| --- | --- | --- |
| Serving the Numbers lesson (`/api/v1/...`, the web UI) | not required | not required |
| `GET /health/ready` reporting `ready` | required | not required |
| Learner, session, and evidence persistence | required | not required |

Redis is a cache and never a source of truth. Leave `ACADEMY_REDIS_URL` empty to disable it:
the API starts normally, `/health/ready` reports the cache as `disabled`, and every read is a
miss. If Redis is configured but unreachable, the cache reports `degraded` and still degrades
to misses rather than failing a request.

When PostgreSQL is down the API still starts and still serves content; `/health/ready` returns
`503` and names the problem. Connections are opened lazily precisely so that readiness can
report *why* it is down instead of the process failing to boot.

### Migrations

```powershell
uv run --directory services/api alembic upgrade head      # apply
uv run --directory services/api alembic current           # show the applied revision
uv run --directory services/api alembic check             # models vs. migrations drift
uv run --directory services/api alembic downgrade base    # roll everything back
```

The migration URL comes from `ACADEMY_DATABASE_URL` at runtime; no credentials are stored in
`alembic.ini`.

`.env` is read from the repository root (and optionally `services/api/.env`) using absolute
paths, so the API behaves the same however it is launched. A relative `ACADEMY_CONTENT_ROOT`
resolves against the repository root, not the working directory. See
[`services/api/README.md`](services/api/README.md#configuration).

## Verification

```powershell
docker compose -f infra/docker-compose.local.yml up -d   # database-backed tests need this
npm run verify     # ruff + mypy + pytest + eslint + web tests + next build + tsc
```

Tests marked `database` skip with an actionable message when PostgreSQL is unreachable, so
`npm run verify` still passes without Docker — it just proves less.

Individual layers: `npm run test:api`, `npm run lint:api`, `npm run typecheck:api`,
`npm run test:web`, `npm run typecheck:web`, `npm run lint:web`, `npm run build:web`.

`npm run test:e2e` is **not** part of `verify`. Playwright drives the built app against a
running API and database, so it needs the stack started first; see
[`apps/web/README.md`](apps/web/README.md#end-to-end-tests). Setting
`ACADEMY_E2E_MANAGE_SERVERS=1` makes Playwright start and stop the API and the production web
server itself, which is how CI runs it:

```powershell
docker compose -f infra/docker-compose.local.yml up -d --wait
uv run --directory services/api alembic upgrade head
npm run build:web
$env:ACADEMY_E2E_MANAGE_SERVERS = "1"; npm run test:e2e
```

Next.js telemetry is disabled for every local and CI invocation
([details](apps/web/README.md#telemetry)).

### Clean-state validation

The release check. It proves the repository builds from what is committed and nothing else —
no leftover `.next`, virtualenv, database schema, `node_modules`, or running process.

```powershell
docker compose -f infra/docker-compose.local.yml down -v
Remove-Item -Recurse -Force apps/web/.next, services/api/.venv, node_modules -ErrorAction SilentlyContinue
docker compose -f infra/docker-compose.local.yml up -d --wait

uv lock --directory services/api --check                    # Python lockfile is current
uv sync --directory services/api --all-groups --locked      # install from the lockfile only
uv run --directory services/api alembic upgrade head
uv run --directory services/api alembic check               # models vs. migrations
uv run --directory services/api alembic downgrade base
uv run --directory services/api alembic upgrade head

npm ci                                                      # fails if the lockfile disagrees
npm run verify
$env:ACADEMY_E2E_MANAGE_SERVERS = "1"; npm run test:e2e

docker compose -f infra/docker-compose.local.yml down
```

No `.env` file is required: every setting has a default matching the local Compose stack.

### CI matrix

[`.github/workflows/verify.yml`](.github/workflows/verify.yml) runs four jobs on every push
and pull request to `main`. Every action is pinned to an immutable commit SHA, which
[`apps/web/tests/repository-hygiene.test.mjs`](apps/web/tests/repository-hygiene.test.mjs)
asserts so the pinning cannot quietly regress.

| Job | Services | What it proves | Gating |
| --- | --- | --- | --- |
| `api` | PostgreSQL | Lockfile current, Ruff, Ruff format, strict MyPy, migrations apply/`check`/reverse, pytest. `ACADEMY_REDIS_URL` empty, so the cache-disabled path is exercised | Blocking |
| `web` | none | `npm ci` (lockfile integrity), ESLint, web tests, production build, `tsc` | Blocking |
| `e2e` | PostgreSQL + Redis | Migrations, production build, Playwright against a Playwright-managed API and web server. Cache enabled, so this is the full production shape | Blocking |
| `audit` | none | `npm audit --audit-level=high`, mirrored into the job summary | Advisory (`continue-on-error`) |

On failure the `e2e` job uploads traces, screenshots, videos, and the captured API and web
server logs; on success it uploads nothing.

## Owner demo

```powershell
docker compose -f infra/docker-compose.local.yml up -d --wait
uv run --directory services/api alembic upgrade head
npm run dev:api      # terminal 1
npm run dev:web      # terminal 2
```

Open <http://127.0.0.1:3000/concepts/numbers> and walk the slice:

1. Answer the opening prompt and save it. The progress panel records it immediately.
2. Step forward to the experiment, normalize the units, and watch the comparison change.
3. Ask for help — the panel states it is a reader of the lesson, not an AI model, and names
   the lesson fields each answer came from.
4. Ask it something the lesson does not cover; it refuses rather than guessing.
5. Submit an explanation. The rubric verdict shows the score, the threshold, and each check,
   and says in as many words that it is a keyword check, not a judgement of understanding.
6. Reload. Progress returns from the server, keyed to an anonymous id held in the browser.
7. Stop the API and reload. The lesson still renders and the page says progress is not saving.

The whole journey is operable from the keyboard alone; `apps/web/e2e/keyboard.spec.ts` is the
automated version of that claim.

## Environment notes

- **OneDrive and `uv`.** This checkout sits under a OneDrive-synced path where `uv`'s default
  hardlink strategy fails with `os error 396`. `services/api/pyproject.toml` sets
  `[tool.uv] link-mode = "copy"`, and CI sets `UV_LINK_MODE=copy`, so no per-shell workaround
  is needed. An in-progress OneDrive sync can still cause a transient `Access is denied
  (os error 5)` during install; re-run the command.
- **Interpreter pin.** `services/api/.python-version` pins the Python version `uv` provisions.

## Dependency policy

- **Overrides.** `overrides` in [`package.json`](package.json) force `postcss ^8.5.25` and
  `sharp ^0.35.3` above the versions Next.js resolves transitively. Reason: the versions
  pulled in by default carried high-severity advisories, and npm's suggested remediation was
  a downgrade of `next` itself, which is not acceptable. Risk: an override can pin a transitive
  dependency to a version its parent has not been tested against. Both packages are
  build-time only, both floors are within the semver range Next.js declares, and the full
  `npm run verify` suite is the control. Revisit and remove each override once Next.js
  resolves the fixed versions on its own.
- **Audit policy.** `npm audit --audit-level=high` runs in CI as a **separate, advisory
  (`continue-on-error`) job**, not as a gate on the build. An upstream advisory with no
  released fix is a real and recurring condition; letting it block every unrelated change
  would be worse than tracking it. A failing audit is not ignorable: it must be triaged and
  recorded in [`docs/governance/evidence-register.md`](docs/governance/evidence-register.md)
  before merge. Run it locally with `npm run audit:web`.

## Phase status (ADR-0006)

Phases run A→F in order, each gated on `npm run verify`.

| Phase | Scope | Status |
| --- | --- | --- |
| A | `uv`/FastAPI backend foundation | Complete |
| B | Next.js/TypeScript learner surface | Complete; the A→B ordering is accepted retrospectively as covered by ADR-0006 |
| C | Local PostgreSQL/Redis persistence and migrations | **Complete.** Local Compose stack, Alembic migrations, `learner`/`learning_session`/`evidence_event` tables, an append-only evidence guarantee, a repository/service boundary, and a degradable Redis cache |
| D | Backend-owned Numbers runtime, progress and mastery evidence | **Landed under [ADR-0007](docs/governance/adr/ADR-0007-learner-evidence-semantics.md).** Anonymous learner bootstrap, a typed closed evidence vocabulary, an interactive Numbers runtime, a replayable progress projection, compensating retraction events, and a privileged learner-subtree erasure route. "Mastery" here means the Learning Object's own keyword rubric, reported with its checks and threshold — not a judgement of understanding. Sessions are never ended (`ended_at` is unused) and no retention window is set |
| E | Deterministic provider-neutral tutoring abstraction | **Complete.** Typed task contracts (explanation, hint, Socratic question, feedback, misconception check), provider metadata, tracing, a router, and one shipped provider that answers only by quoting and rearranging the published Learning Object. It is **not** an LLM, calls no external service, and makes no adaptive-mastery claim: its only use of evidence is to pick the next rubric check the learner has not yet matched. Asking for help writes no evidence and stores no conversation |
| F | Playwright learner-flow E2E and full CI validation | **Complete.** 28 Playwright tests cover the Numbers journey, reload persistence, keyboard-only completion of the whole lesson, axe accessibility scans, browser privacy boundaries, help, and API/database/tutor outage and recovery. The full clean-state suite passes from a destroyed database, deleted `.next`, deleted virtualenv, and deleted `node_modules`. All four CI jobs have been **observed green on GitHub-hosted runners**, with every action pinned to an immutable SHA. Coverage beyond the Numbers slice does not exist |

## Archived prototype

[`prototype/`](prototype/) retains the full Node/static implementation — 11 LOS v2.0 learning
objects, the interactive experiment engine, the rubric tutor, its tests, and its container
tooling. It is preserved as migration evidence under ADR-0006 and is not part of the production
build, CI, or dependency graph. It must not be extended.
