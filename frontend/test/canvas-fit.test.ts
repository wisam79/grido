import { describe, it, expect, beforeEach } from 'vitest';
import {
  AUTO_FIT_LEFTOVER_RATIO,
  AUTO_FIT_MAX_VERTICAL_OVERFLOW,
  CANVAS_FIT_LABELS,
  CANVAS_FIT_PADDING,
  CANVAS_FIT_STORAGE_KEY,
  computeCanvasDisplay,
  isCanvasFitMode,
  lateralLeftoverRatio,
  readStoredFitMode,
  resolveFitMode,
  safeAspect,
  writeStoredFitMode,
} from '../src/lib/canvas/fit';

/**
 * نموذج ملاءمة الورقة — كان الحساب مضمّناً في editor-canvas ويلائم على
 * الارتفاع دائماً، فورقة هوية رأسية تُعرض بعرض 361px داخل منطقة عرض 940px.
 * الاختبار الأول هنا يقفل أرقام المنطق القديم حرفياً (اختبار انحدار) قبل
 * فحص الأوضاع الجديدة.
 */

/** ورقة هوية 35×45مم */
const ID_ASPECT = 35 / 45;
/** الورقة الافتراضية في التطبيق: A4 رأسي 2480×3508 */
const A4_ASPECT = 2480 / 3508;
/** منطقة عمل نافذة 960×640 (الافتراضي القديم) */
const SMALL = { w: 940, h: 496 };
/** منطقة عمل نافذة 1280×800 (الافتراضي الجديد) مع لوح الخصائص مفتوحاً */
const DESKTOP = { w: 916, h: 656 };
/** منطقة عمل نافذة 1600×900 مع لوح الخصائص مفتوحاً */
const LARGE = { w: 1236, h: 756 };

describe('lib/canvas/fit — انحدار: وضع الملاءمة الكاملة يطابق المنطق القديم', () => {
  it('يعيد 361×464 لورقة هوية في نافذة 960×640 كما كان قبل الاستخراج', () => {
    const result = computeCanvasDisplay({
      containerW: SMALL.w,
      containerH: SMALL.h,
      aspect: ID_ASPECT,
      zoom: 1,
      fitMode: 'height',
    });

    expect(result.resolved).toBe('height');
    expect(result.displayW).toBe(361);
    expect(result.displayH).toBe(464);
  });

  it('يطبّق مضاعف الزوم على أساس الملاءمة بنفس ترتيب العمليات القديم', () => {
    const half = computeCanvasDisplay({
      containerW: SMALL.w,
      containerH: SMALL.h,
      aspect: ID_ASPECT,
      zoom: 0.5,
      fitMode: 'height',
    });
    // 0.5 × (908×464 صندوق) → 464/2 = 232 ارتفاعاً، والعرض 232×0.7778 = 180.4
    expect(half.displayW).toBe(180);
    expect(half.displayH).toBe(232);

    const double = computeCanvasDisplay({
      containerW: SMALL.w,
      containerH: SMALL.h,
      aspect: ID_ASPECT,
      zoom: 2,
      fitMode: 'height',
    });
    // 2 × 361×464 → الصندوق 1816×928، والملاءمة تُقيَّد بالارتفاع
    expect(double.displayW).toBe(722);
    expect(double.displayH).toBe(928);
  });

  it('يقيّد الحد الأدنى للعرض قبل التكبير (100 × الزوم)', () => {
    const tiny = computeCanvasDisplay({
      containerW: 120,
      containerH: 90,
      aspect: ID_ASPECT,
      zoom: 1,
      fitMode: 'height',
    });
    expect(tiny.displayW).toBe(100);
    expect(tiny.displayH).toBeGreaterThanOrEqual(100);

    const tinyZoomed = computeCanvasDisplay({
      containerW: 120,
      containerH: 90,
      aspect: ID_ASPECT,
      zoom: 2,
      fitMode: 'height',
    });
    expect(tinyZoomed.displayW).toBeGreaterThanOrEqual(200);
  });
});

