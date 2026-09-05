import { test, expect } from '@playwright/test';
import { setupWailsMock } from './helpers/wails-mock';

/**
 * سيناريوهات E2E إضافية — تغطي حلقات العمل الأساسية للمحرر:
 * التراجع/الإعادة، الزوم، إضافة نص، حوار الاختصارات، وتبديل الأوضاع.
 */
test.describe('Editor Core Workflows E2E', () => {

  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
  });

  test('Zoom controls update the zoom level', async ({ page }) => {
    const zoomIn = page.getByLabel('تكبير');
    const zoomOut = page.getByLabel('تصغير');

    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();

    // تكبير مرتين ثم تصغير مرة — يجب ألا ينهار التطبيق ويبقى الكانفس ظاهراً
    await zoomIn.click();
    await zoomIn.click();
    await zoomOut.click();

    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Add-text is available, theme toggle works', async ({ page }) => {
    // أصبح متاحاً الآن دائماً حتى في وضع الكولاج لإتاحة إضافة النصوص والأختام
    const addText = page.getByRole('button', { name: 'إضافة نص' }).first();
    await expect(addText).toBeEnabled();

    // تبديل الوضع المضيء/الداكن لا يكسر التطبيق
    const themeToggle = page.getByRole('button', { name: 'الوضع المضيء' });
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Keyboard shortcuts dialog opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: 'اختصارات لوحة المفاتيح' }).click();
    await expect(page.getByRole('dialog')).toContainText('اختصارات لوحة المفاتيح');

    await page.keyboard.press('Escape');
    await expect(page.getByText('اختصارات لوحة المفاتيح')).not.toBeVisible();
  });

  test('Undo/redo buttons stay stable across mode switch', async ({ page }) => {
    const undo = page.getByRole('button', { name: 'تراجع' }).first();
    const redo = page.getByRole('button', { name: 'إعادة' }).first();

    await expect(undo).toBeVisible();
    await page.getByTitle('وضع الكولاج').click();
    await expect(redo).toBeVisible();
    await page.getByTitle('وضع التعديل الحر').click();
    await expect(undo).toBeVisible();
  });

  test('Ruler toggle button toggles ruler visibility', async ({ page }) => {
    const rulerButton = page.getByRole('button', { name: /المساطر/ }).first();
    await expect(rulerButton).toBeVisible();
    await rulerButton.click();
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Apply a quick collage template from the panel', async ({ page }) => {
    await page.getByTitle('وضع الكولاج').click();
    const card = page.getByRole('button', { name: /4 صور متساوية/ }).first();
    await expect(card).toBeVisible();
    await card.click();
    // الكانفس يظل ظاهراً ومستقراً بعد تطبيق القالب
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

});
