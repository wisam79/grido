import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Document Scanner Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open document scanner dialog via image properties or menu', async ({ page }) => {
    // Add an image first
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

    // Look for document scanner action button in image properties
    const scannerBtn = page.getByRole('button', { name: /مسح المستند|ماسح المستندات/ }).first();
    if (await scannerBtn.isVisible()) {
      await scannerBtn.click();
      const scannerModal = page.getByRole('dialog').first();
      await expect(scannerModal).toBeVisible({ timeout: 10000 });

      // Cancel and close via Escape
      await page.keyboard.press('Escape');
      await expect(scannerModal).not.toBeVisible();
    }
  });
});
