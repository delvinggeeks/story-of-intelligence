# ADR-0003 — LOS v2.0: Move the Learning Object Schema Toward the Canonical Source Contract

- **Status:** Accepted (owner directive, 2026-08-02: "all three — build the tech stacks required and implement the lessons")
- **Date:** 2026-08-02
- **Supersedes:** LOS v1.0 as the active curriculum contract (v1.0 objects archived, not deleted)
- **EDM impact:** None. EDM v1.0 remains frozen. This change implements more of the already-frozen Knowledge, Learning, and Measurement model responsibilities.

## Problem

LOS v1.0 froze a skeleton of the canonical Learning Object defined in the source vision
(`docs/source/ChatGPT-Story of Intelligence Vision - part2.md`). The canonical contract requires
mental models, analogies, history, experiments, productive failure, discovery, stability tagging,
a next-concept bridge, and a mastery rubric. The five-kind step enum
(observe/wonder/predict/explain/apply) flattened the 14-stage Universal Learning Engine, losing the
Experiment → Fail → Discover arc that the sources call the pedagogical heart.

## Decision

Introduce `schemas/learning-object.schema.v2.json` (LOS v2.0) and migrate all 11 curriculum objects.

New requirements over v1.0:

1. `knowledge.mentalModels` — ≥2 named mental models per concept (Mental Model Library seed).
2. `knowledge.analogies` — ≥2 analogies with a 1–5 strength rating (Analogy Library seed).
3. `knowledge.history` — where the idea came from and why it was needed.
4. `learning.steps[].kind` — expanded enum covering the Universal Learning Engine stages:
   `observe, wonder, predict, experiment, fail, discover, explain, visualize, generalize,
   mathematics, engineer, optimize, production, apply, reflect, whats-next`.
   Every lesson must include at least: observe, wonder, predict, **experiment, fail, discover**, explain, apply.
5. `learning.experiments` — ≥1 playable experiment spec (`id`, `type`, `title`, `instructions`, `config`)
   consumed by the Interactive Engine (ADR-0004). Every `experiment` step must reference a spec by `experimentId`.
6. `measurement.masteryRubric` — machine-checkable rubric (`threshold`, ≥5 `checks` with regex patterns)
   consumed by the Reasoning Tutor (ADR-0005) for evidence-scored gating.
7. `stability` — future-compatibility tag: `timeless | mostly-timeless | stable | rapidly-evolving`.
8. `nextConcept` — explicit forward bridge (the "What's Next?" engine stage as data).

## Out of scope (recorded, deferred)

- Typed knowledge-graph edges (REQUIRES/USES/ENABLES/…) — assumption register A-009.
- Full 14-stage step coverage per lesson (visualize/generalize/mathematics/engineer/optimize/production
  as mandatory kinds) — grows with content maturity; enum admits them now.
- Standalone library entities (mental models/analogies as cross-lesson databases) — currently embedded
  per Learning Object; extraction becomes worthwhile at >1 renderer or >20 objects.

## Consequences

- v1.0 objects move to `content/learning-objects/v1-archive/` for provenance.
- Knowledge graph nodes reference `<id>.v2.json`; server and validators updated.
- Validation grows: stage coverage, experiment reference integrity, rubric pattern compilation.
