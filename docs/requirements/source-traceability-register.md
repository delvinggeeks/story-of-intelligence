# Source Traceability Register

Status: Draft for implementation gating
Date: 2026-08-02
Scope: Story of Intelligence Academy, Numbers vertical slice

## Authority and conflict-priority order

When sources conflict, this register applies the following priority order:

1. Accepted ADRs (highest for architectural naming/freeze decisions)
2. Constitution SSOT v1.0 (normative baseline)
3. Final closure records in source exports (accepted/frozen statements in part2)
4. Extraction and reconciliation register v1.0
5. Copilot working agreement and control policy artifacts
6. Exploratory/proposal passages in source exports (non-normative unless later accepted)

## Classified requirements

Legend:
- Category values are limited to the requested taxonomy.
- "Authority" means how strongly this can be enforced now.

| ID | Category | Requirement / Constraint | Source trace (file + heading/nearby passage) | Authority |
| --- | --- | --- | --- | --- |
| R-001 | immutable principle | EDM v1.0 is frozen; architectural changes require ADR. | docs/governance/academy-constitution-ssot-v1.0.md, "2. Frozen architecture"; docs/governance/adr/ADR-0001-retain-edm-v1.md, "Decision"; docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "EDM v1.0 remains the official name", "Architecture: Frozen" passages | binding |
| R-002 | accepted decision | Retain name Educational Domain Model for v1.0; LIM is deferred hypothesis for later version review trigger. | docs/governance/adr/ADR-0001-retain-edm-v1.md, "Decision and rationale", "Review trigger"; docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "ADR-0001 (Accepted)" block | binding |
| R-003 | immutable principle | Dogfooding: each engineering milestone must produce a learning milestone. | docs/governance/academy-constitution-ssot-v1.0.md, "3. Constitutional principles", principle 0; docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "Principle 0 - Dogfooding" | binding |
| R-004 | immutable principle | No Black Boxes: Use -> Understand -> Build -> Optimize. | docs/governance/academy-constitution-ssot-v1.0.md, principle 1; docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "Principle 1 - No Black Boxes" | binding |
| R-005 | immutable principle | Vertical Slice Before Scale: prove one complete path before breadth. | docs/governance/academy-constitution-ssot-v1.0.md, principle 2; docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "Principle 2 - Vertical Slice Before Scale" | binding |
| R-006 | immutable principle | Evidence Before Elegance and beginner perspective are mandatory quality filters. | docs/governance/academy-constitution-ssot-v1.0.md, principles 3 and 4; .github/copilot-instructions.md, "Non-negotiable guardrails" | binding |
| R-007 | immutable principle | Governance lifecycle is hypothesis -> assumption register -> implementation -> validation -> evidence -> ADR/constitution only when warranted. | docs/governance/academy-constitution-ssot-v1.0.md, "4. Governance loop" | binding |
| R-008 | product requirement | Current scope is one complete Numbers vertical slice only. | docs/governance/academy-constitution-ssot-v1.0.md, "5. Current scope and exclusions"; .github/copilot-instructions.md, "current product scope" | binding |
| R-009 | product requirement | Required vertical slice artifacts: EDM baseline, LOS v1.0, one-concept graph (Numbers), one renderer, one complete Numbers learning object, one adaptive tutoring interaction. | docs/governance/academy-constitution-ssot-v1.0.md, "5. Current scope and exclusions"; docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "Next Milestone" lists | binding |
| R-010 | deferred idea / non-goal | Explicitly out of scope until proof: multiple subjects, many renderers, multi-agent scaleout, enterprise infrastructure, premature optimization. | docs/governance/academy-constitution-ssot-v1.0.md, exclusions list; .github/copilot-instructions.md, scope prohibition; docs/source/ChatGPT-Story of Intelligence Vision - part2.md, backlog/out-of-scope passages | binding |
| R-011 | product requirement | LOS increment done only when defined, documented, validated, Numbers object conforms, and compatibility with graph/runtime/reasoning is demonstrated without architecture change. | docs/governance/academy-constitution-ssot-v1.0.md, "6. Definition of done" | binding |
| R-012 | learning requirement | Platform is beginner-first: assume zero math background and avoid unmarked expert shortcuts. | docs/source/ChatGPT-Story of Intelligence Vision - part1.md, "Primary Audience" and "Learning Principles"; docs/governance/academy-constitution-ssot-v1.0.md, principle 4 | binding |
| R-013 | learning requirement | Teach problem first, then math; lesson is incomplete if foundational "why/usage/what breaks" questions are not answered. | docs/source/ChatGPT-Story of Intelligence Vision - part1.md, "Core Philosophy" | binding |
| R-014 | learning requirement | Preferred pedagogical engine: Observe -> Wonder -> Predict -> Experiment -> Fail -> Discover -> Visualize -> Generalize -> Mathematics -> Engineer -> Optimize -> Production -> Reflect -> What's Next. | docs/source/ChatGPT-Story of Intelligence Vision - part1.md, "The Universal Learning Engine"; also "Teaching Philosophy" sequence | recommended (accepted in closure records but not constitutional text) |
| R-015 | learning requirement | Mastery over coverage: depth loops, foundation blocks, and move on only when learner thinking changes. | docs/source/ChatGPT-Story of Intelligence Vision - part1.md, "The Principle", "Mastery Pyramid", "Golden Rule" | recommended |
| R-016 | learning requirement | Every lesson must create the need for the next lesson (progressive conceptual dependency). | docs/source/ChatGPT-Story of Intelligence Vision - part1.md, "I would make one principle non-negotiable" | recommended |
| R-017 | full-stack engineering requirement | Separate architecture and implementation concerns; architecture changes use ADR workflow only. | docs/control/autonomy-policy.md, "Stop conditions"; docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "Architecture / Implementation / Curriculum" track split | binding |
| R-018 | full-stack engineering requirement | Milestones require explicit validation evidence, not subjective completion. | docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "Definition of Done (DoD)", "Validation column"; docs/governance/academy-constitution-ssot-v1.0.md, evidence loop | binding |
| R-019 | full-stack engineering requirement | Do not push/deploy/merge protected remote branch, use secrets, or destructive git operations in autonomous loop. | docs/control/autonomy-policy.md, "Immutable boundaries" | binding |
| R-020 | UX/accessibility requirement | Learner-facing behavior must be beginner-safe and recoverable (especially hints/errors), avoid cognitive overload and abstraction-first UI. | docs/source/ChatGPT-Story of Intelligence Vision - part1.md, "Visual First", "Learning Principles"; docs/control/active-task.md acceptance criteria for beginner-safe hint/error behavior | binding for current renderer patterns |
| R-021 | product requirement | Source exports in docs/source are preserved historical record and must not be edited to resolve inconsistencies. | docs/governance/extraction-reconciliation-register-v1.0.md, "Reconciliation rules" #1; docs/governance/academy-constitution-ssot-v1.0.md, "7. Source authority and versioning" | binding |
| R-022 | accepted decision | Part2 closure/accepted records control earlier exploratory alternatives when conflicts exist. | docs/governance/extraction-reconciliation-register-v1.0.md, "Method" and rules #2-#3 | binding |
| R-023 | accepted decision | Current project state is implementation with owner gate on complete demoable feature. | docs/control/autonomy-policy.md, "Gate"; docs/control/live-status.json (state/current task) | binding |
| R-024 | contradiction or ambiguity | README says application implementation "intentionally not started", but live-status and codebase show running web+API implementation. | README.md, "Status"; docs/control/live-status.json, "full-stack implementation"; index.html/assets/app.js/server.mjs exist | unresolved; requires owner decision on canonical status text |
| R-025 | contradiction or ambiguity | Constitution says baseline repository has no application implementation, while current repo now contains implementation artifacts. | docs/governance/academy-constitution-ssot-v1.0.md, "this repository currently establishes governance only" vs current files in root/assets/server | reconciled as time/version drift; Constitution text reflects baseline, repo moved forward |
| R-026 | deferred idea / non-goal | AOS/LIM broad-domain expansion remains deferred until evidence beyond AI+math education exists. | docs/governance/adr/ADR-0001-retain-edm-v1.md, review trigger; docs/source/ChatGPT-Story of Intelligence Vision - part2.md, LIM deferral passages | binding deferment |
| R-027 | assumption or hypothesis | Story-first and productive-failure patterns improve understanding/retention; requires empirical evidence capture. | docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "Assumption Register" addition and examples | hypothesis |
| R-028 | assumption or hypothesis | One LOS can support all future concepts/domains; currently unproven beyond Numbers. | docs/source/ChatGPT-Story of Intelligence Vision - part2.md, A-003 example in "Assumption Register" | hypothesis |
| R-029 | assumption or hypothesis | Adaptive tutor materially improves mastery quality relative to static experience. | docs/source/ChatGPT-Story of Intelligence Vision - part2.md, A-004 example | hypothesis |
| R-030 | deferred idea / non-goal | Enterprise AI architecture, multi-agent orchestration, and large content factory are backlog items after first validated slice. | docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "out of scope until first vertical slice" passages; Constitution exclusions | deferred |
| R-031 | product requirement | The immediate executable slice should center on Numbers concept end-to-end with measurable pre/post improvement. | docs/source/ChatGPT-Story of Intelligence Vision - part2.md, "first success criterion" and formal project records; docs/governance/academy-constitution-ssot-v1.0.md sections 5-6 | binding |
| R-032 | full-stack engineering requirement | Keep changes minimal, traceable, and evidence-backed; avoid unneeded dependencies/scaffolding. | .github/copilot-instructions.md, "Non-negotiable guardrails" | binding |
| R-033 | UX/accessibility requirement | Interactions should prefer visual/interactive discovery before notation-heavy abstraction. | docs/source/ChatGPT-Story of Intelligence Vision - part1.md, "Visual First", "Learning Principles", "Teaching Philosophy" | recommended (strong learning requirement) |
| R-034 | learning requirement | Distinguish timeless principles from time-sensitive tools to keep curriculum maintainable and current. | docs/source/ChatGPT-Story of Intelligence Vision - part1.md, responsibilities item 9; foundational/supporting/awareness concept framing | recommended |
| R-035 | contradiction or ambiguity | docs/control/active-task.md marks IR-002 complete; docs/control/live-status.json says backend foundation in progress. Scope sequencing between control files is not fully synchronized. | docs/control/active-task.md status line; docs/control/live-status.json sequence/currentTask | unresolved; requires control-record sync decision |

