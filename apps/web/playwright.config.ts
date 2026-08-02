import { mkdirSync } from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end runs against the production build and a real API, PostgreSQL, and Redis.
 * A dev-server run would hide build-time failures, which is the class of bug this is
 * meant to catch.
 *
 * By default the caller starts the stack (see the repository README), because the
 * containers are not owned by this workspace. Set ACADEMY_E2E_MANAGE_SERVERS=1 — as CI
 * does, once its PostgreSQL service and migrations are up — to have Playwright start and
 * stop the API and the web server itself.
 */
const API_URL = process.env.NEXT_PUBLIC_ACADEMY_API_URL ?? "http://127.0.0.1:8000";
const WEB_URL = process.env.ACADEMY_WEB_URL ?? "http://127.0.0.1:3000";
const manageServers = process.env.ACADEMY_E2E_MANAGE_SERVERS === "1";

// Server output goes to files rather than the console so a CI failure can be uploaded
// alongside the traces. Kept out of test-results/, which Playwright wipes on each run.
const LOG_DIR = "e2e-logs";
if (manageServers) {
  mkdirSync(path.resolve(__dirname, LOG_DIR), { recursive: true });
}

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
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  ...(manageServers
    ? {
        webServer: [
          {
            command:
              "uv run --directory ../../services/api uvicorn academy_api.main:app" +
              ` --host 127.0.0.1 --port 8000 > ${LOG_DIR}/api.log 2>&1`,
            url: `${API_URL}/health/live`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            // `start` and not `dev`: the production build is the thing under test.
            command: `npm run start > ${LOG_DIR}/web.log 2>&1`,
            url: WEB_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ],
      }
    : {}),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
