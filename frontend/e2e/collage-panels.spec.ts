import { test, expect } from '@playwright/test';

import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Collage Mode Rails & Configuration Panels E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Switch collage sections and their internal tabs (no backdrop duplicate)', async ({
    page,
  }) => {
    // Switch to Collage mode
    await page
      .getByTestId('mode-tab-collage')
      .or(page.getByRole('tab', { name: 'كولاج', exact: true }))
      .first()
      .click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 1. Grid section: custom + presets + freeform on one surface
    const gridBtn = page.getByTestId('rail-collage-grid');
    if (await gridBtn.isVisible()) {
      // النقر على وجهة مفتوحة أصلاً يطوي لوحها — نقرتان تضمنان الفتح
      await gridBtn.click();
      if (!(await page.getByTestId('segmented-custom').isVisible())) {
        await gridBtn.click();
      }
      await expect(page.getByTestId('segmented-custom')).toBeVisible();
      await expect(page.getByTestId('segmented-presets')).toBeVisible();
      await expect(page.getByTestId('segmented-freeform')).toBeVisible();

      await page.getByTestId('segmented-presets').click();
      await expect(page.getByTestId('segmented-presets')).toHaveAttribute('aria-selected', 'true');
    }

    // 2. Slots section: autofill + arrange
    const slotsBtn = page.getByTestId('rail-collage-slots');
    if (await slotsBtn.isVisible()) {
      await slotsBtn.click();
      await expect(page.getByTestId('segmented-autofill')).toBeVisible();
      await page.getByTestId('segmented-arrange').click();
      await expect(page.getByTestId('segmented-arrange')).toHaveAttribute('aria-selected', 'true');
    }

    // 3. Paper section: single tab hides the internal switcher
    const paperBtn = page.getByTestId('rail-collage-paper');
    if (await paperBtn.isVisible()) {
      await paperBtn.click();
      await expect(page.getByTestId('segmented-paper')).toHaveCount(0);
    }

    // 4. Backdrop tab deleted — every control lives in the right column
    // (CollageSettings/GeneralSettings/SlotProperties); no rail button remains
    await expect(page.getByTestId('rail-collage-backdrop')).toHaveCount(0);

    // Old flat rail buttons are gone — tabs live inside their section
    for (const oldId of [
      'rail-collage-presets',
      'rail-collage-freeform',
      'rail-collage-autofill',
      'rail-collage-arrange',
    ]) {
      await expect(page.getByTestId(oldId)).toHaveCount(0);
    }
  });
});