## Addendum (post ADR-0002): lesson depth and flow contract

Governing baseline updated: Constitution SSOT v1.1 supersedes v1.0; ADR-0002 (accepted, owner-approved) extends the product scope from the Numbers slice to the 11-lesson path ending at linear regression from scratch. R-008/R-009 are superseded by R-036 below; all other rows remain binding.

| ID | Category | Requirement / Constraint | Source trace | Authority |
| --- | --- | --- | --- | --- |
| R-036 | accepted decision | Product scope is the 11-lesson ADR-0002 path (numbers -> linear-regression), one renderer, LOS v1.0, mastery-gated dashboard. | docs/governance/adr/ADR-0002 "Decision"; docs/governance/academy-constitution-ssot-v1.1.md section 5 | binding |
| R-037 | learning requirement | Depth loops: every lesson runs the full observe->wonder->predict->explain->apply cycle AT LEAST TWICE (>=10 steps). Loop 1 = daily-life/story lens; loop 2 = data/engineering/ML lens. One pass is the prohibited "cream layer" pattern. | part1 "Introduce 'Depth Loops'", "The Rule of Depth", "The Rule of Breadth", "Breadth Without Losing Depth"; validated Numbers object as reference implementation | binding (enforced by contract test) |
| R-038 | learning requirement | Flow bridge: the final apply step of every lesson explicitly exposes a limitation that the NEXT lesson resolves ("every lesson ends by creating the need for the next lesson"). Lesson 11 closes with a forward look beyond current scope without authorizing new scope. | part2 "I would make one principle non-negotiable"; Golden Rule 6 | binding (enforced by contract test) |
| R-039 | learning requirement | Prompt substance: step prompts are concrete scenarios (named contexts, real quantities), and hints teach rather than restate. | part1 "Core Philosophy", "The Rule of Depth"; anti-pattern R-037 | binding |
| R-040 | full-stack engineering requirement | The final lesson's engineering apply step requires from-scratch construction (pseudocode of univariate linear regression) with no ML library. | part1 "Code Philosophy"; part2 "Principle 1 - No Black Boxes"; ADR-0002 acceptance criteria | binding |
| R-041 | contradiction or ambiguity | This task's prompt referenced Constitution v1.0 and Numbers-only scope; both are superseded by v1.1/ADR-0002. docs/control/autonomy-policy.md wording also still names the Numbers slice. | prompt text; docs/governance/academy-constitution-ssot-v1.1.md; ADR-0002 | resolved: v1.1 + ADR-0002 govern; policy wording update is administrative |

