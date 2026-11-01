import { test, expect } from '@playwright/test';

import { stageImageSources } from './helpers/konva-probes';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('AI Tools Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Execute Background Removal on uploaded image', async ({ page }) => {
    // Add image
    await page.getByTestId('mode-tab-single').click();
    await page.getByTestId('toolbar-insert').click();

    // Trigger AI background removal — الزر حتمي الظهور بعد إدراج صورة
    const bgRemovalBtn = page.getByRole('button', { name: /عزل الخلفية|عزل/ }).first();
    await expect(bgRemovalBtn).toBeVisible();
    await bgRemovalBtn.click();

    // أثر فعلي: رابط الصورة الموكول (/local-image/mock_bg_removed.png) وصل
    // إلى عقدة Konva — النتيجة طُبّقت على الكانفس لا مجرد عدم انهيار
    await expect
      .poll(() => stageImageSources(page), { timeout: 20000 })
      .toContain('mock_bg_removed');

    // Canvas stays stable and no crash occurs
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Face restoration applies the mocked result to the canvas', async ({ page }) => {
    await page.getByTestId('mode-tab-single').click();
    await page.getByTestId('toolbar-insert').click();

    // «ترميم الوجه» يمر عبر EnhanceImageWithAI الموكول بعقد الخادم الحقيقي (JSON)
    const enhanceBtn = page.getByRole('button', { name: /ترميم الوجه/ }).first();
    await expect(enhanceBtn).toBeVisible();
    await enhanceBtn.click();

    // أثر فعلي: النتيجة تُحفظ موكولياً ثم تُطبَّق على عقدة الصورة في الكانفس
    await expect.poll(() => stageImageSources(page), { timeout: 20000 }).toContain('saved-b64.png');

    // رسالة النجاح الموثقة في use-ai-enhance بعد commit النتيجة
    await expect(page.getByText(/تم ترميم الصورة بنجاح/)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#canvas-area')).toBeVisible();
  });
});
