import { test, expect } from '@playwright/test';

import { stageImageSources } from './helpers/konva-probes';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Background Removal Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Upload image and run background removal end to end', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await page.getByTestId('mode-tab-single').click();
    await page.getByTestId('toolbar-insert').click();

    const bgButton = page.getByRole('button', { name: 'عزل الخلفية' }).first();
    await expect(bgButton).toBeVisible();
    await bgButton.click();

    // سلوك فعلي لا مجرد ظهور: النتيجة الموكولة تُطبَّق على عقدة الصورة في الكانفس
    await expect
      .poll(() => stageImageSources(page), { timeout: 20000 })
      .toContain('mock_bg_removed');

    // والزر يعود لحالته بعد اكتمال العملية (دورة المعالجة اكتملت)
    await expect(bgButton).toHaveAttribute('title', 'عزل الخلفية', { timeout: 15000 });
    await expect(page.locator('#canvas-area')).toBeVisible();
  });
});
