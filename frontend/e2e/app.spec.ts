import { test, expect } from '@playwright/test';

import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Professional E2E & Visual Testing Suite', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Open app, upload image, save project, and read it back in the library', async ({
    page,
  }) => {
    await page.goto('/');

    await waitForAppReady(page);

    // تبديل الوضع إلى تعديل حر
    await page.getByTestId('mode-tab-single').click();
    await expect(page.locator('#canvas-area')).toBeVisible({ timeout: 15000 });

    // إدراج صورة
    await page.getByTestId('toolbar-insert').click();

    // فتح نافذة مكتبة المشاريع
    await page.getByTestId('toolbar-projects').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // التبديل إلى تبويب الحفظ
    await page.getByRole('tab', { name: /حفظ/ }).click();
    await page.fill('#proj-name', 'مشروع اختباري');

    await page.getByRole('button', { name: /حفظ المشروع|حفظ في قاعدة البيانات/ }).click();

    await expect(page.getByText('تم حفظ المشروع بنجاح في قاعدة البيانات المحلية')).toBeVisible();

    // قراءة فعلية للمكتبة: النداء الموكول GetAllProjects يرسم المشروع المرجعي
    await page.getByRole('tab', { name: /المشاريع/ }).click();
    await expect(page.getByText('مشروع اختباري أول')).toBeVisible();
  });
});
