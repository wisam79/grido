import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { collageCut, collageEndCut } from '../src/lib/canvas/canvas-colors';
import { useEditorStore } from '../src/lib/editor-store';
import { exportCanvas, drawSlotImage } from '../src/lib/export/export-image';
import { computeSlotCrop } from '../src/lib/export/export-primitives';
import { calculatePrintCutLines } from '../src/lib/print/cut-lines-utils';
import { computeSlotRectMM, computeSheetGrid } from '../src/lib/print/print-layout-math';

import type { CanvasSlot } from '../src/lib/store/types';

const CANVAS_W = 2480;
const CANVAS_H = 3508;

type DrawCall = { op: string; args: unknown[] };

function makeRecordingContext() {
  const calls: DrawCall[] = [];
  let strokeStyle = '';
  let fillStyle = '';
  const ctx: any = {
    calls,
    lineWidth: 0,
    _filter: 'none',
    get filter() {
      return this._filter;
    },
    set filter(v: string) {
      this._filter = v;
    },
    get strokeStyle() {
      return strokeStyle;
    },
    set strokeStyle(v: string) {
      strokeStyle = v;
      calls.push({ op: 'setStrokeStyle', args: [v] });
    },
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(v: string) {
      fillStyle = v;
      calls.push({ op: 'setFillStyle', args: [v] });
    },
  };
  const ops = [
    'fillRect',
    'clearRect',
    'drawImage',
    'save',
    'restore',
    'translate',
    'rotate',
    'scale',
    'beginPath',
    'rect',
    'roundRect',
    'closePath',
    'clip',
    'moveTo',
    'lineTo',
    'stroke',
    'fill',
    'setLineDash',
  ];
  for (const op of ops) {
    ctx[op] = (...args: unknown[]) => {
      calls.push({ op, args });
    };
  }
  ctx.getImageData = (_x: number, _y: number, w: number, h: number) =>
    new ImageData(
      new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4),
      Math.max(1, w),
      Math.max(1, h),
    );
  ctx.putImageData = (...args: unknown[]) => {
    calls.push({ op: 'putImageData', args });
  };
  return { ctx, calls };
}

// صورة وهمية تُطلق onload فوراً — loadImage في المسار الاحتياطي تعتمد عليها
class FakeImage {
  crossOrigin = 'anonymous';
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  private _src = '';
  set src(v: string) {
    this._src = v;
    setTimeout(() => this.onload?.(), 0);
  }
  get src() {
    return this._src;
  }
}

function setLicenseActive() {
  useEditorStore.setState({
    user: {
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    } as never,
  });
}

function baseSlot(overrides: Record<string, unknown>): CanvasSlot {
  return {
    id: 's1',
    cellIndex: 0,
    x: 0,
    y: 0,
    w: 0.5,
    h: 1,
    imageSrc: '/local-image/s1.png',
    zoom: 1,
    dragX: 0,
    dragY: 0,
    flipX: false,
    flipY: false,
    rotation: 0,
    ...overrides,
  };
}

function setupCollageState(slots: CanvasSlot[]) {
  useEditorStore.setState({
    mode: 'collage',
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    backgroundColor: '#ffffff',
    elements: [],
    slots,
    collageMargin: 100,
    collageGap: 50,
    collageRadius: 0,
    collageShowCutLines: true,
    collageShowEndCutLine: true,
    collageStrokeWidth: 0,
    collageStrokeColor: '#000000',
    collageTemplate: null,
  } as never);
}

// الاستدعاءات المتسلسلة moveTo → lineTo التي تشكّل خطوط القص المرسومة
function recordedCutLineSegments(calls: DrawCall[]) {
  const segments: Array<[number, number, number, number]> = [];
  let start: [number, number] | null = null;
  for (const c of calls) {
    if (c.op === 'moveTo') start = [c.args[0] as number, c.args[1] as number];
    else if (c.op === 'lineTo' && start) {
      segments.push([start[0], start[1], c.args[0] as number, c.args[1] as number]);
      start = null;
    }
  }
  return segments;
}

// مقاطع خطوط القص المتوقعة من المصدر المشترك بعد تقريب الرسم إلى بكسل صحيح
function expectedCutLineSegments(slots: CanvasSlot[]) {
  return calculatePrintCutLines({
    mode: 'collage',
    actualCopies: 1,
    imageWidthMM: CANVAS_W,
    imageHeightMM: CANVAS_H,
    gapMM: 50,
    paperWidth: CANVAS_W,
    paperHeight: CANVAS_H,
    showEndCutLine: true,
    slots,
    collageMargin: 100,
    collageGap: 50,
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    hasPhysical: false,
    grid: computeSheetGrid({
      cols: 1,
      actualCopies: 1,
      imageWidthMM: CANVAS_W,
      imageHeightMM: CANVAS_H,
      gapMM: 50,
      effectiveMarginMM: 0,
      availableWidthMM: CANVAS_W,
      availableHeightMM: CANVAS_H,
    }),
  }).map((l) => [Math.round(l.x1), Math.round(l.y1), Math.round(l.x2), Math.round(l.y2)]);
}

