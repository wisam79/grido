import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Element Properties & Hierarchy E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Image properties expose all 4 standardized tabs without dead tabs', async ({ page }) => {
    // Add image
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

    // The 4 standardized tabs
    const styleTab = page.getByRole('tab', { name: /تنسيق|التنسيق/ }).first();
    const colorsTab = page.getByRole('tab', { name: /ألوان|الألوان/ }).first();
    const effectsTab = page.getByRole('tab', { name: /تأثيرات|التأثيرات/ }).first();
    const arrangeTab = page.getByRole('tab', { name: /ترتيب|الترتيب/ }).first();

    await expect(styleTab).toBeVisible();
    await expect(colorsTab).toBeVisible();
    await expect(effectsTab).toBeVisible();
    await expect(arrangeTab).toBeVisible();

    // Click Colors tab and verify opacity slider is present
    await colorsTab.click();
    await expect(page.getByText(/شفافية/).first()).toBeVisible();

    // Click Arrange tab and verify flip/rotation controls
    await arrangeTab.click();
    await expect(page.getByText('التدوير والقلب')).toBeVisible();
  });
});
