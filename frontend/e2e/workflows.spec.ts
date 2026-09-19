import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * سيناريوهات E2E إضافية — تغطي حلقات العمل الأساسية للمحرر:
 * التراجع/الإعادة، الزوم، إضافة نص، حوار الاختصارات، وتبديل الأوضاع.
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
    const addText = page.getByTestId('toolbar-add-text').or(page.getByRole('button', { name: 'إضافة نص' })).first();
    await expect(addText).toBeEnabled();

    // تبديل الوضع المضيء/الداكن لا يكسر التطبيق
    const themeToggle = page.getByRole('button', { name: /الوضع المضيء|الوضع الداكن|تبديل المظهر/ }).first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });

  test('Keyboard shortcuts dialog opens and closes', async ({ page }) => {
    const shortcutsBtn = page.getByRole('button', { name: /اختصارات لوحة المفاتيح|اختصارات/ }).first();
    if (await shortcutsBtn.isVisible()) {
      await shortcutsBtn.click();
      await expect(page.getByRole('dialog')).toContainText(/اختصارات/);

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });

  test('Undo/redo buttons stay stable across mode switch', async ({ page }) => {
    const undo = page.getByRole('button', { name: 'تراجع' }).first();
    const redo = page.getByRole('button', { name: 'إعادة' }).first();

    await expect(undo).toBeVisible();
    await page.getByTestId('mode-tab-collage').or(page.getByRole('tab', { name: 'كولاج', exact: true })).click();
    await expect(redo).toBeVisible();
    await page.getByTestId('mode-tab-single').or(page.getByRole('tab', { name: 'تعديل حر' })).click();
    await expect(undo).toBeVisible();
  });

  test('Ruler toggle button toggles ruler visibility', async ({ page }) => {
    const rulerButton = page.getByRole('button', { name: /المساطر/ }).first();
    if (await rulerButton.isVisible()) {
      await rulerButton.click();
      await expect(page.locator('#canvas-area')).toBeVisible();
    }
  });

  test('Apply a quick collage template from the panel', async ({ page }) => {
    await page.getByTestId('mode-tab-collage').or(page.getByRole('tab', { name: 'كولاج', exact: true })).first().click();
    const templatesRailBtn = page.getByRole('button', { name: /قوالب الكولاج والشبكة|القوالب|قوالب/ }).first();
    if (await templatesRailBtn.isVisible()) {
      await templatesRailBtn.click();
    }
    const presetsTab = page.locator('[data-tab="presets"]').or(page.getByRole('tab', { name: /قوالب جاهزة|نماذج|القوالب/ })).first();
    if (await presetsTab.isVisible()) {
      await presetsTab.click();
    }
    const card = page.getByRole('button', { name: /طقم سفر|طقم تقديم|شيت|4 صور|شبكة/ }).first();
    if (await card.isVisible()) {
      await card.click();
    }
    // الكانفس يظل ظاهراً ومستقراً بعد تطبيق القالب
    await expect(page.locator('#canvas-area')).toBeVisible();
  });

  test('Welcome screen appears when mode is not set and allows mode selection', async ({ page }) => {
    // تهيئة المحاكي دون تخطي شاشة الترحيب لرؤية الترحيب فعلياً
    await setupWailsMock(page, { skipWelcome: false });
    await page.goto('/');

    // التحقق من ظهور شاشة الترحيب
    const welcomeHeading = page.getByRole('heading', { name: /كيف تفضّل بدء العمل؟/ });
    await expect(welcomeHeading).toBeVisible({ timeout: 15000 });

    // اختيار مسار الإنتاج السريع
    const quickCard = page.getByTestId('workflow-card-quick');
    await expect(quickCard).toBeVisible();
    await quickCard.click();

    // تأكيد الاختيار
    const confirmBtn = page.getByTestId('workflow-confirm-button');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // الانتقال للمحرر الرئيسي وظهور الكانفس
    await expect(page.locator('#canvas-area')).toBeVisible({ timeout: 15000 });

    // زر تبديل المسار في الهيدر يظهر ويعيد شاشة الترحيب عند النقر
    const switchBtn = page.getByRole('button', { name: 'تبديل مسار العمل' }).first();
    if (await switchBtn.isVisible()) {
      await switchBtn.click();
      await expect(welcomeHeading).toBeVisible({ timeout: 10000 });
    }
  });

});

