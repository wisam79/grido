import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Background Removal Smoke Test', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Upload image and expose background removal controls', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).first().click();
    await page.getByTestId('toolbar-insert').or(page.getByRole('button', { name: /إدراج/ })).first().click();

    await expect(page.getByRole('button', { name: 'عزل الخلفية' }).first()).toBeVisible();
  });

});
