import { test, expect } from "@playwright/test";

test.describe("Numbers vertical slice", () => {
  test("dashboard page renders live lesson summary and launch actions", async ({ page }) => {
    await page.goto("/dashboard.html");

    await expect(page.getByRole("heading", { level: 1, name: "Learner Dashboard" })).toBeVisible();
    await expect(page.locator("#continue-lesson")).toHaveAccessibleName("Start Numbers");
    await expect(page.getByRole("link", { name: "View Delivery Status" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Current Lesson", exact: true })).toBeVisible();
    await expect(page.locator("#lesson-title")).toHaveText("Numbers");
    await expect(page.locator("#curriculum .lesson-row")).toHaveCount(11);
    await expect(page.getByRole("heading", { level: 3, name: "Linear Regression From Scratch" })).toBeVisible();
  });

  test("renders full learner journey with pre/post assessment and completion", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Numbers" })).toBeVisible();
    await expect(page.getByText("Before the lesson", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Before we begin" })).toBeVisible();

    await page.getByLabel("Your thinking").fill("I compare only when metrics share the same unit and context.");

    const expectedKinds = ["observe", "wonder", "predict", "experiment", "break it", "discover", "explain", "apply"];
    const seenKinds = new Set();
    const stepCount = 13;
    for (let i = 1; i <= stepCount; i++) {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText(`Step ${i} of ${stepCount}`, { exact: true })).toBeVisible();
      const currentKind = (await page.locator("#step-kind").innerText()).trim().toLowerCase();
      if (expectedKinds.includes(currentKind)) seenKinds.add(currentKind);
      await page.getByLabel("Your thinking").fill(`Step ${i} reflection about quantity, unit, and decision.`);
    }
    await expect.poll(() => [...seenKinds].sort().join(",")).toBe([...expectedKinds].sort().join(","));

    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("After the lesson", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Show what you understand" })).toBeVisible();

    await page.getByLabel("Your thinking").fill("Table A has 1200 records and table B has 800 records in same schema; check units and metadata before decision.");
    await page.getByRole("button", { name: "Finish" }).click();

    await expect(page.getByRole("button", { name: "Completed" })).toBeDisabled();
    await expect(page.getByText("Mastery evidenced and saved. Return to the dashboard to continue your learning path.")).toBeVisible();

    await expect(page.locator("#success-criteria li")).toHaveCount(5);

    await page.getByRole("link", { name: "Back to Curriculum" }).click();
    await expect(page.locator("#curriculum .lesson-row").nth(0)).toHaveClass(/completed/);
    await expect(page.locator("#curriculum .lesson-row").nth(1)).toHaveClass(/available/);
    await expect(page.getByRole("link", { name: "Start Variables and Algebra" })).toBeVisible();
  });

  test("renders the final linear-regression lesson from the shared LOS renderer", async ({ page }) => {
    await page.goto("/index.html?lesson=linear-regression");

    await expect(page.getByRole("heading", { level: 1, name: "Linear Regression From Scratch" })).toBeVisible();
    await expect(page.getByText("Lesson 11 of 11", { exact: false })).toBeVisible();
    await expect(page.getByText("build, train, and evaluate", { exact: false })).toBeVisible();

    const seenKinds = new Set();
    for (let index = 1; index <= 13; index++) {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText(`Step ${index} of 13`, { exact: true })).toBeVisible();
      seenKinds.add((await page.locator("#step-kind").innerText()).trim().toLowerCase());
    }
    expect([...seenKinds].sort()).toEqual(["apply", "break it", "discover", "experiment", "explain", "observe", "predict", "wonder"]);
    await expect(page.getByText("from-scratch pseudocode", { exact: false })).toBeVisible();
  });

  test("experiment step mounts a playable interactive and reacts to input", async ({ page }) => {
    await page.goto("/");

    for (let i = 1; i <= 4; i++) {
      await page.getByRole("button", { name: "Continue" }).click();
    }
    await expect(page.getByText("Step 4 of 13", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Play with it" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "The bigger number that is actually smaller" })).toBeVisible();

    const readout = page.getByTestId("experiment-readout");
    await expect(readout).toContainText("not yet valid");

    await page.getByRole("button", { name: "Normalize the units" }).click();
    await expect(readout).toContainText("actually larger");

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Push it until it breaks" })).toBeVisible();
    await expect(page.getByTestId("experiment-readout")).toHaveCount(0);
  });

  test("withholds completion until the post-assessment evidences mastery", async ({ page }) => {
    await page.goto("/");

    for (let i = 0; i <= 13; i++) {
      await page.getByRole("button", { name: "Continue" }).click();
    }
    await expect(page.getByText("After the lesson", { exact: true })).toBeVisible();

    await page.getByLabel("Your thinking").fill("It was a nice lesson.");
    await page.getByRole("button", { name: "Finish" }).click();

    await expect(page.getByText("Not yet —", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Finish" })).toBeEnabled();
  });

  test("persists progress and reflection after refresh", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Your thinking").fill("Pre response persists");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Step 1 of 13", { exact: true })).toBeVisible();
    await page.getByLabel("Your thinking").fill("Step one reflection persists");

    await page.reload();

    await expect(page.getByText("Step 1 of 13", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Your thinking")).toHaveValue("Step one reflection persists");
  });

  test("shows instant learning coach rubric feedback while typing", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 3, name: "Learning Coach" })).toBeVisible();
    await expect(page.locator("#coach-checks li")).toHaveCount(5);

    await page.getByLabel("Your thinking").fill("The quantity is support tickets in the same unit and we compare values to decide what to prioritize.");

    const passCount = await page.locator("#coach-checks li.pass").count();
    await expect(passCount).toBeGreaterThanOrEqual(3);
  });

  test("keeps hint hidden until learner requests it", async ({ page }) => {
    await page.goto("/");

    const hintButton = page.getByRole("button", { name: "Show a hint" });
    await expect(hintButton).toBeVisible();

    const hintText = page.getByText("Coach with three prompts:");
    await expect(hintText).toBeHidden();

    await hintButton.click();
    await expect(page.getByRole("button", { name: "Hide hint" })).toBeVisible();
    await expect(hintText).toBeVisible();
  });

  test("provides reasoning-based coaching from the tutor endpoint", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Your thinking").fill("I think bigger numbers are always better.");
    await page.getByRole("button", { name: "Ask for coaching" }).click();

    await expect(page.getByText("mastery dimensions", { exact: false })).toBeVisible();
    await expect(page.getByText("Still missing:", { exact: false })).toBeVisible();
  });

  test("shows clear learner-facing failure state when lesson loading fails", async ({ page }) => {
    await page.route("**/api/lesson/numbers", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "simulated_failure" })
      });
    });

    await page.goto("/");

    await expect(page.getByText("We could not load this lesson just now. Please refresh the page and try again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
