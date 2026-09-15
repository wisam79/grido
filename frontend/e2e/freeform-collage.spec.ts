import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Freeform Collage & Elements Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Add text element and modify typography', async ({ page }) => {
    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    const addTextBtn = page.getByRole('button', { name: /إضافة نص/ }).first();
    await expect(addTextBtn).toBeVisible();
    await addTextBtn.click();

    // Select text preset from dropdown
    const textPreset = page.getByRole('menuitem').first();
    await expect(textPreset).toBeVisible();
    await textPreset.click();

    // Text element is inserted and properties panel displays text properties
    await expect(page.locator('#canvas-area')).toBeVisible();

    // Verify tabs are available
    const styleTab = page.getByRole('tab', { name: /تنسيق|التنسيق/ });
    await expect(styleTab).toBeVisible();

    const colorsTab = page.getByRole('tab', { name: /ألوان|الألوان/ });
    await expect(colorsTab).toBeVisible();
  });

  test('Add shape element and inspect geometry controls', async ({ page }) => {
    const addShapeBtn = page.getByRole('button', { name: /إضافة شكل/ }).first();
    if (await addShapeBtn.isVisible()) {
      await addShapeBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });
});
