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

[`e2e/`](e2e) runs Playwright against the **built** app and a real API.

| Spec | Covers |
| --- | --- |
| [`numbers-journey.spec.ts`](e2e/numbers-journey.spec.ts) | The lesson end to end, saved progress, reload persistence, the rubric verdict |
| [`keyboard.spec.ts`](e2e/keyboard.spec.ts) | The whole lesson, the experiment, and help driven by Tab and Enter only — never `click()` |
| [`accessibility.spec.ts`](e2e/accessibility.spec.ts) | axe-core WCAG 2.1 A/AA scans of four page states |
| [`privacy.spec.ts`](e2e/privacy.spec.ts) | Browser storage, cookies, tutor draft retention, external requests, erasure-route exposure |
| [`degradation.spec.ts`](e2e/degradation.spec.ts) | Loading, API outage, failed write, recovery, unknown concept, tutor outage |
| [`tutor-help.spec.ts`](e2e/tutor-help.spec.ts) | The help flow, grounding, refusal, rubric feedback, failure state |

Easiest run — Playwright starts and stops the API and the production web server itself,
which is also how CI runs it:

```powershell
docker compose -f infra/docker-compose.local.yml up -d --wait
uv run --directory services/api alembic upgrade head
npm run build:web
$env:ACADEMY_E2E_MANAGE_SERVERS = "1"; npm run test:e2e
```

Leave `ACADEMY_E2E_MANAGE_SERVERS` unset to run against a stack you started yourself, which
is the default so that a local server is never killed out from under you:

```powershell
uv run --directory services/api uvicorn academy_api.main:app --port 8000
npm run start --workspace @academy/web
npm run test:e2e
```

When Playwright owns the servers it writes their output to `e2e-logs/` rather than the
console, so CI can upload it beside the traces. Traces, screenshots, and videos are kept for
failed tests only.

## Scope

The Numbers slice only. The "Ask for help" panel renders answers from the API's deterministic
tutoring layer; there is no model, no external provider, and no stored conversation.
