import { expect, test } from "@playwright/test";

/**
 * Privacy boundaries, asserted in the browser rather than only in the API tests.
 *
 * The claims being defended are the ones the learner is given in the interface: that only
 * an opaque identifier is kept, that what they type at the tutor is not retained, and that
 * using the Academy contacts nobody else.
 */

const SECRET = "my landlord Ferdinand bills me in dollars per unit";

test("a full sitting leaves only an opaque learner id in the browser", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  await page.getByLabel(/first answer/i).fill("Numbers are just digits.");
  await page.getByRole("button", { name: /save my first answer/i }).click();

  const panel = page.getByTestId("tutor-panel");
  await panel.getByRole("textbox").fill(SECRET);
  await panel.getByTestId("tutor-feedback").click();
  await expect(panel.getByTestId("tutor-answer")).toBeVisible();

  const stored = await page.evaluate(() => ({
    local: Object.fromEntries(
      Object.keys(window.localStorage).map((key) => [key, window.localStorage.getItem(key)]),
    ),
    session: Object.keys(window.sessionStorage),
    cookie: document.cookie,
  }));

  expect(Object.keys(stored.local)).toEqual(["academy.learnerId"]);
  expect(stored.local["academy.learnerId"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(stored.session).toEqual([]);
  expect(stored.cookie).toBe("");
  expect(JSON.stringify(stored)).not.toContain("Ferdinand");
});

test("the tutor draft is not restored on reload", async ({ page }) => {
  await page.goto("/concepts/numbers");
  const panel = page.getByTestId("tutor-panel");
  await expect(panel).toBeVisible();

  await panel.getByRole("textbox").fill(SECRET);
  await panel.getByTestId("tutor-feedback").click();
  await expect(panel.getByTestId("tutor-answer")).toBeVisible();

  await page.reload();

  await expect(page.getByTestId("tutor-panel").getByRole("textbox")).toHaveValue("");
  await expect(page.getByTestId("tutor-panel").getByText(/nothing asked yet/i)).toBeVisible();
  await expect(page.getByTestId("tutor-answer")).toHaveCount(0);
});

test("nothing outside the local stack is contacted", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
      external.push(request.url());
    }
  });

  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();
  const panel = page.getByTestId("tutor-panel");
  await panel.getByTestId("tutor-hint").click();
  await expect(panel.getByTestId("tutor-answer")).toBeVisible();

  expect(external).toEqual([]);
});

test("the privileged erasure route is not exposed to the browser", async ({ request }) => {
  const apiUrl = process.env.NEXT_PUBLIC_ACADEMY_API_URL ?? "http://127.0.0.1:8000";
  const spec = await (await request.get(`${apiUrl}/openapi.json`)).json();

  // Registered only when ACADEMY_ERASURE_TOKEN is set, which no test environment does.
  expect(Object.keys(spec.paths).filter((path: string) => path.startsWith("/internal"))).toEqual(
    [],
  );
  const response = await request.delete(`${apiUrl}/internal/learners/${crypto.randomUUID()}`);
  expect(response.status()).toBe(404);
});
