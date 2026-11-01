import { test, expect } from '@playwright/test';

import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Document Scanner Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open document scanner dialog via image properties or menu', async ({ page }) => {
    // Add an image first — الإدراج الموكول يحدد العنصر ويفتح خصائصه
    await page.getByTestId('mode-tab-single').click();
    await page.getByTestId('toolbar-insert').click();

    // زر «مسح المستند» قسم ثابت في خصائص الصورة (image-properties) — ظهوره إلزامي
    // (التخطي المسجل القديم كان مبنية على فرضية غياب الصورة، والإدراج يعمل عبر الـmock)
    const scannerBtn = page.getByRole('button', { name: /مسح المستند|ماسح المستندات/ }).first();
    await expect(scannerBtn).toBeVisible();
    await scannerBtn.click();
    const scannerModal = page.getByRole('dialog').first();
    await expect(scannerModal).toBeVisible({ timeout: 10000 });

    // الشريط الجانبي للماسح ظهر فعلاً (ليس حواراً فارغاً)
    await expect(scannerModal.getByText(/نمط المسح|كشف تلقائي|فلاتر الورقة/).first()).toBeVisible({
      timeout: 10000,
    });

    // Cancel and close via Escape
    await page.keyboard.press('Escape');
    await expect(scannerModal).not.toBeVisible();
  });
});
