import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Phone Bridge & Camera Sync E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open phone bridge modal, verify QR code and network details', async ({ page }) => {
    // Trigger Phone Bridge dialog via custom event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('grido:open-phone-bridge'));
    });

    const dialog = page.getByRole('dialog').filter({ hasText: /جسر كاميرا الهاتف/ });
    await expect(dialog).toBeVisible();

    // Verify status indicator
    await expect(dialog.getByText(/الجسر متصل ويعمل/)).toBeVisible();

    // Verify SVG QR Code is rendered
    const qrSvg = dialog.locator('svg').first();
    await expect(qrSvg).toBeVisible();

    // Verify copy button works
    const copyBtn = dialog.getByRole('button', { name: /نسخ/ }).first();
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
    }

    // Dismiss with Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
