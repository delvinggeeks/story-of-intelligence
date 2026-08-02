const elements = {
  state: document.querySelector("#state"),
  lessonTitle: document.querySelector("#lesson-title"),
  lessonMeta: document.querySelector("#lesson-meta"),
  graphCount: document.querySelector("#graph-count"),
  completion: document.querySelector("#completion"),
  learnerCount: document.querySelector("#learner-count"),
  objectives: document.querySelector("#objectives"),
  latest: document.querySelector("#latest"),
  continueLesson: document.querySelector("#continue-lesson"),
  curriculum: document.querySelector("#curriculum"),
  pathSummary: document.querySelector("#path-summary")
};

function learnerId() {
  const key = "story-of-intelligence:learner-id";
  let value = localStorage.getItem(key);
  if (!value) {
    value = `learner-${crypto.randomUUID()}`;
    localStorage.setItem(key, value);
  }
  return value;
}

function render(snapshot) {
  elements.state.textContent = `${snapshot.feature} · ${snapshot.state}`;
  elements.lessonTitle.textContent = snapshot.lesson.title;
  elements.lessonMeta.textContent = `${snapshot.lesson.estimatedMinutes} minutes · ${snapshot.lesson.id}`;
  elements.graphCount.textContent = `${snapshot.graph.conceptCount}`;

  const rate = Math.round((snapshot.progress.completionRate || 0) * 100);
  elements.completion.textContent = `${rate}% completion`;
  elements.learnerCount.textContent = `${snapshot.progress.completionCount} of ${snapshot.graph.conceptCount} lessons complete`;
  elements.continueLesson.href = `index.html?lesson=${snapshot.lesson.id}`;
  elements.continueLesson.textContent = snapshot.progress.completionCount ? `Continue ${snapshot.lesson.title}` : `Start ${snapshot.lesson.title}`;
  elements.pathSummary.textContent = `${snapshot.progress.completionCount}/${snapshot.graph.conceptCount} complete`;

  elements.curriculum.replaceChildren(
    ...snapshot.curriculum.map((lesson, index) => {
      const item = document.createElement("li");
      item.className = `lesson-row ${lesson.status}`;

      const number = document.createElement("span");
      number.className = "lesson-number";
      number.textContent = String(index + 1).padStart(2, "0");

      const body = document.createElement("div");
      body.className = "lesson-body";
      const heading = document.createElement("h3");
      heading.textContent = lesson.title;
      const scope = document.createElement("p");
      scope.textContent = lesson.scope;
      const meta = document.createElement("p");
      meta.className = "lesson-meta";
      meta.textContent = `${lesson.estimatedMinutes} min · ${lesson.status}`;
      body.append(heading, scope, meta);

      const action = lesson.status === "locked" ? document.createElement("span") : document.createElement("a");
      action.className = "lesson-action";
      action.textContent = lesson.status === "completed" ? "Review" : lesson.status === "available" ? "Start" : "Locked";
      if (action instanceof HTMLAnchorElement) {
        action.href = `index.html?lesson=${lesson.id}`;
        action.setAttribute("aria-label", `${action.textContent} ${lesson.title}`);
      }

      item.append(number, body, action);
      return item;
    })
  );

  elements.objectives.replaceChildren(
    ...snapshot.lesson.objectives.map((objective) => {
      const item = document.createElement("li");
      item.textContent = objective;
      return item;
    })
  );

  if (snapshot.progress.latestRecord) {
    const record = snapshot.progress.latestRecord;
    const date = new Date(record.updatedAt).toLocaleString();
    elements.latest.textContent = `Latest learner: ${record.learnerId}. Updated ${date}. Completed: ${record.completed ? "yes" : "no"}.`;
  } else {
    elements.latest.textContent = "No completion records yet. Finish Numbers to unlock the next lesson.";
  }
}

async function refresh() {
  const response = await fetch(`/api/dashboard?learnerId=${encodeURIComponent(learnerId())}&t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Dashboard data unavailable");
  }
  const snapshot = await response.json();
  render(snapshot);
}

refresh().catch(() => {
  elements.state.textContent = "We could not load dashboard data. Start Numbers directly while we retry.";
});
setInterval(() => refresh().catch(() => {}), 15000);
