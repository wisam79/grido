import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Background Removal Smoke Test', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Upload image and expose background removal controls', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByTitle('وضع التعديل الحر').click();
    await page.getByTitle('رفع صورة جديدة').click();

    await expect(page.getByText('خصائص الصورة')).toBeVisible();
    await expect(page.getByText('عزل الخلفية')).toBeVisible();
  });

});