describe('export-image manual fallback — golden tests', () => {
  let calls: DrawCall[];

  beforeEach(() => {
    useEditorStore.getState().reset();
    setLicenseActive();
    vi.clearAllMocks();
    vi.stubGlobal('Image', FakeImage);
    HTMLCanvasElement.prototype.toBlob = function (cb: any, type?: string) {
      cb(new Blob(['mock-image-data'], { type: type || 'image/png' }));
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function recordContext() {
    const recorder = makeRecordingContext();
    HTMLCanvasElement.prototype.getContext = function () {
      return recorder.ctx;
    };
    calls = recorder.calls;
  }

  it('golden: slot rects and cut lines are bit-identical to shared print math', async () => {
    const slots = [
      baseSlot({ id: 's1', x: 0, y: 0, w: 0.5, h: 1 }),
      baseSlot({ id: 's2', x: 0.5, y: 0, w: 0.5, h: 1 }),
    ];
    setupCollageState(slots);
    recordContext();

    const blob = await exportCanvas('png', 0.95, null);
    expect(blob).not.toBeNull();

    // خلفية الورقة البيضاء تغطي الكانفاس كاملاً
    expect(calls.find((c) => c.op === 'fillRect')).toEqual({
      op: 'fillRect',
      args: [0, 0, CANVAS_W, CANVAS_H],
    });

    const translates = calls
      .filter((c) => c.op === 'translate')
      .map((c) => [c.args[0], c.args[1]] as number[])
      // drawSlotImage تصدر ترجمتين لكل خانة: مركز الصندوق ثم العودة للأصل
      .filter((_, i) => i % 2 === 0);
    const drawImages = calls.filter((c) => c.op === 'drawImage');

    // كل خانة تُرسم مرة إلى وسيط RGBA قانوني ثم يُركّب الوسيط مرة على الورقة.
    const sourceDraws = drawImages.filter((call) => call.args[0] instanceof FakeImage);
    const compositeDraws = drawImages.filter((call) => call.args[0] instanceof HTMLCanvasElement);
    expect(sourceDraws).toHaveLength(2);
    expect(compositeDraws).toHaveLength(2);

    // مراكز الخانات تطابق computeSlotRectMM تماماً (x + w/2، y + h/2)
    const expectedCenters = slots.map((s: CanvasSlot) => {
      const r = computeSlotRectMM(
        { xMM: 0, yMM: 0 },
        { x: s.x, y: s.y, w: s.w, h: s.h },
        { widthMM: CANVAS_W, heightMM: CANVAS_H },
        { marginXMM: 100, marginYMM: 100 },
        { gapXMM: 50, gapYMM: 50 },
      );
      return [r.xMM + r.wMM / 2, r.yMM + r.hMM / 2];
    });
    expect(translates).toEqual(expectedCenters);

    // خطوط القص المرسومة تطابق calculatePrintCutLines بعد تقريب البكسل
    expect(recordedCutLineSegments(calls)).toEqual(expectedCutLineSegments(slots));
  });

  it('golden: hard-coded positions for a fixed 2-slot scenario', async () => {
    const slots = [
      baseSlot({ id: 's1', x: 0, y: 0, w: 0.5, h: 1 }),
      baseSlot({ id: 's2', x: 0.5, y: 0, w: 0.5, h: 1 }),
    ];
    setupCollageState(slots);
    recordContext();

    await exportCanvas('png', 0.95, null);

    // قيم محسوبة يدوياً: margin 100، gap 50، canvas 2480×3508
    // track = (2480 − 2×100) + 50 = 2330
    // s1: left = 100، width = 0.5×2330 − 50 = 1115 → center = 657.5
    // s2: left = 100 + 0.5×2330 = 1265 → center = 1822.5
    const translates = calls
      .filter((c) => c.op === 'translate')
      .map((c) => [c.args[0], c.args[1]] as number[])
      .filter((_, i) => i % 2 === 0);
    expect(translates).toEqual([
      [100 + 1115 / 2, 100 + 3308 / 2], // s1 center (657.5, 1754)
      [1265 + 1115 / 2, 100 + 3308 / 2], // s2 center (1822.5, 1754)
    ]);

    const segments = recordedCutLineSegments(calls);
    expect(segments).toEqual([
      [100, 100, 100, 3408], // خط رأس أول (يسار الورقة)
      [1240, 100, 1240, 3408], // منتصف الفجوة
      [2380, 100, 2380, 3408], // خط رأس أخير
      [100, 100, 2380, 100], // خط أفقي علوي
      [0, 3408, 2480, 3408], // خط نهاية منطقة الطباعة كامل العرض
    ]);

    // التجميع الدفعي: فئة واحدة لكل نوع خط — setStrokeStyle مرتين فقط
    // (خطوط القص العادية دفعة، ثم خط النهاية الأزرق دفعة)
    const strokeStyles = calls.filter((c) => c.op === 'setStrokeStyle');
    expect(strokeStyles.map((c) => c.args[0])).toEqual([collageCut(), collageEndCut()]);
  });

  it.each([90, 270, -90, 450])(
    'drawSlotImage preserves cover and proportions at %s degrees',
    (rotation) => {
      const { ctx, calls } = makeRecordingContext();
      const fakeImg = { width: 400, height: 200 } as unknown as HTMLImageElement;
      drawSlotImage(ctx, fakeImg, 10, 20, 100, 200, { rotation, flipX: true });

      expect(calls.find((c) => c.op === 'drawImage')?.args).toEqual([
        fakeImg,
        0,
        0,
        400,
        200,
        0,
        0,
        200,
        100,
      ]);
      expect(calls.filter((c) => c.op === 'translate').map((c) => c.args)).toEqual([
        [60, 120],
        [-100, -50],
      ]);
      expect(calls.findIndex((c) => c.op === 'rotate')).toBeLessThan(
        calls.findIndex((c) => c.op === 'scale'),
      );
    },
  );

  it.each([0, 180])('keeps local dimensions unchanged at %s degrees', (rotation) => {
    const { ctx, calls } = makeRecordingContext();
    const fakeImg = { width: 200, height: 400 } as unknown as HTMLImageElement;
    drawSlotImage(ctx, fakeImg, 10, 20, 100, 200, { rotation });
    expect(calls.find((c) => c.op === 'drawImage')?.args).toEqual([
      fakeImg,
      0,
      0,
      200,
      400,
      0,
      0,
      100,
      200,
    ]);
  });

  it('exports a colored empty slot with its clip and border without fabricating an image', async () => {
    setupCollageState([baseSlot({ imageSrc: undefined, bgColor: '#2468ac' })]);
    useEditorStore.setState({ collageRadius: 12, collageStrokeWidth: 2 });
    recordContext();
    expect(await exportCanvas('png', 0.95, null)).not.toBeNull();
    expect(calls.some((c) => c.op === 'setFillStyle' && c.args[0] === '#2468ac')).toBe(true);
    expect(calls.some((c) => c.op === 'fillRect' && c.args.join(',') === '100,100,1115,3308')).toBe(
      true,
    );
    expect(calls.some((c) => c.op === 'roundRect' && c.args[4] === 12)).toBe(true);
    expect(calls.filter((c) => c.op === 'drawImage')).toHaveLength(0);
    expect(calls.some((c) => c.op === 'stroke')).toBe(true);
  });
});

describe('computeSlotCrop clamps the final window inside the image', () => {
  const img = { width: 1200, height: 800 };

  it('keeps a preserved pan valid when the slot is rotated a quarter turn', () => {
    // خانة 400×600 مدورة 90: المقاس المحلي 600×400 بنسبة مطابقة للصورة —
    // كان التقييم المتماثل حول نقطة البدء (الحافة) يسمح بمصدر سالب بعد
    // إبقاء pan المستخدم عبر rotateSlot.
    const crop = computeSlotCrop(img, 400, 600, { rotation: 90, zoom: 2, dragX: -200, dragY: 0 });
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBe(200);
    expect(crop.sw).toBe(600);
    expect(crop.sh).toBe(400);
  });

  it('clamps the window to the true far edge instead of a symmetric half-range', () => {
    const crop = computeSlotCrop(img, 400, 600, { rotation: 90, zoom: 2, dragX: 700, dragY: 300 });
    expect(crop.sx).toBe(600);
    expect(crop.sy).toBe(400);
    expect(crop.sx + crop.sw).toBeLessThanOrEqual(1200);
    expect(crop.sy + crop.sh).toBeLessThanOrEqual(800);
  });

  it('preserves the centered-window behavior for unrotated slots', () => {
    const crop = computeSlotCrop(img, 400, 600, { zoom: 2, dragX: 100, dragY: 50 });
    expect(crop.sx).toBeCloseTo(466.6667 + 100, 3);
    expect(crop.sy).toBe(50);
    expect(crop.sw).toBeCloseTo(266.6667, 3);
    expect(crop.sh).toBe(400);
  });
});
