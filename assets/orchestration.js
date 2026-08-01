const statusUrl = "./docs/control/live-status.json";
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

refresh().catch((error) => { elements.feature.textContent = error.message; });
setInterval(() => refresh().catch(() => {}), 15000);
