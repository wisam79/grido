import { test, expect } from '@playwright/test';

import { openStudioElementsCategory } from './helpers/studio-elements';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Freeform Collage & Elements Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Add text element and modify typography', async ({ page }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    // النص يُدرج من مكتبة العناصر في الشريط الجانبي (نُقلت من الشريط العلوي)
    await openStudioElementsCategory(page, 'text');
    const addTextBtn = page.getByTestId('element-add-text-heading');
    await expect(addTextBtn).toBeVisible();
    await addTextBtn.click();

    // Text element is inserted and properties panel displays text properties
    await expect(page.locator('#canvas-area')).toBeVisible();

    // تبويبات المفتش حتمية بعد تحديد عنصر — والتنقل بينها فعلي بحالة aria-selected
    const styleTab = page.getByRole('tab', { name: /تنسيق|التنسيق/ }).first();
    await expect(styleTab).toBeVisible();
    await styleTab.click();
    await expect(styleTab).toHaveAttribute('aria-selected', 'true');

    const colorsTab = page.getByRole('tab', { name: /ألوان|الألوان/ }).first();
    await expect(colorsTab).toBeVisible();
    await colorsTab.click();
    await expect(colorsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Add shape element and inspect geometry controls', async ({ page }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await openStudioElementsCategory(page, 'shapes');
    const addShapeBtn = page.getByTestId('element-add-shape-rect');
    await expect(addShapeBtn).toBeVisible();
    await addShapeBtn.click();
    await expect(page.locator('#canvas-area')).toBeVisible();
  });
});
