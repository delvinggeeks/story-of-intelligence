# Full-Stack Numbers Scope

Status: Draft
Date: 2026-08-02
ADR impact: None

## Scope confirmation (authoritative)

The current authorized scope is one complete Numbers vertical slice only:

- EDM v1.0 baseline remains frozen.
- LOS v1.0 implemented and validated.
- Knowledge graph contains exactly one concept: Numbers.
- One renderer (web) for the Numbers learning object.
- One adaptive tutoring interaction in-slice.
- Validation must show measurable learner improvement.

Authoritative sources:
- docs/governance/academy-constitution-ssot-v1.0.md, sections 2, 5, 6
- docs/governance/adr/ADR-0001-retain-edm-v1.md
- .github/copilot-instructions.md, non-negotiable guardrails
- docs/control/autonomy-policy.md, gate/immutable boundaries
- docs/source/ChatGPT-Story of Intelligence Vision - part2.md, accepted closure records

## Explicitly out of scope until this slice is validated

- Multiple subjects beyond Numbers.
- Multiple renderers.
- Multi-agent orchestration expansion.
- Enterprise infrastructure and broad production hardening.
- Premature optimization and architecture expansion without ADR.

Source basis:
- Constitution section 5 exclusions
- Copilot working agreement scope guardrails
- Part2 out-of-scope closure passages

## Current repository implementation status against contract

Existing uncommitted work is treated as provisional and is not discarded.

| Area | Expected by contract | Current repository state | Status |
| --- | --- | --- | --- |
| EDM/ADR governance baseline | Present and controlling | Constitution + ADR-0001 + extraction register present | implemented |
| LOS schema | v1.0 defined and machine-validated | schemas/learning-object.schema.v1.json exists; validator script exists | implemented |
| Numbers learning object | One complete object conforming to LOS | content/learning-objects/numbers.v1.json exists and aligns with schema shape | implemented (provisional until validation rerun in this session) |
| One-concept knowledge graph | Graph contains exactly Numbers concept | content/knowledge-graph.v1.json has one node: numbers | implemented |
| Web renderer | Render Numbers object end-to-end with pre/post prompts | index.html + assets/app.js implement pre/steps/post flow, hint reveal, coaching call | implemented (functional) |
| Adaptive tutoring interaction | In-slice tutor loop available | /api/tutor endpoint + client coaching request exists | implemented (minimal heuristic, evidence pending) |
| Backend API and persistence | Enough for one vertical slice, no over-expansion | server.mjs serves graph, lesson, tutor, and progress write path | partial (progress evidence loop not yet integrated into learner success reporting) |
| Validation evidence for learner improvement | Demonstrable measurable improvement | measurement prompts exist in content and UI, but no recorded before/after evidence report in governance artifacts yet | missing |
| DoD closure for LOS increment | Defined, documented, validated, compatible with graph/runtime/reasoning | Mostly satisfied structurally; explicit integrated proof artifact still missing | partial |
| Control-record consistency | Single coherent current status | docs/control/live-status.json, README.md, and Constitution baseline statements conflict by project phase wording | incorrect/inconsistent |

## Provisional git state observed

Git status indicates local provisional edits not authored in this task:
- Modified: assets/app.js
- Untracked: package.json
- Untracked: server.mjs

These changes were preserved as required and not overwritten.

## Gap statement for immediate execution

To close the Numbers vertical slice under current governance, the smallest remaining gap is evidence, not architecture:

1. Produce a verifiable learner-improvement evidence path for pre/post outcomes.
2. Synchronize control status records so implemented scope and governance state do not contradict each other.
3. Confirm DoD closure artifact for LOS increment across schema, object, graph, runtime, and tutor compatibility.

## Addendum (post ADR-0002): extended scope and per-lesson depth contract

ADR-0002 (accepted) extends this same slice pattern to 11 lessons ending at linear regression from scratch. The Numbers object is the reference implementation of lesson depth. Every lesson in the path must satisfy:

| # | Contract item | Trace |
| --- | --- | --- |
| 1 | Beginner entry assuming nothing beyond declared prerequisites | R-012 |
| 2 | At least two full observe->wonder->predict->explain->apply depth loops (>=10 steps); loop 1 daily-life lens, loop 2 data/engineering/ML lens | R-037 |
| 3 | Substantive scenario prompts, teaching hints | R-039 |
| 4 | >=4 objectives, >=4 misconceptions, tutor guidance | R-013 |
| 5 | Pre/post measurement prompts, >=5 success criteria | R-018, R-031 |
| 6 | Daily-life application present (loop 1 apply) | R-015 |
| 7 | Buildable engineering ending (construct/compute/pseudocode) | R-004, R-040 |
| 8 | Final apply step creates the need for the next lesson | R-016, R-038 |
| 9 | Prerequisites match graph node; dependency order preserved | R-036 |
| 10 | LOS v1.0 conformance, honest provenance | R-001, R-011 |

Verified gap at time of writing: numbers.v1.json conforms (10 steps, two loops); the ten ADR-0002 lessons have 5 steps / one loop and no forward bridge — items 2 and 8 fail. The contract test enforces two loops only for Numbers. Closing this gap is content + test work only; ADR impact: None.
