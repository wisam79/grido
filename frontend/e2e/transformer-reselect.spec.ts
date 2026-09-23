import { test, expect, type Page } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * انحدار قاتل: تحديد عنصر ثم إلغاء تحديده ثم إعادة تحديده يجب أن يُظهر
 * مربع التحديد (Transformer) في كل مرة — لا أن يختفي بعد إعادة التحديد.
 *
 * السبب الجذري الموثق: المحوّل يُفك تركيبه عند انعدام التحديد (عرض
 * مشروط)، وتحسين تخطي المزامنة كان يقارن العقد فقط فيهمل النسخة الجديدة.
 * الاختبار يقود التحديد بلوحة المفاتيح (Escape للإلغاء، Ctrl+A لإعادة
 * التحديد) عمداً — حتمي تماماً بلا أي إحداثيات شاشة هشة، ويمارس مسار
 * الربط نفسه الذي يستخدمه النقر بالفأرة.
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

  test('select, deselect, reselect keeps transformer attached', async ({ page }) => {
    // وضع حر + إدراج صورة (تُحدد تلقائياً عند الإدراج)
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();
    await expect(page.getByRole('button', { name: 'قص وتدوير' })).toBeVisible();

    // 1. التحديد الأول: المحوّل مربوط بعقدة واحدة
    await expect.poll(() => transformerState(page), { timeout: 10000 }).toMatchObject({
      found: true, attached: true, nodes: 1,
    });

    // 2. إلغاء التحديد: المحوّل نفسه يُفك تركيبه (عرض مشروط)
    await page.keyboard.press('Escape');
    await expect.poll(() => transformerState(page), { timeout: 10000 }).toMatchObject({
      found: true, attached: false,
    });

    // 3. إعادة التحديد: المحوّل الجديد يجب أن يُربط — هذا هو الانحدار المُبلغ عنه
    await page.keyboard.press('Control+a');
    await expect.poll(() => transformerState(page), { timeout: 10000 }).toMatchObject({
      found: true, attached: true, nodes: 1, visible: true, onStage: true,
    });
  });
});
