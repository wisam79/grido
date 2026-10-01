/**
 * 🧪 اختبارات مسار كشف OpenCV WASM بمحاكاة **هيكلية** لواجهة `cv`.
 *
 * لماذا هذا الملف: `detectDocumentsWithOpenCV` (586 سطراً) لم يكن يُنفَّذ في أي
 * اختبار — الـWASM لا يتهيأ في jsdom، فقياس التغطية كان **0%** للملف كله.
 * هنا نغطّي ما لا يمكن كشفه إلا بالتنفيذ الفعلي:
 *   1. حساب كل كائنات Mat/MatVector وحذفها (لا تسريب ولا حذف مزدوج).
 *   2. نمط `single` (مستند واحد) مقابل `multi` (مستندان).
 *   3. قصّ البطاقات المكدسة (كتلة بنسبة أبعاد عمودية → بطاقتان بفاصل من التدرّج).
 *   4. بوابات الرفض (بلا كنتورات، ومشهد منخفض التباين بلا سياق خلفية).
 *
 * طريقة الحقن: `getLoadedOpenCV()` في `opencv-loader.ts` يقرأ `globalThis.cv`
 * إن كان فيه `Mat` دالة — فالاختبار يحقن المحاكاة دون أي تعديل على كود الإنتاج.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { detectDocumentsWithOpenCV } from '../core/opencv-detector';
import type { Point } from '../core/types';

const SW = 640;
const SH = 640;
const DESK = 60;

// ─────────────────────────── محاكاة OpenCV الهيكلية ───────────────────────────

interface Fixture {
  /** المساحة التي يعيدها cv.contourArea (تخضع لبوابة 1.2%–98% من الصورة) */
  area: number;
  /** المحيط الذي يعيده cv.arcLength */
  perimeter: number;
  /** المضلع التي تُعيده كل مولّدات المضلع (approx ×2 + convexHull) */
  quad: Point[];
}

interface Harness {
  gray: Uint8Array;
  fixtures: Fixture[];
}

let harness: Harness = { gray: new Uint8Array(SW * SH), fixtures: [] };
let lastImageData: { width: number; height: number; dataLength: number } | null = null;
const calls = { cvtColor: 0, findContours: 0, approxPolyDP: 0, cvtMats: 0 };

let matSeq = 0;
let createdMats: MockMat[] = [];
let createdVectors: MockMatVector[] = [];
const doubleDeletes: number[] = [];

class MockMat {
  rows = 0;
  cols = 0;
  data: Uint8Array = new Uint8Array(0);
  data32S: Int32Array = new Int32Array(0);
  data32F: Float32Array = new Float32Array(0);
  /** فهرس الكنتور الذي تنتمي إليه هذه المصفوفة (تُضبط في MatVector.get) */
  contourIndex = -1;
  /** هل هذه المصفوفة ناتج convexHull؟ (يميّز مسار الغلاف عن مسار الكنتور) */
  isHullTarget = false;
  hullSourceIndex = -1;
  readonly id: number;
  private deleted = false;

  constructor() {
    this.id = ++matSeq;
    createdMats.push(this);
  }

  delete(): void {
    if (this.deleted) doubleDeletes.push(this.id);
    this.deleted = true;
  }

  isDeleted(): boolean {
    return this.deleted;
  }
}

class MockMatVector {
  private count = 0;
  private deleted = false;
  readonly id: number;

  constructor() {
    this.id = ++matSeq;
    createdVectors.push(this);
  }

  setCount(next: number): void {
    this.count = next;
  }

  size(): number {
    return this.count;
  }

  /** يحاكي cv.MatVector.get: غلاف Mat جديد في كل نداء (يجب حذفه من المنادي) */
  get(index: number): MockMat {
    const mat = new MockMat();
    mat.contourIndex = index;
    return mat;
  }

  delete(): void {
    if (this.deleted) doubleDeletes.push(this.id);
    this.deleted = true;
  }

  isDeleted(): boolean {
    return this.deleted;
  }
}

class MockSize {
  constructor(
    public width: number,
    public height: number,
  ) {}
}

