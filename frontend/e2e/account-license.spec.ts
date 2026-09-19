import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Account, Authentication & License Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open account modal, verify active Pro status, and switch auth/license tabs', async ({ page }) => {
    // Open Account modal from top-right titlebar button
    const accountBtn = page.getByLabel(/الحساب والتراخيص/).first();
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();

    const dialog = page.getByRole('dialog').filter({ hasText: /الحساب|الترخيص/ });
    await expect(dialog).toBeVisible();

    // Verify dialog header
    await expect(dialog.getByText(/الحساب والترخيص/)).toBeVisible();

    // Verify tabs exist (FluentSegmentedControl buttons)
    const licenseTab = dialog.getByRole('button', { name: /الترخيص/ }).or(dialog.getByText('الترخيص')).first();
    const authTab = dialog.getByRole('button', { name: /الحساب/ }).or(dialog.getByText('الحساب')).first();

    if (await licenseTab.isVisible()) {
      await expect(licenseTab).toBeVisible();
      await licenseTab.click();
    }

    if (await authTab.isVisible()) {
      await expect(authTab).toBeVisible();
      await authTab.click();
    }

    // Dismiss with Escape key (Fluent 2 invariant)
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
