import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Collage Mode and Filters E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Switch to collage mode and apply an official template', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
    await page.getByTitle('وضع الكولاج').click();

    // Toggle open official print templates
    const toggleBtn = page.getByRole('button', { name: 'قوالب الكولاج والطباعة' });
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Select the mixed template
    const mixedTemplateCard = page.getByText('طقم هوية ومعاملات عراقية (مختلط)').first();
    await expect(mixedTemplateCard).toBeVisible();
    await mixedTemplateCard.click();
  });

});
