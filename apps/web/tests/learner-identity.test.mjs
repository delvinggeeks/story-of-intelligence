import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(webRoot, "src");

/**
 * ADR-0007 D3 is a privacy guarantee, so it is asserted against the source rather than
 * left to review: the browser must persist an opaque identifier and nothing else.
 */
test("the browser stores only an opaque learner identifier", async () => {
  const identity = await readFile(path.join(srcRoot, "lib", "learner-identity.ts"), "utf8");

  const stored = [...identity.matchAll(/setItem\(([^)]*)\)/g)].map((match) => match[1]);
  assert.deepEqual(stored, ["LEARNER_STORAGE_KEY, learnerId"]);
  assert.match(identity, /UUID_PATTERN/);
});

/** Comments explain the guarantee and name what is *not* stored, so scan code only. */
const withoutComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("no frontend source persists personal data", async () => {
  const forbidden = ["email", "fullName", "displayName", "fingerprint"];
  const identity = withoutComments(
    await readFile(path.join(srcRoot, "lib", "learner-identity.ts"), "utf8"),
  );
  const client = withoutComments(
    await readFile(path.join(srcRoot, "lib", "learner-api.ts"), "utf8"),
  );

  for (const term of forbidden) {
    assert.ok(!identity.includes(term), `learner-identity.ts references ${term}`);
    assert.ok(!client.includes(term), `learner-api.ts references ${term}`);
  }
});

test("the learner client reaches the API over HTTP and never the filesystem", async () => {
  const client = await readFile(path.join(srcRoot, "lib", "learner-api.ts"), "utf8");

  assert.match(client, /NEXT_PUBLIC_ACADEMY_API_URL/);
  assert.ok(!client.includes("node:fs"), "the learner client must not read the filesystem");
  assert.ok(!client.includes("packages/content"), "the learner client must not read content JSON");
});
