import { expect } from '@playwright/test';

import { applyCollagePreset } from './helpers/collage-presets';
import { test, setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Grid Collage Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Switch to grid collage mode and verify template settings', async ({ page }) => {
    // Ensure collage mode
    await page.getByTestId('mode-tab-collage').click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // تطبيق قالب مستخدم محفوظ محاكى مختلف («طقم تقديم») — تطبيق إلزامي بحالة نشطة مؤكدة
    await applyCollagePreset(page, 'طقم تقديم');
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Verify collage controls and canvas stability', async ({ page }) => {
    await page.getByTestId('mode-tab-collage').click();
    await expect(page.locator('#canvas-area')).toBeVisible();
    await expect(page.getByTestId('canvas-zoom-in')).toBeVisible();
    await expect(page.getByTestId('canvas-zoom-out')).toBeVisible();
  });
});
