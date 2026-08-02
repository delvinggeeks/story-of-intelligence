# Story of Intelligence Academy

This repository is the authoritative, Git-first workspace for the Story of Intelligence Academy.

## Status

- Architecture baseline: Educational Domain Model (EDM) v1.0 — frozen
- Governance: ADR-based
- Current scope: one executable learning path from **Numbers** through **Linear Regression From Scratch**
- Application implementation: 11 LOS v1.0 learning objects, prerequisite graph, shared renderer, adaptive coaching, progress persistence, and mastery-gated learner dashboard

The governing baseline is [the Academy Constitution](docs/governance/academy-constitution-ssot-v1.1.md). Original conversation exports are preserved verbatim in `docs/source/`.

## Change policy

Changes to the frozen architecture require an ADR. Hypotheses belong in an assumption register; validated findings belong in an evidence register. Do not silently reinterpret the source exports.

## Local run

1. Install dependencies:
	- `npm ci`
2. Start local server:
	- `npm run start`
3. Open in browser:
	- Learner dashboard and curriculum: `http://127.0.0.1:8765/dashboard.html`
	- Lesson 1 (Numbers): `http://127.0.0.1:8765/index.html?lesson=numbers`
	- Lesson 11 (Linear Regression): `http://127.0.0.1:8765/index.html?lesson=linear-regression`
	- Delivery status: `http://127.0.0.1:8765/orchestration.html`

If 8765 is occupied, the server automatically falls back to the next available local port and prints the active URL.

## Docker

Build and run the production container:

- `docker compose up --build -d`
- Open `http://127.0.0.1:8765/dashboard.html`
- Check health with `docker compose ps`
- Stop with `docker compose down`

The container runs as a non-root user, persists learner progress in a named volume, exposes health/readiness endpoints, and shuts down gracefully. See [Docker deployment](docs/development/docker-deployment.md).
