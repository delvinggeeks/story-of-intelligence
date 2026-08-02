# ADR-0007: Learner evidence semantics, identity, and retention

- **Status:** Accepted
- **Date:** 2026-08-02 (raised during ADR-0006 Phase C, accepted before Phase D)
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

Seven decisions are accepted. Together they define what an evidence event means, who a learner
is, and how learner data is erased. Nothing below is implemented yet; this ADR authorises the
implementation, which lands in Phase D.

### D1. A versioned, closed evidence vocabulary, enforced in the domain layer

`evidence_event.kind` is drawn from a **closed, versioned vocabulary defined in Python**. It is
**not** a PostgreSQL enum and not a database constraint.

The domain layer is the enforcement point because it keeps replay analysable without making
every new observation a schema migration. A database enum would buy marginal integrity at the
cost of a migration, a deploy ordering constraint, and a downgrade hazard each time the
vocabulary grows. The `String(64)` column is retained as storage only.

The vocabulary is versioned so that a kind's meaning can never be silently redefined. A kind
that must change meaning gets a new name; the retired name stays readable for replay of
historical events and is rejected for new writes.

Unknown kinds are rejected on write. On read, an unknown or retired kind must remain
deserialisable, because events already written cannot be retro-validated.

### D2. Payloads validated by a discriminated Pydantic model keyed by kind

`evidence_event.payload` is validated by a **discriminated union of Pydantic models, with `kind`
as the discriminator**. Each kind has exactly one payload model.

Validation happens on write. A payload that does not match its kind is rejected before it
reaches the database, so an unschema'd JSONB column can never become an undocumented contract.

On read, validation is best-effort: an event whose payload no longer matches the current model
must still be retrievable in raw form. Events already written cannot be retro-validated, and a
read path that raised on historical data would make the record unusable exactly when it matters.

JSONB remains the storage type. The schema lives in code, beside the vocabulary it belongs to.

### D3. Learner identity stays anonymous-only

A learner is a **server-generated UUID with no credential, no personal data, and no cross-device
linkage**. This confirms the Phase C model as the permanent design, not a placeholder.

Specifically, and permanently for this scope:

- no accounts, no sign-in, no email address, no name;
- no device fingerprinting and no linking of anonymous IDs;
- no attempt to determine whether two learner IDs are the same human.

Any future change to this is a new ADR, not an implementation detail. Introducing accounts
introduces personal data, and that must never happen implicitly.

### D4. Evidence stays append-only; corrections are typed compensating events

Evidence is **never updated**. The `before_flush` guard added in Phase C is confirmed as a
permanent invariant, not a temporary safety net.

A mistake is corrected by **appending a typed compensating event** that references the event it
corrects. The compensating event is part of the D1 vocabulary and carries a D2-validated
payload, so a correction is itself first-class evidence rather than an improvised convention.

This means replay is the only correct way to derive current state: a consumer that reads the
latest event without applying compensations will be wrong. That cost is accepted in exchange for
a learning record whose history cannot be silently rewritten.

### D5. `evidence_event.sequence` is the authoritative replay order

The database identity column `evidence_event.sequence` is **confirmed as part of the public
contract**. It is the only correct ordering for replay.

Timestamps must not be used for ordering. PostgreSQL `now()` is transaction-start time, so
events written inside one transaction share a `recorded_at` and cannot be ordered by it.
`occurred_at` is caller-supplied and therefore untrusted. Both remain useful as facts; neither
is an ordering key.

### D6. Erasure is a privileged learner-subtree delete

A **privileged erasure operation** deletes a learner together with its sessions and its entire
evidence subtree, as one transaction.

Individual evidence-event deletion is **not permitted** and must remain impossible. Erasure is
all-or-nothing for a learner, which is what makes it compatible with D4: the append-only
invariant protects the integrity of a record that exists, and erasure removes the record
entirely rather than editing it.

The operation is privileged. It is not reachable from ordinary learner-facing request handling
and is not part of the normal repository surface. It must be auditable, and it is irreversible.

No time-based retention window is set by this ADR. Anonymous evidence carrying no personal data
creates little retention pressure, and an arbitrary window would delete learning history for no
stated benefit. A retention window is a separate decision if one is ever needed.

### D7. Learner-facing limitations are stated plainly

The consequences of D3 and D6 are recorded in learner-facing terms, not left implicit in
architecture documents:

- **Progress is tied to this browser.** Clearing site data starts over as a new learner.
- **Progress does not follow you.** There is no way to continue on another device or browser.
- **There is no account to recover.** Nothing identifies a learner, so lost progress cannot be
  restored by support.
- **Erasure is complete and permanent.** Erasing a learner removes their sessions and their
  entire learning history at once; it cannot be undone or partially applied.

These are the honest price of collecting no personal data. Stating them is part of the decision,
not a follow-up task.

## Consequences

Phase D may now interpret evidence, because evidence has an agreed meaning.

Implementation notes carried into Phase D:

- The Phase C immutability guard rejects **all** deletes of `EvidenceEvent`. D6 requires a
  deliberate, narrow, auditable bypass for learner-subtree erasure only. Widening that guard
  casually would silently repeal D4.
- Phase C configured no ORM cascades, precisely so that no deletion policy was implied before
  this ADR existed. D6 now supplies that policy, so the erasure path may rely on the existing
  database-level `ON DELETE CASCADE` from `learner` downward.
- Evidence written during Phase C predates the D1 vocabulary and the D2 payload models. It must
  remain readable and must not be retro-validated.
- `evidence_event.kind` remains `String(64)`. D1 requires no migration.

## Review trigger

Re-open this ADR if any of the following becomes true: a requirement appears that cannot be met
without identifying a learner across devices; a legal or institutional obligation imposes a
retention window; or the closed vocabulary changes often enough that the migration-cost argument
for keeping it out of the database no longer holds.