describe('lib/canvas/fit — وضع ملاءمة العرض', () => {
  it('يملأ عرض منطقة العمل ويسمح بتجاوز الارتفاع (تمرير رأسياً)', () => {
    const result = computeCanvasDisplay({
      containerW: DESKTOP.w,
      containerH: DESKTOP.h,
      aspect: ID_ASPECT,
      zoom: 1,
      fitMode: 'width',
    });

    expect(result.resolved).toBe('width');
    expect(result.displayW).toBe(DESKTOP.w - CANVAS_FIT_PADDING);
    // 884 / 0.7778 = 1136.57 → 1137 ارتفاعاً مقابل 656 متاحة: الورقة تُمرَّر
    expect(result.displayH).toBe(1137);
    expect(result.displayH).toBeGreaterThan(DESKTOP.h - CANVAS_FIT_PADDING);
  });

  it('يوسّع الورقة الرأسية أكثر من ضعف وضع الملاءمة الكاملة', () => {
    const full = computeCanvasDisplay({
      containerW: DESKTOP.w,
      containerH: DESKTOP.h,
      aspect: ID_ASPECT,
      zoom: 1,
      fitMode: 'height',
    });
    const wide = computeCanvasDisplay({
      containerW: DESKTOP.w,
      containerH: DESKTOP.h,
      aspect: ID_ASPECT,
      zoom: 1,
      fitMode: 'width',
    });

    expect(full.displayW).toBe(485);
    expect(wide.displayW / full.displayW).toBeGreaterThan(1.8);
  });

  it('يُحترم الوضع الصريح حتى في صندوق مربع (لا قيود على اختيار المستخدم)', () => {
    const result = computeCanvasDisplay({
      containerW: 800,
      containerH: 800,
      aspect: 1,
      zoom: 1,
      fitMode: 'width',
    });
    expect(result.resolved).toBe('width');
    expect(result.displayW).toBe(768);
    expect(result.displayH).toBe(768);
  });
});