const cvMock = {
  COLOR_RGBA2GRAY: 6,
  BORDER_DEFAULT: 4,
  MORPH_RECT: 0,
  ADAPTIVE_THRESH_GAUSSIAN_C: 1,
  THRESH_BINARY_INV: 1,
  THRESH_BINARY: 0,
  THRESH_OTSU: 8,
  RETR_LIST: 0,
  CHAIN_APPROX_SIMPLE: 1,

  Mat: MockMat,
  MatVector: MockMatVector,
  Size: MockSize,

  matFromImageData: (imageData: { data: Uint8ClampedArray; width: number; height: number }) => {
    lastImageData = {
      width: imageData.width,
      height: imageData.height,
      dataLength: imageData.data.length,
    };
    const mat = new MockMat();
    mat.data = new Uint8Array(imageData.data);
    return mat;
  },

  cvtColor: (_src: MockMat, dst: MockMat) => {
    calls.cvtColor++;
    calls.cvtMats++;
    // الصورة الرمادية المصدرية للمحرك كله — السيناريو يبنيها بكسل بكسل
    dst.rows = SH;
    dst.cols = SW;
    dst.data = new Uint8Array(harness.gray);
  },

  GaussianBlur: () => {},
  Canny: () => {},
  dilate: () => {},
  adaptiveThreshold: () => {},
  threshold: () => {},
  getStructuringElement: () => new MockMat(),

  findContours: (_binMat: MockMat, contours: MockMatVector) => {
    calls.findContours++;
    contours.setCount(harness.fixtures.length);
  },

  contourArea: (contour: MockMat) => harness.fixtures[contour.contourIndex]?.area ?? 0,

  arcLength: (contour: MockMat) => harness.fixtures[contour.contourIndex]?.perimeter ?? 0,

  approxPolyDP: (curve: MockMat, approx: MockMat) => {
    calls.approxPolyDP++;
    const index = curve.isHullTarget ? curve.hullSourceIndex : curve.contourIndex;
    const quad = harness.fixtures[index]?.quad;
    if (!quad) {
      approx.rows = 0;
      return;
    }
    const flat = new Int32Array(8);
    quad.forEach((point, i) => {
      flat[i * 2] = Math.round(point.x);
      flat[i * 2 + 1] = Math.round(point.y);
    });
    approx.rows = 4;
    approx.cols = 1;
    approx.data32S = flat;
  },

  isContourConvex: () => true,

  // لا rotatedRectPoints ولا RotatedRect: نغطّي فرع «minAreaRect بلا دعم النقاط»
  minAreaRect: () => ({ center: { x: 0, y: 0 }, size: { width: 0, height: 0 }, angle: 0 }),

  convexHull: (points: MockMat, hull: MockMat) => {
    hull.isHullTarget = true;
    hull.hullSourceIndex = points.contourIndex;
  },
};

// ────────────────────────────── أدوات السيناريو ──────────────────────────────

function rectQuad(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

function paintRect(
  gray: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  value: number,
) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) gray[y * SW + x] = value;
  }
}

function deskGray(): Uint8Array {
  return new Uint8Array(SW * SH).fill(DESK);
}

function roundedCorners(quad: Point[]): string {
  return quad.map((point) => `${Math.round(point.x)},${Math.round(point.y)}`).join(' ');
}

function makeSource(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SW;
  canvas.height = SH;
  return canvas;
}

// A4 عرضية (280×196 ⇒ 1.429) و بطاقة ID (200×126 ⇒ 1.587) — كلتاهما داخل نطاقات المكافأة
const A4_QUAD = rectQuad(80, 120, 360, 316);
const ID_QUAD = rectQuad(420, 420, 620, 546);
// كتلة عمودية (200×256 ⇒ 0.781) = بطاقتان مكدستان فوق بعضهما (فرع القصّ الرأسي)
const STACKED_QUAD = rectQuad(200, 150, 400, 406);
// كتلة عرضية (300×230 ⇒ 1.304) = بطاقتان جنباً إلى جنب (فرع القصّ الأفقي)
const SIDE_BY_SIDE_QUAD = rectQuad(170, 200, 470, 430);
// كتلة صغيرة بلا أي سياق خلفية (لبوابة الرفض)
const LOW_CONTRAST_QUAD = rectQuad(240, 240, 400, 336);

