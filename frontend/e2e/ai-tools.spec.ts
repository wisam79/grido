import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('AI Tools Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Execute Background Removal on uploaded image', async ({ page }) => {
    // Add image
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

    // Trigger AI background removal
    const bgRemovalBtn = page.getByRole('button', { name: /عزل الخلفية|عزل/ }).first();
    await expect(bgRemovalBtn).toBeVisible();
    await bgRemovalBtn.click();

    // Canvas stays stable and no crash occurs
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Biometric Face Framing action stability', async ({ page }) => {
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

    const faceFrameBtn = page.getByRole('button', { name: /تأطير الوجه|تأطير/ }).first();
    if (await faceFrameBtn.isVisible()) {
      await faceFrameBtn.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });
});
