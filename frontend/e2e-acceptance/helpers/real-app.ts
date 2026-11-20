import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { test as base, expect, chromium } from '@playwright/test';
import { generateJourneyFixtures } from '../../../../scripts/e2e/journey-fixtures.mjs';
import { startRuntimeAuthContract } from '../../../../scripts/e2e/runtime-auth-contract.mjs';
import { launchRuntime } from '../../../../scripts/e2e/runtime-process.mjs';
import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
// Import only test infrastructure; application service bindings are deliberately absent.
// @ts-expect-error Node-owned runtime helper has no declaration file.
// @ts-expect-error Backend-owned transparent native third-party auth contract fixture.
// @ts-expect-error Node-owned independent fixture generator.

export type RuntimeHandle = {
  baseURL?: string;
  cdpURL?: string;
  appDir: string;
  pid: number;
  paths: Record<string, string>;
  enqueueDialog(choice: {
    kind: 'open-file' | 'open-files' | 'open-directory' | 'save-file';
    path?: string;
    paths?: string[];
    cancel?: boolean;
    title?: string;
  }): Promise<string>;
  restart(options?: { graceful?: () => Promise<void> }): Promise<unknown>;
  stop(options?: { graceful?: () => Promise<void> }): Promise<unknown>;
};
export type JourneyInputs = {
  root: string;
  landscape: string;
  portrait: string;
  alpha: string;
  document: string;
  vdp: string;
};
export type Outcome = {
  capability: string;
  status: 'passed' | 'blocked' | 'not-covered';
  detail: unknown;
};
export type Journey = {
  page: Page;
  runtime: RuntimeHandle;
  inputs: JourneyInputs;
  lane: 'server' | 'native';
  name: string;
  outputPath(name: string): string;
  checkpoint(name: string): Promise<void>;
  record(capability: string, detail: unknown, status?: Outcome['status']): void;
  restart(): Promise<Page>;
};

function credential(primary: string, alias: string): string {
  const value = process.env[primary] ?? process.env[alias];
  if (!value) throw new Error(`Temporary sandbox GUI credential missing: ${primary}`);
  return value;
}

