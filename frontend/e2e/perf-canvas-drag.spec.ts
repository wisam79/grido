import { expect } from '@playwright/test';

import { openStudioElementsCategory } from './helpers/studio-elements';
import { test, setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/** Report-only pending an approved cloud baseline. A working actual drag and
 * populated frame measurements are still mandatory, never silently skipped. */
test.describe('Canvas actual pointer drag — report-only performance', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });
  test('Report pointer drag frame timing and assert movement, without an invented FPS floor', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('mode-tab-single').click();
    await page.getByTestId('canvas-fit-all').click();
    await openStudioElementsCategory(page, 'shapes');
    await page.getByTestId('element-add-shape-rect').click();
    const read = () =>
      page.evaluate(() => {
        const stage = (window as any).__gridoStage;
        const node = stage?.find('Transformer')[0]?.nodes()[0];
        if (!node) return null;
        const rect = node.getClientRect();
        const canvas = stage.container().getBoundingClientRect();
        return {
          x: node.x() as number,
          y: node.y() as number,
          pointerX: canvas.left + rect.x + rect.width / 2,
          pointerY: canvas.top + rect.y + rect.height / 2,
        };
      });
    await expect.poll(read).not.toBeNull();
    const before = (await read())!;
    testInfo.annotations.push({
      type: 'performance-policy',
      description: 'report-only: no approved FPS floor',
    });
    await page.evaluate(() => {
      const report = { samples: [] as number[], last: null as number | null, frame: 0 };
      const collect = (time: number) => {
        if (report.last !== null) {
          report.samples.push(time - report.last);
        }
        report.last = time;
        report.frame = requestAnimationFrame(collect);
      };
      (window as any).__dragPerf = report;
      report.frame = requestAnimationFrame(collect);
    });
    await page.mouse.move(before.pointerX, before.pointerY);
    await page.mouse.down();
    // Trusted mouse input, pressed throughout; rAF is measurement cadence only.
    for (let step = 1; step <= 48; step++) {
      await page.mouse.move(before.pointerX + step * 1.5, before.pointerY + step * 0.5);
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      );
    }
    await page.mouse.up();
    await expect
      .poll(async () => {
        const after = await read();
        return after ? Math.hypot(after.x - before.x, after.y - before.y) : 0;
      })
      .toBeGreaterThan(10);
    const samples = await page.evaluate(() => {
      const report = (window as any).__dragPerf;
      cancelAnimationFrame(report.frame);
      return report.samples as number[];
    });
    expect(samples.length, 'Drag measurement must collect actual frames').toBeGreaterThan(10);
    expect(samples.every((sample) => Number.isFinite(sample) && sample > 0)).toBe(true);
    const sorted = [...samples].sort((a, b) => a - b);
    await testInfo.attach('actual-pointer-drag-performance-report', {
      body: Buffer.from(
        JSON.stringify(
          {
            policy: 'report-only',
            browser: testInfo.project.name,
            samples: samples.length,
            medianFrameMs: sorted[Math.floor(sorted.length / 2)],
            p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
            medianFps: 1000 / sorted[Math.floor(sorted.length / 2)],
            before,
            after: await read(),
            frameIntervalsMs: samples,
          },
          null,
          2,
        ),
      ),
      contentType: 'application/json',
    });
  });
});