/** مشهد مستندين منفصلين: ورقة فاتحة + بطاقة داكنة، مع رقعة فاتحة في زاوية الصورة */
function twoDocumentScene(): Harness {
  const gray = deskGray();
  paintRect(gray, 80, 120, 360, 316, 255);
  paintRect(gray, 420, 420, 620, 546, 25);
  gray[SW - 1] = 200; // تجعل borderDelta ≥ 25 فتنجو النتيجة من بوابة الرفض
  return {
    gray,
    fixtures: [
      { area: 280 * 196, perimeter: 2 * (280 + 196), quad: A4_QUAD },
      { area: 200 * 126, perimeter: 2 * (200 + 126), quad: ID_QUAD },
    ],
  };
}

/**
 * مشهد بطاقتين مكدستين: منطقة فاتحة، ثم انتقال خفيف عند منتصف الكتلة (يُشبع
 * شرط الحافة `avgMidEdge ≥ 12`)، ثم تدرّج قويّ **غير متمركز** عند 52% من
 * الارتفاع — فالقصّ يجب أن يتبع الفاصل المكتشف لا المنتصف الهندسي.
 */
function stackedCardsScene(): Harness {
  const gray = deskGray();
  const seamStepRow = 279;
  const rampStartRow = 280;
  const rampEndRow = 289;

  paintRect(gray, 200, 150, 400, 278, 255);
  for (let x = 200; x < 400; x++) gray[278 * SW + x] = 245;
  for (let x = 200; x < 400; x++) gray[seamStepRow * SW + x] = 231;
  for (let y = rampStartRow; y <= rampEndRow; y++) {
    const value = 231 - 15 * (y - seamStepRow);
    for (let x = 200; x < 400; x++) gray[y * SW + x] = value;
  }
  paintRect(gray, 200, rampEndRow + 1, 400, 406, 81);
  gray[SW - 1] = 200;

  return {
    gray,
    fixtures: [{ area: 200 * 256, perimeter: 2 * (200 + 256), quad: STACKED_QUAD }],
  };
}

/**
 * مشهد البطاقتين الجانبيتين (المرآة الأفقية للمشهد السابق): انتقال خفيف عند
 * منتصف الكتلة يُشبع `avgMidEdge ≥ 12`، وتدرّج أقوى **عند 52% من العرض** يجعل
 * القصّ يتبع الفاصل المكتشف (150/150 عند المنتصف مقابل 152/142 عند الفاصل).
 * ملاحظة: الشطران الناتجان عموديان (152×230 و 142×230)، والمحرك يشتقّ
 * `aspectType` من الهندسة فيُسمّيهما `a4_p`/`free` — لا `id_card` رغم أن القصّ
 * جاء من مسار البطاقات المكدسة (تفصيله في تقرير المراجعة 13، البند F-12).
 */
function sideBySideCardsScene(): Harness {
  const gray = deskGray();
  const seamStepCol = 321;
  const rampStartCol = 322;
  const rampEndCol = 331;

  paintRect(gray, 170, 200, 320, 430, 255);
  for (let y = 200; y < 430; y++) gray[y * SW + 320] = 245;
  for (let y = 200; y < 430; y++) gray[y * SW + seamStepCol] = 231;
  for (let x = rampStartCol; x <= rampEndCol; x++) {
    const value = 231 - 15 * (x - seamStepCol);
    for (let y = 200; y < 430; y++) gray[y * SW + x] = value;
  }
  paintRect(gray, rampEndCol + 1, 200, 470, 430, 81);
  gray[SW - 1] = 200;

  return {
    gray,
    fixtures: [{ area: 300 * 230, perimeter: 2 * (300 + 230), quad: SIDE_BY_SIDE_QUAD }],
  };
}

// ─────────────────────────────── تثبيت المحاكاة ───────────────────────────────

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext | null = null;

