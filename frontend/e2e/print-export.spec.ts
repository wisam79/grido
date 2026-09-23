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

  test('Creates top-level print container after preview when HTML doc is returned', async ({ page }) => {
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

    // مراقب race-free: حاوية الطباعة تُزال ذاتياً بعد الطباعة (afterprint/مهلة)،
    // فالتقاط لحظة إنشائها عبر MutationObserver بدل انتظار عنصر عابر.
    // الطباعة من المستوى الأعلى الآن — لا iframe: iframe المخفي يُسقط سياق @page
    // في WebView2 فتُطبع الورقة على Letter بهوامش المتصفح (خللا تم إصلاحه)
    await page.evaluate(() => {
      const w = window as unknown as {
        __printContainers: (string | null)[];
        __printPageRule: string;
      };
      w.__printContainers = [];
      w.__printPageRule = '';
      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLDivElement && node.id === 'print-container') {
              w.__printContainers.push(node.getAttribute('aria-hidden'));
            }
            if (node instanceof HTMLStyleElement && node.id === 'grido-print-sheet-style') {
              w.__printPageRule = node.textContent ?? '';
            }
          }
        }
      }).observe(document.body, { childList: true });
      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLStyleElement && node.id === 'grido-print-sheet-style') {
              (window as unknown as { __printPageRule: string }).__printPageRule = node.textContent ?? '';
            }
          }
        }
      }).observe(document.head, { childList: true });
    });

    await exportBtn.click();

    // العملية تتم للنهاية: الحوار يُغلق بعد نجاح التصدير
    await expect(printModal).not.toBeVisible({ timeout: 15000 });

    // حاوية الطباعة أُنشئت في المستند الأعلى (aria-hidden="true")
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as unknown as { __printContainers: (string | null)[] }).__printContainers?.length ?? 0
          ),
        { timeout: 15000 }
      )
      .toBe(1);
    const containerFlag = await page.evaluate(
      () => (window as unknown as { __printContainers: (string | null)[] }).__printContainers[0]
    );
    expect(containerFlag).toBe('true');

    // قاعدة @page بمقاس الورقة حقنت في المستند الأعلى (تُلتقط لحظة الإنشاء)
    const pageRule = await page.evaluate(
      () => (window as unknown as { __printPageRule: string }).__printPageRule
    );
    expect(pageRule).toContain('@page');
  });
});
