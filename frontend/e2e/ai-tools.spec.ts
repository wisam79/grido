import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('AI Tools Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Execute Background Removal on uploaded image', async ({ page }) => {
    // Add image
    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await page.getByRole('button', { name: /إدراج صورة جديدة|إدراج/ }).click();

    // Trigger AI background removal
    const bgRemovalBtn = page.getByRole('button', { name: /عزل الخلفية|عزل/ }).first();
    await expect(bgRemovalBtn).toBeVisible();
    await bgRemovalBtn.click();

    // Canvas stays stable and no crash occurs
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Biometric Face Framing action stability', async ({ page }) => {
    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await page.getByRole('button', { name: /إدراج صورة جديدة|إدراج/ }).click();

    const faceFrameBtn = page.getByRole('button', { name: /تأطير الوجه|تأطير/ }).first();
    if (await faceFrameBtn.isVisible()) {
      await faceFrameBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });
});
