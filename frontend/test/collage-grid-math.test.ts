import { describe, it, expect } from 'vitest';

import {
  buildPhysicalGridCells,
  getGridLimits,
  getPhotoDimensions,
} from '../src/components/editor/panels/collage/collage-grid-math';
import {
  computeDynamicCollageCells,
  getEffectiveDpi,
  getPhysicalCellSizeMM,
} from '../src/lib/templates/grid-utils';

// ─────────────────────────────────────────────────────────────────────────────
// collage-grid-math.test.ts — عقد هندسة الكولاج بين باني الواجهة ومحرك المتجر
//
// يقفل ثلاث ثغرات أُصلحت في جلسة الهندسة:
//   1. الصفر قيمة صريحة: فجوة/هامش = 0 لا يُستبدلان سراً بـ 2مم/4مم.
//   2. سعة الشبكة (getGridLimits) تحسب الهامش والفجوة — لا وعد بشبكة تصغّر
//      عند التطبيق لأن المساحة المتاحة كانت تُحسب بلا هوامش.
//   3. باني الشبكة (buildPhysicalGridCells) وخلايا المتجر
//      (computeDynamicCollageCells) ينتجان إحداثيات متطابقة.
// ─────────────────────────────────────────────────────────────────────────────

const DPI = 300;
const PX_PER_MM = DPI / 25.4;
const A4_PX = { W: 2480, H: 3508 };

const makeTemplate = (layout: Record<string, unknown>) =>
  ({ id: 'test-template', name: 'Test', physicalLayout: layout }) as any;

describe('collage-grid-math — هندسة الباني مطابقة لمحرك المتجر', () => {
  it('الصفر قيمة صريحة: خانتان بفجوة 0 تتلاصقان تماماً (لا فجوة 2مم خفية)', () => {
    const tmpl = makeTemplate({ type: 'passport', rows: 2, cols: 2 });
    const dpi = getEffectiveDpi(A4_PX.W, A4_PX.H, DPI);
    const paperW = (A4_PX.W / dpi) * 25.4;
    const paperH = (A4_PX.H / dpi) * 25.4;

    const cells = computeDynamicCollageCells(tmpl, A4_PX.W, A4_PX.H, dpi, 0, 0)!;
    expect(cells).toHaveLength(4);

    const startX = (paperW - 2 * 35) / 2;
    const startY = (paperH - 2 * 45) / 2;
    // الخلية الثانية في نفس الصف على بعد 35مم بالضبط — لا 37مم (فجوة 2مم مخفية)
    expect(cells[1].x * paperW).toBeCloseTo(startX + 35, 6);
    // الصف الثاني على بعد 45مم بالضبط من الأول
    expect(cells[2].y * paperH).toBeCloseTo(startY + 45, 6);
  });

  it('الصفر قيمة صريحة: هامش 0 لا يُستبدل بـ 4مم فتُصغَّر شبكة تتسع فعلاً', () => {
    const tmpl = makeTemplate({ type: 'passport', rows: 1, cols: 5 });
    const dpi = getEffectiveDpi(A4_PX.W, A4_PX.H, DPI);
    const gapPx = 7 * (dpi / 25.4);
    const paperW = (A4_PX.W / dpi) * 25.4;

    // 5×35 + 4×7 = 203مم ≤ 210مم ⇒ لا تصغير إطلاقاً
    const cells = computeDynamicCollageCells(tmpl, A4_PX.W, A4_PX.H, dpi, gapPx, 0)!;
    expect(cells).toHaveLength(5);
    expect(cells[0].w * paperW).toBeCloseTo(35, 6);
    // مع هامش 4مم مخفي كان التصغير 202/203 = 0.995 ⇒ خلية 34.83مم
  });

  it('سعة الشبكة تحسب الهامش والفجوة بدل الوعد بشبكة تُصغَّر عند التطبيق', () => {
    // كانفاس 1000×1500 بكسل = 84.67×127مم بدقة 300 صريحة (لا مطابقة ورقة قياسية)
    const W = 1000;
    const H = 1500;
    const noSpacing = getGridLimits('passport', W, H, DPI, 0, 0);
    expect(noSpacing.maxCols).toBe(2); // floor(84.67 / 35)
    expect(noSpacing.maxRows).toBe(2); // floor(127 / 45)

    // هامش 10مم وفجوة 10مم: المتاح أفقي 64.67مم ⇒ عمود واحد فقط
    const withSpacing = getGridLimits('passport', W, H, DPI, 10 * PX_PER_MM, 10 * PX_PER_MM);
    expect(withSpacing.maxCols).toBe(1);
    expect(withSpacing.maxRows).toBe(2); // floor((107 + 10) / (45 + 10))
  });

  it('الشبكة عند سقف السعة لا تُصغَّر عند التطبيق (باني الواجهة ملتزم بالسعة)', () => {
    const gapPx = 5 * PX_PER_MM;
    const marginPx = 10 * PX_PER_MM;
    const limits = getGridLimits('passport', A4_PX.W, A4_PX.H, DPI, gapPx, marginPx);

    const cells = buildPhysicalGridCells(
      'passport',
      limits.maxRows,
      limits.maxCols,
      'center',
      A4_PX.W,
      A4_PX.H,
      DPI,
      gapPx,
      marginPx,
    );
    expect(cells).toHaveLength(limits.maxRows * limits.maxCols);

    const dpi = getEffectiveDpi(A4_PX.W, A4_PX.H, DPI);
    const paperW = (A4_PX.W / dpi) * 25.4;
    for (const cell of cells) {
      // بلا تصغير: خلية كاملة 35مم — لو وعدت السعة بصف/عمود زائد لصغّر المحرك
      expect(cell.w * paperW).toBeCloseTo(35, 6);
    }
  });

  it('باني الشبكة وخلايا المتجر ينتجان نفس الإحداثيات (صفر انحراف)', () => {
    const dpi = getEffectiveDpi(A4_PX.W, A4_PX.H, DPI);
    const gapPx = 6 * PX_PER_MM;
    const marginPx = 12 * PX_PER_MM;
    const tmpl = makeTemplate({ type: 'passport', rows: 2, cols: 3, align: 'center' });

    const fromStore = computeDynamicCollageCells(tmpl, A4_PX.W, A4_PX.H, dpi, gapPx, marginPx)!;
    const fromBuilder = buildPhysicalGridCells(
      'passport',
      2,
      3,
      'center',
      A4_PX.W,
      A4_PX.H,
      DPI,
      gapPx,
      marginPx,
    );

    expect(fromBuilder).toHaveLength(fromStore.length);
    fromBuilder.forEach((cell, i) => {
      expect(cell.x).toBeCloseTo(fromStore[i].x, 12);
      expect(cell.y).toBeCloseTo(fromStore[i].y, 12);
      expect(cell.w).toBeCloseTo(fromStore[i].w, 12);
      expect(cell.h).toBeCloseTo(fromStore[i].h, 12);
    });
  });

  it('مقاسات الصور في الواجهة مطابقة لمولّد الخلايا الفيزيائية لكل نوع', () => {
    const types = [
      'passport',
      'id',
      'visa',
      'iq-national-id',
      'iq-civil-id',
      'iq-general-id',
      'iq-transactions',
    ] as const;
    for (const type of types) {
      const dim = getPhotoDimensions(type);
      expect(getPhysicalCellSizeMM(type)).toEqual({ wMM: dim.wMM, hMM: dim.hMM });
    }
  });
});
