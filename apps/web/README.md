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

## Scope

Read-only rendering of the Numbers slice. Interactive experiments, progress, mastery evaluation,
and tutoring are backend contracts scheduled for Phase D and are intentionally absent here.
