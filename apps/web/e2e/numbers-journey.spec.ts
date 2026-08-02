import { expect, test } from "@playwright/test";

/**
 * The core learner journey against the production stack: open the lesson, interact,
 * submit, see saved progress, reload, and confirm the progress survived.
 */

const GOOD_ANSWER =
  "The quantity is a count of records, the unit is millions against thousands, and a fair " +
  "comparison needs one unit. Ignoring that risks the wrong decision.";

test("a learner works through Numbers and their progress survives a reload", async ({ page }) => {
  await page.goto("/concepts/numbers");

  const progress = page.getByTestId("progress-panel");
  await expect(progress).toBeVisible();

  // The opening prompt is recorded before any step is seen.
  await page.getByLabel(/first answer/i).fill("Numbers are just digits.");
  await page.getByRole("button", { name: /save my first answer/i }).click();
  await expect(progress.getByText("Saved").first()).toBeVisible();

  // Walk to the experiment and run it.
  const next = page.getByRole("button", { name: "Next" });
  for (let step = 0; step < 4; step += 1) {
    await next.click();
  }
  await expect(page.getByText(/of 13 steps recorded/)).toBeVisible();

  const learnerId = await page.evaluate(() => window.localStorage.getItem("academy.learnerId"));
  expect(learnerId).toMatch(/^[0-9a-f-]{36}$/);

  await page.reload();

  // Progress is server-side, so it comes back without replaying any of the interaction.
  const reloaded = page.getByTestId("progress-panel");
  await expect(reloaded).toBeVisible();
  await expect(reloaded.getByText("4 / 13")).toBeVisible();
  await expect(reloaded.getByText("Saved").first()).toBeVisible();
  const sameLearner = await page.evaluate(() => window.localStorage.getItem("academy.learnerId"));
  expect(sameLearner).toBe(learnerId);
});

test("submitting an explanation returns the lesson's own rubric verdict", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  // Jump to the closing prompt.
  const next = page.getByRole("button", { name: "Next" });
  await expect(next).toBeEnabled();
  while (await next.isEnabled()) {
    await next.click();
  }

  await page.getByLabel(/your explanation/i).fill(GOOD_ANSWER);
  await page.getByRole("button", { name: /submit my explanation/i }).click();

  await expect(page.getByText(/rubric points/)).toBeVisible();
  // The wording must not overclaim: this is a keyword check, not understanding.
  await expect(page.getByText(/not a judgement of whether you understand/i)).toBeVisible();

  await page.getByRole("button", { name: /mark this lesson finished/i }).click();
  await expect(page.getByText(/you marked this lesson finished/i)).toBeVisible();
});

test("the experiment is operable and explained by keyboard alone", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  const next = page.getByRole("button", { name: "Next" });
  for (let step = 0; step < 4; step += 1) {
    await next.click();
  }

  const normalize = page.getByRole("button", { name: /normalize the units/i });
  await expect(normalize).toBeVisible();
  await expect(normalize).toHaveAttribute("aria-pressed", "false");

  await normalize.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("button", { name: /show the raw numbers again/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText(/both bars are measured the same way/i)).toBeVisible();
});

test("the learner is anonymous and nothing personal is stored", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  const stored = await page.evaluate(() => ({ ...window.localStorage }));

  expect(Object.keys(stored)).toEqual(["academy.learnerId"]);
  expect(page.url()).not.toContain(stored["academy.learnerId"]);
});
