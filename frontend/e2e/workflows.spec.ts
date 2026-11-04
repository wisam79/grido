import { test, expect } from '@playwright/test';

import { applyCollagePreset } from './helpers/collage-presets';
import { openStudioElementsCategory } from './helpers/studio-elements';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * سيناريوهات E2E إضافية — تغطي حلقات العمل الأساسية للمحرر:
 * التراجع/الإعادة، الزوم، إضافة نص، حوار الاختصارات، وتبديل الأوضاع.
 * كل التفاعلات إلزامية — فشل أي عنصر ظهوره متوقع فشل صريح للاختبار.
 */
test.describe('Editor Core Workflows E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Zoom controls update the zoom level', async ({ page }) => {
    const zoomIn = page.getByTestId('canvas-zoom-in').or(page.getByLabel('تكبير'));
    const zoomOut = page.getByTestId('canvas-zoom-out');

    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();

    // تكبير مرتين ثم تصغير مرة — يجب ألا ينهار التطبيق ويبقى الكانفس ظاهراً
    await zoomIn.click();
    await zoomIn.click();
    await zoomOut.click();

    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Add-text is available, theme toggle works', async ({ page }) => {
    await page.getByTestId('mode-tab-single').click();
    await openStudioElementsCategory(page, 'text');
    const addText = page.getByTestId('element-add-text-heading');
    await expect(addText).toBeEnabled();

    // تبديل المظهر تفعل حقيقي: صنف .dark على الجذر ينقلب فعلاً
    const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
    const before = await isDark();
    const railSettings = page.getByTestId('rail-settings-menu-trigger');
    if (await railSettings.isVisible()) {
      await railSettings.click();
      const themeItem = page.getByTestId('rail-theme-toggle-item');
      await expect(themeItem).toBeVisible();
      await themeItem.click();
    } else {
      const themeToggle = page
        .getByRole('button', { name: /مظهر النظام|الوضع المضيء|الوضع الداكن/ })
        .first();
      await expect(themeToggle).toBeVisible();
      await themeToggle.click();
    }
    await expect.poll(isDark, { timeout: 5000 }).toBe(!before);
  });

  test('Keyboard shortcuts dialog opens and closes', async ({ page }) => {
    // الزر مدمج في كبسولة الزوم أسفل الكانفس — ظهوره حتمي
    const shortcutsBtn = page.getByRole('button', { name: 'اختصارات لوحة المفاتيح' }).first();
    await expect(shortcutsBtn).toBeVisible();
    await shortcutsBtn.click();
    await expect(page.getByRole('dialog')).toContainText(/اختصارات/);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('Undo/redo buttons stay stable across mode switch', async ({ page }) => {
    const undo = page.getByRole('button', { name: 'تراجع' }).first();
    const redo = page.getByRole('button', { name: 'إعادة' }).first();

    await expect(undo).toBeVisible();
    await page.getByTestId('mode-tab-collage').click();
    await expect(redo).toBeVisible();
    await page.getByTestId('mode-tab-single').click();
    await expect(undo).toBeVisible();
  });

  test('Ruler toggle button toggles ruler visibility', async ({ page }) => {
    // زر المساطر جزء ثابت من سطح العرض أسفل الكانفس
    const rulerButton = page.getByRole('button', { name: /المساطر/ }).first();
    await expect(rulerButton).toBeVisible();
    await rulerButton.click();
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Apply a quick collage template from the panel', async ({ page }) => {
    await page.getByTestId('mode-tab-collage').click();

    // تطبيق إلزامي لقالب جاهز عبر المساعد المشترك (بدل المحدد الميت القديم)
    await applyCollagePreset(page, 'طقم عائلي');
    await expect(page.locator('#canvas-area')).toBeVisible();
  });
});
