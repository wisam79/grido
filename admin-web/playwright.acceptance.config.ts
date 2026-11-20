import path from 'node:path';
import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (process.env.CI !== 'true' || process.env.E2E_FIXTURE_KIND !== 'actual-local-supabase' || !url || !key) {
  throw new Error('Acceptance requires the CI disposable local Supabase fixture');
}
const api = new URL(url);
if (api.protocol !== 'http:' || api.hostname !== '127.0.0.1' || !api.port) {
  throw new Error('Acceptance refuses non-loopback Supabase endpoints');
}
let role: string | undefined;
try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { /* invalid key */ }
if (role !== 'anon') throw new Error('Only the disposable anon key may reach Vite/browser');
const baseURL = 'http://127.0.0.1:9347';
const reportDir = process.env.GRIDO_REPORT_DIR || path.resolve('acceptance-report');

export default defineConfig({
  testDir: './e2e-acceptance',
  outputDir: path.join(reportDir, 'artifacts'),
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(reportDir, 'results.json') }],
    ['html', { outputFolder: path.join(reportDir, 'html'), open: 'never' }],
  ],
  use: {
    baseURL,
    headless: true,
    serviceWorkers: 'block',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    { name: 'admin-chromium', testMatch: 'admin-real.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone-chromium', testMatch: 'phone-real.spec.ts', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [{
    // CI builds admin-web with the public disposable fixture env before this.
    // Real /admin and /cam journeys exercise the production bundle.
    command: 'npm run preview -- --host 127.0.0.1 --port 9347 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_ANON_KEY: key,
      // These are never fixture inputs; prevent accidentally inherited secrets.
      SUPABASE_SERVICE_ROLE_KEY: '',
      SUPABASE_SECRET_KEY: '',
      VITE_SUPABASE_SERVICE_ROLE_KEY: '',
    },
  }, {
    // The second page is an explicitly labeled test receiver, never the product
    // UI. Only /admin and /cam on the production preview count as GUI journeys.
    command: 'npm run dev -- --host 127.0.0.1 --port 9348 --strictPort',
    url: 'http://127.0.0.1:9348/e2e-acceptance/phone-receiver.html',
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_ANON_KEY: key,
      SUPABASE_SERVICE_ROLE_KEY: '',
      SUPABASE_SECRET_KEY: '',
      VITE_SUPABASE_SERVICE_ROLE_KEY: '',
    },
  }],
});
