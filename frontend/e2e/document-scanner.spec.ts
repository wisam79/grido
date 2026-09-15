import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Document Scanner Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Open document scanner dialog via image properties or menu', async ({ page }) => {
    // Add an image first
    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await page.getByRole('button', { name: 'إضافة صورة جديدة' }).click();

    // Look for document scanner action button in image properties or toolbar
    const scannerBtn = page.getByRole('button', { name: /مسح المستند|ماسح المستندات/ }).or(page.getByTitle(/مسح/)).first();
    if (await scannerBtn.isVisible()) {
      await scannerBtn.click();
      const scannerModal = page.getByRole('dialog').filter({ hasText: /ماسح|مستند/ });
      await expect(scannerModal).toBeVisible();

      // Cancel and close
      const cancelBtn = scannerModal.getByRole('button', { name: /إلغاء|إغلاق/ }).first();
      await cancelBtn.click();
      await expect(scannerModal).not.toBeVisible();
    }
  });
});
