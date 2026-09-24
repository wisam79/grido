import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * لوحة الأدوات (Ctrl+K) — مصدر واحد ومدخل واحد.
 *
 * تُقفل هذه المواصفة الدرس الذي كسر بوابة الدخان: لا يجوز وجود لوحة أوامر
 * ثانية تختطف Ctrl+K، ولا يجوز إعلان أمر بحدث grido:* بلا مستمع حقيقي.
 */
test.describe('مدخل لوحة الأدوات وأوامرها الحقيقية', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('قائمة «عرض» تفتح اللوحة نفسها بلا نسخة حوارية موازية', async ({ page }) => {
    await page.getByRole('button', { name: 'عرض' }).click();
    await page.getByRole('menuitem', { name: /لوحة الأدوات/ }).click();

    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible();
    await expect(palette).toHaveCount(1);
    // لا نسخة ثانية من اللوحة على شكل نافذة حوارية فوق الشريط
    await expect(page.locator('[data-slot="dialog-content"]')).toHaveCount(0);
  });

  test('Ctrl+K يفتح اللوحة النشطة الوحيدة', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await expect(page.locator('[data-slot="dialog-content"]')).toHaveCount(0);
  });

  test('أمر «تبديل المظهر» ينفّذ تبديلاً حقيقياً للمظهر', async ({ page }) => {
    const isDark = () =>
      page.evaluate(() => document.documentElement.classList.contains('dark'));
    const before = await isDark();

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('grido:toggle-theme')));

    await expect.poll(isDark, { timeout: 5000 }).toBe(!before);
  });

  test('أمر «الحساب والتراخيص» يفتح نافذته فعلاً', async ({ page }) => {
    const dialog = page.getByRole('dialog').first();
    if (await dialog.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('grido:open-account')));

    await expect(dialog).toBeVisible();
  });

  test('أمر «إضافة نص» من اللوحة يُدرج عنصراً فعلاً', async ({ page }) => {
    // التطبيق قد يقلع على وضع الكولاج (يعرض خانات لا عناصر حرّة) — نثبّت الوضع أولاً
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .click();

    const konvaTexts = () =>
      page.evaluate(() => {
        const stage = (window as unknown as { __gridoStage?: { find: (s: string) => unknown[] } })
          .__gridoStage;
        return stage ? stage.find('Text').length : -1;
      });

    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    const before = await konvaTexts();

    await page.getByTestId('command-insert-text').click();

    await expect(page.getByTestId('command-palette')).toBeHidden();
    await expect.poll(konvaTexts, { timeout: 5000 }).toBeGreaterThan(before);
  });
});
