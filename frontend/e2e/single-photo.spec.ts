import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Single Photo Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Single photo mode loads with canvas, toolbar and bottom deck', async ({ page }) => {
    await expect(page.locator('#canvas-area')).toBeVisible();
    await expect(page.getByRole('button', { name: /إدراج صورة|إدراج|إضافة صورة/ }).or(page.getByTitle(/صورة جديدة/)).first()).toBeVisible();
    await expect(page.getByLabel('تكبير')).toBeVisible();
    await expect(page.getByLabel('تصغير')).toBeVisible();
  });

  test('Add image, view properties panel and image controls', async ({ page }) => {
    // Switch to freeform mode and add image
    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await page.getByRole('button', { name: 'إدراج صورة جديدة' }).click();

    // Verify properties panel appears with action buttons
    await expect(page.getByRole('button', { name: 'قص وتدوير' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'عزل الخلفية' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'ترميم الوجه' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'تأطير الوجه' }).first()).toBeVisible();
    await expect(page.getByText('استدارة الزوايا')).toBeVisible();
  });
});
