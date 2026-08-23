import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

test.describe('Collage Mode and Filters E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Switch to collage mode and apply an official template', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
    await page.getByTitle('وضع الكولاج').click();

    // لوحة القوالب تعرض بطاقات القوالب الجاهزة مباشرة (تصميم Fluent 2)
    const gridTemplateCard = page.getByRole('button', { name: /2×2 4 صور/ }).first();
    await expect(gridTemplateCard).toBeVisible();
    await gridTemplateCard.click();

    // شريط الحالة يظل مستقراً بعد تطبيق القالب (مطابقة تامة لتفادي تعارض عناوين الألواح)
    await expect(page.getByText('جاهز', { exact: true })).toBeVisible();
  });

});
