// Guards the ADR-0006 contract boundary: the renderer must not own the step taxonomy.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(webRoot, "src");

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    }),
  );
  return files.flat();
}

const STEP_KINDS = [
  "observe",
  "wonder",
  "predict",
  "experiment",
  "fail",
  "discover",
  "explain",
  "visualize",
  "generalize",
  "mathematics",
  "engineer",
  "optimize",
  "production",
  "apply",
  "reflect",
  "whats-next",
];

test("no frontend source enumerates the step taxonomy", async () => {
  for (const file of await sourceFiles(srcRoot)) {
    const contents = await readFile(file, "utf8");
    const present = STEP_KINDS.filter((kind) => contents.includes(`"${kind}"`));
    assert.deepEqual(
      present,
      [],
      `${path.relative(webRoot, file)} hard-codes step kinds ${present.join(", ")}; ` +
        "the taxonomy is owned by the API.",
    );
  }
});

test("the runtime renders the API-supplied step label", async () => {
  const component = await readFile(path.join(srcRoot, "components", "lesson-runtime.tsx"), "utf8");
  assert.match(component, /\{step\.label\}/);
  assert.doesNotMatch(component, /STEP_LABELS|Record<StepKind/);
});

test("the step type defers its kind vocabulary to the API", async () => {
  const types = await readFile(path.join(srcRoot, "types", "academy.ts"), "utf8");
  assert.match(types, /export type StepKind = string;/);
  assert.match(types, /label: string;/);
});
