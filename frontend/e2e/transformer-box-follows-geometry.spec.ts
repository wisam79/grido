import { test, expect, type Page } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * انحدار: صندوق المحوّل يجب أن يتبع هندسة العنصر عندما تتغيّر من المتجر
 * (لوحة المفاتيح/الخصائص) مع ثبات هوية العقد المربوطة — أي في مسار
 * `sameNodes` داخل konva-canvas.tsx الذي لا يعيد ربط `nodes()`.
 *
 * الاختيار عمداً بلا إحداثيات شاشة هشة: Alt+ArrowUp تكبير ناعم عبر المتجر،
 * وArrowRight إزاحة عبر المتجر (كلاهما في use-keyboard-shortcuts.ts).
 */
test.describe('Transformer box follows store geometry', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);
  });

  async function transformerBox(page: Page) {
    return page.evaluate(() => {
      const stage = (
        window as unknown as {
          __gridoStage?: {
            find: (selector: string) => Array<{
              x: () => number;
              y: () => number;
              width: () => number;
              height: () => number;
              nodes: () => unknown[];
            }>;
          };
        }
      ).__gridoStage;
      const tr = stage?.find('Transformer')?.[0];
      if (!tr) return null;
      return {
        x: tr.x(),
        y: tr.y(),
        w: tr.width(),
        h: tr.height(),
        nodes: tr.nodes().length,
      };
    });
  }

  test('يكبر ويتحرك مع الكتابة في المتجر بلا إعادة ربط العقد', async ({ page }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .click();
    await page
      .getByTestId('toolbar-insert')
      .or(page.getByRole('button', { name: /إدراج/ }))
      .first()
      .click();
    await expect(page.getByRole('button', { name: 'قص وتدوير' })).toBeVisible();

    const initial = await transformerBox(page);
    expect(initial).not.toBeNull();
    expect(initial!.nodes).toBe(1);
    expect(initial!.w).toBeGreaterThan(0);

    // تكبير ناعم (عامل 1.015 لكل ضغطة) — تغيّر أبعاد من المتجر
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Alt+ArrowUp');
    await expect
      .poll(() => transformerBox(page), { timeout: 5000 })
      .not.toEqual(initial);
    const grown = await transformerBox(page);
    expect(grown!.w).toBeGreaterThan(initial!.w + 1);
    expect(grown!.h).toBeGreaterThan(initial!.h + 1);
    // نفس العقدة — لا إعادة ربط، أي أن المسار المقاس هو مسار ثبات الهوية
    expect(grown!.nodes).toBe(1);

    // إزاحة يميناً — تغيّر موضع من المتجر
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => transformerBox(page), { timeout: 5000 })
      .not.toEqual(grown);
    const moved = await transformerBox(page);
    expect(moved!.x).toBeGreaterThan(grown!.x);
    expect(moved!.w).toBeCloseTo(grown!.w, 0);
    expect(moved!.nodes).toBe(1);
  });
});
