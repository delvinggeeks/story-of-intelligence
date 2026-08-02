# Academy Constitution SSOT v1.1

**Project:** Story of Intelligence Academy  
**Status:** Authoritative baseline  
**Supersedes:** Academy Constitution SSOT v1.0  
**Architecture:** Educational Domain Model (EDM) v1.0 — frozen  
**Governance:** ADR-based  
**Project state:** State 2 — Implementation  
**Current scope:** one governed learning path from Numbers through linear regression from scratch

## 1. Purpose and north star

The Academy helps a complete beginner develop durable understanding of the mathematics, intuition, and engineering behind machine learning, deep learning, transformers, and large language models. It prioritizes understanding over memorization, discovery before definition, engineering judgment over opaque use, and mastery before progression.

Success is demonstrated learner improvement: a learner should be able to explain, predict, apply, and teach a concept better after a Learning Object than before.

## 2. Frozen architecture

EDM v1.0 remains the normative architecture:

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

Model names and responsibilities cannot be changed by implementation convenience. An architectural change requires an ADR.

ADR-0001 retains the name Educational Domain Model for v1.0. ADR-0002 authorizes staged curriculum expansion without changing EDM v1.0 or LOS v1.0.

## 3. Constitutional principles

0. **Dogfooding.** The Academy teaches through its own creation.
1. **No Black Boxes.** Use it, understand it, build it, then optimize it.
2. **Vertical Evidence Before Scale.** Each expansion must preserve an executable learner path and produce validation evidence.
3. **Evidence Before Elegance.** Prefer learner and implementation evidence to unsupported presentation claims.
4. **Preserve Beginner Perspective.** Start from zero prior knowledge and introduce intuition before jargon.
5. **Mastery-Gated Progression.** A learner advances only when prerequisite evidence is complete.

## 4. Governance loop

Lifecycle: hypothesis → assumption register → implementation → validation → evidence register → ADR or Constitution update when warranted.

Every increment states what is being built, what is being learned, how validation establishes that it worked, and which assumptions remain open.

## 5. Current scope and exclusions

The active release contains one renderer, LOS v1.0, one prerequisite Knowledge Graph, adaptive coaching, pre/post measurement, persistence, and a learner dashboard for:

1. Numbers and quantities
2. Variables and algebra
3. Functions and graphs
4. Coordinates and vectors
5. Matrices and transformations
6. Probability and uncertainty
7. Statistics and distributions
8. Derivatives and gradients
9. Loss and optimization
10. Data, features, and targets
11. Linear regression from scratch

Breadth beyond linear regression, additional renderers, new AI agents, deep learning, production ML, enterprise infrastructure, and EDM reinterpretation remain out of scope unless separately approved.

## 6. Definition of done

The release is technically complete only when every Learning Object conforms to LOS v1.0; graph IDs, files, and prerequisites agree; the runtime serves each object through the shared renderer; progress is isolated per learner and concept; the dashboard exposes ordered mastery state; native and browser tests pass; and the production container passes health and endpoint smoke checks.

Technical completion does not prove pedagogical effectiveness. Learner outcome and content-depth assumptions remain open until observed use produces evidence.

## 7. Source authority and versioning

The preserved exports in `docs/source/` remain the historical record. This Constitution is the current normative extraction. ADR-0001 and ADR-0002 record the accepted decisions that produced it. Future architectural or scope changes require an ADR and a new Constitution version.