import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const DEV_SERVER_HOST = '127.0.0.1';
const DEV_SERVER_PORT = 9245;
const DEV_SERVER_URL = `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`;
const reportDir = process.env.GRIDO_REPORT_DIR ?? 'playwright-report';
const strict = process.env.GRIDO_ACCEPTANCE_STRICT === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  failOnFlakyTests: true,
  retries: strict ? 0 : process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60000,
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? 'test-results',
  expect: { timeout: 15000 },
  // The central report-run wrapper can replace this with --reporter, including
  // its inventory/acceptance reporter. Direct runs keep the same report formats.
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(reportDir, 'results.json') }],
    ['junit', { outputFile: path.join(reportDir, 'junit.xml') }],
    ['blob', { outputDir: path.join(reportDir, 'blob') }],
    ['html', { outputFolder: path.join(reportDir, 'html'), open: 'never' }],
  ],
  use: {
    baseURL: DEV_SERVER_URL,
    serviceWorkers: 'block',
    trace: strict ? 'on' : 'retain-on-failure',
    screenshot: strict ? 'on' : 'only-on-failure',
    video: strict ? 'on' : 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Match shipped Linux WebKitGTK's Ctrl-based shortcuts, not macOS Cmd.
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15',
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --host ${DEV_SERVER_HOST} --port ${DEV_SERVER_PORT} --strictPort`,
    url: DEV_SERVER_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
