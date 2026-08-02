import { mountExperiment } from "./experiments.js";

const requestedLessonId = new URLSearchParams(location.search).get("lesson") || "numbers";
const lessonId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedLessonId) ? requestedLessonId : "numbers";
const contentUrl = `/api/lesson/${lessonId}`;
const graphUrl = "/api/graph";
const storageKey = `story-of-intelligence:${lessonId}:v2`;
const labels = { observe: "Observe", wonder: "Wonder", predict: "Predict", experiment: "Experiment", fail: "Break It", discover: "Discover", explain: "Explain", visualize: "Visualize", generalize: "Generalize", mathematics: "Mathematics", engineer: "Engineer", optimize: "Optimize", production: "Production", apply: "Apply", reflect: "Reflect", "whats-next": "What's Next" };
const headings = { observe: "What do you notice?", wonder: "What do you wonder?", predict: "Make a prediction", experiment: "Play with it", fail: "Push it until it breaks", discover: "Name what you found", explain: "Build the idea", visualize: "See the idea", generalize: "Find the general rule", mathematics: "Make it precise", engineer: "Build it for real", optimize: "Make it better", production: "Take it to production", apply: "Try it yourself", reflect: "Look back", "whats-next": "Where the story goes next" };
const elements = Object.fromEntries(["title", "scope", "duration", "entry", "progress-text", "progress-bar", "step-kind", "step-heading", "step-prompt", "experiment-region", "reflection", "previous", "next", "reset", "guidance", "hint-toggle", "success-criteria", "tutor", "tutor-response", "coach-summary", "coach-checks"].map((id) => [id, document.querySelector(`#${id}`)]));

let coachChecks = [];

function evaluateReflection(text) {
  return coachChecks.map((rule) => ({ ...rule, pass: rule.test.test(text) }));
}

function renderCoach(text, postStep) {
  const checks = evaluateReflection(text || "");
  const passed = checks.filter((item) => item.pass).length;
  const target = postStep ? checks.length : 3;
  const tone = passed >= target
    ? `Strong progress: ${passed}/${checks.length} coaching checks satisfied.`
    : `Keep going: ${passed}/${checks.length} checks satisfied. Add one more concrete detail.`;
  elements["coach-summary"].textContent = tone;
  elements["coach-checks"].replaceChildren(
    ...checks.map((item) => {
      const li = document.createElement("li");
      li.className = item.pass ? "pass" : "pending";
      li.textContent = item.label;
      return li;
    })
  );
}

