# ADR-0007: Learner evidence semantics, identity, and retention

- **Status:** Proposed — not accepted, not implemented
- **Date:** ADR-0006 Phase C
- **Supersedes / amends:** Nothing. ADR-0001 (EDM v1.0 frozen) and ADR-0006 (production platform scope) are unchanged.

## Context

Phase C added a persistence foundation for the single Numbers Learning Object: three tables
(`learner`, `learning_session`, `evidence_event`), an append-only guarantee on evidence, a
repository/service boundary, and an Alembic migration.

That work deliberately stopped short of deciding **what an evidence event means**. The
`evidence_event.kind` and `evidence_event.payload` columns are currently *opaque*: the service
layer stores them and no code branches on their contents. This is not an oversight. The Copilot
working agreement requires that a change to learner evidence semantics be proposed in an ADR
rather than invented mid-implementation, and Phase D (learner progress) cannot be built without
these decisions being made explicitly.

Three questions are open, and each has consequences that are expensive to reverse once learner
data exists.

### 1. What is an evidence event?

Today any `kind` string up to 64 characters is accepted. Options include a closed vocabulary
enforced in the database, a closed vocabulary enforced in the domain layer, or an open
vocabulary with a registry. A closed vocabulary makes replay analysable but makes adding a new
observation a migration. An open vocabulary is cheap now and becomes unanalysable later.

The payload has the same problem: a JSONB column with no schema is convenient to write and
unreliable to read. If Phase D derives mastery from these events, an unschema'd payload becomes
an undocumented contract.

### 2. Who is a learner?

Phase C models a learner as an anonymous, server-generated UUID with no credential, no personal
data, and no linkage to a device or account. This is the most privacy-preserving option
available and was chosen for exactly that reason, but it has real consequences that have not
been decided: a learner who clears local state is a new learner, progress cannot follow a person
across devices, and there is no way to answer "is this the same human?".

Any move beyond this — accounts, device binding, or linking anonymous IDs — introduces personal
data and must not happen implicitly.

### 3. How long is evidence kept, and how is it erased?

Evidence is append-only by contract. Phase C enforces this with a SQLAlchemy `before_flush`
listener that rejects updates and deletes, and it exposes no delete path at all. That is a
sound default for an audit-style learning record, but "append-only forever" is not a retention
policy, and immutability is in direct tension with an erasure request.

The database keeps `ON DELETE CASCADE` from `learner` to its sessions and events purely as a
referential-integrity backstop; ORM cascades were deliberately **not** configured so that no
deletion policy is implied by the code.

## Decision

**None yet.** This ADR is raised to record that these decisions are outstanding and to block
Phase D from making them implicitly.

## Options to evaluate before acceptance

1. **Evidence vocabulary.** Closed enum in the domain layer, versioned, with a documented
   meaning per kind; versus an open string with a registry document. Recommendation to test:
   closed vocabulary in the domain layer, not in the database, so the migration cost stays low
   while replay stays analysable.
2. **Payload governance.** A discriminated Pydantic model per `kind`, validated on write and on
   read, versus free-form JSONB. Note that events already written cannot be retro-validated.
3. **Correction semantics.** Because evidence cannot be updated, a mistake must be corrected by
   appending a compensating event. The shape of that event needs to be decided, not improvised.
4. **Ordering guarantee.** Phase C already establishes that `evidence_event.sequence` (a
   database identity column) is the authoritative replay order, because PostgreSQL `now()` is
   transaction-start time and cannot order events written in one transaction. This ADR should
   confirm that guarantee as part of the public contract.
5. **Identity.** Keep anonymous-only, or define a deliberate upgrade path to an account. If
   anonymous-only is confirmed, the limitations above must be stated in learner-facing terms.
6. **Retention and erasure.** A retention window, and a defined erasure mechanism that is
   compatible with the immutability guarantee — for example, deleting a whole learner subtree
   as a privileged operation rather than mutating individual events.

## Consequences if this ADR is not accepted

Phase D cannot derive progress or mastery from evidence, because no evidence has an agreed
meaning. The Phase C tables remain a correct, inert record: they can store facts, and nothing
reads them for judgement.

## Review trigger

Before the first Phase D change that reads `evidence_event.kind` or `evidence_event.payload`
for any purpose other than returning them verbatim.
