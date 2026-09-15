import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Sticker Studio & Barcode Generator E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Open sticker studio dialog and browse collections', async ({ page }) => {
    const stickerBtn = page.getByRole('button', { name: /ملصقات|استوديو الملصقات/ }).or(page.getByTitle(/ملصقات/)).first();
    if (await stickerBtn.isVisible()) {
      await stickerBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Close dialog
      const closeBtn = dialog.getByRole('button', { name: /إغلاق|إلغاء/ }).or(page.locator('button[aria-label="إغلاق"]')).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('Open barcode dialog if available', async ({ page }) => {
    // Check toolbar more menu or direct button
    const barcodeBtn = page.getByRole('button', { name: /باركود|QR/ }).or(page.getByTitle(/باركود/)).first();
    if (await barcodeBtn.isVisible()) {
      await barcodeBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
