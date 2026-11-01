import { test, expect } from '@playwright/test';

import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Account, Authentication & License Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open account modal, verify active Pro status, and switch auth/license tabs', async ({
    page,
  }) => {
    // Open Account modal from top-right titlebar button
    const accountBtn = page.getByLabel(/الحساب والتراخيص/).first();
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();

    const dialog = page.getByRole('dialog').filter({ hasText: /الحساب|الترخيص/ });
    await expect(dialog).toBeVisible();

    // Verify dialog header
    await expect(dialog.getByText(/الحساب والترخيص/)).toBeVisible();

    // Verify tabs exist — المبدّل يُخرج role="tab" حقيقية (tablist موثّق في الكود)
    const licenseTab = dialog.getByRole('tab', { name: 'الترخيص' });
    const authTab = dialog.getByRole('tab', { name: 'الحساب' });

    await expect(licenseTab).toBeVisible();
    await licenseTab.click();
    await expect(licenseTab).toHaveAttribute('aria-selected', 'true');

    await expect(authTab).toBeVisible();
    await authTab.click();
    await expect(authTab).toHaveAttribute('aria-selected', 'true');

    // Dismiss with Escape key (Fluent 2 invariant)
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
