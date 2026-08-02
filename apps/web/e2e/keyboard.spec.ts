import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The whole Numbers lesson, and the help panel, driven without a mouse.
 *
 * Nothing here uses `click()`. Controls are reached by Tab from the top of the document,
 * which is the assertion that matters: a control that no amount of tabbing reaches is
 * unusable to a keyboard learner however correct its markup is.
 */

const GOOD_ANSWER =
  "The quantity is a count of records, the unit is millions against thousands, and a fair " +
  "comparison needs one unit. Ignoring that risks the wrong decision.";

/** Tabs forward until `target` holds focus, failing loudly if it is never reached. */
async function tabTo(page: Page, target: Locator, label: string, limit = 60) {
  for (let stop = 0; stop < limit; stop += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error(`"${label}" was not reachable by Tab within ${limit} stops`);
}

test("a learner can complete Numbers using only the keyboard", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  const firstAnswer = page.getByLabel(/first answer/i);
  await tabTo(page, firstAnswer, "first answer");
  await page.keyboard.type("Numbers are just digits.");

  const save = page.getByRole("button", { name: /save my first answer/i });
  await tabTo(page, save, "save my first answer");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("progress-panel").getByText("Saved").first()).toBeVisible();

  // Walk the whole lesson. Focus stays on Next between presses, so no re-tabbing.
  const next = page.getByRole("button", { name: "Next" });
  await tabTo(page, next, "next");
  while (await next.isEnabled()) {
    await page.keyboard.press("Enter");
  }
  await expect(page.getByText(/13 of 13 steps recorded/)).toBeVisible();

  const explanation = page.getByLabel(/your explanation/i);
  await tabTo(page, explanation, "your explanation");
  await page.keyboard.type(GOOD_ANSWER);

  const submit = page.getByRole("button", { name: /submit my explanation/i });
  await tabTo(page, submit, "submit my explanation");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/rubric points/)).toBeVisible();

  const finish = page.getByRole("button", { name: /mark this lesson finished/i });
  await tabTo(page, finish, "mark this lesson finished");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/you marked this lesson finished/i)).toBeVisible();
});

test("the experiment is operable from the keyboard", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  const next = page.getByRole("button", { name: "Next" });
  await tabTo(page, next, "next");
  for (let step = 0; step < 4; step += 1) {
    await page.keyboard.press("Enter");
  }

  const convert = page.getByRole("button", { name: /normalize the units/i });
  await tabTo(page, convert, "normalize the units");
  await page.keyboard.press("Enter");

  await expect(page.getByText(/now both bars are measured the same way/i)).toBeVisible();
  await expect(page.getByTestId("progress-panel").getByText("1 / 1")).toBeVisible();
});

test("help can be asked for and read without a mouse", async ({ page }) => {
  await page.goto("/concepts/numbers");
  const panel = page.getByTestId("tutor-panel");
  await expect(panel).toBeVisible();

  const question = panel.getByRole("textbox");
  await tabTo(page, question, "tutor question");
  await page.keyboard.type("What is a unit?");

  const hint = panel.getByTestId("tutor-hint");
  await tabTo(page, hint, "give me a nudge");
  await page.keyboard.press("Enter");

  await expect(panel.getByTestId("tutor-answer")).toHaveAttribute("data-supported", "true");
  await expect(panel.getByTestId("tutor-disclaimer")).toBeVisible();
});