describe('lib/canvas/fit — الملاءمة التلقائية', () => {
  it('يختار ملاءمة العرض للورقة الافتراضية A4 في نافذة عريضة (1600×900)', () => {
    expect(
      resolveFitMode({ containerW: LARGE.w, containerH: LARGE.h, aspect: A4_ASPECT, fitMode: 'auto' })
    ).toBe('width');
  });

  it('يفعّل ملاءمة العرض لورقة الهوية 35×45 في منطقة عمل بلا ألواح جانبية', () => {
    // الورقة الرأسية الضيقة تحتاج منطقة أعرض (AR > 1.73) ليصبح فراغها مبالَغاً به
    const wide = { w: 1852, h: 936 };
    expect(lateralLeftoverRatio(wide.w, wide.h, ID_ASPECT)).toBeGreaterThan(AUTO_FIT_LEFTOVER_RATIO);
    expect(resolveFitMode({ containerW: wide.w, containerH: wide.h, aspect: ID_ASPECT, fitMode: 'auto' })).toBe(
      'width'
    );
  });

  it('يبقى على «ملاءمة الكل» في النافذة الافتراضية 1280×800 (الورقة كاملة)', () => {
    // A4 في 1280×800 مع اللوح مفتوحاً: الفراغ 50% — دون العتبة، فالورقة
    // كاملة على الشاشة في الحجم الافتراضي للتطبيق (لا تمرير مفاجئ أول مرة)
    expect(lateralLeftoverRatio(DESKTOP.w, DESKTOP.h, A4_ASPECT)).toBeLessThan(AUTO_FIT_LEFTOVER_RATIO);
    expect(
      resolveFitMode({ containerW: DESKTOP.w, containerH: DESKTOP.h, aspect: A4_ASPECT, fitMode: 'auto' })
    ).toBe('height');
    // وورقة 35×45 في نفس النافذة: فراغ 45% — دون العتبة أيضاً
    expect(
      resolveFitMode({ containerW: DESKTOP.w, containerH: DESKTOP.h, aspect: ID_ASPECT, fitMode: 'auto' })
    ).toBe('height');
    // ورقة رأسية قريبة من المربع: لا فراغ يستحق التمرير
    expect(
      resolveFitMode({ containerW: DESKTOP.w, containerH: DESKTOP.h, aspect: 0.9, fitMode: 'auto' })
    ).toBe('height');
  });

  it('لا يُكبّر بإفراط في النوافذ العريضة القصيرة (سقف التمدد الرأسي)', () => {
    const wideShort = { w: 2004, h: 404 };
    // الفراغ هنا 84% وهو مبالَغ به فعلاً، لكن ملاءمة العرض تعني تكبيراً 6×
    // وورقة شبه مخفية — فيبقى وضع auto على الورقة كاملة
    expect(lateralLeftoverRatio(wideShort.w, wideShort.h, ID_ASPECT)).toBeGreaterThan(0.8);
    expect(
      resolveFitMode({ containerW: wideShort.w, containerH: wideShort.h, aspect: ID_ASPECT, fitMode: 'auto' })
    ).toBe('height');
  });

  it('يوسّع الورقة تلقائياً في نافذة 960×640 الضيقة (كانت 361px فقط)', () => {
    const result = computeCanvasDisplay({
      containerW: SMALL.w,
      containerH: SMALL.h,
      aspect: ID_ASPECT,
      zoom: 1,
      fitMode: 'auto',
    });

    expect(result.resolved).toBe('width');
    expect(result.displayW).toBe(SMALL.w - CANVAS_FIT_PADDING);
    expect(result.displayW).toBeGreaterThan(900);
  });

  it('لا يغيّر الوضع لأوراق أفقية أو مربعة (التمدد الرأسي لا يُصلح شيئاً)', () => {
    // ورقة مربعة تُلائَم بالارتفاع أيضاً: ملاءمتها بالعرض تخرج عن الإطار
    // بلا فائدة تُذكر (فراغ جانبي 29% فقط)، فالقرار يبقى على «الكل».
    for (const aspect of [1, 1.5, 2.4]) {
      expect(resolveFitMode({ containerW: DESKTOP.w, containerH: DESKTOP.h, aspect, fitMode: 'auto' })).toBe(
        'height'
      );
    }

    // الأوراق العريضة بما يكفي لملء العرض: لا فراغ أصلاً في وضع «الكل»
    for (const aspect of [1.5, 2.4]) {
      expect(lateralLeftoverRatio(DESKTOP.w, DESKTOP.h, aspect)).toBe(0);
    }
  });

  it('يعتمد على هندسة النافذة لا على الزوم فلا يتقلّب أثناء التكبير', () => {
    const modes = [0.1, 0.5, 1, 2, 5].map(
      (zoom) =>
        computeCanvasDisplay({
          containerW: LARGE.w,
          containerH: LARGE.h,
          aspect: A4_ASPECT,
          zoom,
          fitMode: 'auto',
        }).resolved
    );
    expect(new Set(modes)).toEqual(new Set(['width']));
  });

  it('عتبة الفراغ الجانبي 55% من عرض منطقة العمل (سقف التمدد 3×)', () => {
    expect(AUTO_FIT_LEFTOVER_RATIO).toBeCloseTo(0.55, 6);
    expect(AUTO_FIT_MAX_VERTICAL_OVERFLOW).toBe(3);
    // ورقة رأسية في منطقة أفقية واسعة: الفراغ يتجاوز العتبة بكثير
    expect(lateralLeftoverRatio(SMALL.w, SMALL.h, ID_ASPECT)).toBeGreaterThan(AUTO_FIT_LEFTOVER_RATIO);
  });
});

