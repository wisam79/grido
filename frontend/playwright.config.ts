import { defineConfig, devices } from '@playwright/test';

// 🔌 منفذ خادم التطوير موحّد مع Vite/Wails v3 (vite.config.ts: port 9245 + strictPort)
// كان 5173 هنا = تعارض مؤكد يجعل webServer لا يجهز أبداً ويفشل E2E بالمهلة.
const DEV_SERVER_HOST = '127.0.0.1';
const DEV_SERVER_PORT = 9245;
const DEV_SERVER_URL = `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'html',
  use: {
    baseURL: DEV_SERVER_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      // محرك الإصدار الحقيقي: WebKitGTK على لينكس وWebView2 على ويندوز.
      // يُشغّل منه في CI مواصفات @smoke فقط (engine-smoke.spec.ts) لأن
      // تشغيل الحزمة كاملة على WebKit مكلف ومُعرّض للتقلّب.
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --host ${DEV_SERVER_HOST} --port ${DEV_SERVER_PORT} --strictPort`,
    url: DEV_SERVER_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
