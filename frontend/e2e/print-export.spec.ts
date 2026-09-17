import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Print & Export Workflows E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Open and interact with Print Dialog', async ({ page }) => {
    // Add image first so there is content to print
    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await page.getByRole('button', { name: 'إدراج صورة جديدة' }).click();

    // Click Print button in toolbar
    const printBtn = page.getByRole('button', { name: /طباعة/ }).or(page.getByTitle(/طباعة/)).first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    // Print dialog should be visible
    const printModal = page.getByRole('dialog').filter({ hasText: /طباعة/ });
    await expect(printModal).toBeVisible();

    // Verify close / cancel
    const cancelBtn = printModal.getByRole('button', { name: /إلغاء|إغلاق/ }).first();
    await cancelBtn.click();
    await expect(printModal).not.toBeVisible();
  });

  test('Open and interact with Export Dialog', async ({ page }) => {
    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await page.getByRole('button', { name: 'إدراج صورة جديدة' }).click();

    const exportBtn = page.getByRole('button', { name: /تصدير/ }).or(page.getByTitle(/تصدير/)).first();
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    const exportModal = page.getByRole('dialog').filter({ hasText: /تصدير/ });
    await expect(exportModal).toBeVisible();

    const cancelBtn = exportModal.getByRole('button', { name: /إلغاء|إغلاق/ }).first();
    await cancelBtn.click();
    await expect(exportModal).not.toBeVisible();
  });
});