beforeAll(() => {
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  // سياق 2D مصغّر: المحرك يحتاج drawImage/getImageData فقط، والرمادي يأتي من cvMock
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
    if (contextId !== '2d') return null;
    return {
      canvas: this,
      drawImage: () => {},
      putImageData: () => {},
      clearRect: () => {},
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      }),
      getImageData: (_x: number, _y: number, width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      }),
    } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterAll(() => {
  if (originalGetContext) {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  }
  delete (globalThis as unknown as Record<string, unknown>).cv;
});

beforeEach(() => {
  createdMats = [];
  createdVectors = [];
  doubleDeletes.length = 0;
  lastImageData = null;
  calls.cvtColor = 0;
  calls.findContours = 0;
  calls.approxPolyDP = 0;
  calls.cvtMats = 0;
  // الحقن قبل أول نداء لـgetLoadedOpenCV في هذا الملف
  (globalThis as unknown as Record<string, unknown>).cv = cvMock;
});

/** كل Mat/MatVector أنشأه المحرك يجب أن يُحذف مرة واحدة بالضبط */
function expectNoResourceLeaks() {
  const leakedMats = createdMats.filter((mat) => !mat.isDeleted());
  const leakedVectors = createdVectors.filter((vector) => !vector.isDeleted());
  expect(leakedMats.map((mat) => mat.id)).toEqual([]);
  expect(leakedVectors.map((vector) => vector.id)).toEqual([]);
  expect(doubleDeletes).toEqual([]);
  expect(createdMats.length).toBeGreaterThan(0);
  expect(createdVectors.length).toBeGreaterThan(0);
}

// ─────────────────────────────────── الاختبارات ───────────────────────────────────

