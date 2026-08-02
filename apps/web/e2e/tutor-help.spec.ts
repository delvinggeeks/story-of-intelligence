import { expect, test } from "@playwright/test";

/**
 * The "Ask for help" flow against the production stack.
 *
 * What matters here is not that help appears, but that it is honest about what it is,
 * refuses what the lesson does not cover, and records nothing.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("tutor-panel")).toBeVisible();
});

test("help starts empty and offers every task", async ({ page }) => {
  const panel = page.getByTestId("tutor-panel");

  await expect(panel.getByRole("heading", { name: "Ask for help" })).toBeVisible();
  await expect(panel.getByText(/nothing asked yet/i)).toBeVisible();
  await expect(panel.getByText(/not by an AI model/i)).toBeVisible();

  for (const task of ["hint", "explanation", "socratic-question", "misconception-check"]) {
    await expect(panel.getByTestId(`tutor-${task}`)).toBeEnabled();
  }
  // Checking a draft is impossible without a draft.
  await expect(panel.getByTestId("tutor-feedback")).toBeDisabled();
});

test("a hint is grounded in the lesson and labelled as not being a model", async ({ page }) => {
  const panel = page.getByTestId("tutor-panel");
  await panel.getByTestId("tutor-hint").click();

  const answer = panel.getByTestId("tutor-answer");
  await expect(answer).toBeVisible();
  await expect(answer).toHaveAttribute("data-supported", "true");
  await expect(answer.getByText(/a nudge, not the answer/i)).toBeVisible();
  await expect(answer.getByTestId("tutor-disclaimer")).toContainText("not from an AI model");
  await expect(answer.getByText(/runs locally, no external service/i)).toBeVisible();
  await expect(answer.getByText(/^Drawn from: /)).toBeVisible();
});

test("a question the lesson does not cover is refused, not guessed", async ({ page }) => {
  const panel = page.getByTestId("tutor-panel");

  await panel.getByRole("textbox").fill("Who won the 1998 football world cup final?");
  await panel.getByTestId("tutor-hint").click();

  const answer = panel.getByTestId("tutor-answer");
  await expect(answer).toHaveAttribute("data-supported", "false");
  await expect(panel.getByTestId("tutor-unsupported")).toBeVisible();
  await expect(answer).toContainText(/outside what this lesson covers/i);
  await expect(answer).not.toContainText(/football/i);
});

test("draft feedback reports the rubric without claiming understanding", async ({ page }) => {
  const panel = page.getByTestId("tutor-panel");

  await panel
    .getByRole("textbox")
    .fill(
      "The quantity is a count of records, the unit is millions against thousands, and a fair " +
        "comparison needs one unit. Ignoring that risks the wrong decision.",
    );
  await panel.getByTestId("tutor-feedback").click();

  const answer = panel.getByTestId("tutor-answer");
  await expect(answer).toContainText(/rubric points/);
  await expect(answer).toContainText(/not proof that you understand/);
  await expect(answer).toContainText(/not saved/);
});

test("asking for help records no evidence", async ({ page }) => {
  const panel = page.getByTestId("tutor-panel");
  const progress = page.getByTestId("progress-panel");
  await expect(progress).toBeVisible();

  const before = await progress.textContent();

  await panel.getByTestId("tutor-hint").click();
  await expect(panel.getByTestId("tutor-answer")).toBeVisible();
  await panel.getByTestId("tutor-misconception-check").click();
  await expect(panel.getByTestId("tutor-answer")).toContainText(/get(s)? misread/i);

  expect(await progress.textContent()).toBe(before);
});

test("the flow is reachable and operable by keyboard alone", async ({ page }) => {
  const panel = page.getByTestId("tutor-panel");
  const hint = panel.getByTestId("tutor-hint");

  await hint.focus();
  await expect(hint).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(panel.getByTestId("tutor-answer")).toBeVisible();
});

test("an unreachable API is reported, not swallowed", async ({ page }) => {
  await page.route("**/api/v1/tutor", (route) => route.abort());

  const panel = page.getByTestId("tutor-panel");
  await panel.getByTestId("tutor-hint").click();

  await expect(panel.getByTestId("tutor-failure")).toContainText(/cannot reach the Academy/i);
  await expect(panel.getByTestId("tutor-answer")).toHaveCount(0);
});