function stateFromStorage() { try { return JSON.parse(localStorage.getItem(storageKey)) ?? { position: 0, reflections: {} }; } catch { return { position: 0, reflections: {} }; } }
function save(state) { localStorage.setItem(storageKey, JSON.stringify(state)); }
function learnerId() {
  const key = "story-of-intelligence:learner-id";
  let value = localStorage.getItem(key);
  if (!value) {
    value = localStorage.getItem(`${storageKey}:learner-id`) || `learner-${crypto.randomUUID()}`;
    localStorage.setItem(key, value);
  }
  return value;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${url} failed with status ${response.status}`);
  }
  return response.json();
}

async function saveCompletion(state, lesson, prePosition, postPosition) {
  return fetchJson("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      learnerId: learnerId(),
      conceptId: lesson.id,
      version: lesson.version,
      preResponse: (state.reflections[prePosition] ?? "").trim(),
      postResponse: (state.reflections[postPosition] ?? "").trim(),
      completed: true
    })
  });
}

async function start() {
  const [lesson, graph] = await Promise.all([fetchJson(contentUrl), fetchJson(graphUrl)]);
  if (!graph.nodes.some((node) => node.id === lesson.knowledge.conceptId)) throw new Error();
  coachChecks = (lesson.measurement.masteryRubric?.checks ?? []).map((check) => ({ key: check.id, label: check.label, test: new RegExp(check.pattern, "i") }));
  const lessonIndex = graph.nodes.findIndex((node) => node.id === lesson.id);
  const state = stateFromStorage();
  const last = lesson.learning.steps.length + 1;
  const prePosition = 0;
  const postPosition = last;
  if (state.position === undefined) state.position = (state.step ?? 0) + 1;
  state.position = Math.min(Math.max(state.position, 0), last);
  state.completed = Boolean(state.completed);
  elements.title.textContent = lesson.title;
  document.title = `Story of Intelligence Academy — ${lesson.title}`;
  const eyebrow = document.querySelector("#lesson-eyebrow");
  if (eyebrow) eyebrow.textContent = `Story of Intelligence Academy · Lesson ${lessonIndex + 1} of ${graph.nodes.length}`;
  elements.scope.textContent = lesson.scope;
  elements.duration.textContent = `${lesson.learning.estimatedMinutes} minutes`;
  elements.entry.textContent = lesson.beginnerEntry;
  elements.guidance.textContent = lesson.reasoning.tutorGuidance;

  function render() {
    const pre = state.position === 0, post = state.position === last;
    const step = pre || post ? null : lesson.learning.steps[state.position - 1];
    elements["step-kind"].textContent = pre ? "Before" : post ? "After" : labels[step.kind] ?? step.kind;
    elements["step-heading"].textContent = pre ? "Before we begin" : post ? "Show what you understand" : headings[step.kind] ?? step.kind;
    elements["step-prompt"].textContent = pre ? lesson.measurement.prePrompt : post ? lesson.measurement.postPrompt : step.prompt;
    const experimentSpec = step?.kind === "experiment" ? (lesson.learning.experiments ?? []).find((experiment) => experiment.id === step.experimentId) : null;
    if (experimentSpec) {
      mountExperiment(elements["experiment-region"], experimentSpec);
      elements["experiment-region"].hidden = false;
    } else {
      elements["experiment-region"].hidden = true;
      elements["experiment-region"].replaceChildren();
    }
    elements["success-criteria"].hidden = !post;
    elements["success-criteria"].replaceChildren(...(post ? lesson.measurement.successCriteria : []).map((text) => Object.assign(document.createElement("li"), { textContent: text })));
    elements.reflection.value = state.reflections[state.position] ?? "";
    elements["progress-text"].textContent = pre ? "Before the lesson" : post ? "After the lesson" : `Step ${state.position} of ${lesson.learning.steps.length}`;
    elements["progress-bar"].style.width = `${(state.position / last) * 100}%`;
    elements.previous.disabled = pre;
    elements.next.disabled = state.completed;
    elements.next.textContent = post ? (state.completed ? "Completed" : "Finish") : "Continue";
    renderCoach(elements.reflection.value, post);
    save(state);
  }
  elements.reflection.addEventListener("input", () => {
    state.reflections[state.position] = elements.reflection.value;
    renderCoach(elements.reflection.value, state.position === last);
    save(state);
  });
  elements.previous.addEventListener("click", () => { state.position--; render(); });
  elements.next.addEventListener("click", async () => {
    if (state.position < last) {
      state.position++;
      render();
      return;
    }
    if (state.completed) return;
    try {
      const record = await saveCompletion(state, lesson, prePosition, postPosition);
      if (record.completed) {
        state.completed = true;
        elements["tutor-response"].textContent = "Mastery evidenced and saved. Return to the dashboard to continue your learning path.";
        elements["tutor-response"].hidden = false;
        render();
        return;
      }
      const missing = (record.mastery?.checks ?? []).filter((check) => !check.pass).map((check) => check.label);
      elements["tutor-response"].textContent = `Not yet — your answer evidences ${record.mastery?.score ?? 0}/${record.mastery?.checks?.length ?? 5} mastery dimensions (need ${record.mastery?.threshold ?? 3}). Add: ${missing.join(" ")}`;
      elements["tutor-response"].hidden = false;
    } catch {
      elements["tutor-response"].textContent = "We could not save completion right now. Your answers are still safe in this browser. Please try Finish again.";
      elements["tutor-response"].hidden = false;
    }
  });
  elements.reset.addEventListener("click", () => {
    state.position = 0;
    state.completed = false;
    state.reflections = {};
    elements["tutor-response"].hidden = true;
    elements.guidance.hidden = true;
    elements["hint-toggle"].textContent = "Show a hint";
    render();
  });
  elements["hint-toggle"].addEventListener("click", () => { elements.guidance.hidden = !elements.guidance.hidden; elements["hint-toggle"].textContent = elements.guidance.hidden ? "Show a hint" : "Hide hint"; });
  elements.tutor.addEventListener("click", async () => {
    try {
      const coaching = await fetchJson("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId: lesson.id, reflection: elements.reflection.value })
      });
      elements["tutor-response"].textContent = coaching.response;
      elements["tutor-response"].hidden = false;
    } catch {
      elements["tutor-response"].textContent = "Coaching is temporarily unavailable. Keep going by naming quantity, unit, and decision.";
      elements["tutor-response"].hidden = false;
    }
  });
  render();
}
start().catch(() => { elements.scope.textContent = "We could not load this lesson just now. Please refresh the page and try again."; elements.next.disabled = true; });
