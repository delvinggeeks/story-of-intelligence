# Implementation Roadmap

Status: Draft execution roadmap
Date: 2026-08-02
Project state: Implementation
ADR impact: None

## Goal

Complete and validate one full-stack Numbers vertical slice under EDM v1.0 constraints, with evidence of learner improvement and no architecture expansion.

## Guardrails (must hold in every task)

- EDM v1.0 remains frozen.
- Any architecture change triggers ADR process.
- Vertical Slice Before Scale: no breadth expansion before proof.
- Evidence Before Elegance: validation output is mandatory.
- No remote push/deploy/secret access/destructive git operations.

Sources: Constitution sections 2-6, ADR-0001, autonomy policy, copilot instructions.

## Workstream roadmap

### WS-1: Source-of-truth alignment

Objective:
- Align control/governance status records to current implementation state without changing architecture.

Tasks:
1. Confirm canonical status source (owner decision): control records vs README baseline text.
2. Update non-canonical status wording to remove contradictions.
3. Record assumptions and unresolved ambiguities explicitly.

Exit criteria:
- No conflicting "implementation started/not started" statements across active status artifacts.

### WS-2: LOS increment closure evidence

Objective:
- Demonstrate LOS v1.0 increment completion against Constitution DoD.

Tasks:
1. Re-run schema/object validation checks.
2. Produce one artifact proving graph/runtime/reasoning compatibility on Numbers object.
3. Record result in evidence register.

Exit criteria:
- LOS defined, documented, validated; Numbers object conforms; compatibility evidence captured.

### WS-3: Learner-outcome evidence loop

Objective:
- Establish minimal measurable evidence path for pre/post improvement in Numbers slice.

Tasks:
1. Define measurement protocol using existing pre/post prompts and success criteria.
2. Execute at least one reproducible validation run.
3. Capture outcomes in evidence register with pass/fail statement.

Exit criteria:
- Evidence artifact states whether learner can explain/predict/apply/teach better after lesson.

### WS-4: Demo gate readiness

Objective:
- Prepare owner-validation package for complete Numbers slice.

Tasks:
1. Provide concise demo script (start, navigate, complete pre/lesson/post, request hint/tutor).
2. Attach check outputs and known risks/assumptions.
3. Update live-status state to "ready for owner validation" only if evidence criteria pass.

Exit criteria:
- Owner can run one complete demo path with no missing prerequisite and with evidence context.

## Addendum (post ADR-0002): curriculum depth increment

WS-2 through WS-4 completed for the Numbers slice (evidence register E-001..E-009). ADR-0002 extended the path to 11 lessons; the deployed ten new lessons carry one depth loop and violate contract items 2 and 8 (see full-stack scope addendum).

### WS-5: Lesson depth and flow closure (current increment)

Tasks:
1. Extend each of the ten ADR-0002 lesson objects from 5 to 10 steps: add a second full observe->wonder->predict->explain->apply loop in the data/engineering/ML lens; rewrite the final apply step to create the need for the next lesson (Golden Rule 6).
2. Extend the lesson contract test to enforce, for ALL lessons: >=2 steps of every kind, and a final apply step.
3. Update the final-lesson end-to-end journey to the 10-step shape.
4. Run full validation (`npm run test:ci`), rebuild the container, smoke-probe a deepened lesson.
5. Record evidence (E-010) and update assumption A-005/A-006 status.

Exit criteria: all 11 lessons satisfy the per-lesson depth contract; all validation gates green; container serves deepened content. ADR impact: None (content + tests only; EDM v1.0 and LOS v1.0 untouched).

### WS-6: Owner depth eye-test (gate)

Owner walks lessons 1-3 and 11 and accepts or rejects depth (closes A-006). Stop condition per autonomy policy: demo ready.

## Not planned before validation complete

Deferred by policy until first slice is validated:
- Additional subjects
- Additional renderers
- Multi-agent orchestration expansion
- Enterprise platform hardening
- Content-factory automation

## Smallest next implementation task

Task candidate: establish and run the learner-outcome evidence protocol for the existing Numbers flow, then record the result in governance evidence artifacts.

Rationale:
- Architecture and core implementation pieces already exist.
- Primary remaining blocker is objective evidence for the success metric.
