import { test, expect } from '@playwright/test';

import { applyCollagePreset } from './helpers/collage-presets';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Collage Mode and Filters E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Switch to collage mode and apply an official template', async ({ page }) => {
    await page.goto('/');

    await waitForAppReady(page);
    await page.getByTestId('mode-tab-collage').click();
    await expect(page.locator('#canvas-area')).toBeVisible();

    // تطبيق قالب رسمي فعلي («طقم سفر») من تبويب القوالب الجاهزة — كل خطوة إلزامية
    await applyCollagePreset(page, 'طقم سفر');

    // الكانفس يظل ظاهراً ومستقراً بعد تطبيق القالب، والقالب صار نشطاً
    // (تأكيد aria-pressed=true داخل applyCollagePreset)
    await expect(page.locator('#canvas-area')).toBeVisible();
  });
});
