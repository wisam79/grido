import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Element Properties & Hierarchy E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Image properties expose all 4 standardized tabs without dead tabs', async ({ page }) => {
    // Add image
    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await page.getByRole('button', { name: 'إدراج صورة جديدة' }).click();

    // The 4 standardized tabs
    const styleTab = page.getByRole('tab', { name: /تنسيق|التنسيق/ });
    const colorsTab = page.getByRole('tab', { name: /ألوان|الألوان/ });
    const effectsTab = page.getByRole('tab', { name: /تأثيرات|التأثيرات/ });
    const arrangeTab = page.getByRole('tab', { name: /ترتيب|الترتيب/ });

    await expect(styleTab).toBeVisible();
    await expect(colorsTab).toBeVisible();
    await expect(effectsTab).toBeVisible();
    await expect(arrangeTab).toBeVisible();

    // Click Colors tab and verify opacity slider is present
    await colorsTab.click();
    await expect(page.getByText(/شفافية/)).toBeVisible();

    // Click Arrange tab and verify flip/rotation controls
    await arrangeTab.click();
    await expect(page.getByText('التدوير والقلب')).toBeVisible();
  });
});
