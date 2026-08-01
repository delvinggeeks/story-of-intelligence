# Learning Object Schema (LOS) v1.0

**Status:** Sprint 1 implementation artifact  
**ADR impact:** None — this schema instantiates the frozen EDM baseline; it does not alter it.

## Purpose

LOS defines the canonical data shape for a Learning Object. It separates a concept’s identity and graph relationships from its beginner-facing learning experience, assessment, and tutoring context.

## Required capabilities

An object must provide:

- a stable identity, title, version, and scope;
- Knowledge Model fields: concept id, prerequisites, and related concepts;
- Learning and Experience Model fields: objectives, estimated duration, and an Observe → Wonder → Predict → Explain → Apply sequence;
- Measurement Model fields: pre- and post-assessment prompts with observable success criteria;
- Reasoning Model fields: learner misconceptions and tutor guidance;
- provenance and an explicit beginner entry assumption.

The machine-readable contract is `schemas/learning-object.schema.v1.json`. The first conforming instance is `content/learning-objects/numbers.v1.json`.

## Validation criteria

1. The JSON instance satisfies every required field and allowed enum.
2. Its concept identifier is stable and its prerequisite/relationship lists are structurally usable by a graph.
3. A renderer can present the ordered learning steps without inferring hidden structure.
4. A tutor can use objectives, misconceptions, and guidance without modifying the object.
5. Pre/post prompts and success criteria make later learner validation possible.
