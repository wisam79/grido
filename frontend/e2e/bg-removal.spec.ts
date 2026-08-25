import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Background Removal Smoke Test', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Upload image and expose background removal controls', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'وضع التعديل الحر' }).or(page.getByTitle('وضع التعديل الحر')).click();
    await page.getByRole('button', { name: /إضافة صورة|رفع صورة/ }).or(page.getByTitle(/صورة جديدة/)).first().click();

    await expect(page.getByText('عزل الخلفية', { exact: true })).toBeVisible();
  });

});
