# Academy Constitution SSOT v1.0

**Project:** Story of Intelligence Academy  
**Status:** Authoritative baseline  
**Architecture:** Educational Domain Model (EDM) v1.0 — frozen  
**Governance:** ADR-based  
**Project state:** State 2 — Implementation  
**Current scope:** the Numbers executable vertical slice; no application implementation in this repository baseline.

## 1. Purpose and north star

The Academy exists to help a complete beginner develop durable understanding of mathematics, intuition, and engineering behind machine learning, deep learning, transformers, and large language models. It prioritizes understanding over memorization, discovery before definition, engineering judgment over opaque use, and mastery before progression.

Success is not presentation quality. A learner should be able to explain, predict, apply, and teach a concept better after a Learning Object than before; the platform must be able to demonstrate evidence of that improvement.

## 2. Frozen architecture

EDM v1.0 is the normative architecture:

1. Meta Model
2. Cognitive Model
3. Governance Model
4. Knowledge Model
5. Learning Model
6. Capability Model
7. Experience Model
8. Reasoning Model
9. Measurement Model
10. Platform Model
11. Execution Model

These models are the frozen architectural baseline. An architectural change is not made by conversation, implementation convenience, or this document; it requires an ADR.

### ADR-0001 — accepted

EDM retains the name **Educational Domain Model** in v1.0. The current evidence supports AI and mathematics education; broader generalization remains a hypothesis. Consider a rename to Learning Intelligence Model only after successful application to at least one substantially different domain, as part of EDM v2.0.

## 3. Constitutional principles

0. **Dogfooding.** The Academy teaches through its own creation: every engineering milestone produces a corresponding learning milestone.
1. **No Black Boxes.** For an implementation, use it, understand it, build it, then optimize it.
2. **Vertical Slice Before Scale.** Prove one complete path before adding breadth.
3. **Evidence Before Elegance.** Prefer learner and implementation evidence to attractive but unsupported design.
4. **Preserve Beginner Perspective.** A Learning Object starts from zero prior knowledge. Unmarked expert shortcuts are defects.

## 4. Governance loop

| Artifact | Responsibility |
| --- | --- |
| Constitution | Principles and frozen baseline |
| ADRs | Architectural decisions and rationale |
| Assumption Register | Unvalidated hypotheses |
| Evidence Register | Validated findings |
| Definition of Done | Completion criteria |
| Sprint Plan | Execution scope |

Lifecycle: hypothesis → assumption register → implementation → validation → evidence register → ADR or Constitution only when warranted.

Every sprint must state: (1) what we are building, (2) what we are learning, and (3) how validation will establish that it worked.

## 5. Current scope and exclusions

The first proof is a single end-to-end vertical slice:

- EDM v1.0 baseline
- Learning Object Schema v1.0
- a Knowledge Graph containing exactly one concept: **Numbers**
- one web renderer
- one complete `Numbers` Learning Object
- one adaptive tutoring interaction using the Reasoning Model

Until that slice is proven, do not add multiple foundation blocks, renderers, AI agents, premature performance work, enterprise infrastructure, or unvalidated generalization. This repository currently establishes governance only; it does not implement those artifacts.

## 6. Definition of done for the first Learning Object Schema increment

LOS v1.0 is complete only when it is defined, documented, and validated; a `Numbers` Learning Object conforms; and compatibility is demonstrated for the Knowledge Graph, runtime, and Reasoning Model without an architectural change.

## 7. Source authority and versioning

The preserved source exports in `docs/source/` are the primary historical record. This Constitution is the concise normative extraction for v1.0. The accompanying extraction and reconciliation register records traceability, decisions, duplicates, contradictions, and deliberately deferred material. Future changes require a new version and, where architectural, an ADR.
