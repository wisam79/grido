import { test, expect, type Page } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * انحدار قاتل: تحديد عنصر ثم إلغاء تحديده ثم إعادة تحديده يجب أن يُظهر
 * مربع التحديد (Transformer) في كل مرة — لا أن يختفي بعد إعادة التحديد.
 */
test.describe('Transformer survives deselect/reselect cycle', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);
  });

  async function transformerState(page: Page) {
    return page.evaluate(() => {
      const stage = (window as unknown as { __gridoStage?: { find: (s: string) => Array<{ nodes: () => unknown[]; visible: () => boolean; getLayer: () => { getStage: () => unknown } | null }> } }).__gridoStage;
      if (!stage) return { found: false as const };
      const trs = stage.find('Transformer');
      if (trs.length === 0) return { found: true as const, attached: false as const };
      const tr = trs[0];
      const layer = tr.getLayer();
      return {
        found: true as const,
        attached: true as const,
        nodes: tr.nodes().length,
        visible: tr.visible(),
        onStage: !!layer && !!layer.getStage(),
      };
    });
  }

  async function imageCenter(page: Page) {
    return page.evaluate(() => {
      const stage = (window as unknown as {
        __gridoStage?: {
          find: (s: string) => Array<{
            getAbsolutePosition: () => { x: number; y: number };
            width: () => number; height: () => number; scaleX: () => number; scaleY: () => number;
          }>;
        };
      }).__gridoStage;
      const box = document.querySelector('.konvajs-content')?.getBoundingClientRect();
      if (!stage || !box) return null;
      const imgs = stage.find('Image');
      if (imgs.length === 0) return null;
      const img = imgs[0];
      const p = img.getAbsolutePosition();
      const w = img.width() * img.scaleX();
      const h = img.height() * img.scaleY();
      return {
        x: box.left + p.x + Math.abs(w) / 2,
        y: box.top + p.y + Math.abs(h) / 2,
        imgLeft: box.left + p.x,
        imgTop: box.top + p.y,
        imgRight: box.left + p.x + Math.abs(w),
        imgBottom: box.top + p.y + Math.abs(h),
        boxLeft: box.left,
        boxTop: box.top,
        boxRight: box.right,
        boxBottom: box.bottom,
      };
    });
  }

  test('select, deselect, reselect keeps transformer attached', async ({ page }) => {
    // وضع حر + إدراج صورة (تُحدد تلقائياً عند الإدراج)
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();
    await expect(page.getByRole('button', { name: 'قص وتدوير' })).toBeVisible();

    // 1. التحديد الأول: المحوّل مربوط
    await expect.poll(() => transformerState(page), { timeout: 10000 }).toMatchObject({
      found: true, attached: true, nodes: 1,
    });

    const geo = await imageCenter(page);
    expect(geo).not.toBeNull();
    if (!geo) return;

    // 2. إلغاء التحديد بلوحة المفاتيح (مسار حتمي: Escape → selectElement(null) —
    // نفس مسار النقر على الخلفية في الـ store، دون هشاشة إحداثيات الزوايا).
    await page.keyboard.press('Escape');
    await expect.poll(() => transformerState(page), { timeout: 10000 }).toMatchObject({
      found: true, attached: true, nodes: 0,
    });

    // 3. إعادة التحديد: المحوّل يجب أن يعود — هذا هو الانحدار المُبلغ عنه
    await page.mouse.click(geo.x, geo.y);
    await expect.poll(() => transformerState(page), { timeout: 10000 }).toMatchObject({
      found: true, attached: true, nodes: 1, visible: true, onStage: true,
    });
  });
});
