const contentUrl = "./content/learning-objects/numbers.v1.json";
const graphUrl = "./content/knowledge-graph.v1.json";
const storageKey = "story-of-intelligence:numbers:v1";
const labels = { observe: "Observe", wonder: "Wonder", predict: "Predict", explain: "Explain", apply: "Apply" };
const headings = { observe: "What do you notice?", wonder: "What do you wonder?", predict: "Make a prediction", explain: "Build the idea", apply: "Try it yourself" };
const elements = Object.fromEntries(["title", "scope", "duration", "entry", "progress-text", "progress-bar", "step-kind", "step-heading", "step-prompt", "reflection", "previous", "next", "reset", "guidance", "hint-toggle", "success-criteria", "tutor", "tutor-response"].map((id) => [id, document.querySelector(`#${id}`)]));

function stateFromStorage() { try { return JSON.parse(localStorage.getItem(storageKey)) ?? { position: 0, reflections: {} }; } catch { return { position: 0, reflections: {} }; } }
function save(state) { localStorage.setItem(storageKey, JSON.stringify(state)); }

async function start() {
  const [response, graphResponse] = await Promise.all([fetch(contentUrl), fetch(graphUrl)]);
  if (!response.ok || !graphResponse.ok) throw new Error();
  const lesson = await response.json();
  const graph = await graphResponse.json();
  if (!graph.nodes.some((node) => node.id === lesson.knowledge.conceptId)) throw new Error();
  const state = stateFromStorage();
  const last = lesson.learning.steps.length + 1;
  if (state.position === undefined) state.position = (state.step ?? 0) + 1;
  state.position = Math.min(Math.max(state.position, 0), last);
  elements.title.textContent = lesson.title;
  elements.scope.textContent = lesson.scope;
  elements.duration.textContent = `${lesson.learning.estimatedMinutes} minutes`;
  elements.entry.textContent = lesson.beginnerEntry;
  elements.guidance.textContent = lesson.reasoning.tutorGuidance;

  function render() {
    const pre = state.position === 0, post = state.position === last;
    const step = pre || post ? null : lesson.learning.steps[state.position - 1];
    elements["step-kind"].textContent = pre ? "Before" : post ? "After" : labels[step.kind];
    elements["step-heading"].textContent = pre ? "Before we begin" : post ? "Show what you understand" : headings[step.kind];
    elements["step-prompt"].textContent = pre ? lesson.measurement.prePrompt : post ? lesson.measurement.postPrompt : step.prompt;
    elements["success-criteria"].hidden = !post;
    elements["success-criteria"].replaceChildren(...(post ? lesson.measurement.successCriteria : []).map((text) => Object.assign(document.createElement("li"), { textContent: text })));
    elements.reflection.value = state.reflections[state.position] ?? "";
    elements["progress-text"].textContent = pre ? "Before the lesson" : post ? "After the lesson" : `Step ${state.position} of ${lesson.learning.steps.length}`;
    elements["progress-bar"].style.width = `${(state.position / last) * 100}%`;
    elements.previous.disabled = pre;
    elements.next.disabled = false;
    elements.next.textContent = post ? "Finish" : "Continue";
    save(state);
  }
  elements.reflection.addEventListener("input", () => { state.reflections[state.position] = elements.reflection.value; save(state); });
  elements.previous.addEventListener("click", () => { state.position--; render(); });
  elements.next.addEventListener("click", () => { if (state.position < last) { state.position++; render(); } else { elements.next.textContent = "Completed"; elements.next.disabled = true; } });
  elements.reset.addEventListener("click", () => { state.position = 0; state.reflections = {}; elements.guidance.hidden = true; elements["hint-toggle"].textContent = "Show a hint"; render(); });
  elements["hint-toggle"].addEventListener("click", () => { elements.guidance.hidden = !elements.guidance.hidden; elements["hint-toggle"].textContent = elements.guidance.hidden ? "Show a hint" : "Hide hint"; });
  elements.tutor.addEventListener("click", () => { const answer = elements.reflection.value.trim(); elements["tutor-response"].textContent = answer ? "Good start. Now name the quantity, its unit, and the decision that the comparison supports." : "Start with your own observation. What quantity is represented, and what unit makes it comparable?"; elements["tutor-response"].hidden = false; });
  render();
}
start().catch(() => { elements.scope.textContent = "We could not load this lesson just now. Please refresh the page and try again."; elements.next.disabled = true; });
