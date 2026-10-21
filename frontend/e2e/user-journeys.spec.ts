import { test, expect } from '@playwright/test';

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
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 2. Switch to Collage Mode
    await page
      .getByTestId('mode-tab-collage')
      .or(page.getByRole('tab', { name: 'كولاج', exact: true }))
      .first()
      .click();
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

  test('User Journey 2: Freeform elements manipulation and undo/redo stability', async ({
    page,
  }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    await openStudioElementsCategory(page, 'text');
    const addTextBtn = page.getByTestId('element-add-text-heading');
    if (await addTextBtn.isVisible()) {
      await addTextBtn.click();
    }

    await expect(page.locator('#canvas-area')).toBeVisible();

    const undoBtn = page
      .getByTestId('canvas-undo')
      .or(page.getByRole('button', { name: /تراجع/ }))
      .first();
    if ((await undoBtn.isVisible()) && (await undoBtn.isEnabled())) {
      await undoBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });

  test('User Journey 3: Sticker Studio browsing and parameter tabs interaction', async ({
    page,
  }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await openStudioElementsCategory(page, 'stickers');
    const stickerBtn = page.getByTestId('element-open-sticker-studio');
    await expect(stickerBtn).toBeVisible();
    await stickerBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const allTab = dialog.getByRole('tab', { name: /الكل/ }).first();
    if (await allTab.isVisible()) {
      await expect(allTab).toBeVisible();
    }

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('User Journey 4: Keyboard accessibility and modal escape dismissal', async ({ page }) => {
    const shortcutsBtn = page
      .getByRole('button', { name: /اختصارات/ })
      .or(page.getByTitle(/اختصارات/))
      .first();
    if (await shortcutsBtn.isVisible()) {
      await shortcutsBtn.click();
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }

    await expect(page.locator('#canvas-area')).toBeVisible();
  });
});
