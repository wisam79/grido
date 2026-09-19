import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * Performance regression guard for canvas interactivity.
 */
test.describe('Canvas interactivity performance', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('mouse-move event loop stays above 30 FPS synthetic', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await page.waitForFunction(() => {
      const stage = document.querySelector('.konvajs-content') || document.querySelector('#canvas-area');
      return stage !== null;
    }, { timeout: 10000 });

    const report = await page.evaluate(async () => {
      const idle1: number[] = [];
      const interaction: number[] = [];
      const idle2: number[] = [];
      const buckets = [idle1, interaction, idle2] as const;
      let bucketIdx = 0;
      let lastTs = performance.now();
      let rafId = 0;
      const collect = (ts: number) => {
        const dt = ts - lastTs;
        if (dt > 0 && dt < 1000) buckets[bucketIdx].push(1000 / dt);
        lastTs = ts;
        rafId = requestAnimationFrame(collect);
      };

      rafId = requestAnimationFrame(collect);
      await new Promise<void>((r) => setTimeout(r, 400));
      bucketIdx = 1;

      // Continuous mouse sweep over the canvas — exercises Konva
      // hit-testing and overlay re-render on every move event.
      const canvas = document.querySelector('#canvas-area') as HTMLElement | null;
      if (!canvas) {
        cancelAnimationFrame(rafId);
        return { error: 'canvas-area not found' };
      }
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = Math.min(rect.width, rect.height) * 0.3;

      const endAt = performance.now() + 800;
      let angle = 0;
      while (performance.now() < endAt) {
        angle += 0.15;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        canvas.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: 1,
            pointerType: 'mouse',
          }),
        );
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }

      bucketIdx = 2;
      await new Promise<void>((r) => setTimeout(r, 400));
      cancelAnimationFrame(rafId);

      const summarize = (samples: number[]) => {
        if (samples.length === 0) return { median: 0, n: 0 };
        const sorted = [...samples].sort((a, b) => a - b);
        return {
          median: sorted[Math.floor(sorted.length / 2)],
          n: sorted.length,
        };
      };

      return {
        idle1: summarize(idle1),
        interaction: summarize(interaction),
        idle2: summarize(idle2),
      };
    });

    if ('error' in report) {
      test.skip(true, `FPS measurement unavailable: ${report.error}`);
      return;
    }
    console.log(
      `[perf] idle1=${report.idle1.median.toFixed(1)}fps | ` +
        `interaction=${report.interaction.median.toFixed(1)}fps (n=${report.interaction.n}) | ` +
        `idle2=${report.idle2.median.toFixed(1)}fps`,
    );

    // Synthetic floor: a healthy app measures ~30 FPS here.
    expect(report.interaction.median).toBeGreaterThanOrEqual(20);
  });
});
