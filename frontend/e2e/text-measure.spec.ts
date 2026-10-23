import fs from 'node:fs';
import path from 'node:path';

import { test, expect } from '@playwright/test';

import { openStudioElementsCategory } from './helpers/studio-elements';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * حارس انحدار حقيقي لمحرك قياس النص: يعمل داخل Chromium بسياق Canvas فعلي
 * (jsdom بلا canvas لا يستطيع قياس Konva). يُحمَّل الملف المصدر عبر خادم Vite
 * مباشرةً لاختبار الدالة الفعلية لا نسخة مقلّدة.
 */
test.describe('Text measurement on a real canvas', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    // ارتفاع كافٍ ليظل النص ومقابض محوّله داخل مساحة العمل القابلة للنقر
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('wrapped Arabic text reports a multi-line height instead of one line', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const modulePath = '/src/lib/canvas/text-measure.ts';
      const mod = (await import(/* @vite-ignore */ modulePath)) as {
        measureTextHeightPx: (spec: Record<string, unknown>, widthPx: number) => number | null;
      };
      const spec = {
        text: 'سطر طويل من النص العربي يتجاوز عرض الصندوق بكثير ليلتف على عدة أسطر متتالية',
        fontFamily: 'Cairo, sans-serif',
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 1.2,
        wrap: 'word',
        direction: 'rtl',
        align: 'center',
      };
      return {
        narrow: mod.measureTextHeightPx(spec, 160),
        wide: mod.measureTextHeightPx(spec, 4000),
        singleLinePx: 32 * 1.2,
      };
    });

    expect(result.narrow).not.toBeNull();
    expect(result.wide).not.toBeNull();
    // العرض الضيق يلتف إلى عدة أسطر — هذا ما كان ينهار إلى سطر واحد مع textHeight
    expect(result.narrow as number).toBeGreaterThan(result.singleLinePx * 2);
    // العرض الواسع يحتمل السطر كاملاً
    expect(result.wide as number).toBeCloseTo(result.singleLinePx, 0);
  });

  test('width measurement ignores wrapping and grows with content', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const modulePath = '/src/lib/canvas/text-measure.ts';
      const mod = (await import(/* @vite-ignore */ modulePath)) as {
        measureTextWidthPx: (spec: Record<string, unknown>) => number | null;
      };
      const base = {
        fontFamily: 'Cairo, sans-serif',
        fontSize: 32,
        fontWeight: 700,
        wrap: 'none',
        direction: 'rtl',
      };
      return {
        short: mod.measureTextWidthPx({ ...base, text: 'نص' }),
        long: mod.measureTextWidthPx({
          ...base,
          text: 'نص عربي أطول بكثير من الأول بمرات عديدة',
        }),
      };
    });

    expect(result.short).not.toBeNull();
    expect(result.long).not.toBeNull();
    expect(result.long as number).toBeGreaterThan(result.short as number);
  });

  test('auto sizing hugs content; fixed keeps width and grows height by wrapping', async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const modulePath = '/src/lib/canvas/text-fit.ts';
      const mod = (await import(/* @vite-ignore */ modulePath)) as {
        fitTextGeometry: (
          source: Record<string, unknown>,
          canvasWidth: number,
          canvasHeight: number,
        ) => {
          width: number;
          height: number;
          x: number;
          y: number;
          widthPx: number;
          heightPx: number;
          measured: boolean;
        } | null;
        measureTextContentHeightPx: (
          source: Record<string, unknown>,
          widthPx: number,
        ) => number | null;
      };
      const base = {
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.1,
        rotation: 0,
        fontFamily: 'Cairo, sans-serif',
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 1.2,
        textAlign: 'center',
        wrap: 'word',
        textSizing: 'auto',
      };
      const shortText = 'نص';
      const longText = 'سطر طويل من النص العربي يتجاوز عرض الصندوق بكثير ليلتف على عدة أسطر';

      const shortAuto = mod.fitTextGeometry({ ...base, text: shortText }, 1000, 1000);
      const longAuto = mod.fitTextGeometry({ ...base, text: longText }, 1000, 1000);
      const longFixed = mod.fitTextGeometry(
        { ...base, text: longText, textSizing: 'fixed' },
        1000,
        1000,
      );
      const rotated = mod.fitTextGeometry({ ...base, text: longText, rotation: 90 }, 1000, 1000);

      const straightHeight = mod.measureTextContentHeightPx(
        { ...base, text: shortText, textSizing: 'fixed', curve: 0 },
        300,
      );
      const curvedHeight = mod.measureTextContentHeightPx(
        { ...base, text: shortText, textSizing: 'fixed', curve: 60 },
        300,
      );

      return { shortAuto, longAuto, longFixed, rotated, straightHeight, curvedHeight };
    });

    expect(result.shortAuto?.measured).toBe(true);
    expect(result.longAuto?.measured).toBe(true);
    // auto: العرض يتبع أطول سطر، والارتفاع يبقى سطراً واحداً
    expect(result.longAuto!.widthPx).toBeGreaterThan(result.shortAuto!.widthPx);
    expect(result.longAuto!.widthPx).toBeLessThanOrEqual(950);
    expect(result.longAuto!.heightPx).toBeCloseTo(32 * 1.2, 0);
    // المركز الأفقي محفوظ أثناء نمو العرض
    expect(result.longAuto!.x + result.longAuto!.width / 2).toBeCloseTo(0.25, 3);
    // fixed: العرض ثابت 300px والارتفاع يكبر بالالتفاف
    expect(result.longFixed!.widthPx).toBeCloseTo(300, 0);
    expect(result.longFixed!.heightPx).toBeGreaterThan(result.longAuto!.heightPx);
    // مع الدوران 90° يتحرك الأصل رأسياً للحفاظ على مركز العرض
    expect(result.rotated!.y).not.toBeCloseTo(0.2, 4);
    // النص المنحني يحتاج ارتفاعاً أكبر بمقدار هبوط القوس
    expect(result.curvedHeight as number).toBeGreaterThan(result.straightHeight as number);
  });

  test('auto-fit keeps the selection box hugging the text and centered on growth', async ({
    page,
  }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await openStudioElementsCategory(page, 'text');
    await page.getByTestId('element-add-text-heading').click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await expect(page.getByText('ملاءمة تلقائية').first()).toBeVisible();

    const readBox = () =>
      page.evaluate(() => {
        const stage = (
          window as unknown as {
            __gridoStage?: {
              scaleX: () => number;
              find: (selector: string) => Array<{
                width: () => number;
                height: () => number;
                nodes: () => Array<{
                  x: () => number;
                  y: () => number;
                  width: () => number;
                  height: () => number;
                }>;
              }>;
            };
          }
        ).__gridoStage;
        const tr = stage?.find('Transformer')?.[0];
        const node = tr?.nodes()?.[0];
        if (!tr || !node) return null;
        // المحوّل يقيس بوحدات منصة العرض لا بوحدات الكانفس — نطبعها للمقارنة
        const scale = stage!.scaleX();
        return {
          x: node.x(),
          y: node.y(),
          w: node.width(),
          h: node.height(),
          trW: tr.width() / scale,
          trH: tr.height() / scale,
        };
      });

    await expect.poll(readBox, { timeout: 8000 }).not.toBeNull();
    const initial = (await readBox())!;
    expect(initial.w).toBeGreaterThan(0);
    expect(initial.h).toBeGreaterThan(0);
    // الصندوق يحيط بالنص لا بحجم ورقة أكبر بكثير
    expect(initial.h).toBeLessThan(140);

    await page.getByRole('combobox', { name: 'حجم الخط', exact: true }).click();
    await page.getByRole('option', { name: '72px', exact: true }).click();

    await expect
      .poll(async () => (await readBox())?.w ?? 0, { timeout: 8000 })
      .toBeGreaterThan(initial.w + 1);
    const grown = (await readBox())!;

    // التكبير يوسّع العرض حول المركز: الموضع يُزاح بنصف الفرق
    const centerBefore = initial.x + initial.w / 2;
    const centerAfter = grown.x + grown.w / 2;
    expect(Math.abs(centerAfter - centerBefore)).toBeLessThan(1.5);
    // الارتفاع يتبع حجم الخط الجديد
    expect(grown.h).toBeGreaterThan(initial.h);
    // مربع التحديد يطابق عقدة النص بعد إعادة الملاءمة (يُحدَّث في إطار لاحق)
    await expect
      .poll(
        async () => {
          const box = await readBox();
          return box ? Math.abs(box.trW - box.w) : Number.POSITIVE_INFINITY;
        },
        { timeout: 8000 },
      )
      .toBeLessThanOrEqual(10);
    await expect
      .poll(
        async () => {
          const box = await readBox();
          return box ? Math.abs(box.trH - box.h) : Number.POSITIVE_INFINITY;
        },
        { timeout: 8000 },
      )
      .toBeLessThanOrEqual(10);
    await expect(page.getByText('72px · ملاءمة تلقائية')).toBeVisible();
  });

  test('corner handles scale the text font size proportionally', async ({ page }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await openStudioElementsCategory(page, 'text');
    await page.getByTestId('element-add-text-heading').click();
    await expect(page.getByRole('tabpanel')).toBeVisible();

    // خط 200px: صندوق 48px على لوحة 2480 يُعرض بـ47px فقط فتتداخل مقابض
    // الحواف مع الزوايا ويلتقط Konva أقربها بدل المقبض المقصود.
    await page.getByRole('combobox', { name: 'حجم الخط', exact: true }).click();
    await page.getByRole('option', { name: '200px', exact: true }).click();

    const readState = () =>
      page.evaluate(() => {
        type AnchorNode = {
          name: () => string;
          getAbsolutePosition: () => { x: number; y: number };
          getClientRect: () => { width: number };
        };
        const stage = (
          window as unknown as {
            __gridoStage?: {
              container: () => HTMLDivElement;
              scaleX: () => number;
              find: (selector: string) => Array<{
                find: (selector: string) => AnchorNode[];
                findOne: (selector: string) => AnchorNode | null;
                nodes: () => Array<{
                  x: () => number;
                  y: () => number;
                  getAbsolutePosition: () => { x: number; y: number };
                  width: () => number;
                  height: () => number;
                  find: (selector: string) => Array<{ fontSize: () => number }>;
                }>;
              }>;
            };
          }
        ).__gridoStage!;
        const tr = stage.find('Transformer')[0];
        const node = tr.nodes()[0];
        const anchors = tr.find('._anchor');
        const pos = tr.findOne('.bottom-right')!.getAbsolutePosition();
        const box = stage.container().getBoundingClientRect();
        const nodeAbs = node.getAbsolutePosition();
        const scale = stage.scaleX();
        return {
          anchorNames: anchors.map((a) => a.name().split(' ')[0]),
          anchorWidths: anchors.map((a) => a.getClientRect().width),
          point: { x: box.left + pos.x, y: box.top + pos.y },
          nodePoint: {
            x: box.left + nodeAbs.x + node.width() * scale,
            y: box.top + nodeAbs.y + node.height() * scale,
          },
          x: node.x(),
          y: node.y(),
          w: node.width(),
          h: node.height(),
          fontSize: node.find('Text')[0].fontSize(),
        };
      });

    // انتظر تموضع المحوّل على العقدة قبل قراءة إحداثيات المقبض
    await expect
      .poll(
        async () => {
          const h = await readState();
          return Math.hypot(h.point.x - h.nodePoint.x, h.point.y - h.nodePoint.y);
        },
        { timeout: 5000 },
      )
      .toBeLessThan(30);

    await expect.poll(async () => (await readState()).fontSize, { timeout: 8000 }).toBe(200);
    const before = await readState();
    // الأركان الأربعة + منتصفات الحواف + مقبض التدوير — لا مربع بلا مقابض
    expect(before.anchorNames).toEqual(
      expect.arrayContaining([
        'top-left',
        'top-center',
        'top-right',
        'middle-left',
        'middle-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
        'rotater',
      ]),
    );
    // مقابض الزوايا والتدوير بأحجام مرئية قابلة للنقر
    const widthByName = new Map(
      before.anchorNames.map((name, i) => [name, before.anchorWidths[i]]),
    );
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
      expect(widthByName.get(corner)).toBeGreaterThanOrEqual(9);
    }
    expect(widthByName.get('rotater')).toBeGreaterThanOrEqual(12);

    // سحب ركن سفلي أيمن للخارج يُحجّم الكتلة تناسبياً: حجم الخط + العرض + الارتفاع
    await page.mouse.move(before.point.x, before.point.y);
    await page.mouse.down();
    await page.mouse.move(before.point.x + 60, before.point.y + 30, { steps: 10 });
    await page.mouse.up();
    await expect
      .poll(async () => (await readState()).w, { timeout: 5000 })
      .toBeGreaterThan(before.w + 20);

    const after = await readState();
    const fontRatio = after.fontSize / before.fontSize;
    // حجم الخط كبر فعلاً بنفس نسبة العرض (Rounding إلى عدد صحيح يسمح بهامش)
    expect(after.fontSize).toBeGreaterThan(before.fontSize + 6);
    expect(Math.abs(fontRatio - after.w / before.w)).toBeLessThan(fontRatio * 0.12);
    // الارتفاع مشتق من المحتوى فيكبر معه (لا يُثبَّت أثناء تحجيم الزاوية)
    expect(after.h).toBeGreaterThan(before.h * 1.05);
    // الركن المقابل (الأعلى الأيسر) يبقى مثبتاً — لا يتزحزح النص أثناء التحجيم
    expect(Math.abs(after.x - before.x)).toBeLessThan(4);
    expect(Math.abs(after.y - before.y)).toBeLessThan(4);
    expect(after.anchorNames).toHaveLength(9);
    // الحالة التلقائية محفوظة: التحجيم ليس اختيار عرض صريح
    await expect(page.getByText('ملاءمة تلقائية').first()).toBeVisible();
  });

  test('corner resize anchor survives a font that loads after the gesture', async ({ page }) => {
    // وجهِ كل طلبات Oswald إلى وجه محلي يُسلَّم متأخراً 7 ثوانٍ: أثناء الإيماءة
    // يُقاس النص بالخط البديل، ثم يصل الوجه الحقيقي فتتغيّر مقاييسه. هذا هو
    // السيناريو الذي كان يزيح الصندوق بعد التحجيم (إعادة قياس متأخرة).
    const lateFontBytes = fs.readFileSync(
      path.join(process.cwd(), 'src/assets/fonts/Amiri_700_arabic.woff2'),
    );
    const lateFontUrl = `${new URL(page.url()).origin}/__late-oswald.woff2`;
    await page.route('**/fonts.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/css',
        body: `@font-face{font-family:'Oswald';font-style:normal;font-weight:100 900;src:url('${lateFontUrl}') format('woff2');}`,
      });
    });
    await page.route('**/__late-oswald.woff2', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 7000));
      await route.fulfill({ status: 200, contentType: 'font/woff2', body: lateFontBytes });
    });

    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await openStudioElementsCategory(page, 'text');
    await page.getByTestId('element-add-text-heading').click();
    await expect(page.getByRole('tabpanel')).toBeVisible();

    // اختيار Oswald (خط سحابي) يبدأ تحميل وجهه المتأخر — قبل تحجيم الزاوية.
    await page.getByRole('button', { name: 'الخط: كايرو', exact: true }).click();
    await page.getByRole('combobox', { name: 'البحث في الخطوط' }).fill('Oswald');
    await page.getByRole('button', { name: 'Oswald', exact: true }).click();
    await expect(page.getByRole('button', { name: 'الخط: Oswald', exact: true })).toBeVisible();

    await page.getByRole('combobox', { name: 'حجم الخط', exact: true }).click();
    await page.getByRole('option', { name: '200px', exact: true }).click();

    const readState = () =>
      page.evaluate(() => {
        type AnchorNode = { getAbsolutePosition: () => { x: number; y: number } };
        const stage = (
          window as unknown as {
            __gridoStage?: {
              container: () => HTMLDivElement;
              find: (selector: string) => Array<{
                findOne: (selector: string) => AnchorNode | null;
                nodes: () => Array<{
                  width: () => number;
                  height: () => number;
                  find: (selector: string) => Array<{ fontSize: () => number }>;
                }>;
              }>;
            };
          }
        ).__gridoStage;
        const tr = stage?.find('Transformer')?.[0];
        const node = tr?.nodes()?.[0];
        if (!tr || !node) return null;
        const box = stage!.container().getBoundingClientRect();
        const tl = tr.findOne('.top-left')?.getAbsolutePosition();
        const br = tr.findOne('.bottom-right')?.getAbsolutePosition();
        return {
          anchor: tl ? { x: box.left + tl.x, y: box.top + tl.y } : null,
          point: br ? { x: box.left + br.x, y: box.top + br.y } : null,
          w: node.width(),
          h: node.height(),
          fontSize: node.find('Text')[0]?.fontSize() ?? 0,
          fontLoaded: document.fonts.check('800 16px Oswald'),
        };
      });

    await expect.poll(async () => (await readState())?.fontSize ?? 0, { timeout: 8000 }).toBe(200);
    const before = (await readState())!;
    expect(before.point).not.toBeNull();
    // الوجه الحقيقي لم يصل بعد — القياس الحالي يستخدم البديل.
    expect(before.fontLoaded).toBe(false);

    // سحب ركن سفلي أيمن: الركن المقابل (أعلى يسار) هو الارتساء.
    await page.mouse.move(before.point!.x, before.point!.y);
    await page.mouse.down();
    await page.mouse.move(before.point!.x + 60, before.point!.y + 30, { steps: 10 });
    await page.mouse.up();
    await expect
      .poll(async () => (await readState())?.w ?? 0, { timeout: 5000 })
      .toBeGreaterThan(before.w + 20);
    const postDrag = (await readState())!;
    expect(postDrag.fontLoaded).toBe(false);
    // الإيماءة نفسها لا تحرّك الركن المقابل.
    expect(Math.abs(postDrag.anchor!.x - before.anchor!.x)).toBeLessThan(2);
    expect(Math.abs(postDrag.anchor!.y - before.anchor!.y)).toBeLessThan(2);

    // يصل الخط المتأخر → إعادة قياس جديدة لعرض مختلف.
    await expect
      .poll(async () => (await readState())?.fontLoaded ?? false, { timeout: 20000 })
      .toBe(true);
    await expect
      .poll(async () => {
        const state = await readState();
        return state ? Math.abs(state.w - postDrag.w) : 0;
      })
      .toBeGreaterThan(3);

    const after = (await readState())!;
    // إعادة القياس غيّرت العرض لكن الركن المقابل بقي على موضعه تماماً.
    expect(after.fontSize).toBe(postDrag.fontSize);
    expect(Math.abs(after.w - postDrag.w)).toBeGreaterThan(3);
    expect(Math.abs(after.anchor!.x - before.anchor!.x)).toBeLessThan(1.5);
    expect(Math.abs(after.anchor!.y - before.anchor!.y)).toBeLessThan(1.5);
  });

  test('side handles resize text width without changing the font size', async ({ page }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await openStudioElementsCategory(page, 'text');
    await page.getByTestId('element-add-text-heading').click();
    await expect(page.getByRole('tabpanel')).toBeVisible();

    // خط 200px: صندوق 48px على لوحة 2480 يُعرض بـ47px فقط فتتداخل مقابض
    // الحواف مع الزوايا ويلتقط Konva أقربها بدل المقبض المقصود.
    await page.getByRole('combobox', { name: 'حجم الخط', exact: true }).click();
    await page.getByRole('option', { name: '200px', exact: true }).click();

    const readState = () =>
      page.evaluate(() => {
        type AnchorNode = {
          getAbsolutePosition: () => { x: number; y: number };
          getClientRect: () => { width: number };
        };
        const stage = (
          window as unknown as {
            __gridoStage?: {
              container: () => HTMLDivElement;
              find: (selector: string) => Array<{
                findOne: (selector: string) => AnchorNode | null;
                nodes: () => Array<{
                  x: () => number;
                  width: () => number;
                  height: () => number;
                  find: (selector: string) => Array<{ fontSize: () => number }>;
                }>;
              }>;
            };
          }
        ).__gridoStage!;
        const tr = stage.find('Transformer')[0];
        const node = tr.nodes()[0];
        const pos = tr.findOne('.middle-left')!.getAbsolutePosition();
        const box = stage.container().getBoundingClientRect();
        return {
          point: { x: box.left + pos.x, y: box.top + pos.y },
          x: node.x(),
          w: node.width(),
          h: node.height(),
          fontSize: node.find('Text')[0].fontSize(),
        };
      });

    await expect.poll(async () => (await readState()).fontSize, { timeout: 8000 }).toBe(200);
    const before = await readState();

    // سحب منتصف الحافة اليسرى للخارج يوسّع العرض فقط
    await page.mouse.move(before.point.x, before.point.y);
    await page.mouse.down();
    await page.mouse.move(before.point.x - 50, before.point.y, { steps: 10 });
    await page.mouse.up();
    await expect
      .poll(async () => (await readState()).w, { timeout: 5000 })
      .toBeGreaterThan(before.w + 20);

    const after = await readState();
    // حجم الخط لم يتغيّر، والارتفاع يبقى مشتقاً من سطر واحد
    expect(after.fontSize).toBe(before.fontSize);
    expect(Math.abs(after.h - before.h)).toBeLessThan(2);
    // المقبض الجانبي اختيار عرض صريح — يتوقف الحضن التلقائي
    await expect(page.getByText('عرض ثابت').first()).toBeVisible();
  });

  test('top handles keep the text baseline in place while resizing width', async ({ page }) => {
    await page
      .getByTestId('mode-tab-single')
      .or(page.getByRole('tab', { name: 'تعديل حر' }))
      .first()
      .click();
    await openStudioElementsCategory(page, 'text');
    await page.getByTestId('element-add-text-heading').click();
    await expect(page.getByRole('tabpanel')).toBeVisible();

    const readBox = () =>
      page.evaluate(() => {
        type Point = { x: number; y: number };
        type Anchor = { getAbsolutePosition: () => Point };
        const stage = (
          window as unknown as {
            __gridoStage?: {
              container: () => HTMLDivElement;
              find: (selector: string) => Array<{
                findOne: (selector: string) => Anchor | null;
                nodes: () => Array<{
                  x: () => number;
                  y: () => number;
                  width: () => number;
                  height: () => number;
                }>;
              }>;
            };
          }
        ).__gridoStage!;
        const tr = stage.find('Transformer')[0];
        const node = tr.nodes()[0];
        const box = stage.container().getBoundingClientRect();
        const tl = tr.findOne('.top-left')!.getAbsolutePosition();
        const br = tr.findOne('.bottom-right')!.getAbsolutePosition();
        const topCenter = tr.findOne('.top-center')!.getAbsolutePosition();
        return {
          topCenter: { x: box.left + topCenter.x, y: box.top + topCenter.y },
          // منتصف القطرين = مركز الصندوق مهما كان التدوير
          center: {
            x: box.left + (tl.x + br.x) / 2,
            y: box.top + (tl.y + br.y) / 2,
          },
          x: node.x(),
          y: node.y(),
          w: node.width(),
          h: node.height(),
        };
      });

    await expect.poll(readBox, { timeout: 8000 }).not.toBeNull();
    const initial = await readBox();

    // أنزل العنصر بعيداً عن الترويسة العائمة قبل سحب المقبض العلوي
    await page.mouse.move(initial.center.x, initial.center.y);
    await page.mouse.down();
    await page.mouse.move(initial.center.x, initial.center.y + 140, { steps: 10 });
    await page.mouse.up();
    await expect
      .poll(async () => (await readBox()).y, { timeout: 5000 })
      .toBeGreaterThan(initial.y + 40);

    const before = await readBox();
    await page.mouse.move(before.topCenter.x, before.topCenter.y);
    await page.mouse.down();
    await page.mouse.move(before.topCenter.x, before.topCenter.y - 40, { steps: 10 });
    await page.mouse.up();

    const after = await readBox();
    // الحافة العليا ثابتة: لا انزياح رأسي للنص رغم أن المقبض سُحب رأسياً
    expect(Math.abs(after.y - before.y)).toBeLessThan(1.5);
    expect(Math.abs(after.h - before.h)).toBeLessThan(2);
    // سحب عمودي محض لا يغيّر العرض أيضاً
    expect(Math.abs(after.w - before.w)).toBeLessThan(2);
  });

  test('curved text paints its fill and unified stroke through the SVG filter', async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const modulePath = '/src/lib/canvas/curved-text-utils.ts';
      const mod = (await import(/* @vite-ignore */ modulePath)) as {
        drawCurvedText: (ctx: CanvasRenderingContext2D, options: Record<string, unknown>) => void;
      };
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { red: 0, blue: 0, filterBuilt: false };

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      mod.drawCurvedText(ctx, {
        text: 'تصميم',
        width: 500,
        height: 240,
        fontSize: 80,
        fontFamily: 'Cairo, sans-serif',
        color: '#ff0000',
        stroke: '#0000ff',
        strokeWidth: 8,
        curve: 40,
        direction: 'rtl',
      });

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let red = 0;
      let blue = 0;
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        if (r > 200 && g < 60 && b < 60) red++;
        if (b > 200 && r < 60 && g < 60) blue++;
      }
      return {
        red,
        blue,
        filterBuilt: !!document.getElementById('grido-text-stroke-filters-container'),
      };
    });

    expect(result.filterBuilt).toBe(true);
    expect(result.red).toBeGreaterThan(100);
    expect(result.blue).toBeGreaterThan(50);
  });

  test('curved text keeps glyph ink that rises above its element box', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const modulePath = '/src/lib/canvas/curved-text-utils.ts';
      const mod = (await import(/* @vite-ignore */ modulePath)) as {
        drawCurvedText: (ctx: CanvasRenderingContext2D, options: Record<string, unknown>) => void;
      };

      const countInk = (boxHeight: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 700;
        canvas.height = 600;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // إزاحة الأصل للأسفل: حبر القوس يخرج فوق صندوق العنصر القصير، ونريد
        // عزل قصّ الكانفاس المؤقت (الموضع تحت الاختبار) عن قصّ الكانفاس نفسه.
        ctx.translate(100, 300);
        mod.drawCurvedText(ctx, {
          text: 'تصميم',
          width: 500,
          height: boxHeight,
          fontSize: 80,
          fontFamily: 'Cairo, sans-serif',
          color: '#ff0000',
          stroke: '#0000ff',
          strokeWidth: 4,
          curve: 40,
          direction: 'rtl',
        });
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let ink = 0;
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          if (r > 180 && g < 90 && b < 90) ink++;
          else if (b > 180 && r < 90 && g < 90) ink++;
        }
        return ink;
      };

      return { short: countInk(40), tall: countInk(240) };
    });

    // الصندوق الطويل مرجع كامل (لا قصّ)؛ القصير يجب أن يحمل نفس كتلة الحبر
    // تماماً — قبل الإصلاح كان الكانفاس المؤقت بحجم صندوق العنصر فيبتر
    // القوس العلوي بكامله.
    expect(result.tall).toBeGreaterThan(1500);
    expect(result.short).toBeGreaterThan(result.tall * 0.9);
  });

  test('curved text scratch canvas maps back correctly at device scale 2', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const modulePath = '/src/lib/canvas/curved-text-utils.ts';
      const mod = (await import(/* @vite-ignore */ modulePath)) as {
        drawCurvedText: (ctx: CanvasRenderingContext2D, options: Record<string, unknown>) => void;
      };

      const measure = (scale: number) => {
        const size = 1400;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        // نفس تحويل مرحلة العرض: مقياس نقطة + أصل في فضاء العنصر
        ctx.setTransform(scale, 0, 0, scale, scale * 100, scale * 300);
        mod.drawCurvedText(ctx, {
          text: 'تصميم',
          width: 500,
          height: 240,
          fontSize: 80,
          fontFamily: 'Cairo, sans-serif',
          color: '#ff0000',
          stroke: '#0000ff',
          strokeWidth: 4,
          curve: 40,
          direction: 'rtl',
        });
        const { data } = ctx.getImageData(0, 0, size, size);
        let ink = 0;
        let sumX = 0;
        let sumY = 0;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
            const colored = (r > 180 && g < 90 && b < 90) || (b > 180 && r < 90 && g < 90);
            if (colored) {
              ink++;
              sumX += x;
              sumY += y;
            }
          }
        }
        return { ink, cx: sumX / ink, cy: sumY / ink };
      };

      return { one: measure(1), two: measure(2) };
    });

    // الكتلة تبقى كاملة (لا قصّ عند المقياس الأعلى) ومساحتها تقارب ٤×،
    // ومركزها في فضاء العنصر لا ينزاح — أي خطأ في إزاحة إعادة الرسم يظهر هنا.
    expect(result.two.ink).toBeGreaterThan(result.one.ink * 3);
    expect(Math.abs(result.two.cx - result.one.cx * 2)).toBeLessThan(4);
    expect(Math.abs(result.two.cy - result.one.cy * 2)).toBeLessThan(4);
  });
});
