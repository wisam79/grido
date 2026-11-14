import process from "node:process";

import { defineConfig, devices } from "@playwright/test";

const HOST = "127.0.0.1";
const PORT = 9346;
const URL = `http://${HOST}:${PORT}`;

// CI-only browser execution. No .env file, account or live Supabase credentials.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "ux-smoke.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: URL,
    headless: true,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`,
    url: URL,
    // Never attach to a developer's server with unknown baked credentials.
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      VITE_SUPABASE_URL: "https://ux-mock.invalid",
      VITE_SUPABASE_ANON_KEY: "ux-public-placeholder-not-a-real-key",
    },
  },
});
