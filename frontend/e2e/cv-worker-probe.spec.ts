import { test, expect } from '@playwright/test';

/**
 * @probe — جدوى OpenCV.js داخل Web Worker
 *
 * المرحلة 3 من خطة الأداء (نقل كشف OpenCV/scanic خارج الخيط الرئيسي) مشروطة
 * بإثبات أنّ محرك OpenCV (WASM) يعمل داخل عامل. هذا الفحص يحسم المسألة آلياً:
 * إن فشل، نتوقف عن المرحلة 3 ونعتمد مكاسب المرحلتين 1 و2 فقط.
 *
 * يعمل على صفحة فارغة على نفس أصل خادم التطوير حتى لا نحتاج جسر Wails.
 */
test.describe('@probe OpenCV داخل Web Worker', () => {
  test('يُهيّئ OpenCV.js وينفّذ findContours داخل العامل', async ({ page }) => {
    await page.route('**/probe.html', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body>cv probe</body></html>',
      }),
    );
    await page.goto('/probe.html');

    const result = await page.evaluate(async () => {
      const worker = new Worker('/src/workers/cv-worker-probe.worker.ts', { type: 'module' });
      return await new Promise<{
        ok: boolean;
        hasMat: boolean;
        contours: number;
        error?: string;
      }>((resolve) => {
        const timer = setTimeout(
          () => resolve({ ok: false, hasMat: false, contours: 0, error: 'probe timeout' }),
          60000,
        );
        worker.onmessage = (event) => {
          clearTimeout(timer);
          worker.terminate();
          resolve(event.data);
        };
        worker.onerror = (event) => {
          clearTimeout(timer);
          worker.terminate();
          resolve({ ok: false, hasMat: false, contours: 0, error: event.message });
        };
        worker.postMessage('probe');
      });
    });

    console.log('[cv-probe]', JSON.stringify(result));

    expect(result.error ?? '').toBe('');
    expect(result.hasMat).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.contours).toBeGreaterThan(0);
  });
});
