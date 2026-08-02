# ADR-0005 — Reasoning Tutor and Evidence-Scored Mastery Gating (Phase 7 of the Source Roadmap)

- **Status:** Accepted (owner directive, 2026-08-02)
- **Date:** 2026-08-02
- **EDM impact:** None. Implements the Reasoning and Measurement model responsibilities already frozen in EDM v1.0.

## Problem

The source vision requires a tutor that "reasons over learner state, prerequisite gaps,
misconception graph, mastery evidence… next best concept," and a success metric where "the platform
can demonstrate evidence for that improvement." Today the tutor returns static `tutorGuidance` text
(with a hardcoded special case for Numbers), and lesson completion is granted for submitting the
post-assessment regardless of content — completion-gated, not mastery-gated.

## Decision

1. **Rubric-driven reasoning.** Every Learning Object carries `measurement.masteryRubric`
   (LOS v2.0): ≥5 machine-checkable dimensions with regex signals and a pass threshold.
2. **`POST /api/tutor` becomes lesson-generic and stateful in reasoning, not retrieval:**
   it scores the learner's reflection against the lesson's own rubric, names the specific missing
   dimensions, warns about the most relevant misconception, and — once the threshold is met —
   bridges to `nextConcept`. The Numbers-only hardcoded coaching is removed.
3. **`POST /api/progress` computes mastery server-side.** `completed` is granted only when the
   post-assessment response meets the rubric threshold. The response returns the scored rubric so
   the renderer can show the learner exactly which dimensions are still missing.
4. **Client coach is lesson-driven.** The instant coach checks in `assets/app.js` come from the
   lesson's rubric instead of the hardcoded Numbers rules, so all 11 lessons get real-time coaching.

## Honest limits (recorded)

- Scoring is deterministic keyword/pattern evidence, not semantic understanding — the strongest
  signal available without adding a model dependency. Recorded as assumption A-010: rubric-pattern
  scoring is a sufficient v1 proxy for mastery evidence; revisit when an LLM-backed tutor is governed in.
- Learner state remains per-concept progress records; a cross-concept learner model (confidence,
  spaced review) is deferred.

## Consequences

- Dashboard gating semantics unchanged (`completed` still unlocks the next node) but `completed`
  now means *evidenced*, not *submitted*.
- Tests change: e2e post-assessment answers must genuinely satisfy the Numbers rubric.
