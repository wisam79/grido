import { expect } from '@playwright/test';

import { stageTextCount, stageImageSources } from './helpers/konva-probes';
import { openStudioElementsCategory } from './helpers/studio-elements';
import { test, setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Integrated User Journeys E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('User Journey 1: Import image, transfer real design to collage, and complete mocked export', async ({
    page,
  }) => {
    // 1. Add image to canvas
    await page.getByTestId('mode-tab-single').click();
    await page.getByTestId('toolbar-insert').click();
    await expect.poll(() => stageImageSources(page)).not.toBe('');

    // Transfer the actual design, not merely switch to an empty collage.
    await page.getByTestId('toolbar-transfer-to-collage').click();
    await expect(page.getByText(/إدراج التصميم في/)).toBeVisible();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 3. Open Export dialog
    const exportBtn = page
      .getByRole('button', { name: /تصدير/ })
      .or(page.getByTitle(/تصدير/))
      .first();
    await exportBtn.click();

    const exportModal = page.getByRole('dialog').filter({ hasText: /تصدير/ });
    await expect(exportModal).toBeVisible();

    const saveRequest = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/save-file' &&
        response.request().method() === 'POST',
    );
    await exportModal.getByRole('button', { name: 'تصدير', exact: true }).click();
    const saved = await saveRequest;
    expect(saved.request().postDataBuffer()!.length).toBeGreaterThan(100);
    expect(await saved.json()).toEqual({ status: 'success' });
    await expect(page.getByText('تم تصدير الصورة بنجاح', { exact: true })).toBeVisible();
    await expect(exportModal).toBeHidden();
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
    const stickerBtn = page.getByTestId('rail-studio-stickers');
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
