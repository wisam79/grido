import { test, expect } from '@playwright/test';

import { stageTextCount } from './helpers/konva-probes';
import { openStudioElementsCategory } from './helpers/studio-elements';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Integrated User Journeys E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('User Journey 1: Import image, edit, switch to collage, and trigger export', async ({
    page,
  }) => {
    // 1. Add image to canvas
    await page.getByTestId('mode-tab-single').click();
    await page.getByTestId('toolbar-insert').click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 2. Switch to Collage Mode
    await page.getByTestId('mode-tab-collage').click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 3. Open Export dialog
    const exportBtn = page
      .getByRole('button', { name: /تصدير/ })
      .or(page.getByTitle(/تصدير/))
      .first();
    await exportBtn.click();

    const exportModal = page.getByRole('dialog').filter({ hasText: /تصدير/ });
    await expect(exportModal).toBeVisible();

    // Close export dialog
    const cancelBtn = exportModal.getByRole('button', { name: /إلغاء|إغلاق/ }).first();
    await cancelBtn.click();
    await expect(exportModal).not.toBeVisible();
  });

  test('User Journey 2: Freeform text insert and real undo removes it', async ({ page }) => {
    await page.getByTestId('mode-tab-single').click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    await openStudioElementsCategory(page, 'text');
    const addTextBtn = page.getByTestId('element-add-text-heading');
    await expect(addTextBtn).toBeVisible();

    // إدراج نص فعلي: عدد عقد Text على الكانفس يرتفع
    const before = await stageTextCount(page);
    await addTextBtn.click();
    await expect.poll(() => stageTextCount(page), { timeout: 10000 }).toBeGreaterThan(before);

    // تراجع فعلي: العدد يعود لما كان — لا مجرد استقرار الواجهة
    const undoBtn = page
      .getByTestId('canvas-undo')
      .or(page.getByRole('button', { name: /تراجع/ }))
      .first();
    await expect(undoBtn).toBeEnabled();
    await undoBtn.click();
    await expect.poll(() => stageTextCount(page), { timeout: 10000 }).toBe(before);

    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('User Journey 3: Sticker Studio browsing and category filter interaction', async ({
    page,
  }) => {
    await page.getByTestId('mode-tab-single').click();
    await openStudioElementsCategory(page, 'stickers');
    const stickerBtn = page.getByTestId('element-open-sticker-studio');
    await expect(stickerBtn).toBeVisible();
    await stickerBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // رقاقة فئة «الكل» من مجموع التصفية — فعلاً لا ظهوراً فقط
    const allChip = dialog.getByRole('group', { name: 'تصفية' }).getByRole('button', {
      name: 'الكل',
    });
    await expect(allChip).toBeVisible();
    await allChip.click();
    await expect(allChip).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('User Journey 4: Keyboard accessibility and modal escape dismissal', async ({ page }) => {
    const shortcutsBtn = page.getByRole('button', { name: 'اختصارات لوحة المفاتيح' }).first();
    await expect(shortcutsBtn).toBeVisible();
    await shortcutsBtn.click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    await expect(page.locator('#canvas-area')).toBeVisible();
  });
});
