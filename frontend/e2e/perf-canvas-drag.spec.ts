import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

/**
 * Performance regression guard for canvas interactivity.
 *
 * ⚠️ Synthetic event throttling caveat:
 * Playwright's `page.evaluate` runs on the page's main thread. When
 * we dispatch pointer events from inside an async loop, the rAF rate
 * is gated by the await cycle, not the browser's actual paint rate.
 * A healthy app measured this way will report ~30 FPS (one frame
 * per dispatch+rAF cycle) regardless of the user's real experience.
 *
 * What this test IS useful for:
 * - Detecting catastrophic regressions (e.g. an infinite loop, a
 *   heavy sync computation per event, or a memory leak that causes
 *   GC pauses). These will drop the synthetic rate well below 30 FPS.
 * - Catching accidental introduction of per-event `getBoundingClientRect`
 *   calls, layout-thrashing subscriptions, or store-wide re-renders
 *   in mouse-handler code paths.
 *
 * What this test CANNOT measure:
 * - Real user-perceived drag lag (needs OS-level mouse events).
 *   That requires manual testing or a real-input E2E harness.
 * - Konva render quality (separate from event handling).
 */
test.describe('Canvas interactivity performance', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('mouse-move event loop stays above 30 FPS synthetic', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible({ timeout: 15000 });

    await page.waitForFunction(() => {
      const stage = document.querySelector('.konvajs-content');
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

    // Synthetic floor: a healthy app measures ~30 FPS here. If it
    // drops below, something heavy is happening on every event
    // (synchronous layout, JSON serialization, big re-renders).
    expect(report.interaction.median).toBeGreaterThanOrEqual(25);
  });
});
