import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';
import { setupWailsV3Bridge } from './helpers/wails-v3-bridge';

test.describe('Print & Export Workflows E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open and interact with Print Dialog', async ({ page }) => {
    // Add image first so there is content to print
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

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
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

    const exportBtn = page.getByRole('button', { name: /تصدير/ }).or(page.getByTitle(/تصدير/)).first();
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    const exportModal = page.getByRole('dialog').filter({ hasText: /تصدير/ });
    await expect(exportModal).toBeVisible();

    const cancelBtn = exportModal.getByRole('button', { name: /إلغاء|إغلاق/ }).first();
    await cancelBtn.click();
    await expect(exportModal).not.toBeVisible();
  });

  test('Full export flow: preview renders, export completes, native print triggered', async ({ page }) => {
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

    // لا يوجد Backend في E2E — اعتراض رفع لقطة الطباعة لتمرير مسار الالتقاط
    await page.route('**/api/upload-print-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', imageSrc: '/local-image/e2e-print.png' }),
      });
    });

    const printBtn = page.getByRole('button', { name: /طباعة/ }).or(page.getByTitle(/طباعة/)).first();
    await printBtn.click();
    const printModal = page.getByRole('dialog').filter({ hasText: /طباعة/ });
    await expect(printModal).toBeVisible();

    // المعاينة النهائية تُرسم داخل نافذة الطباعة الرئيسية
    await expect(printModal.locator('img.w-full.h-full.object-contain')).toBeVisible({ timeout: 15000 });

    const exportBtn = printModal.getByRole('button', { name: /تصدير وعرض/ });
    await expect(exportBtn).toBeEnabled();
    await exportBtn.click();

    // العملية تتم للنهاية: الحوار يُغلق (mock بلا htmlDoc ← مسار الطباعة الأصلية)
    await expect(printModal).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/الطباعة الأصلية بنجاح/)).toBeVisible({ timeout: 15000 });
  });

  test('Creates hidden print window after preview when HTML doc is returned', async ({ page }) => {
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

    await page.route('**/api/upload-print-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', imageSrc: '/local-image/e2e-print.png' }),
      });
    });

    // تجاوز mock ليعيد وثيقة HTML — يُفعّل مسار iframe نافذة الطباعة
    // 334009393 = ExportPrintSheet (انظر WAILS_V3_METHOD_HANDLERS)
    await setupWailsV3Bridge(page, {
      334009393: async () => ({
        success: true,
        filePath: 'C:/mock/sheet.png',
        htmlDoc: '<!DOCTYPE html><html><body><img src="/local-image/e2e-print.png"></body></html>',
      }),
    });

    const printBtn = page.getByRole('button', { name: /طباعة/ }).or(page.getByTitle(/طباعة/)).first();
    await printBtn.click();
    const printModal = page.getByRole('dialog').filter({ hasText: /طباعة/ });
    await expect(printModal).toBeVisible();

    const exportBtn = printModal.getByRole('button', { name: /تصدير وعرض/ });
    await expect(exportBtn).toBeEnabled();
    await exportBtn.click();

    // نافذة الطباعة المخفية تُنشأ بعد المعاينة والتصدير
    await expect(page.locator('iframe[aria-hidden="true"]')).toHaveCount(1, { timeout: 15000 });
  });
});
