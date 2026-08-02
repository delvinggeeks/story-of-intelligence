import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const workflowDir = path.join(repoRoot, ".github", "workflows");

const workflows = async () => {
  const names = (await readdir(workflowDir)).filter((name) => /\.ya?ml$/.test(name));
  assert.ok(names.length > 0, "no workflows found to check");
  return Promise.all(
    names.map(async (name) => ({
      name,
      source: await readFile(path.join(workflowDir, name), "utf8"),
    })),
  );
};

/**
 * A tag is mutable, so `uses: some/action@v4` runs whatever that tag points at today.
 * Pinning is only a guarantee while every reference stays pinned, so it is asserted.
 */
test("every GitHub Action is pinned to an immutable commit SHA", async () => {
  for (const { name, source } of await workflows()) {
    for (const [line, ref] of [...source.matchAll(/^\s*uses:\s*(\S+)\s*$/gm)].map((match) => [
      match[0].trim(),
      match[1],
    ])) {
      const version = ref.split("@")[1];
      assert.match(version ?? "", /^[0-9a-f]{40}$/, `${name}: ${line} is not SHA-pinned`);
    }
  }
});

test("every pinned action records which release the SHA is", async () => {
  for (const { name, source } of await workflows()) {
    for (const line of source.split("\n").filter((entry) => /^\s*uses:/.test(entry))) {
      assert.match(line, /#\s*v\d/, `${name}: "${line.trim()}" has no version comment`);
    }
  }
});

test("no workflow carries a literal secret", async () => {
  for (const { name, source } of await workflows()) {
    // Real credentials must arrive through ${{ secrets.* }}, never as inline text.
    for (const match of source.matchAll(/^\s*([A-Z_]*(?:TOKEN|KEY|SECRET|PASSWORD))\s*:\s*(\S+)/gm)) {
      const [, key, value] = match;
      const allowed =
        value.startsWith("${{") || key === "POSTGRES_PASSWORD" || value === '""';
      assert.ok(allowed, `${name}: ${key} is set to a literal value`);
    }
  }
});

test("no environment file but the example is tracked", async () => {
  const ignore = await readFile(path.join(repoRoot, ".gitignore"), "utf8");

  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^\.env\.\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.match(ignore, /^e2e-logs\/$/m);
});

test("the example environment file holds no real credential", async () => {
  const example = await readFile(path.join(repoRoot, ".env.example"), "utf8");
  const assignments = [...example.matchAll(/^([A-Z_]+)=(.*)$/gm)];

  assert.ok(assignments.length > 0, "no settings found in .env.example");
  for (const [, key, value] of assignments) {
    if (!/TOKEN|KEY|SECRET|PASSWORD/.test(key)) continue;
    assert.equal(value, "", `${key} has a value in .env.example`);
  }
  // The erasure token stays commented out: an unset token means the route does not exist.
  assert.ok(
    !assignments.some(([, key]) => key === "ACADEMY_ERASURE_TOKEN"),
    "the erasure token must stay unset",
  );
});