Reconciliation note (LOS vs 16-stage engine): LOS v1.0's frozen `steps.kind` enum (observe/wonder/predict/explain/apply) is the schema-approved projection of the Universal Learning Engine. The engine's remaining stages (experiment/fail/discover/visualize/engineer/production) are expressed inside explain/apply prompt content and by repeating the cycle (R-037), not by schema change. Changing the enum would require an ADR; none is needed.
| R-036 | assumption or hypothesis | "Use Fable for planning/design/cost optimization" appears in current request but is not grounded in governed artifacts and toolchain contracts. | user request text (outside governed docs); no supporting requirement in required source files | assumption requiring owner decision |

## Reconciliation notes applied in this register

1. Where early source passages propose broad academy/platform expansion, they are classified as deferred unless later accepted within frozen EDM scope.
2. Where part2 closure records state accepted/frozen status, those are treated as controlling over prior brainstorming.
3. Constitution and ADR-0001 are treated as normative constraints over implementation convenience.
4. Unsupported implementation directives (including unreferenced named tools or services) are explicitly marked as assumption requiring owner decision.

## Coverage statement

All requested source files were read in full and used in this register:
- docs/source/ChatGPT-Story of Intelligence Vision - part1.md
- docs/source/ChatGPT-Story of Intelligence Vision - part2.md
- docs/governance/academy-constitution-ssot-v1.0.md
- docs/governance/extraction-reconciliation-register-v1.0.md
- docs/governance/adr/ADR-0001-retain-edm-v1.md
- .github/copilot-instructions.md
- docs/control/autonomy-policy.md
- docs/control/live-status.json
