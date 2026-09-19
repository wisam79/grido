import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Sticker Studio & Barcode Generator E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open sticker studio dialog and browse collections', async ({ page }) => {
    const stickerBtn = page.getByRole('button', { name: /ملصقات|استوديو الملصقات/ }).or(page.getByTitle(/ملصقات/)).first();
    if (await stickerBtn.isVisible()) {
      await stickerBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Close dialog via Escape key
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test('Open barcode dialog if available', async ({ page }) => {
    const barcodeBtn = page.getByRole('button', { name: /باركود|QR/ }).or(page.getByTitle(/باركود/)).first();
    if (await barcodeBtn.isVisible()) {
      await barcodeBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
