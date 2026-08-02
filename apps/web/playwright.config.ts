import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end runs against the production build and a real API, PostgreSQL, and Redis.
 * A dev-server run would hide build-time failures, which is the class of bug this is
 * meant to catch.
 *
 * The stack is started by the caller (see the repository README) rather than by a
 * webServer block, because the API and its containers are not owned by this workspace.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.ACADEMY_WEB_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
