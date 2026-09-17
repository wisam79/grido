import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Integrated User Journeys E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Complete User Journey: Import image, edit, switch to collage, and trigger export', async ({ page }) => {
    // 1. Add image to canvas
    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await page.getByRole('button', { name: /إدراج صورة جديدة|إدراج/ }).click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 2. Switch to Collage Mode
    await page.getByRole('tab', { name: 'كولاج', exact: true }).click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 4. Open Export dialog
    const exportBtn = page.getByRole('button', { name: /تصدير/ }).or(page.getByTitle(/تصدير/)).first();
    await exportBtn.click();

    const exportModal = page.getByRole('dialog').filter({ hasText: /تصدير/ });
    await expect(exportModal).toBeVisible();

    // Close export dialog
    const cancelBtn = exportModal.getByRole('button', { name: /إلغاء|إغلاق/ }).first();
    await cancelBtn.click();
    await expect(exportModal).not.toBeVisible();
  });
});
