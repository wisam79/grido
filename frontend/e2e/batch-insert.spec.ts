import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Batch Photo Insert Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open batch insert dialog via custom event and inspect layout controls', async ({ page }) => {
    // Open Batch Insert dialog via custom event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('grido:open-batch-insert-dialog'));
    });

    const dialog = page.getByRole('dialog').filter({ hasText: /إدراج دفعة صور|دفعة صور/ });
    await expect(dialog).toBeVisible();

    // Verify dialog header
    await expect(dialog.getByText(/إدراج دفعة صور/)).toBeVisible();

    // Verify empty state guidance
    await expect(dialog.getByText(/لا توجد صور في قائمة الانتظار/)).toBeVisible();

    // Dismiss with Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
