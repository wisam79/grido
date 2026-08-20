import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Professional E2E & Visual Testing Suite', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Open app, upload image, and save project', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();

    await page.getByRole('button', { name: 'وضع التعديل الحر' }).or(page.getByTitle('وضع التعديل الحر')).click();
    await page.getByRole('button', { name: /إضافة صورة|رفع صورة/ }).or(page.getByTitle(/صورة جديدة/)).first().click();

    await expect(page.getByText('خصائص الصورة')).toBeVisible();

    await page.getByTitle('مكتبة المشاريع المحلية').click();
    await expect(page.getByRole('dialog', { name: 'مكتبة المشاريع المحلية' })).toBeVisible();

    await page.fill('#proj-name', 'مشروع اختباري');

    await page.getByRole('button', { name: /حفظ المشروع|حفظ في قاعدة البيانات/ }).click();

    await expect(page.getByText('تم حفظ المشروع بنجاح في قاعدة البيانات المحلية')).toBeVisible();
  });

});