describe('lib/canvas/fit — الحجم الفعلي 1:1', () => {
  it('يعرض الورقة بمقاسها البكسلي الحقيقي بلا تقييد بالصندوق', () => {
    const result = computeCanvasDisplay({
      containerW: DESKTOP.w,
      containerH: DESKTOP.h,
      aspect: A4_ASPECT,
      zoom: 1,
      fitMode: 'actual',
      canvasW: 2480,
      canvasH: 3508,
    });

    expect(result.resolved).toBe('actual');
    expect(result.displayW).toBe(2480);
    expect(result.displayH).toBe(3508);
    // أعرض وأطول من منطقة العمل — وهذا هو المقصود: العصوان تظهران هنا
    // (باقي الأوضاع تُصغّر الورقة لتناسب العرض فلا تمرير أفقي فيها).
    expect(result.displayW).toBeGreaterThan(DESKTOP.w);
    expect(result.displayH).toBeGreaterThan(DESKTOP.h);
  });

  it('يطبّق مضاعف الزوم فوق المقاس الحقيقي', () => {
    const half = computeCanvasDisplay({
      containerW: DESKTOP.w,
      containerH: DESKTOP.h,
      aspect: 1,
      zoom: 0.5,
      fitMode: 'actual',
      canvasW: 1000,
      canvasH: 1000,
    });
    expect(half.resolved).toBe('actual');
    expect(half.displayW).toBe(500);
    expect(half.displayH).toBe(500);
  });

  it('يعود إلى ملاءمة الكل إذا غاب مقاس الورقة بدل ادّعاء 1:1 كاذب', () => {
    const result = computeCanvasDisplay({
      containerW: DESKTOP.w,
      containerH: DESKTOP.h,
      aspect: ID_ASPECT,
      zoom: 1,
      fitMode: 'actual',
    });
    expect(result.resolved).toBe('height');
    expect(result.displayW).toBeLessThan(DESKTOP.w);
  });

  it('يُقبل الوضع كمُفضَّل صالح ويُحفظ', () => {
    expect(isCanvasFitMode('actual')).toBe(true);
    writeStoredFitMode('actual');
    expect(readStoredFitMode()).toBe('actual');
  });
});

describe('lib/canvas/fit — حمايات القيم الشاذة', () => {
  it('يعالج aspect صفرياً أو NaN بلا قسمة على صفر', () => {
    expect(safeAspect(0)).toBe(1);
    expect(safeAspect(Number.NaN)).toBe(1);
    expect(safeAspect(-2)).toBe(1);

    for (const aspect of [0, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = computeCanvasDisplay({ containerW: 900, containerH: 600, aspect, zoom: 1 });
      expect(Number.isFinite(result.displayW)).toBe(true);
      expect(Number.isFinite(result.displayH)).toBe(true);
    }
  });

  it('يعالج حاوية بلا قياس بعد (0×0) بلا عرض سالب', () => {
    const result = computeCanvasDisplay({ containerW: 0, containerH: 0, aspect: ID_ASPECT, zoom: 1 });
    expect(result.displayW).toBeGreaterThanOrEqual(100);
    expect(result.displayH).toBeGreaterThanOrEqual(100);
  });

  it('يتجاهل الزوم غير الصالح ويعود إلى 1', () => {
    const base = computeCanvasDisplay({ containerW: SMALL.w, containerH: SMALL.h, aspect: ID_ASPECT, zoom: 1 });
    const invalid = computeCanvasDisplay({
      containerW: SMALL.w,
      containerH: SMALL.h,
      aspect: ID_ASPECT,
      zoom: Number.NaN,
    });

    expect(invalid.displayW).toBe(base.displayW);
    expect(invalid.displayH).toBe(base.displayH);
  });
});

describe('lib/canvas/fit — تفضيل الملاءمة المحفوظ', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يعيد auto عندما لا يوجد تفضيل مخزّن', () => {
    expect(readStoredFitMode()).toBe('auto');
  });

  it('يحفظ ويقرأ الوضع المختار', () => {
    writeStoredFitMode('width');
    expect(readStoredFitMode()).toBe('width');
    expect(localStorage.getItem(CANVAS_FIT_STORAGE_KEY)).toBe('width');
  });

  it('يتجاهل قيمة مخزّنة غير صالحة بدل تعطيل الواجهة', () => {
    localStorage.setItem(CANVAS_FIT_STORAGE_KEY, 'diagonal');
    expect(readStoredFitMode()).toBe('auto');
    expect(isCanvasFitMode('diagonal')).toBe(false);
    expect(isCanvasFitMode('height')).toBe(true);
  });

  it('لكل وضع عنوان عربي معروض في الواجهة', () => {
    expect(Object.keys(CANVAS_FIT_LABELS).sort()).toEqual(['actual', 'auto', 'height', 'width']);
    for (const label of Object.values(CANVAS_FIT_LABELS)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });
});
