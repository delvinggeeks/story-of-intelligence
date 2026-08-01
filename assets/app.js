const contentUrl = "./content/learning-objects/numbers.v1.json";
const storageKey = "story-of-intelligence:numbers:v1";
const labels = {
  observe: "Observe",
  wonder: "Wonder",
  predict: "Predict",
  explain: "Explain",
  apply: "Apply"
};

const elements = {
  title: document.querySelector("#title"),
  scope: document.querySelector("#scope"),
  duration: document.querySelector("#duration"),
  entry: document.querySelector("#entry"),
  progressText: document.querySelector("#progress-text"),
  progressBar: document.querySelector("#progress-bar"),
  kind: document.querySelector("#step-kind"),
  heading: document.querySelector("#step-heading"),
  prompt: document.querySelector("#step-prompt"),
  reflection: document.querySelector("#reflection"),
  previous: document.querySelector("#previous"),
  next: document.querySelector("#next"),
  reset: document.querySelector("#reset"),
  guidance: document.querySelector("#guidance")
};

function readState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? { step: 0, reflections: {} };
  } catch {
    return { step: 0, reflections: {} };
  }
}

function saveState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function headingFor(kind) {
  return { observe: "What do you notice?", wonder: "What do you wonder?", predict: "Make a prediction", explain: "Build the idea", apply: "Try it yourself" }[kind];
}

async function start() {
  const response = await fetch(contentUrl);
  if (!response.ok) throw new Error("The Numbers learning object could not be loaded.");
  const lesson = await response.json();
  const state = readState();
  state.step = Math.min(Math.max(state.step, 0), lesson.learning.steps.length - 1);

  elements.title.textContent = lesson.title;
  elements.scope.textContent = lesson.scope;
  elements.duration.textContent = `${lesson.learning.estimatedMinutes} minutes`;
  elements.entry.textContent = lesson.beginnerEntry;
  elements.guidance.textContent = lesson.reasoning.tutorGuidance;

  function render() {
    const step = lesson.learning.steps[state.step];
    elements.kind.textContent = labels[step.kind];
    elements.heading.textContent = headingFor(step.kind);
    elements.prompt.textContent = step.prompt;
    elements.reflection.value = state.reflections[state.step] ?? "";
    elements.progressText.textContent = `Step ${state.step + 1} of ${lesson.learning.steps.length}`;
    elements.progressBar.style.width = `${((state.step + 1) / lesson.learning.steps.length) * 100}%`;
    elements.previous.disabled = state.step === 0;
    elements.next.textContent = state.step === lesson.learning.steps.length - 1 ? "Finish" : "Continue";
    saveState(state);
  }

  elements.reflection.addEventListener("input", () => {
    state.reflections[state.step] = elements.reflection.value;
    saveState(state);
  });
  elements.previous.addEventListener("click", () => { state.step -= 1; render(); });
  elements.next.addEventListener("click", () => {
    if (state.step < lesson.learning.steps.length - 1) { state.step += 1; render(); }
    else { elements.next.textContent = "Completed"; elements.next.disabled = true; }
  });
  elements.reset.addEventListener("click", () => {
    state.step = 0;
    state.reflections = {};
    elements.next.disabled = false;
    render();
  });
  render();
}

start().catch((error) => {
  elements.scope.textContent = error.message;
  elements.next.disabled = true;
});
