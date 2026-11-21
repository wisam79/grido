import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const lane = process.env.GRIDO_ACCEPTANCE_LANE ?? 'server';
if (!['server', 'native'].includes(lane))
  throw new Error('GRIDO_ACCEPTANCE_LANE must be server or native');
const reportRoot = resolve(
  process.env.GRIDO_REPORT_DIR ?? process.env.GRIDO_ACCEPTANCE_RUN_DIR ?? '../artifacts/acceptance',
);

// CI owns building/provisioning. This config never starts Vite, a mock bridge, or
// a replacement runtime. Tests launch the real Go binary through RuntimeProcess.
export default defineConfig({
  testDir: './e2e-acceptance',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  outputDir: resolve(reportRoot, 'test-results'),
  reporter: [
    ['list'],
    ['json', { outputFile: resolve(reportRoot, 'playwright-results.json') }],
    ['junit', { outputFile: resolve(reportRoot, 'junit.xml') }],
    ['blob', { outputDir: resolve(reportRoot, 'blob-report') }],
    ['html', { outputFolder: resolve(reportRoot, 'html-report'), open: 'never' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1600, height: 1000 },
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    acceptDownloads: true,
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [{ name: lane === 'native' ? 'real-native-webview2' : 'real-server-chromium' }],
});
