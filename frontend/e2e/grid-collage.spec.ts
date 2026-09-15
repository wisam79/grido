import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Grid Collage Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Switch to grid collage mode and verify template settings', async ({ page }) => {
    // Ensure collage mode
    await page.getByRole('tab', { name: 'كولاج', exact: true }).click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // Switch to presets tab
    await page.locator('[data-tab="presets"]').click();
    const templateCard = page.getByRole('button', { name: /طقم سفر|طقم تقديم|شيت|4 صور/ }).first();
    await expect(templateCard).toBeVisible();
    await templateCard.click();
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Verify collage controls and canvas stability', async ({ page }) => {
    await page.getByRole('tab', { name: 'كولاج', exact: true }).click();
    await expect(page.locator('#canvas-area')).toBeVisible();
    await expect(page.getByLabel('تكبير')).toBeVisible();
    await expect(page.getByLabel('تصغير')).toBeVisible();
  });
});
