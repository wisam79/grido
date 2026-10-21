import { test, expect, type Page, type Locator } from '@playwright/test';

import { setupWailsMock, setupWailsV3Bridge, waitForAppReady } from './helpers/wails-mock';

/**
 * 🖨️ المسار الكامل لحوار الطباعة: الفتح ← اختيار الطابعة ← طباعة الورقة.
 *
 * يلتقط انحدارات مستقبلية في:
 * - ربط الاختيار (مزامنة الافتراضي من النظام) وزر «الخصائص».
 * - وضع الكولاج (تصميم حقيقي في الخانات، لا وضع الصورة الواحدة فقط).
 * - مسار الطباعة الاحتياطية عبر المتصفح (وثيقة HTML ← window.print المباشر).
 *
 * كل نداءات Wails مُحاكاة — لا نافذة نظام ولا طابعة حقيقية.
 */

const IMAGE_SRC = '/local-image/e2e-print.png';
const PREF_METHOD = 2929786627; // OpenPrinterPreferences
const EXPORT_METHOD = 334009393; // ExportPrintSheet
const DIRECT_METHOD = 1268920029; // PrintDirect

/** تمرير مسار لقطة الطباعة المرفوعة (لا Backend في E2E). */
async function routePrintUpload(page: Page) {
  await page.route('**/api/upload-print-image', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', imageSrc: IMAGE_SRC }),
    });
  });
}

/** إدراج صورة واحدة في الوضع الحر (مصدر التصميم). */
async function insertSingleImage(page: Page) {
  await page
    .getByTestId('mode-tab-single')
    .or(page.getByRole('tab', { name: 'تعديل حر' }))
    .first()
    .click();
  await page
    .getByTestId('toolbar-insert')
    .or(page.getByRole('button', { name: /إدراج/ }))
    .first()
    .click();
}

/** يبني كولاجاً حقيقياً: يصمّم في الوضع الحر ثم ينقل التصميم لخانات الكولاج. */
async function buildCollageWithImage(page: Page) {
  await insertSingleImage(page);
  await page.getByTestId('toolbar-transfer-to-collage').click();
  // الانتقال لوضع الكولاج + إدراج اللقطة في الخانة (خطوة واحدة)
  await expect(page.getByText(/إدراج التصميم في/)).toBeVisible({ timeout: 15000 });
}

/** يفتح حوار الطباعة ويعيد عنصر الحوار. */
async function openPrintDialog(page: Page) {
  const printBtn = page.getByRole('button', { name: /طباعة/ }).or(page.getByTitle(/طباعة/)).first();
  await expect(printBtn).toBeVisible();
  await printBtn.click();
  const modal = page.getByRole('dialog').filter({ hasText: /طباعة/ });
  await expect(modal).toBeVisible();
  return modal;
}

/** يتحقق أن الطابعة الافتراضية للنظام معروضة، ثم يختار EPSON ويعيد تأكيد ذلك. */
async function selectEpsonPrinter(page: Page, modal: Locator) {
  const printerSelect = modal.getByRole('combobox').first();
  await expect(printerSelect).toBeEnabled();
  await expect(printerSelect).toContainText('Brother DCP-T520W');
  await printerSelect.click();
  await page.getByRole('option', { name: /EPSON L805 Series/ }).click();
  await expect(printerSelect).toContainText('EPSON L805 Series');
}

test.describe('Print Dialog — Printer Flow', () => {
  test('opens the dialog, shows the system default printer, selects another, and prints the sheet', async ({
    page,
  }) => {
    const openPrefsCalls: string[] = [];
    const exportCalls: unknown[] = [];

    await setupWailsMock(page);
    await setupWailsV3Bridge(page, {
      [PREF_METHOD]: async (name: string) => {
        openPrefsCalls.push(name);
        return { success: true };
      },
      [EXPORT_METHOD]: async (...args: unknown[]) => {
        exportCalls.push(args);
        return { success: true, filePath: 'C:/mock/sheet.png' };
      },
    });
    await page.goto('/');
    await waitForAppReady(page);

    await insertSingleImage(page);
    await routePrintUpload(page);

    // 1) فتح حوار الطباعة من شريط الأدوات
    const printModal = await openPrintDialog(page);
    await expect(printModal.getByText('معاينة الورقة المطبوعة')).toBeVisible();

    // 2+3) الطابعة الافتراضية ثم اختيار طابعة مختلفة
    await selectEpsonPrinter(page, printModal);

    // زر «الخصائص» يتبع الاختيار
    await printModal.getByRole('button', { name: /الخصائص|خصائص/ }).click();
    await expect.poll(() => openPrefsCalls.length).toBeGreaterThan(0);
    expect(openPrefsCalls.at(-1)).toBe('EPSON L805 Series');

    // 4) طباعة الورقة — يكتمل التصدير ويُغلق الحوار
    await printModal.getByRole('button', { name: 'طباعة الورقة' }).click();
    await expect(printModal).not.toBeVisible({ timeout: 15000 });
    await expect.poll(() => exportCalls.length).toBeGreaterThan(0);
  });

  test('prints a collage sheet built from the canvas with the selected printer', async ({
    page,
  }) => {
    const exportCalls: unknown[] = [];

    await setupWailsMock(page);
    await setupWailsV3Bridge(page, {
      [EXPORT_METHOD]: async (...args: unknown[]) => {
        exportCalls.push(args);
        return { success: true, filePath: 'C:/mock/collage.png' };
      },
    });
    await page.goto('/');
    await waitForAppReady(page);

    // كولاج حقيقي بخانة تحمل صورة (لا وضع الصورة الواحدة)
    await buildCollageWithImage(page);
    await routePrintUpload(page);

    const printModal = await openPrintDialog(page);

    // كتلة الطابعة تعمل في الكولاج أيضاً
    await selectEpsonPrinter(page, printModal);

    // زر الطباعة مُفعَّل (المحتوى موجود في الخانات) ويكتمل المسار
    const printSheetBtn = printModal.getByRole('button', { name: 'طباعة الورقة' });
    await expect(printSheetBtn).toBeEnabled();
    await printSheetBtn.click();

    await expect(printModal).not.toBeVisible({ timeout: 15000 });
    await expect.poll(() => exportCalls.length).toBeGreaterThan(0);
  });

  test('handles direct print failure gracefully with error toast and no DOM pollution in collage mode', async ({
    page,
  }) => {
    await setupWailsMock(page);
    await setupWailsV3Bridge(page, {
      [EXPORT_METHOD]: async () => ({
        success: true,
        filePath: 'C:/mock/collage.png',
      }),
      [DIRECT_METHOD]: async () => ({
        success: false,
        jobId: 0,
        status: '',
        error: 'Direct print spooler failed',
      }),
    });
    await page.goto('/');
    await waitForAppReady(page);

    await buildCollageWithImage(page);
    await routePrintUpload(page);

    const printModal = await openPrintDialog(page);

    await printModal.getByRole('button', { name: 'طباعة الورقة' }).click();

    // تظهر رسالة الخطأ الصريحة بدلاً من فتح حوار المتصفح
    await expect(page.getByText(/تعذرت الطباعة/)).toBeVisible({ timeout: 15000 });

    // التأكد التام من عدم حقن أي حاوية طباعة أو قواعد أنماط عابرة في الـ DOM
    expect(await page.locator('#print-container').count()).toBe(0);
    expect(await page.locator('#grido-print-sheet-style').count()).toBe(0);
  });
});
