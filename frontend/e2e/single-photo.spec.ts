import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Single Photo Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Single photo mode loads with canvas, toolbar and bottom deck', async ({ page }) => {
    await expect(page.locator('#canvas-area')).toBeVisible();
    await expect(page.getByRole('button', { name: /إدراج صورة|إدراج|إضافة صورة/ }).or(page.getByTitle(/صورة جديدة/)).first()).toBeVisible();
    await expect(page.getByTestId('canvas-zoom-in').or(page.getByLabel('تكبير'))).toBeVisible();
    await expect(page.getByTestId('canvas-zoom-out')).toBeVisible();
  });

  test('Add image, view properties panel and image controls', async ({ page }) => {
    // Switch to freeform mode and add image
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

    // Verify properties panel appears with action buttons
    await expect(page.getByRole('button', { name: 'قص وتدوير' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'عزل الخلفية' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'ترميم الوجه' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'تأطير الوجه' }).first()).toBeVisible();
    await expect(page.getByText('استدارة الزوايا')).toBeVisible();
  });
});
