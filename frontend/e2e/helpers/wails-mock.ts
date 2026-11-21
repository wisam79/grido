import { test as base, expect } from '@playwright/test';

import { getMockLedger, setupWailsV3Bridge, waitForAppReady } from './wails-v3-bridge';

import type { Page } from '@playwright/test';

export { setupWailsV3Bridge, waitForAppReady };

const memoryTrimCounts = new WeakMap<Page, number>();

/** Successful authorized mock cleanup calls; not native memory-release proof. */
export function getMockMemoryTrimCount(page: Page): number {
  return memoryTrimCounts.get(page) ?? 0;
}

/** Browser integration only: UI is real, native IPC/files/services are mocked. */
export async function setupWailsMock(page: Page) {
  return setupWailsV3Bridge(page);
}

const ISOLATED = new Set([
  'export-transform.spec.ts',
  'print-rgba-parity.spec.ts',
  'text-measure.spec.ts',
  'transformer-box-follows-geometry.spec.ts',
  'transformer-reselect.spec.ts',
  'warp-worker-probe.spec.ts',
  'panel-geometry.spec.ts',
  'ux-keyboard.spec.ts',
]);

/** All existing specs must import this test, including isolated engine probes.
 * externalMocks is an exact host/path allowlist for test-owned fulfillment only;
 * it never grants live network access (the context route still aborts external).
 */
