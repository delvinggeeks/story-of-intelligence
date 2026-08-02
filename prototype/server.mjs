import { createServer } from "node:http";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { resolve, extname, sep } from "node:path";

const root = resolve(process.cwd());
const dataDir = resolve(root, "data");
const progressFile = resolve(dataDir, "progress.json");
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT || "8765");
const maxPortAttempts = Number(process.env.PORT_ATTEMPTS || (process.env.NODE_ENV === "production" ? "1" : "20"));
const maxRequestBytes = Number(process.env.MAX_REQUEST_BYTES || "16384");
const json = (response, status, body) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(body)); };
const readJson = async (file, fallback = {}) => { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } };
const graphFile = resolve(root, "content/knowledge-graph.v1.json");
let progressWrite = Promise.resolve();
const saveProgress = async (record) => {
  progressWrite = progressWrite.then(async () => {
    await mkdir(dataDir, { recursive: true });
    const all = await readJson(progressFile, {});
    all[`${record.learnerId}:${record.conceptId || "unknown"}`] = record;
    const temporaryFile = `${progressFile}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(all, null, 2));
    await rename(temporaryFile, progressFile);
  });
  return progressWrite;
};
const setCommonHeaders = (response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'");
  response.setHeader("Cache-Control", "no-store");
};

async function readRequestJson(request) {
  let body = "";
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxRequestBytes) throw new Error("payload_too_large");
    body += chunk;
  }
  if (!body.trim()) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("invalid_json");
  }
}

async function readLesson(conceptId) {
  const graph = await readJson(graphFile, { nodes: [] });
  const node = graph.nodes.find((candidate) => candidate.id === conceptId);
  if (!node || !/^[a-z0-9-]+\.v2\.json$/.test(node.learningObject)) return null;
  return readJson(resolve(root, "content/learning-objects", node.learningObject), null);
}

function scoreRubric(lesson, text = "") {
  const rubric = lesson?.measurement?.masteryRubric;
  if (!rubric) return null;
  const checks = rubric.checks.map((check) => ({
    id: check.id,
    label: check.label,
    pass: new RegExp(check.pattern, "i").test(text)
  }));
  const score = checks.filter((check) => check.pass).length;
  return { checks, score, threshold: rubric.threshold, mastered: score >= rubric.threshold };
}

function reasonAboutReflection(lesson, reflection) {
  const rubric = scoreRubric(lesson, reflection);
  if (!reflection.trim()) {
    return { rubric, response: `Start here: ${lesson.learning.objectives[0]} ${lesson.reasoning.tutorGuidance}` };
  }
  if (rubric.mastered) {
    const bridge = lesson.nextConcept ? ` When you finish, the story continues with ${lesson.nextConcept.replaceAll("-", " ")}.` : "";
    return { rubric, response: `Strong evidence: ${rubric.score}/${rubric.checks.length} mastery dimensions are present in your thinking.${bridge}` };
  }
  const missing = rubric.checks.filter((check) => !check.pass).slice(0, 2).map((check) => check.label);
  const caution = lesson.reasoning.misconceptions[0] ? ` Common trap to avoid: ${lesson.reasoning.misconceptions[0]}` : "";
  return { rubric, response: `You have evidenced ${rubric.score}/${rubric.checks.length} mastery dimensions. Still missing: ${missing.join(" Also: ")}${caution}` };
}

async function readDashboardSnapshot(learnerId) {
  const [status, graph, progress] = await Promise.all([
    readJson(resolve(root, "docs/control/live-status.json"), {}),
    readJson(graphFile, {}),
    readJson(progressFile, {})
  ]);

  const records = Object.values(progress);
  const learnerRecords = learnerId ? records.filter((record) => record.learnerId === learnerId) : records;
  const completedConcepts = new Set(learnerRecords.filter((record) => record.completed).map((record) => record.conceptId));
  const lessons = await Promise.all((graph.nodes || []).map((node) => readLesson(node.id)));
  const curriculum = (graph.nodes || []).map((node, index) => {
    const lesson = lessons[index] || {};
    const prerequisitesComplete = node.prerequisites.every((id) => completedConcepts.has(id));
    return {
      id: node.id,
      title: lesson.title || node.id,
      scope: lesson.scope || "",
      estimatedMinutes: lesson.learning?.estimatedMinutes || 0,
      objectives: lesson.learning?.objectives || [],
      prerequisites: node.prerequisites,
      status: completedConcepts.has(node.id) ? "completed" : prerequisitesComplete ? "available" : "locked"
    };
  });
  const currentLesson = curriculum.find((lesson) => lesson.status === "available") || curriculum.at(-1) || {};
  const completed = learnerRecords.filter((record) => record.completed).length;
  const latest = learnerRecords
    .filter((record) => typeof record.updatedAt === "string")
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] ?? null;

  return {
    feature: "Foundations to Machine Learning",
    state: status.state || "implementation",
    updatedAt: status.updatedAt || new Date().toISOString(),
    lesson: {
      id: currentLesson.id || "numbers",
      title: currentLesson.title || "Numbers",
      estimatedMinutes: currentLesson.estimatedMinutes || 0,
      objectives: currentLesson.objectives || []
    },
    curriculum,
    graph: {
      version: graph.version || "1.0.0",
      conceptCount: Array.isArray(graph.nodes) ? graph.nodes.length : 0
    },
    progress: {
      learnerCount: new Set(records.map((record) => record.learnerId)).size,
      completionCount: completed,
      completionRate: curriculum.length ? Number((completedConcepts.size / curriculum.length).toFixed(2)) : 0,
      latestRecord: latest
    }
  };
}

const app = createServer(async (request, response) => {
  setCommonHeaders(response);
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/healthz" || url.pathname === "/readyz") {
    if (request.method !== "GET") return json(response, 405, { error: "method_not_allowed" });
    return json(response, 200, { status: "ok" });
  }
  if (url.pathname === "/api/graph") {
    if (request.method !== "GET") return json(response, 405, { error: "method_not_allowed" });
    return json(response, 200, await readJson(graphFile));
  }
  const lessonMatch = url.pathname.match(/^\/api\/lesson\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (lessonMatch) {
    if (request.method !== "GET") return json(response, 405, { error: "method_not_allowed" });
    const lesson = await readLesson(lessonMatch[1]);
    return lesson ? json(response, 200, lesson) : json(response, 404, { error: "lesson_not_found" });
  }
  if (url.pathname === "/api/tutor") {
    if (request.method !== "POST") return json(response, 405, { error: "method_not_allowed" });
    let payload;
    try {
      payload = await readRequestJson(request);
    } catch (error) {
      return json(response, error.message === "payload_too_large" ? 413 : 400, { error: error.message });
    }
    const { conceptId = "numbers", reflection = "" } = payload;
    const lesson = await readLesson(conceptId);
    if (!lesson) return json(response, 404, { error: "lesson_not_found" });
    return json(response, 200, reasonAboutReflection(lesson, String(reflection)));
  }
  if (url.pathname === "/api/progress") {
    if (request.method === "GET") {
      const all = await readJson(progressFile, {});
      return json(response, 200, {
        learnerCount: Object.keys(all).length,
        records: all
      });
    }
    if (request.method !== "POST") return json(response, 405, { error: "method_not_allowed" });
    let payload;
    try {
      payload = await readRequestJson(request);
    } catch (error) {
      return json(response, error.message === "payload_too_large" ? 413 : 400, { error: error.message });
    }
    const record = { ...payload, updatedAt: new Date().toISOString() };
    if (!record.learnerId) return json(response, 400, { error: "learnerId is required" });
    const lesson = record.conceptId ? await readLesson(record.conceptId) : null;
    if (!lesson) return json(response, 400, { error: "valid conceptId is required" });
    const mastery = scoreRubric(lesson, String(record.postResponse || ""));
    record.mastery = mastery;
    record.completed = Boolean(record.completed) && Boolean(mastery?.mastered);
    await saveProgress(record);
    return json(response, 201, record);
  }
  if (url.pathname === "/api/dashboard") {
    if (request.method !== "GET") return json(response, 405, { error: "method_not_allowed" });
    return json(response, 200, await readDashboardSnapshot(url.searchParams.get("learnerId")));
  }
  const file = resolve(root, `.${url.pathname === "/" ? "/index.html" : url.pathname}`);
  if (!file.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
  try {
    await readFile(file);
    response.writeHead(200, {
      "Content-Type": {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8"
      }[extname(file)] ?? "application/octet-stream"
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});

function listenWithFallback(startPort, attempt = 0) {
  const activePort = startPort + attempt;
  const onError = (error) => {
    app.off("listening", onListening);
    if (error.code === "EADDRINUSE" && attempt + 1 < maxPortAttempts) {
      listenWithFallback(startPort, attempt + 1);
      return;
    }
    throw error;
  };
  const onListening = () => {
    app.off("error", onError);
    if (activePort !== startPort) {
      console.log(`Port ${startPort} unavailable, using ${activePort}.`);
    }
    console.log(`Academy server ready: http://${host}:${activePort}`);
  };
  app.once("error", onError);
  app.once("listening", onListening);
  app.listen(activePort, host);
}

listenWithFallback(port);

function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  app.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
