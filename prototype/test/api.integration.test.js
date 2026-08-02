import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import net from "node:net";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const progressFile = resolve(repoRoot, "data/progress.json");

async function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((err) => {
        if (err) return reject(err);
        resolvePort(address.port);
      });
    });
    server.on("error", reject);
  });
}

async function waitForServer(baseUrl, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/graph`);
      if (response.ok) return;
    } catch {
      // Retry until timeout.
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 50));
  }
  throw new Error("server_start_timeout");
}

async function startServer() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: repoRoot,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  await waitForServer(baseUrl);

  return {
    baseUrl,
    child,
    stderr: () => stderr
  };
}

async function stopServer(child) {
  child.kill();
  await once(child, "exit");
}

test.beforeEach(async () => {
  await rm(progressFile, { force: true });
});

test.afterEach(async () => {
  await rm(progressFile, { force: true });
});

test("GET /api/graph returns the ordered curriculum", async () => {
  const runtime = await startServer();
  try {
    const response = await fetch(`${runtime.baseUrl}/api/graph`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.version, "1.1.0");
    assert.equal(Array.isArray(payload.nodes), true);
    assert.equal(payload.nodes.length, 11);
    assert.equal(payload.nodes[0].id, "numbers");
    assert.equal(payload.nodes.at(-1).id, "linear-regression");
  } finally {
    await stopServer(runtime.child);
  }
});

test("GET /api/lesson/numbers aligns lesson id with graph concept", async () => {
  const runtime = await startServer();
  try {
    const [lessonResponse, graphResponse] = await Promise.all([
      fetch(`${runtime.baseUrl}/api/lesson/numbers`),
      fetch(`${runtime.baseUrl}/api/graph`)
    ]);

    assert.equal(lessonResponse.status, 200);
    assert.equal(graphResponse.status, 200);

    const lesson = await lessonResponse.json();
    const graph = await graphResponse.json();

    assert.equal(lesson.id, "numbers");
    assert.equal(lesson.knowledge.conceptId, "numbers");
    assert.equal(graph.nodes[0].id, lesson.knowledge.conceptId);

    const kinds = lesson.learning.steps.map((step) => step.kind);
    for (const kind of ["observe", "wonder", "predict", "experiment", "fail", "discover", "explain", "apply"]) {
      assert.equal(kinds.includes(kind), true);
    }
  } finally {
    await stopServer(runtime.child);
  }
});

test("GET /api/lesson resolves only concepts approved by the graph", async () => {
  const runtime = await startServer();
  try {
    const lessonResponse = await fetch(`${runtime.baseUrl}/api/lesson/numbers`);
    assert.equal(lessonResponse.status, 200);

    const unknownResponse = await fetch(`${runtime.baseUrl}/api/lesson/not-in-graph`);
    assert.equal(unknownResponse.status, 404);
    assert.deepEqual(await unknownResponse.json(), { error: "lesson_not_found" });
  } finally {
    await stopServer(runtime.child);
  }
});

test("POST /api/tutor reasons over the lesson's mastery rubric", async () => {
  const runtime = await startServer();
  try {
    const emptyResponse = await fetch(`${runtime.baseUrl}/api/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection: "" })
    });
    assert.equal(emptyResponse.status, 200);
    const emptyCoaching = await emptyResponse.json();
    assert.match(emptyCoaching.response, /^Start here:/);

    const weakResponse = await fetch(`${runtime.baseUrl}/api/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection: "Numbers are useful" })
    });
    assert.equal(weakResponse.status, 200);
    const weakCoaching = await weakResponse.json();
    assert.match(weakCoaching.response, /mastery dimensions. Still missing:/);
    assert.equal(weakCoaching.rubric.mastered, false);

    const strongResponse = await fetch(`${runtime.baseUrl}/api/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection: "The record count is a quantity in a shared unit; comparing the larger table is valid only after checking the schema, otherwise the decision is wrong." })
    });
    assert.equal(strongResponse.status, 200);
    const strongCoaching = await strongResponse.json();
    assert.equal(strongCoaching.rubric.mastered, true);
    assert.match(strongCoaching.response, /^Strong evidence:/);
  } finally {
    await stopServer(runtime.child);
  }
});