export const test = base.extend<{ externalMocks: string[]; integrationGuard: void }>({
  externalMocks: [[], { option: true }],
  integrationGuard: [
    async ({ context, page, baseURL, externalMocks }, runFixture, testInfo) => {
      const origin = new URL(baseURL!).origin;
      const traffic: Array<{ method: string; url: string; policy: string }> = [];
      const errors: string[] = [];
      memoryTrimCounts.set(page, 0);
      const isolated = ISOLATED.has(testInfo.file.replace(/\\/g, '/').split('/').pop()!);
      testInfo.annotations.push({ type: 'fixture-kind', description: 'mocked-wails' });
      testInfo.annotations.push({
        type: 'coverage-kind',
        description: isolated
          ? 'isolated-engine-or-component-regression'
          : 'mocked-browser-gui-integration',
      });
      testInfo.annotations.push({
        type: 'backend-proof',
        description: 'none: no Go runtime, physical printer or persisted file proof',
      });

      context.on('request', (request) => {
        const url = new URL(request.url());
        if (url.protocol === 'data:' || url.protocol === 'blob:') return;
        const external = url.origin !== origin;
        const declared = externalMocks.includes(`${url.hostname}${url.pathname}`);
        traffic.push({
          method: request.method(),
          url: request.url(),
          policy: external
            ? declared
              ? 'declared-test-owned-mock'
              : 'denied-external'
            : 'local-asset-or-mocked-service',
        });
        if (external && !declared)
          errors.push(
            `Unexpected external request: ${request.method()} ${url.origin}${url.pathname}`,
          );
      });
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) {
          // Explicit font tests install a page route that fulfills locally. If that
          // route is missing/falls back, even declared hosts never go live.
          await route.abort('blockedbyclient');
          return;
        }
        if (url.pathname.startsWith('/models/scanic/')) {
          traffic.push({
            method: route.request().method(),
            url: url.href,
            policy: 'offline-fixture-model-warmup-disabled',
          });
          await route.abort('blockedbyclient');
          return;
        }
        if (url.pathname === '/api/trim-memory') {
          // Mirror AssetServer + LocalApiGuard, not an /api/* allowlist.
          const request = route.request();
          const headers = request.headers();
          const token = getMockLedger(page)
            ?.rpc.filter((call) => call.name === 'GetLocalApiToken')
            .at(-1)?.result;
          let sameHost = true;
          try {
            if (headers.origin) sameHost = new URL(headers.origin).host === url.host;
          } catch {
            sameHost = false;
          }
          if (
            !sameHost ||
            typeof token !== 'string' ||
            !token ||
            headers['x-grido-session'] !== token
          ) {
            errors.push('Mock trim-memory requires same-host origin and valid IPC session token');
            await route.fulfill({ status: 403, json: { status: 'error' } });
          } else if (request.method() !== 'POST') {
            errors.push(`Mock trim-memory requires POST, received ${request.method()}`);
            await route.fulfill({ status: 405, json: { status: 'error' } });
          } else {
            memoryTrimCounts.set(page, getMockMemoryTrimCount(page) + 1);
            traffic.push({
              method: 'POST',
              url: url.href,
              policy: 'mock-memory-trim:authorized',
            });
            await route.fulfill({ status: 200, json: { status: 'ok' } });
          }
          return;
        }
        if (url.pathname === '/api/upload-media' || url.pathname === '/api/upload-print-image') {
          await route.fulfill({
            json: {
              status: 'success',
              imageSrc: '/local-image/saved-b64.png',
              width: 800,
              height: 600,
              aspectRatio: 4 / 3,
            },
          });
          return;
        }
        if (url.pathname === '/api/scanner-detect') {
          await route.fulfill({
            json: {
              status: 'success',
              corners: [
                { x: 40, y: 40 },
                { x: 760, y: 40 },
                { x: 760, y: 560 },
                { x: 40, y: 560 },
              ],
              confidence: 0.99,
              width: 800,
              height: 600,
            },
          });
          return;
        }
        if (url.pathname === '/api/save-file') {
          // Fixed mock streaming-save service: records submitted bytes, not proof
          // of a real file on disk. Never route a missing service to Vite HTML.
          const bytes = route.request().postDataBuffer()?.length ?? 0;
          if (route.request().method() !== 'POST' || bytes === 0) {
            errors.push('Mock save-file requires a nonempty POST image payload');
            await route.fulfill({ status: 400, json: { status: 'error' } });
          } else {
            traffic.push({
              method: 'POST',
              url: url.href,
              policy: `mock-streaming-save:${bytes}-bytes`,
            });
            await route.fulfill({ json: { status: 'success' } });
          }
          return;
        }
        if (url.pathname.startsWith('/api/')) {
          errors.push(`Unmocked local API: ${route.request().method()} ${url.pathname}`);
          await route.fulfill({
            status: 501,
            json: { status: 'error', error: 'Unmocked local API in browser integration' },
          });
          return;
        }
        if (url.pathname === '/wails/runtime' || url.pathname.startsWith('/local-image/')) {
          errors.push(`Missing Wails fixture route: ${url.pathname}`);
          await route.abort('blockedbyclient');
          return;
        }
        await route.continue();
      });
      await context.routeWebSocket('**/*', (socket) => {
        const url = new URL(socket.url());
        const local = new URL(baseURL!);
        // Vite HMR only; a phone bridge websocket needs its own explicit mock.
        if (url.hostname === local.hostname && url.port === local.port && url.pathname === '/')
          socket.connectToServer();
        else {
          errors.push(`Unexpected websocket: ${socket.url()}`);
          socket.close({ code: 1008, reason: 'Offline integration fixture' });
        }
      });
      try {
        await runFixture();
      } finally {
        const rpc = getMockLedger(page);
        await testInfo.attach('mocked-integration-ledger', {
          body: Buffer.from(
            JSON.stringify(
              {
                fixtureKind: 'mocked-wails',
                coverageKind: isolated ? 'isolated-regression' : 'gui-integration',
                externalMocks,
                traffic,
                memoryTrimCount: getMockMemoryTrimCount(page),
                networkErrors: errors,
                runtime: rpc ?? null,
              },
              null,
              2,
            ),
          ),
          contentType: 'application/json',
        });
        expect(
          errors,
          'Network policy violations remain fatal even when the UI catches them',
        ).toEqual([]);
        expect(
          rpc?.errors ?? [],
          'Unknown/malformed/failed mock IPC remains fatal even when the UI catches it',
        ).toEqual([]);
      }
    },
    { auto: true },
  ],
});
