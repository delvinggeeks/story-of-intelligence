import { expect, test } from "@playwright/test";

/**
 * Degradation. The lesson text is served by the API, but the learner loop needs the
 * database; when writes cannot land the page must say so rather than silently dropping
 * what the learner did.
 *
 * The outage is simulated by intercepting the learner routes, which exercises exactly the
 * paths a real PostgreSQL or Redis outage would break without requiring the test to stop
 * anyone's containers.
 *
 * Alerts are looked up inside `main` because Next.js renders its own empty
 * `role="alert"` route announcer in the document, which an unscoped lookup would match.
 */

test("an unreachable learner API still renders the lesson and says progress is not saving", async ({
  page,
}) => {
  await page.route("**/api/v1/learners**", (route) => route.abort("connectionrefused"));

  await page.goto("/concepts/numbers");

  // The lesson itself is server-rendered, so the content survives the outage.
  await expect(page.getByRole("heading", { name: "Numbers", exact: true })).toBeVisible();
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toContainText(/cannot reach the Academy/i);
  await expect(alert).toContainText(/lesson text below still works/i);
});

test("a failing evidence write is reported rather than silently dropped", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  // Only writes fail, which is what a database outage behind a healthy API looks like.
  await page.route("**/sessions/**/events", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "The database is unavailable." }),
    }),
  );

  await page.getByLabel(/first answer/i).fill("Numbers are just digits.");
  await page.getByRole("button", { name: /save my first answer/i }).click();

  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    /database is unavailable/i,
  );
});

test("an unknown concept renders the not-found page", async ({ page }) => {
  await page.goto("/concepts/quantum-alchemy");

  // Asserted on what the learner sees, not on the status line: Next.js serves this
  // streamed not-found body with a 200, and the status is the framework's to decide.
  await expect(page.getByRole("heading", { name: "Concept not in the graph" })).toBeVisible();
  await expect(page.getByRole("link", { name: /back to the learning path/i })).toBeVisible();
});

test("the learner is told the lesson is preparing before progress arrives", async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  // Only the bootstrap call is held, so the wait is real rather than a fixed sleep.
  await page.route("**/api/v1/learners", async (route) => {
    await held;
    await route.continue();
  });

  await page.goto("/concepts/numbers");
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    /preparing your lesson/i,
  );

  release();
  await expect(page.getByTestId("progress-panel")).toBeVisible();
});

test("a write that fails and then succeeds clears the warning and saves", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  // A transient outage: the first write fails, every later one is let through.
  let firstWrite = true;
  await page.route("**/sessions/**/events", async (route) => {
    if (firstWrite) {
      firstWrite = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "The database is unavailable." }),
      });
      return;
    }
    await route.continue();
  });

  const alert = page.getByRole("main").getByRole("alert");
  await page.getByLabel(/first answer/i).fill("Numbers are just digits.");
  await page.getByRole("button", { name: /save my first answer/i }).click();
  await expect(alert).toContainText(/database is unavailable/i);

  await page.getByRole("button", { name: /save my first answer/i }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByTestId("progress-panel").getByText("Saved").first()).toBeVisible();

  // The recovery is server-side, not just a cleared banner.
  await page.reload();
  await expect(page.getByTestId("progress-panel").getByText("Saved").first()).toBeVisible();
});

test("a tutor outage does not take the lesson down with it", async ({ page }) => {
  await page.route("**/api/v1/tutor", (route) => route.abort("connectionrefused"));

  await page.goto("/concepts/numbers");
  const panel = page.getByTestId("tutor-panel");
  await panel.getByTestId("tutor-hint").click();

  await expect(panel.getByTestId("tutor-failure")).toContainText(/cannot reach the Academy/i);
  // The learner loop is a different route and must be unaffected.
  await page.getByLabel(/first answer/i).fill("Numbers are just digits.");
  await page.getByRole("button", { name: /save my first answer/i }).click();
  await expect(page.getByTestId("progress-panel").getByText("Saved").first()).toBeVisible();
});
