import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated accessibility checks.
 *
 * axe-core catches the machine-checkable failures — missing accessible names, invalid
 * ARIA, contrast, landmark and heading structure — which is the part a human review is
 * worst at and a hand-written assertion can only restate. It cannot judge whether the
 * page is usable, so the keyboard journey in `keyboard.spec.ts` covers what it misses.
 */

const scan = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  // A scan that silently matched nothing would report zero violations and look green.
  expect(results.passes.length).toBeGreaterThan(0);
  return results;
};

test("the landing page has no automatically detectable violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test("the lesson has no automatically detectable violations once loaded", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test("a rendered tutor answer has no automatically detectable violations", async ({ page }) => {
  await page.goto("/concepts/numbers");
  const panel = page.getByTestId("tutor-panel");
  await panel.getByTestId("tutor-hint").click();
  await expect(panel.getByTestId("tutor-answer")).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test("the rubric verdict has no automatically detectable violations", async ({ page }) => {
  await page.goto("/concepts/numbers");
  await expect(page.getByTestId("progress-panel")).toBeVisible();

  const next = page.getByRole("button", { name: "Next" });
  while (await next.isEnabled()) {
    await next.click();
  }
  await page
    .getByLabel(/your explanation/i)
    .fill(
      "The quantity is a count of records, the unit is millions against thousands, and a fair " +
        "comparison needs one unit. Ignoring that risks the wrong decision.",
    );
  await page.getByRole("button", { name: /submit my explanation/i }).click();
  await expect(page.getByText(/rubric points/)).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});
