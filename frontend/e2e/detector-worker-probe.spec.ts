import { test, expect } from '@playwright/test';

/**
 * @probe — مسار OpenCV داخل عامل الكشف
 *
 * المرحلة 3 من خطة الأداء: محرك OpenCV (WASM) ينفّذ كشف الكفاف داخل العامل
 * بدل الخيط الرئيسي. هذا الفحص يتحقق في متصفح حقيقي من:
 *  1) أن العامل يردّ بنتيجة OpenCV (وليس خطأً).
 *  2) أن النتيجة تحتوي مستنداً مكتشفاً من صورة اصطناعية (مستند أبيض على خلفية داكنة).
 */
test.describe('@probe OpenCV داخل عامل الكشف', () => {
  test('يكشف المستند عبر محرك OpenCV داخل العامل', async ({ page }) => {
    await page.route('**/probe.html', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body>detector probe</body></html>',
      }),
    );
    await page.goto('/probe.html');

    const response = await page.evaluate(async () => {
      const worker = new Worker('/src/workers/document-detector.worker.ts', { type: 'module' });
      const w = 200;
      const h = 200;
      const data = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const inside = x >= 50 && x < 150 && y >= 40 && y < 160;
          const i = (y * w + x) * 4;
          data[i] = inside ? 245 : 40;
          data[i + 1] = inside ? 245 : 40;
          data[i + 2] = inside ? 245 : 40;
          data[i + 3] = 255;
        }
      }
      const buffer = data.buffer.slice(0);

      return await new Promise<Record<string, unknown>>((resolve) => {
        const timer = setTimeout(() => resolve({ type: 'timeout' }), 90000);
        worker.onmessage = (event) => {
          clearTimeout(timer);
          worker.terminate();
          resolve(event.data as Record<string, unknown>);
        };
        worker.onerror = (event) => {
          clearTimeout(timer);
          worker.terminate();
          resolve({ type: 'worker-error', error: event.message });
        };
        worker.postMessage(
          {
            type: 'opencv',
            requestId: 1,
            buffer,
            sw: w,
            sh: h,
            originalWidth: w,
            originalHeight: h,
            mode: 'single',
          },
          [buffer],
        );
      });
    });

    console.log('[detector-probe]', JSON.stringify(response));

    expect(response.type).toBe('opencv-success');
    const result = response.result as { documents?: unknown[] } | null;
    expect(result?.documents?.length ?? 0).toBeGreaterThan(0);
  });
});
