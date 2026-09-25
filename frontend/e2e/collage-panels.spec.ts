import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Collage Mode Rails & Configuration Panels E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Switch between collage rail tools: grid, presets, paper, autofill, arrange (no backdrop duplicate)', async ({
    page,
  }) => {
    // Switch to Collage mode
    await page
      .getByTestId('mode-tab-collage')
      .or(page.getByRole('tab', { name: 'كولاج', exact: true }))
      .first()
      .click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 1. Grid tool
    const gridBtn = page.getByTestId('rail-collage-grid');
    if (await gridBtn.isVisible()) {
      await gridBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }

    // 2. Presets tool
    const presetsBtn = page.getByTestId('rail-collage-presets');
    if (await presetsBtn.isVisible()) {
      await presetsBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }

    // 3. Paper tool
    const paperBtn = page.getByTestId('rail-collage-paper');
    if (await paperBtn.isVisible()) {
      await paperBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }

    // 4. Autofill tool
    const autofillBtn = page.getByTestId('rail-collage-autofill');
    if (await autofillBtn.isVisible()) {
      await autofillBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }

    // 5. Backdrop tab deleted — every control lives in the right column
    // (CollageSettings/GeneralSettings/SlotProperties); no rail button remains
    await expect(page.getByTestId('rail-collage-backdrop')).toHaveCount(0);

    // 6. Arrange tool
    const arrangeBtn = page.getByTestId('rail-collage-arrange');
    if (await arrangeBtn.isVisible()) {
      await arrangeBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });
});
