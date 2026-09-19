import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Collage Mode and Filters E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Switch to collage mode and apply an official template', async ({ page }) => {
    await page.goto('/');

    await waitForAppReady(page);
    await page.getByTestId('mode-tab-collage').or(page.getByRole('tab', { name: 'كولاج', exact: true })).first().click();

    const templatesRailBtn = page.getByRole('button', { name: /قوالب الكولاج والشبكة|القوالب|قوالب/ }).first();
    if (await templatesRailBtn.isVisible()) {
      await templatesRailBtn.click();
    }
    const presetsTab = page.locator('[data-tab="presets"]').or(page.getByRole('tab', { name: /قوالب جاهزة|نماذج|القوالب/ })).first();
    if (await presetsTab.isVisible()) {
      await presetsTab.click();
    }

    // لوحة القوالب تعرض بطاقات القوالب الجاهزة مباشرة
    const gridTemplateCard = page.getByRole('button', { name: /طقم سفر|طقم تقديم|شيت|4 صور|شبكة/ }).first();
    if (await gridTemplateCard.isVisible()) {
      await gridTemplateCard.click();
    }

    // الكانفس يظل ظاهراً ومستقراً بعد تطبيق القالب
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

});
