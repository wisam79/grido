import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * @smoke — دخان محرك العرض (Engine Smoke)
 *
 * WebKitGTK (لينكس) وWebView2 (ويندوز) هما محركان الإصدار الفعليان، بينما بقية
 * الحزمة تعمل على chromium فقط — فأعطال المحرك (رسم الكانفاس، معالجة لوحة
 * المفاتيح، ترتيب الطبقات) لا يلتقطها chromium أصلاً.
 *
 * يُشترط في هذه المواصفة أن تكون **مستقلّة عن وضع الكانفاس** (كولاج/تعديل حر):
 * التطبيق قد يقلع على أي منهما، فلا تُثبَّت أي أداة أو تبويب بعينه — تُقاس
 * العقود العامة فقط (كانفاس يُرسم، شريط يعمل، اختصار يفتح اللوحة). وهي ضحلة
 * ومستقرة عمداً لتصلح لبوابة محرك لا لاستبدال الحزمة الكاملة.
 */

/** كل أزرار أدوات الشريط (لا تشمل زر «كل الأدوات» الثابت) */
const railToolButtons = '[data-testid^="rail-collage-"], [data-testid^="rail-studio-"]';

test.describe('@smoke إقلاع المحرك والمسارات الحرجة', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    // الشريط الجانبي يظهر فقط خارج العرض المدمج (>= 1024px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('يُقلع التطبيق ويرسم الكانفاس والشريط الجانبي', async ({ page }) => {
    await expect(page.getByTestId('workspace-canvas-shell')).toBeVisible();
    await expect(page.getByTestId('workspace-panel-rail')).toBeVisible();
    await expect(page.locator(railToolButtons).first()).toBeVisible();

    // الكانفاس الحقيقي (Konva) — أهم ما يختلف بين المحركات: سياق 2d بلا دعم،
    // أو كانفاس بأبعاد صفرية، يظهر هنا قبل أي شيء آخر.
    const konvaCanvas = page.locator('#canvas-area canvas').first();
    await expect(konvaCanvas).toBeVisible();

    const probe = await konvaCanvas.evaluate((el) => {
      const canvas = el as HTMLCanvasElement;
      return {
        hasContext: canvas.getContext('2d') !== null,
        width: canvas.width,
        height: canvas.height,
        dataUrlLength: canvas.toDataURL().length,
      };
    });

    expect(probe.hasContext).toBe(true);
    expect(probe.width).toBeGreaterThan(0);
    expect(probe.height).toBeGreaterThan(0);
    expect(probe.dataUrlLength).toBeGreaterThan(100);
  });

  test('Ctrl+K يفتح لوحة الأدوات وEsc يغلقها', async ({ page }) => {
    const palette = page.getByTestId('command-palette');

    // ⚠️ حارس السبب الجذري: `mod` في مكتبات الاختصارات تُحلّ من `navigator.userAgent`
    // (Cmd على macOS وCtrl غيرها). المشروع يقدّم نفسه كـWebKitGTK/لينكس في
    // playwright.config.ts؛ فلو عاد ليبدو macOS لصار Ctrl+K مفحوصاً على اختصار
    // غير المربوط أصلاً — فشل مُبهم بدل رسالة واضحة.
    const userAgent = await page.evaluate(() => navigator.userAgent);
    expect(
      userAgent,
      'مشروع webkit يجب أن يقدّم نفسه كمنصة PC (WebKitGTK/لينكس) — User-Agent يشبه macOS يقلب معنى mod إلى Cmd ويفسد فحوص الاختصارات',
    ).not.toMatch(/mac/i);

    await page.keyboard.press('Control+k');
    await expect(palette).toBeVisible();
    // أدوات الوضع الحالي تظهر في اللوحة (أي وضع كان)
    await expect(page.locator('[data-testid^="launcher-"]').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
  });

  test('اختيار أداة من الشريط يفتح لوحتها ويعلّمها نشطة', async ({ page }) => {
    // التبويب الأول مفتوح افتراضياً عند الإقلاع — نتحقق من حالته النشطة
    const firstTool = page.locator(railToolButtons).first();
    await expect(firstTool).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('workspace-panel-templates')).toHaveAttribute(
      'data-collapsed',
      'false',
    );

    // اختيار أداة أخرى من الشريط يفعّلها ويبقي اللوحة مفتوحة
    const secondTool = page.locator(railToolButtons).nth(1);
    await secondTool.click();
    await expect(secondTool).toHaveAttribute('aria-pressed', 'true');
    await expect(firstTool).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('workspace-panel-templates')).toHaveAttribute(
      'data-collapsed',
      'false',
    );
  });
});