export async function loginThroughGui(
  page: Page,
  account?: { email: string; password: string },
): Promise<void> {
  // An isolated appDir starts without a session. Later restart may restore it.
  const authEmail = page.locator('#auth-email');
  await expect
    .poll(
      async () =>
        (await authEmail.isVisible()) || (await page.getByTestId('workspace-toolbar').isVisible()),
      { timeout: 60_000 },
    )
    .toBe(true);
  if (await authEmail.isVisible()) {
    await authEmail.fill(account?.email ?? credential('E2E_USER_EMAIL', 'GRIDO_ACCEPTANCE_EMAIL'));
    await page
      .locator('#auth-password')
      .fill(account?.password ?? credential('E2E_USER_PASSWORD', 'GRIDO_ACCEPTANCE_PASSWORD'));
    await page
      .getByRole('dialog')
      .filter({ has: authEmail })
      .getByRole('button', { name: 'تسجيل الدخول', exact: true })
      .click();
    await expect(authEmail).not.toBeVisible({ timeout: 60_000 });
  }
  await expect(page.getByTestId('workspace-toolbar')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#canvas-area canvas').first()).toBeVisible();
  // The acceptance lane rejects the DEV-only window.go mock rather than hiding it.
  const bridge = await page.evaluate(() => ({
    legacy: !!(window as unknown as { go?: unknown }).go,
    runtime: !!(window as unknown as { wails?: unknown }).wails,
  }));
  expect(bridge.legacy, 'Acceptance must not run DEV fallback window.go').toBe(false);
}

async function findNativePage(browser: Browser): Promise<Page> {
  let candidate: Page | undefined;
  await expect
    .poll(
      async () => {
        const pages = browser.contexts().flatMap((context) => context.pages());
        for (const page of pages) {
          if (page.url() !== 'about:blank' && (await page.locator('#root').count())) {
            candidate = page;
            break;
          }
        }
        return !!candidate;
      },
      { timeout: 60_000 },
    )
    .toBe(true);
  return candidate!;
}

export const test = base.extend<{ journey: Journey }>({
  journey: async ({ browser }, provideJourney, testInfo: TestInfo) => {
    const lane = (process.env.GRIDO_ACCEPTANCE_LANE ?? 'server') as Journey['lane'];
    const root = resolve(
      process.env.GRIDO_REPORT_DIR ?? process.env.GRIDO_ACCEPTANCE_RUN_DIR ?? testInfo.outputDir,
    );
    const id = createHash('sha256').update(testInfo.testId).digest('hex').slice(0, 12);
    const appDir = join(root, 'runtime', id);
    await mkdir(appDir, { recursive: true });
    // Inputs and selected outputs live inside the runner's isolated dialog root.
    const inputs = (await generateJourneyFixtures(join(appDir, 'journey-inputs'))) as JourneyInputs;
    await mkdir(join(appDir, 'journey-outputs'), { recursive: true });
    const authContract =
      lane === 'native' && !process.env.GRIDO_E2E_AUTH_CLASSIFICATION
        ? await startRuntimeAuthContract({
            password:
              process.env.GRIDO_E2E_PASSWORD ??
              credential('E2E_USER_PASSWORD', 'GRIDO_ACCEPTANCE_PASSWORD'),
            email: process.env.E2E_USER_EMAIL,
          })
        : undefined;
    const account = authContract
      ? { email: authContract.email as string, password: authContract.password as string }
      : undefined;
    const runtime = (await launchRuntime({
      binary: process.env.GRIDO_E2E_BINARY,
      mode: lane,
      appDir,
      env: { ...process.env, ...authContract?.env },
      startupTimeoutMs: 90_000,
    })) as RuntimeHandle;
    let attached: Browser | undefined;
    let context!: BrowserContext;
    let page!: Page;
    let connected = false;
    let generation = 0;
    let browserState: Awaited<ReturnType<BrowserContext['storageState']>> | undefined;
    const outcomes: Outcome[] = [];
    const screenshots: string[] = [];
    const connect = async () => {
      if (lane === 'native') {
        if (!runtime.cdpURL)
          throw new Error('Native runner did not expose a real WebView2 CDP URL');
        attached = await chromium.connectOverCDP(runtime.cdpURL);
        page = await findNativePage(attached);
        context = page.context();
      } else {
        context = await browser.newContext({
          viewport: { width: 1600, height: 1000 },
          acceptDownloads: true,
          storageState: browserState,
          recordVideo: {
            dir: testInfo.outputPath(`video-${generation}`),
            size: { width: 1600, height: 1000 },
          },
        });
        page = await context.newPage();
        const targetURL = process.env.GRIDO_ACCEPTANCE_URL ?? runtime.baseURL;
        if (!targetURL) throw new Error('Real server URL missing');
        await page.goto(targetURL);
      }
      connected = true;
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    };
    const checkpoint = async (name: string) => {
      const path = testInfo.outputPath(
        `screenshot-${generation}-${name.replace(/[^a-z0-9-]/gi, '-')}.png`,
      );
      await page.screenshot({ path, fullPage: false });
      screenshots.push(path);
      await testInfo.attach('screenshot', { path, contentType: 'image/png' });
    };
    const disconnect = async () => {
      const errors: unknown[] = [];
      if (connected && page && !page.isClosed()) {
        try {
          await checkpoint('final');
        } catch (error) {
          errors.push(error);
        }
      }
      if (context) {
        const trace = testInfo.outputPath(`trace-${generation}.zip`);
        try {
          await context.tracing.stop({ path: trace });
          await testInfo.attach('trace', { path: trace, contentType: 'application/zip' });
        } catch (error) {
          errors.push(error);
        }
        if (lane === 'server') {
          const video = page?.video();
          try {
            await context.close();
            if (video)
              await testInfo.attach('video', {
                path: await video.path(),
                contentType: 'video/webm',
              });
          } catch (error) {
            errors.push(error);
          }
        }
      }
      if (attached) {
        // Playwright disconnects an attached browser; it does not terminate the owner process.
        try {
          await attached.close();
        } catch (error) {
          errors.push(error);
        }
        attached = undefined;
      }
      connected = false;
      if (errors.length)
        outcomes.push({
          capability: 'evidence-capture',
          status: 'blocked',
          detail: errors.map((e) => (e instanceof Error ? e.message : String(e))),
        });
    };
    const journey: Journey = {
      get page() {
        return page;
      },
      runtime,
      inputs,
      lane,
      name: `Journey-${process.env.E2E_RUN_ID ?? id}-${id}`,
      outputPath: (name) => {
        if (!/^[a-z0-9-]+\.(png|jpg|jpeg|tif|tiff|pdf|json|svg)$/i.test(name))
          throw new Error('Invalid journey output filename');
        return join(appDir, 'journey-outputs', name);
      },
      checkpoint,
      record: (capability, detail, status = 'passed') =>
        outcomes.push({ capability, status, detail }),
      restart: async () => {
        await checkpoint('before-restart');
        // Read the real browser's storage before shutting it down, preserving the
        // user's own GUI-created settings across process/context recreation.
        if (lane === 'server') browserState = await context.storageState();
        await disconnect();
        const previousPid = runtime.pid;
        const result = await runtime.restart();
        expect(runtime.pid, 'Persistence requires a new real backend process').not.toBe(
          previousPid,
        );
        generation++;
        await connect();
        await loginThroughGui(page, account);
        outcomes.push({
          capability: 'backend-process-restart',
          status: 'passed',
          detail: { previousPid, newPid: runtime.pid, result, generation },
        });
        return page;
      },
    };
    try {
      await connect();
      await loginThroughGui(page, account);
      outcomes.push({
        capability: 'sandbox-gui-login',
        status: 'passed',
        detail: {
          account: 'disposable sandbox user',
          provider:
            lane === 'server'
              ? 'real local Supabase'
              : 'loopback third-party auth contract fixture; not Supabase live',
          legacyMock: false,
        },
      });
      await checkpoint('authenticated');
      await provideJourney(journey);
    } finally {
      await disconnect();
      const shutdown = await runtime.stop();
      if (authContract) {
        const metadata = authContract.metadata();
        const authPath = testInfo.outputPath('auth-contract-metadata.json');
        await writeFile(authPath, `${JSON.stringify(metadata, null, 2)}\n`);
        await testInfo.attach('auth-contract-metadata', {
          path: authPath,
          contentType: 'application/json',
        });
        await authContract.stop();
      }
      const manifest = {
        schemaVersion: 1,
        testId: testInfo.testId,
        title: testInfo.title,
        lane,
        project: testInfo.project.name,
        status: testInfo.status,
        expectedStatus: testInfo.expectedStatus,
        wholeApplicationAcceptance: false,
        appDir,
        runtime: { baseURL: runtime.baseURL, paths: runtime.paths, shutdown },
        evidence: {
          screenshots,
          trace: 'attached',
          video: lane === 'native' ? 'blocked-cdp-production-context' : 'attached',
        },
        outcomes,
      };
      const path = testInfo.outputPath('outcome-manifest.json');
      await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
      await testInfo.attach('outcome-manifest', { path, contentType: 'application/json' });
      // Preserve a copy outside Playwright's retry/cleanup lifecycle for the CI ledger.
      await mkdir(join(root, 'outcomes'), { recursive: true });
      await copyFile(path, join(root, 'outcomes', `${id}.json`));
    }
  },
});

export { expect };
export async function readPersistedAutosave(
  runtime: RuntimeHandle,
): Promise<Record<string, unknown>> {
  const location = runtime.paths.autosave;
  if (!location) throw new Error('RuntimeProcess must expose canonical paths.autosave');
  return JSON.parse(await readFile(location, 'utf8')) as Record<string, unknown>;
}
