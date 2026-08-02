# Open Assumptions

Status: Open
Date: 2026-08-02
ADR impact: None

This file tracks assumptions/hypotheses that are not yet validated by evidence or not yet authorized by governed sources.

## Assumptions requiring validation (from accepted governance flow)

| ID | Assumption / Hypothesis | Why it is not yet settled | Evidence needed | Source trace |
| --- | --- | --- | --- | --- |
| A-001 | Story-first sequencing improves beginner understanding and retention for Numbers. | It is a pedagogical claim, not yet backed by in-repo measured outcomes. | Before/after learner evidence showing explain/predict/apply/teach improvement. | docs/source/ChatGPT-Story of Intelligence Vision - part1.md (Learning Principles); part2.md (Assumption Register examples) |
| A-002 | Productive failure steps (predict/fail/discover) improve mastery quality. | Conceptually accepted in philosophy, but no measured local evidence yet. | Controlled or at least repeatable learner outcome logs. | docs/source/ChatGPT-Story of Intelligence Vision - part1.md (Universal Learning Engine); part2.md (A-002 example) |
| A-003 | One LOS v1.0 structure is sufficient for future concepts beyond Numbers. | Proven only on one object in this repository. | Additional concept pilots or explicit constraints documenting LOS boundary. | docs/source/ChatGPT-Story of Intelligence Vision - part2.md (A-003 example) |
| A-004 | The current tutor interaction improves learner outcomes vs static hinting. | Current tutor is heuristic text response; no comparative evidence. | Measured improvement with and without tutor interaction. | docs/source/ChatGPT-Story of Intelligence Vision - part2.md (A-004 example) |
| A-005 | Current progress capture can support evidence-grade validation. | Progress endpoint exists, but evidence reporting pipeline is not yet documented in governance artifacts. | End-to-end evidence artifact in docs/governance/evidence-register.md. | server.mjs, docs/governance/evidence-register.md, Constitution section 4 |

## Assumptions requiring owner decision (unsupported by governed sources)

| ID | Item | Why decision is needed | Decision options |
| --- | --- | --- | --- |
| O-001 | "Use Fable for planning, designing and cost-optimized model selection." | No requirement for Fable appears in Constitution, ADRs, extraction register, control policies, or repository tooling. Introducing it may change process/tooling scope. | 1) Defer until after first validated slice; 2) Approve as implementation-level tooling note with no architecture impact; 3) Propose ADR if it changes governance/architecture. |

## Ambiguities requiring owner decision

| ID | Ambiguity | Observed conflict | Proposed resolution path |
| --- | --- | --- | --- |
| U-001 | Current implementation status wording | README says implementation intentionally not started; live-status says full-stack implementation active; code exists. | Decide canonical status source, then update non-canonical files to match. |
| U-002 | Baseline vs current-state narrative | Constitution includes baseline statement that repo does not implement artifacts, but repository now contains implementations. | Keep Constitution as baseline history; add current-state note in control/governance docs without changing frozen architecture meaning. |
| U-003 | "Complete" Numbers vertical slice threshold | Structural pieces exist, but measurable learner-improvement evidence is not yet recorded as completed. | Define and execute one evidence capture protocol, then mark completion in evidence register and live status. |

## Addendum (post ADR-0002): depth-related open items

| ID | Item | Why open | Decision/evidence needed |
| --- | --- | --- | --- |
| A-006 | Two depth loops per lesson (10 steps) provide sufficient beginner-first depth for the ten new concepts. | Depth is defined by mastery, not step count; only owner eye-test and learner evidence can confirm. | Owner walkthrough of lessons 1-3 and 11; later learner pre/post evidence. |
| A-007 | From-scratch pseudocode in apply steps adequately satisfies "every lesson ends with code" within the text renderer. | A runnable code panel would need renderer work (possible future ADR). | Owner accepts pseudocode for v1 or requests an ADR for a code/interaction layer. |
| A-008 | Two lenses (daily life + data/ML) suffice for v1; history/LLM/research lenses deferred. | The 10-part deep module in the vision includes lenses the current loops do not cover. | Owner accepts two-lens depth for v1 or requests a third loop per lesson. |
| U-004 | docs/control/autonomy-policy.md still names the Numbers slice as the current feature; ADR-0002 widened the path. | Administrative drift, not a behavior change. | Owner confirms wording update. |

## Immediate handling rule

Per governance, none of the assumptions above should be treated as facts until validated evidence is recorded.
