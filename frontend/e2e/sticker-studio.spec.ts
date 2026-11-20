import { expect } from '@playwright/test';

import { runWorkspaceCommand } from './helpers/studio-elements';

import { test, setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * استوديو الملصقات — المدخل الحتمي عبر حدث grido:open-stickers-dialog
 * (المضيف الدائم sticker-studio-host يستمع إليه، بنفس نمط مواصفات
 * phone-bridge وcommand-palette). «حوار الباركود» المستقل لم يعد موجوداً —
 * الباركود فئة قوالب داخل الاستوديو نفسه (الاسم القديم للملف تاريخي مهمل).
 */
test.describe('Sticker Studio & Barcode Generator E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open sticker studio dialog and pick a template into customize stage', async ({ page }) => {
    await runWorkspaceCommand(page, 'stickers');
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();

    // بطاقة قالب من المعرض — اختيارها ينقل الاستوديو لمرحلة التخصيص فعلاً
    const gallery = dialog.getByRole('group', { name: 'القوالب' });
    await expect(gallery).toBeVisible();
    const card = gallery.getByRole('button').first();
    await expect(card).toBeVisible();
    await card.click();

    // دليل تغيير المرحلة: زر العودة للمعرض يظهر في ترويسة التخصيص
    await expect(dialog.getByRole('button', { name: /المعرض/ })).toBeVisible();

    // Close dialog via Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('Reach commercial barcode template through the codes category', async ({ page }) => {
    await runWorkspaceCommand(page, 'stickers');
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();

    // فئة «رموز وتواصل» — الباركود قوالب داخلها لا حوار مستقل
    const filterGroup = dialog.getByRole('group', { name: 'تصفية' });
    await expect(filterGroup).toBeVisible();
    const codesChip = filterGroup.getByRole('button', { name: 'رموز وتواصل' });
    await codesChip.click();
    await expect(codesChip).toHaveAttribute('aria-pressed', 'true');

    // بطاقة باركود تجاري (Code 128) تظهر ضمن الفئة ويُختار فعلاً
    const barcodeCard = dialog.getByRole('button', { name: /باركود تجاري/ }).first();
    await expect(barcodeCard).toBeVisible();
    await barcodeCard.click();
    await expect(dialog.getByRole('button', { name: /المعرض/ })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
