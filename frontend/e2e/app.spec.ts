import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Professional E2E & Visual Testing Suite', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Open app, upload image, and save project', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible({ timeout: 15000 });

    await page.getByRole('tab', { name: 'تعديل حر' }).click();
    await expect(page.locator('#canvas-area')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'إدراج صورة جديدة' }).click();

    await expect(page.getByRole('button', { name: 'عزل الخلفية' }).first()).toBeVisible();

    await page.getByRole('button', { name: /مكتبة المشاريع/ }).or(page.getByTitle('مكتبة المشاريع المحلية')).click();
    await expect(page.getByRole('dialog', { name: /مكتبة المشاريع/ })).toBeVisible();

    await page.getByRole('tab', { name: /حفظ/ }).click();
    await page.fill('#proj-name', 'مشروع اختباري');

    await page.getByRole('button', { name: /حفظ المشروع|حفظ في قاعدة البيانات/ }).click();

    await expect(page.getByText('تم حفظ المشروع بنجاح في قاعدة البيانات المحلية')).toBeVisible();
  });

});
