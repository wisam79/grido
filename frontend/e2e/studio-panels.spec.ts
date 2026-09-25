import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Studio Panels & Workspace Tool Rail E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Switch studio rail tools and toggle Zen mode', async ({ page }) => {
    // Ensure in Single / Freeform mode
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 1. Layers tool
    const layersBtn = page.getByTestId('rail-studio-layers');
    if (await layersBtn.isVisible()) {
      await layersBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }

    // 1b. Elements hub (merged stickers/shapes/text) with internal switcher
    const elementsBtn = page.getByTestId('rail-studio-elements');
    if (await elementsBtn.isVisible()) {
      await elementsBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
    await expect(page.getByTestId('rail-studio-stickers')).toHaveCount(0);
    await expect(page.getByTestId('rail-studio-shapes')).toHaveCount(0);
    await expect(page.getByTestId('rail-studio-text')).toHaveCount(0);

    // 2. Fonts tool
    const fontsBtn = page.getByTestId('rail-studio-fonts');
    if (await fontsBtn.isVisible()) {
      await fontsBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }

    // 3. Palette tool
    const paletteBtn = page.getByTestId('rail-studio-palette');
    if (await paletteBtn.isVisible()) {
      await paletteBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }

    // 4. Backdrops tool
    const backdropsBtn = page.getByTestId('rail-studio-backdrops');
    if (await backdropsBtn.isVisible()) {
      await backdropsBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }

    // 5. Zen mode toggle
    const zenBtn = page.getByTestId('rail-zen-mode');
    if (await zenBtn.isVisible()) {
      await zenBtn.click(); // Toggle on
      await expect(page.locator('#canvas-area')).toBeVisible();
      await zenBtn.click(); // Toggle off
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });

  test('Open rail tool launcher popover', async ({ page }) => {
    const launcherBtn = page.getByTestId('rail-tool-launcher');
    if (await launcherBtn.isVisible()) {
      await launcherBtn.click();
      const popover = page
        .getByRole('dialog')
        .or(page.locator('[data-radix-popper-content-wrapper]'))
        .first();
      await expect(popover).toBeVisible();

      // Dismiss by pressing Escape
      await page.keyboard.press('Escape');
    }
  });
});
