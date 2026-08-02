/**
 * Anonymous learner identity (ADR-0007 D3).
 *
 * The browser stores exactly one thing: an opaque server-generated UUID. There is no name,
 * email, account, or fingerprint, and no attempt to recognise the same person on another
 * device. Clearing site data is therefore indistinguishable from being a new learner, which
 * is the intended privacy property, not a defect.
 */

export const LEARNER_STORAGE_KEY = "academy.learnerId";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLearnerId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function readStoredLearnerId(storage: Pick<Storage, "getItem">): string | null {
  const stored = storage.getItem(LEARNER_STORAGE_KEY);
  // Anything that is not a well-formed UUID is treated as absent rather than sent onward.
  return isLearnerId(stored) ? stored : null;
}

export function storeLearnerId(storage: Pick<Storage, "setItem">, learnerId: string): void {
  if (!isLearnerId(learnerId)) {
    throw new Error("Refusing to store a value that is not a learner UUID.");
  }
  storage.setItem(LEARNER_STORAGE_KEY, learnerId);
}
