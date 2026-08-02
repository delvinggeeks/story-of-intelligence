import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(webRoot, "src");

const read = (...segments) => readFile(path.join(srcRoot, ...segments), "utf8");

/** Comments name what is deliberately absent, so scan code only. */
const withoutComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * The help flow is the easiest place for an external model or a stored transcript to
 * appear by accident, so both are asserted against the source rather than left to review.
 */
test("the help flow talks to no provider but the Academy API", async () => {
  const panel = withoutComments(await read("components", "tutor-panel.tsx"));
  const client = withoutComments(await read("lib", "learner-api.ts"));

  for (const term of ["openai", "anthropic", "api_key", "apiKey", "Bearer ", "https://"]) {
    assert.ok(!panel.toLowerCase().includes(term.toLowerCase()), `tutor-panel references ${term}`);
    assert.ok(
      !client.toLowerCase().includes(term.toLowerCase()),
      `learner-api references ${term}`,
    );
  }
  assert.ok(!panel.includes("fetch("), "the panel must go through the shared API client");
});

test("the help flow persists nothing", async () => {
  const panel = withoutComments(await read("components", "tutor-panel.tsx"));

  for (const term of ["localStorage", "sessionStorage", "document.cookie", "indexedDB"]) {
    assert.ok(!panel.includes(term), `tutor-panel writes the learner's words to ${term}`);
  }
});

test("the tutor client sends no evidence and writes no learner record", async () => {
  const client = await readFile(path.join(srcRoot, "lib", "learner-api.ts"), "utf8");
  const askTutor = client.slice(client.indexOf("export function askTutor"));

  assert.match(askTutor, /"\/api\/v1\/tutor"/);
  assert.ok(!askTutor.includes("/events"), "asking for help must not append evidence");
});

test("every response the panel renders carries the provenance footer", async () => {
  const panel = await read("components", "tutor-panel.tsx");

  assert.match(panel, /response\.disclaimer/);
  assert.match(panel, /response\.provider\.name/);
  assert.match(panel, /response\.provider\.determinism/);
  assert.match(panel, /not by an AI model/);
});

test("the panel offers exactly the tasks the API declares", async () => {
  const panel = await read("components", "tutor-panel.tsx");
  const types = await read("types", "academy.ts");

  const declared = [...types.matchAll(/^ {2}\w+: "([a-z-]+)",$/gm)]
    .map((match) => match[1])
    .filter((value) => types.slice(types.indexOf("TUTOR_TASK")).includes(`"${value}"`));

  for (const task of declared) {
    assert.ok(panel.includes(task) || panel.includes(camel(task)), `no control for ${task}`);
  }
});

function camel(task) {
  return task.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
}

test("the panel exposes loading, empty, unsupported, and failure states", async () => {
  const panel = await read("components", "tutor-panel.tsx");

  assert.match(panel, /state === "loading"/);
  assert.match(panel, /state === "idle"/);
  assert.match(panel, /tutor-unsupported/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /role="status"/);
  assert.match(panel, /aria-busy/);
});
