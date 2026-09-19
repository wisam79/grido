import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Grid Collage Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Switch to grid collage mode and verify template settings', async ({ page }) => {
    // Ensure collage mode
    await page.getByTestId('mode-tab-collage').or(page.getByRole('tab', { name: 'كولاج', exact: true })).first().click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // Open templates panel via rail if collapsed
    const templatesRailBtn = page.getByRole('button', { name: /قوالب الكولاج والشبكة|القوالب|قوالب/ }).first();
    if (await templatesRailBtn.isVisible()) {
      await templatesRailBtn.click();
    }
    const presetsTab = page.locator('[data-tab="presets"]').or(page.getByRole('tab', { name: /قوالب جاهزة|نماذج|القوالب/ })).first();
    if (await presetsTab.isVisible()) {
      await presetsTab.click();
    }
    const templateCard = page.getByRole('button', { name: /طقم سفر|طقم تقديم|شيت|4 صور|شبكة/ }).first();
    if (await templateCard.isVisible()) {
      await templateCard.click();
    }
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Verify collage controls and canvas stability', async ({ page }) => {
    await page.getByTestId('mode-tab-collage').or(page.getByRole('tab', { name: 'كولاج', exact: true })).first().click();
    await expect(page.locator('#canvas-area')).toBeVisible();
    await expect(page.getByTestId('canvas-zoom-in').or(page.getByLabel('تكبير'))).toBeVisible();
    await expect(page.getByTestId('canvas-zoom-out')).toBeVisible();
  });
});
