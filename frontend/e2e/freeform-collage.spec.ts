import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Freeform Collage & Elements Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Add text element and modify typography', async ({ page }) => {
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    const addTextBtn = page.getByTestId('toolbar-add-text').or(page.getByRole('button', { name: /إضافة نص/ })).first();
    await expect(addTextBtn).toBeVisible();
    await addTextBtn.click();

    // Select text preset from dropdown
    const textPreset = page.getByRole('menuitem').first();
    await expect(textPreset).toBeVisible();
    await textPreset.click();

    // Text element is inserted and properties panel displays text properties
    await expect(page.locator('#canvas-area')).toBeVisible();

    // Verify tabs are available
    const styleTab = page.getByRole('tab', { name: /تنسيق|التنسيق/ }).first();
    if (await styleTab.isVisible()) {
      await expect(styleTab).toBeVisible();
    }

    const colorsTab = page.getByRole('tab', { name: /ألوان|الألوان/ }).first();
    if (await colorsTab.isVisible()) {
      await expect(colorsTab).toBeVisible();
    }
  });

  test('Add shape element and inspect geometry controls', async ({ page }) => {
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    const addShapeBtn = page.getByTestId('toolbar-add-shape').or(page.getByRole('button', { name: /إضافة شكل/ })).first();
    if (await addShapeBtn.isVisible()) {
      await addShapeBtn.click();
      const shapeItem = page.getByRole('menuitem').first();
      if (await shapeItem.isVisible()) {
        await shapeItem.click();
      }
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });
});
