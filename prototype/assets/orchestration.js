const statusUrl = "./docs/control/live-status.json";
const fallbackStatus = {
  updatedAt: "2026-08-02T00:00:00+05:30",
  feature: "Numbers vertical slice",
  currentTask: { id: "IR-002", title: "Numbers assessment and beginner-safe UX", status: "approved — awaiting execution" },
  sequence: [
    { name: "Architecture baseline", status: "complete" },
    { name: "LOS and Numbers object", status: "complete" },
    { name: "Static renderer", status: "complete" },
    { name: "Assessment and beginner-safe UX", status: "active" },
    { name: "Demo validation", status: "pending" }
  ],
  automation: { status: "active", cadence: "every 15 minutes", lastAction: "IR-002 has been issued; no Copilot report is present yet." },
  gate: "Owner review only when the complete demoable Numbers feature is validated."
};
const elements = {
  feature: document.querySelector("#feature"),
  taskTitle: document.querySelector("#task-title"),
  taskStatus: document.querySelector("#task-status"),
  sequence: document.querySelector("#sequence"),
  updated: document.querySelector("#updated"),
  automationStatus: document.querySelector("#automation-status"),
  lastAction: document.querySelector("#last-action"),
  gate: document.querySelector("#gate")
};

function render(status) {
  elements.feature.textContent = status.feature;
  elements.taskTitle.textContent = status.currentTask.title;
  elements.taskStatus.textContent = `${status.currentTask.id} · ${status.currentTask.status}`;
  elements.sequence.replaceChildren(...status.sequence.map((item) => {
    const row = document.createElement("li");
    row.className = `status-${item.status}`;
    row.innerHTML = `<span>${item.name}</span><strong>${item.status}</strong>`;
    return row;
  }));
  elements.updated.textContent = `Updated ${new Date(status.updatedAt).toLocaleString()}`;
  elements.automationStatus.textContent = `${status.automation.status} · ${status.automation.cadence}`;
  elements.lastAction.textContent = status.automation.lastAction;
  elements.gate.textContent = status.gate;
}

async function refresh() {
  const response = await fetch(`${statusUrl}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Status is temporarily unavailable.");
  render(await response.json());
}

render(fallbackStatus);
refresh().catch(() => {});
setInterval(() => refresh().catch(() => {}), 15000);
