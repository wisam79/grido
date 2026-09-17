import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Collage Mode and Filters E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Switch to collage mode and apply an official template', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
    await page.getByRole('tab', { name: 'كولاج', exact: true }).first().click();

    const templatesRailBtn = page.getByRole('button', { name: 'قوالب الكولاج والشبكة' });
    if (await templatesRailBtn.isVisible()) {
      await templatesRailBtn.click();
    }
    await page.waitForSelector('[data-tab="presets"]', { timeout: 10000 });
    await page.locator('[data-tab="presets"]').click();

    // لوحة القوالب تعرض بطاقات القوالب الجاهزة مباشرة (تصميم Fluent 2)
    const gridTemplateCard = page.getByRole('button', { name: /طقم سفر|طقم تقديم|شيت|4 صور/ }).first();
    await expect(gridTemplateCard).toBeVisible();
    await gridTemplateCard.click();

    // الكانفس يظل ظاهراً ومستقراً بعد تطبيق القالب
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

});
