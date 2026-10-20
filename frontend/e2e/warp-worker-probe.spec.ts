import { test, expect } from '@playwright/test';

/**
 * @probe — مسار الاستعدال داخل العامل
 *
 * المرحلة 2 من خطة الأداء: استعدال المنظور ينفَّذ داخل Web Worker على
 * OffscreenCanvas. هذا الفحص يتحقق في متصفح حقيقي من:
 *  1) أن العامل يقرأ Blob ويفكّه بـ createImageBitmap.
 *  2) أن الاستعدال ينتج Blob PNG صالحاً (لا صورة سوداء/فارغة).
 */
test.describe('@probe الاستعدال داخل العامل', () => {
  test('ينتج صورة PNG عبر createImageBitmap + OffscreenCanvas', async ({ page }) => {
    await page.route('**/probe.html', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body>warp probe</body></html>',
      }),
    );
    await page.goto('/probe.html');

    const response = await page.evaluate(async () => {
      const source = document.createElement('canvas');
      source.width = 200;
      source.height = 200;
      const ctx = source.getContext('2d');
      if (!ctx) return { type: 'no-canvas' };
      ctx.fillStyle = '#282828';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(50, 40, 100, 120);
      const blob = await new Promise<Blob | null>((resolve) =>
        source.toBlob((b) => resolve(b), 'image/png'),
      );
      if (!blob) return { type: 'no-blob' };

      const worker = new Worker('/src/workers/scanner-warp.worker.ts', { type: 'module' });
      return await new Promise<Record<string, unknown>>((resolve) => {
        const timer = setTimeout(() => resolve({ type: 'timeout' }), 60000);
        worker.onmessage = (event) => {
          clearTimeout(timer);
          worker.terminate();
          const data = event.data as { type: string; blob?: Blob };
          if (data?.type === 'success' && data.blob) {
            resolve({ type: 'success', size: data.blob.size, mime: data.blob.type });
            return;
          }
          resolve({ type: 'error', error: String((data as { error?: string })?.error) });
        };
        worker.onerror = (event) => {
          clearTimeout(timer);
          worker.terminate();
          resolve({ type: 'worker-error', error: event.message });
        };
        worker.postMessage({
          type: 'warp',
          requestId: 1,
          source: blob,
          corners: [
            { x: 50, y: 40 },
            { x: 150, y: 40 },
            { x: 150, y: 160 },
            { x: 50, y: 160 },
          ],
          targetW: 100,
          targetH: 120,
          filterMode: 'original',
          rotation: 0,
        });
      });
    });

    console.log('[warp-probe]', JSON.stringify(response));

    expect(response.type).toBe('success');
    expect(response.mime).toBe('image/png');
    expect(response.size as number).toBeGreaterThan(100);
  });
});