test("POST /api/progress gates completion on mastery evidence", async () => {
  const runtime = await startServer();
  try {
    const masteringBody = {
      learnerId: "learner-test-001",
      conceptId: "numbers",
      version: "2.0.0",
      preResponse: "Need same unit",
      postResponse: "Each record count is a quantity; compare the larger table only when units and schema match, and validate metadata before the decision.",
      completed: true
    };

    const response = await fetch(`${runtime.baseUrl}/api/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(masteringBody)
    });

    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload.learnerId, masteringBody.learnerId);
    assert.equal(payload.completed, true);
    assert.equal(payload.mastery.mastered, true);
    assert.equal(typeof payload.updatedAt, "string");

    const weakResponse = await fetch(`${runtime.baseUrl}/api/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...masteringBody, learnerId: "learner-test-weak", postResponse: "It was a nice lesson." })
    });
    assert.equal(weakResponse.status, 201);
    const weakPayload = await weakResponse.json();
    assert.equal(weakPayload.completed, false);
    assert.equal(weakPayload.mastery.mastered, false);

    const fileContent = JSON.parse(await readFile(progressFile, "utf8"));
    assert.equal(fileContent[`${masteringBody.learnerId}:numbers`].completed, true);
    assert.equal(fileContent[`${masteringBody.learnerId}:numbers`].conceptId, "numbers");
  } finally {
    await stopServer(runtime.child);
  }
});

test("API methods enforce contracts and return deterministic errors", async () => {
  const runtime = await startServer();
  try {
    const methodNotAllowed = await fetch(`${runtime.baseUrl}/api/graph`, { method: "POST" });
    assert.equal(methodNotAllowed.status, 405);
    assert.deepEqual(await methodNotAllowed.json(), { error: "method_not_allowed" });

    const missingLearner = await fetch(`${runtime.baseUrl}/api/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId: "numbers" })
    });
    assert.equal(missingLearner.status, 400);
    assert.deepEqual(await missingLearner.json(), { error: "learnerId is required" });

    const missingConcept = await fetch(`${runtime.baseUrl}/api/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId: "learner-test-002" })
    });
    assert.equal(missingConcept.status, 400);
    assert.deepEqual(await missingConcept.json(), { error: "valid conceptId is required" });

    const badJson = await fetch(`${runtime.baseUrl}/api/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    });
    assert.equal(badJson.status, 400);
    assert.deepEqual(await badJson.json(), { error: "invalid_json" });
  } finally {
    await stopServer(runtime.child);
  }
});

test("GET /api/dashboard returns learner-aware curriculum and progress", async () => {
  const runtime = await startServer();
  try {
    const response = await fetch(`${runtime.baseUrl}/api/dashboard`);
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(payload.lesson.id, "numbers");
    assert.equal(payload.lesson.title, "Numbers");
    assert.equal(payload.graph.conceptCount, 11);
    assert.equal(payload.curriculum.length, 11);
    assert.equal(payload.curriculum[0].status, "available");
    assert.equal(payload.curriculum[1].status, "locked");
    assert.equal(Array.isArray(payload.lesson.objectives), true);
    assert.equal(payload.lesson.objectives.length > 0, true);
    assert.equal(typeof payload.progress.learnerCount, "number");
  } finally {
    await stopServer(runtime.child);
  }
});

test("health and readiness endpoints report service availability", async () => {
  const runtime = await startServer();
  try {
    for (const path of ["/healthz", "/readyz"]) {
      const response = await fetch(`${runtime.baseUrl}${path}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "ok" });
    }
  } finally {
    await stopServer(runtime.child);
  }
});

test("JSON endpoints reject oversized request bodies", async () => {
  const runtime = await startServer();
  try {
    const response = await fetch(`${runtime.baseUrl}/api/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection: "x".repeat(20_000) })
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "payload_too_large" });
  } finally {
    await stopServer(runtime.child);
  }
});
