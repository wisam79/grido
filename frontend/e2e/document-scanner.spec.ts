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
    if (!(await scannerBtn.isVisible())) {
      // تخطٍّ صريح مسجل في التقرير بدل النجاح الصامت السابق — غياب الزر
      // هنا يعني غياب صورة مدخلة في بيئة الـ mock، لا نجاح المسار.
      test.skip(true, 'No image present in Wails mock environment — scanner entry not reachable');
      return;
    }
    await scannerBtn.click();
    const scannerModal = page.getByRole('dialog').first();
    await expect(scannerModal).toBeVisible({ timeout: 10000 });

    // الشريط الجانبي للماسح ظهر فعلاً (ليس حواراً فارغاً)
    await expect(scannerModal.getByText(/نمط المسح|كشف تلقائي|فلاتر الورقة/).first()).toBeVisible({ timeout: 10000 });

    // Cancel and close via Escape
    await page.keyboard.press('Escape');
    await expect(scannerModal).not.toBeVisible();
  });
});
