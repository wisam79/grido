import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Background Removal Smoke Test', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Upload image and expose background removal controls', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await page.getByRole('button', { name: 'إدراج صورة جديدة' }).click();

    await expect(page.getByRole('button', { name: 'عزل الخلفية' }).first()).toBeVisible();
  });

});
