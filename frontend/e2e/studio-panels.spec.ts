import { test, expect } from '@playwright/test';

import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Studio Panels & Workspace Tool Rail E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Switch studio tools from their independent rail buttons', async ({ page }) => {
    // Ensure in Single / Freeform mode
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // 1. كل أداة إدراج لها زرها المستقل في شريط الأيقونات نفسه
    for (const tool of ['layers', 'stickers', 'shapes', 'text']) {
      await expect(page.getByTestId(`rail-studio-${tool}`)).toHaveCount(1);
    }
    await expect(page.getByTestId('rail-studio-content')).toHaveCount(0);

    // 2. كل زر يفتح لوحه مباشرة — لا شريط تبويبات داخلي فوق اللوح
    for (const [tool, panelId] of [
      ['layers', 'studio-layers-panel'],
      ['stickers', 'studio-elements-stickers'],
      ['shapes', 'studio-elements-shapes'],
      ['text', 'studio-elements-text'],
    ] as const) {
      const railBtn = page.getByTestId(`rail-studio-${tool}`);
      const panel = page.getByTestId(panelId);
      if (!(await panel.isVisible())) {
        await railBtn.click();
      }
      if (!(await panel.isVisible())) {
        // النقر على وجهة نشطة يطوي لوحها — نقرة ثانية تعيد الفتح
        await railBtn.click();
      }
      await expect(panel).toBeVisible();
      await expect(railBtn).toHaveAttribute('aria-pressed', 'true');
    }

    // 3. شريط التبويبات الداخلي القديم لم يبق له أثر
    for (const segmentedId of [
      'segmented-stickers',
      'segmented-shapes',
      'segmented-text',
      'segmented-layers',
      'segmented-elements',
    ]) {
      await expect(page.getByTestId(segmentedId)).toHaveCount(0);
    }

    // 4. Zen mode toggle
    const zenBtn = page.getByTestId('rail-zen-mode');
    if (await zenBtn.isVisible()) {
      await zenBtn.click(); // Toggle on
      await expect(page.locator('#canvas-area')).toBeVisible();
      await zenBtn.click(); // Toggle off
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });

  test('Open rail tool launcher popover and list the four studio tools', async ({ page }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();

    const launcherBtn = page.getByTestId('rail-tool-launcher');
    if (await launcherBtn.isVisible()) {
      await launcherBtn.click();
      const popover = page
        .getByRole('dialog')
        .or(page.locator('[data-radix-popper-content-wrapper]'))
        .first();
      await expect(popover).toBeVisible();
      for (const tool of ['layers', 'stickers', 'shapes', 'text']) {
        await expect(page.getByTestId(`launcher-${tool}`)).toBeVisible();
      }
      await expect(page.getByTestId('launcher-content')).toHaveCount(0);

      // Dismiss by pressing Escape
      await page.keyboard.press('Escape');
    }
  });
});