describe('OpenCV detector — مسار الـWASM بمحاكاة هيكلية', () => {
  it('يحذف كل كائنات Mat/MatVector التي أنشأها ولا يحذف أياً منها مرتين', async () => {
    harness = twoDocumentScene();

    const result = await detectDocumentsWithOpenCV(makeSource(), SW, SH, 'single');

    expect(result).not.toBeNull();
    expect(result?.method).toBe('opencv');
    // المحاكاة استُعملت فعلاً (حماية من تسمية دالة خاطئة في المحاكاة)
    expect(calls.cvtColor).toBeGreaterThan(0);
    expect(calls.findContours).toBe(4); // أربعة أقنعة ثنائية
    expect(calls.approxPolyDP).toBeGreaterThan(0);
    expectNoResourceLeaks();
  });

  it('يمرّر صورة مصغّرة 640px إلى matFromImageData بلا تصغير إضافي', async () => {
    harness = twoDocumentScene();

    await detectDocumentsWithOpenCV(makeSource(), SW, SH, 'single');

    expect(lastImageData).toEqual({ width: SW, height: SH, dataLength: SW * SH * 4 });
  });

  it('نمط single يُرجع مستنداً واحداً بأركان حقيقية لا الإطار الافتراضي', async () => {
    harness = twoDocumentScene();

    const result = await detectDocumentsWithOpenCV(makeSource(), SW, SH, 'single');

    expect(result?.documents).toHaveLength(1);
    const corners = result?.documents?.[0]?.corners ?? [];
    expect(corners).toHaveLength(4);
    // لا بد أن تكون إحدى الكتل المرشّحة فعلاً (لا إزاحة 5% الافتراضية)
    expect([roundedCorners(A4_QUAD), roundedCorners(ID_QUAD)]).toContain(roundedCorners(corners));
    expectNoResourceLeaks();
  });

  it('نمط multi يُرجع المستندين معاً بثقة ≥ 0.5 ومعرّفات متسلسلة', async () => {
    harness = twoDocumentScene();

    const result = await detectDocumentsWithOpenCV(makeSource(), SW, SH, 'multi');

    const documents = result?.documents ?? [];
    expect(documents).toHaveLength(2);
    expect(documents.map((doc) => doc.id)).toEqual(['doc-1', 'doc-2']);
    expect(documents.every((doc) => doc.confidence >= 0.5)).toBe(true);
    expect(new Set(documents.map((doc) => roundedCorners(doc.corners)))).toEqual(
      new Set([roundedCorners(A4_QUAD), roundedCorners(ID_QUAD)]),
    );
    expectNoResourceLeaks();
  });

  it('يقصّ البطاقتين المكدستين إلى مستندين بنسبة بطاقة هوية والفاصل يتبع التدرّج لا المنتصف', async () => {
    harness = stackedCardsScene();

    const result = await detectDocumentsWithOpenCV(makeSource(), SW, SH, 'multi');

    const documents = result?.documents ?? [];
    expect(documents).toHaveLength(2);

    const heights = documents.map((doc) => {
      const ys = doc.corners.map((point) => point.y);
      return Math.round(Math.max(...ys) - Math.min(...ys));
    });
    const widths = documents.map((doc) => {
      const xs = doc.corners.map((point) => point.x);
      return Math.round(Math.max(...xs) - Math.min(...xs));
    });

    // كل شطر بطاقة هوية (200/131 ≈ 1.53 و 200/119 ≈ 1.68 داخل نطاق ID-1)
    documents.forEach((doc, index) => {
      expect(doc.aspectType).toBe('id_card');
      expect(widths[index]).toBe(200);
      expect(200 / heights[index]).toBeGreaterThan(1.44);
      expect(200 / heights[index]).toBeLessThan(1.84);
    });

    // لا شطر يساوي الكتلة كاملة، والنصفان متجاوران بلا تداخل
    heights.forEach((height) => expect(height).toBeLessThan(200));
    expect(heights[0] + heights[1]).toBeLessThanOrEqual(256);
    // الفاصل المكتشف عند ~52% من الارتفاع ⇒ الشطران غير متماثلين (المنتصف = 128 لكلٍّ)
    expect(Math.abs(heights[0] - heights[1])).toBeGreaterThanOrEqual(4);
    expectNoResourceLeaks();
  });

  it('يقصّ البطاقتين الجانبيتين أيضاً (الفرع الأفقي) وتظلّ الحشوة صفراً بين الشطرين', async () => {
    harness = sideBySideCardsScene();

    const result = await detectDocumentsWithOpenCV(makeSource(), SW, SH, 'multi');

    const documents = result?.documents ?? [];
    expect(documents).toHaveLength(2);

    const bounds = documents.map((doc) => {
      const xs = doc.corners.map((point) => point.x);
      const ys = doc.corners.map((point) => point.y);
      return {
        minX: Math.round(Math.min(...xs)),
        maxX: Math.round(Math.max(...xs)),
        height: Math.round(Math.max(...ys) - Math.min(...ys)),
      };
    });

    // ارتفاع كامل لكل شطر، وعرض أصغر من الكتلة، ولا تداخل بينهما
    bounds.forEach((box) => {
      expect(box.height).toBe(230);
      expect(box.maxX - box.minX).toBeLessThan(300);
      expect(box.minX).toBeGreaterThanOrEqual(170);
      expect(box.maxX).toBeLessThanOrEqual(470);
    });
    const [left, right] = bounds.sort((a, b) => a.minX - b.minX);
    expect(left.maxX).toBeLessThanOrEqual(right.minX);

    // القصّ عند ~52% ⇒ العرضان غير متماثلين (المنتصف الهندسي = 150/150)
    const widths = [left.maxX - left.minX, right.maxX - right.minX];
    expect(Math.abs(widths[0] - widths[1])).toBeGreaterThanOrEqual(4);
    expect(widths[0] + widths[1]).toBeLessThanOrEqual(300);
    expectNoResourceLeaks();
  });

  it('يُعيد null عند غياب أي كنتور (ولا يتسرب أي كائن)', async () => {
    harness = { gray: deskGray(), fixtures: [] };

    const result = await detectDocumentsWithOpenCV(makeSource(), SW, SH, 'multi');

    expect(result).toBeNull();
    expectNoResourceLeaks();
  });

  it('يرفض كتلة منخفضة التباين بلا سياق خلفية (بوابة الالتباس) مع تنظيف كامل', async () => {
    harness = {
      gray: deskGray(),
      fixtures: [{ area: 160 * 96, perimeter: 2 * (160 + 96), quad: LOW_CONTRAST_QUAD }],
    };

    const result = await detectDocumentsWithOpenCV(makeSource(), SW, SH, 'single');

    expect(result).toBeNull();
    expectNoResourceLeaks();
  });
});
