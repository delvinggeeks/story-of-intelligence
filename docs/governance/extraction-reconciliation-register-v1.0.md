# Extraction & Reconciliation Register v1.0

**Purpose:** Trace the Academy Constitution SSOT v1.0 to the preserved exports without modifying their content.  
**Method:** Read both exports in full; treat accepted/final closure statements in part 2 as controlling where earlier exploratory material differs.

## Source inventory

| ID | Preserved file | SHA-256 | Role |
| --- | --- | --- | --- |
| S1 | `docs/source/ChatGPT-Story of Intelligence Vision - part1.md` | `ac8911da155397d2b16f7e9473ff491e184fb6afdd5d466a208cb7cc3542c854` | Original mission, learning philosophy, product and curriculum vision |
| S2 | `docs/source/ChatGPT-Story of Intelligence Vision - part2.md` | `b9d5073adbae28a870c4361c333bdf5c39499eaa80b702467ba4d52e6593234b` | Constitution, EDM closure, governance, scope, and subsequent setup discussion |

## Reconciliation rules

1. Preserve both source files verbatim; never edit them to resolve inconsistency.
2. Treat exploration, proposals, and options as non-normative unless explicitly accepted or recorded as final/locked.
3. Where part 2 formally closes architecture, that closure controls prior free-form architecture discussion.
4. Distinguish fact, assumption, hypothesis, opinion, design decision, and evidence in later work.
5. The Constitution records the governing result; the source files retain full context.

## Extracted decisions and reconciliation

| Register ID | Source | Extracted item | Status / reconciliation | SSOT location |
| --- | --- | --- | --- | --- |
| R-001 | S1 | Mission: build a learning platform for ML, DL, Transformers, and LLMs from beginner foundations. | Adopted as the North Star; retained at a concise level. | Constitution §1 |
| R-002 | S1/S2 | Understanding, intuition, discovery, and mastery are prioritized over rote coverage. | Adopted; these are consistent across exports. | Constitution §1, §3 |
| R-003 | S2, `EDM v1.0` | Eleven-model Educational Domain Model baseline. | Frozen. | Constitution §2 |
| R-004 | S2, `ADR-0001 (Accepted)` | Proposal to rename EDM to LIM. | Rejected/deferred for v1.0: retain EDM pending demonstrated cross-domain evidence. | Constitution §2 |
| R-005 | S2 | Dogfooding and No Black Boxes. | Accepted constitutional principles 0–1. | Constitution §3 |
| R-006 | S2 | Vertical Slice Before Scale, Evidence Before Elegance, Preserve Beginner Perspective. | Accepted constitutional principles 2–4. | Constitution §3 |
| R-007 | S2 | ADRs govern architectural changes after architecture freeze. | Adopted. | Constitution §2, §4 |
| R-008 | S2 | Constitution, ADR, assumption, and evidence registers form a lifecycle. | Adopted. | Constitution §4 |
| R-009 | S2 | First proof is EDM + LOS + one-concept graph + web renderer + Numbers object + adaptive tutor. | Adopted as scope boundary; not yet implemented. | Constitution §5 |
| R-010 | S2 | Do not scale to multiple blocks/renderers/agents or enterprise features before proof. | Adopted as explicit exclusions. | Constitution §5 |
| R-011 | S2 | Sprint 1 details include development-environment setup and later LOS work. | Not initiated here: user directed documentation-only workspace setup. | Constitution §5–6 |

## Contradictions, duplicates, and resolution

| ID | Topic | Observed material | Resolution |
| --- | --- | --- | --- |
| C-001 | EDM vs. LIM | LIM is proposed as a broader name; later ADR-0001 accepts retaining EDM. | EDM v1.0 is authoritative. LIM is a future-review hypothesis only. |
| C-002 | Architecture openness | Early text freely introduces models and refinements; later text declares architecture closed/frozen. | Formal closure governs. Changes require ADRs. |
| D-001 | Repeated closure records | Multiple acceptance, closure, and official-record passages restate the same status. | Consolidated into Constitution §§2–5; original repetitions preserved in S2. |
| D-002 | Repeated sprint framing | Several passages repeat the build/learn/validate cadence and LOS definition of done. | Consolidated into Constitution §§4 and 6. |

## Deliberately deferred items

The source exports discuss implementation technologies, environment setup, detailed schemas, renderers, graphs, tutoring, metrics, and broader platform ideas. They are retained as context, but are not implementation authorization in this baseline. They enter active work only through a scoped sprint, with ADR review if they affect the frozen architecture.

## Baseline integrity check

- Source exports copied verbatim and fingerprinted above.
- Constitution captures accepted/final governance, not exploratory alternatives.
- Current working scope remains the Numbers vertical slice.
- No application code, schema implementation, renderer, graph, or tutor has been created.
