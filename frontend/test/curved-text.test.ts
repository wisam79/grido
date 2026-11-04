import { describe, it, expect, vi } from 'vitest';

import {
  drawCurvedText,
  getRetainedScratchArea,
  getScratchContext,
} from '../src/lib/canvas/curved-text-utils';

describe('Curved Text Drawing Tests', () => {
  it('does nothing when curve is 0 or text is empty', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 10 }),
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: '',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 20,
      fontFamily: 'Arial',
      curve: 50,
    });
    expect(mockCtx.fillText).not.toHaveBeenCalled();

    drawCurvedText(mockCtx, {
      text: 'Hello',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 20,
      fontFamily: 'Arial',
      curve: 0,
    });
    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });

  it('draws each character rotated along arc when curve is positive or negative', () => {
    const fillTextSpy = vi.fn();
    const rotateSpy = vi.fn();
    const translateSpy = vi.fn();

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: translateSpy,
      rotate: rotateSpy,
      fillText: fillTextSpy,
      strokeText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 15 }),
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: 'GRIDO',
      x: 0,
      y: 0,
      width: 300,
      height: 150,
      fontSize: 24,
      fontFamily: 'Cairo',
      curve: 60,
      stroke: '#000000',
      strokeWidth: 2,
    });

    // 5 characters in "GRIDO"
    expect(fillTextSpy).toHaveBeenCalledTimes(5);
    expect(rotateSpy).toHaveBeenCalledTimes(5);
    expect(translateSpy).toHaveBeenCalledTimes(5);
  });

  it('starts the arc from the right when the first strong direction is rtl', () => {
    const translateSpy = vi.fn();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: translateSpy,
      rotate: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 15 }),
      fillStyle: '#000000',
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: 'GRIDO',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 20,
      fontFamily: 'Cairo',
      curve: 50,
      direction: 'rtl',
    });

    // مركز القوس عند x=100؛ البداية RTL من يمين المركز
    expect(translateSpy.mock.calls[0][0]).toBeGreaterThan(100);
  });

  it('reverses embedded Latin runs inside an RTL curve to keep visual order', () => {
    const fillTextSpy = vi.fn();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: fillTextSpy,
      measureText: vi.fn().mockReturnValue({ width: 15 }),
      fillStyle: '#000000',
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: 'مرحبا Cd',
      x: 0,
      y: 0,
      width: 300,
      height: 150,
      fontSize: 24,
      fontFamily: 'Cairo',
      curve: 40,
      direction: 'rtl',
    });

    const drawn = fillTextSpy.mock.calls.map((call) => call[0]);
    expect(drawn.slice(-2)).toEqual(['d', 'C']);
  });

  it('resolves a per-glyph fill for gradient/pattern paints', () => {
    const fillTextSpy = vi.fn();
    const fillStyleForGlyph = vi.fn(() => '#ff0000');

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: fillTextSpy,
      measureText: vi.fn().mockReturnValue({ width: 10 }),
      fillStyle: '#000000',
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: 'AB',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 24,
      fontFamily: 'Cairo',
      curve: 40,
      fillStyle: fillStyleForGlyph,
    });

    expect(fillStyleForGlyph).toHaveBeenCalledTimes(2);
    expect(fillStyleForGlyph).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rotation: expect.any(Number) }),
    );
    expect(mockCtx.fillStyle).toBe('#ff0000');
  });

  it('reuses cached glyph layout across consecutive draws with only a single probe measurement', () => {
    const measureSpy = vi.fn().mockReturnValue({ width: 14 });
    const mockCtx = {
      font: '',
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      measureText: measureSpy,
      fillStyle: '#000000',
    } as unknown as CanvasRenderingContext2D;

    const opts = {
      text: 'CACHED_CURVE',
      x: 0,
      y: 0,
      width: 280,
      height: 120,
      fontSize: 22,
      fontFamily: 'Cairo',
      curve: 45,
    };

    drawCurvedText(mockCtx, opts);
    const firstPassMeasures = measureSpy.mock.calls.length;
    expect(firstPassMeasures).toBe(opts.text.length);

    measureSpy.mockClear();
    drawCurvedText(mockCtx, opts);
    expect(measureSpy).toHaveBeenCalledTimes(1);
  });

  // H3 — سقف المخزون المحتفظ به للكانفس المؤقت (16MP): النمو أعلى-سقف فقط،
  // والحاجة فوق السقف (أو نمو تاريخي مركب فوق السقف) تستخدم كانفساً مؤقتاً
  // غير محتفظ به ولا تلمس المخزون الدائم ولا تذبذب بين تصغير وتكبير.
  // ملاحظة بيئة: jsdom بلا محرك رسم فيعيد getContext('2d') قيمة null وتعود
  // getScratchContext بقيمة null — لكن تتبّع أبعاد المخزون يتم قبلها وهو محل الفحص.
  it('caps the retained scratch stock: growth stays under the cap and over-cap needs never raise it', () => {
    // الملف الحالي لا يمس المخزون في أي اختبار آخر — يبدأ فارغاً
    expect(getRetainedScratchArea()).toBe(0);

    // 2000×2000 = 4MP ≤ 16MP → يُنشأ مخزون دائم بهذه الحاجة بالضبط
    expect(getScratchContext(2000, 2000)).toBeNull(); // null = فشل getContext في jsdom فقط
    expect(getRetainedScratchArea()).toBe(4_000_000);

    // حاجة أصغر: لا انكماش ولا إعادة تخصيص (المخزون يتصاعد فقط)
    expect(getScratchContext(100, 100)).toBeNull();
    expect(getRetainedScratchArea()).toBe(4_000_000);

    // نمو ضمن السقف: 3000×3000 = 9MP
    expect(getScratchContext(3000, 3000)).toBeNull();
    expect(getRetainedScratchArea()).toBe(9_000_000);

    // حاجة فوق السقف (6000×6000 = 36MP): كانفس مؤقت — المخزون الدائم لم يُمَس
    expect(getScratchContext(6000, 6000)).toBeNull();
    expect(getRetainedScratchArea()).toBe(9_000_000);

    // الحاجة نفسها تحت السقف (200×15000 = 3MP) لكن اتحاد الأبعاد التاريخية
    // 3000×15000 = 45MP فوق السقف → مؤقت ولا نمو دائم (بلا تذبذب)
    expect(getScratchContext(200, 15000)).toBeNull();
    expect(getRetainedScratchArea()).toBe(9_000_000);
  });

  it('draws over-cap unified stroke through the temp canvas path without growing the stock', () => {
    const before = getRetainedScratchArea();

    // jsdom بلا محرك رسم — نعوض getContext على HTMLCanvasElement ليعيد سياقاً
    // وهمياً كي يعمل مسار الاستئجار كاملاً (مؤقت فوق السقف + تحرير بعد الرسم).
    const fakeCanvasCtx = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
      fillStyle: '#000000',
    };
    const ctxSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(fakeCanvasCtx as unknown as CanvasRenderingContext2D);

    const drawImageSpy = vi.fn();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 3000 }),
      drawImage: drawImageSpy,
      filter: 'none',
      font: '',
      fillStyle: '#000000',
    } as unknown as CanvasRenderingContext2D;

    try {
      drawCurvedText(mockCtx, {
        text: 'EXPORT',
        x: 0,
        y: 0,
        // صندوق حبر ضخم (خط 20000px على قوس بعرض 5000) → الحاجة بعد مقياس
        // التصدير تُقيَّد عند MAX_EXPORT_PIXELS (50MP) وهي فوق سقف 16MP
        width: 5000,
        height: 5000,
        fontSize: 20000,
        fontFamily: 'Cairo',
        curve: 30,
        stroke: '#000000',
        strokeWidth: 40,
      });
    } finally {
      ctxSpy.mockRestore();
    }

    // المسار الموحّد عمل فعلاً عبر كانفس مستأجر
    expect(drawImageSpy).toHaveBeenCalledTimes(1);
    const leased = drawImageSpy.mock.calls[0][0] as HTMLCanvasElement;
    expect(leased).not.toBeNull();
    // الكانفس المؤقت يُحرَّر فوراً بعد drawImage بتصفير أبعاده، والمخزون
    // الدائم لم ينمُّ (ظل عند قيمته قبل الاختبار — النمو أعلى-سقف فقط)
    expect(leased.width).toBe(0);
    expect(leased.height).toBe(0);
    expect(getRetainedScratchArea()).toBe(before);
  });
});
