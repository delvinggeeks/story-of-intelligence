# Academy Web

Production learner surface. Governed by
[ADR-0006](../../docs/governance/adr/ADR-0006-production-platform-foundation.md).

Next.js App Router + React + TypeScript + Tailwind CSS v4. There are no static HTML pages and no
bundled curriculum: every concept and Learning Object is fetched from
[`services/api`](../../services/api) at request time.

## Layout

```
src/
  app/          routes (server components), global styles
  components/   presentational components
  lib/api.ts    the only place that talks to the API
  types/        TypeScript mirror of the backend contracts
scripts/next.mjs  telemetry-disabling wrapper around the Next CLI
tests/        contract-boundary tests (Node's built-in test runner)
```

## Commands

```powershell
npm install --workspaces          # from the repository root
npm run dev --workspace @academy/web
npm run build --workspace @academy/web
npm run test --workspace @academy/web
npm run typecheck --workspace @academy/web
npm run lint --workspace @academy/web
```

The API must be running on `ACADEMY_API_URL` (default `http://127.0.0.1:8000`).

`typecheck` runs `next typegen` before `tsc --noEmit` because `next-env.d.ts` references
build-generated route types. That makes the script safe from a clean checkout, with no
prior build required.

## Telemetry

Next.js telemetry is **disabled by default** for every local and CI invocation. Rather
than depending on machine-global `next telemetry disable` state, `dev`, `build`, `start`,
and `typecheck` run through [`scripts/next.mjs`](scripts/next.mjs), which sets
`NEXT_TELEMETRY_DISABLED=1` before the Next CLI loads. CI sets the same variable at job
level. Verify with:

```powershell
node ./scripts/next.mjs telemetry status   # -> Status: Disabled
```

An explicitly set `NEXT_TELEMETRY_DISABLED` is never overwritten, so opting back in stays
possible.

## Contract boundary

The step taxonomy and its display labels belong to the API. This app renders
`step.label` verbatim and treats `StepKind` as an opaque string.
[`tests/step-taxonomy.test.mjs`](tests/step-taxonomy.test.mjs) fails the build if any
source file re-introduces a hard-coded step vocabulary.

All data comes from the API. No component reads `packages/content` or the filesystem.
Lesson text is fetched server-side via `ACADEMY_API_URL`; the learner loop is fetched from
the browser via `NEXT_PUBLIC_ACADEMY_API_URL`, which must be reachable from the learner's
machine. [`tests/learner-identity.test.mjs`](tests/learner-identity.test.mjs) enforces both.

## Learner runtime

[`components/lesson-runtime.tsx`](src/components/lesson-runtime.tsx) walks the pre-prompt,
the steps, and the post-prompt, appending one evidence event per action and re-reading the
server's progress projection after each write. On load it reuses the learner id in
`localStorage`, confirms it still exists, and resumes at the furthest recorded step.

**Only an opaque server-generated UUID is stored client-side** under `academy.learnerId`.
No name, email, account, or device fingerprint is collected.

The progress panel shows what was recorded and, once an explanation is submitted, the
Learning Object's own rubric result. That rubric is a keyword check written into the
content, and the panel says so: it is not a judgement of understanding.

Loading, empty, and failure states are explicit. `loading.tsx` and `error.tsx` cover the
server-rendered lesson; the runtime renders an in-page alert when the API, PostgreSQL, or
Redis is unreachable, and the lesson text stays readable throughout.

## End-to-end tests

[`e2e/`](e2e) runs Playwright against the **built** app and a real API. Start both first:

```powershell
docker compose -f infra/docker-compose.local.yml up -d
uv run --directory services/api alembic upgrade head
uv run --directory services/api uvicorn academy_api.main:app --port 8000
npm run build:web; npm run start --workspace @academy/web
npm run test:e2e
```

The config deliberately has no `webServer` block: these tests are meant to exercise the
production stack an operator actually runs, not one Playwright quietly starts for them.

## Scope

The Numbers slice only. Tutoring contracts are Phase E and are intentionally absent.
