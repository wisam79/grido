import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  buildCollagePayload,
  buildSinglePayload,
  type CollagePayloadContext,
} from '../src/components/editor/print/print-payload-builder';

import type { usePrintLayout } from '../src/hooks/use-print-layout';
import type { CanvasSlot, ImageElement } from '../src/lib/store/types';

// ─────────────────────────────────────────────────────────────────────────────
// print-payload-builder.test.ts — عقد حمولة الوضع الحر (Single Mode Contract)
//
// يقفل إصلاحات مراجعة الطباعة RV-16:
//   H2: عناصر التركيب تُرسل بـ slotAspect=0 (تمديد Konva) لا قصاً تغطياً في Go.
//   M3: توسيع النسخ على جانب Go (copies/copyCols/copyStep*) بدل تكرار العناصر
//       عبر IPC — 48 نسخة × 21 عنصراً كانت تتجاوز حد التحقق 1000 عنصر.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../src/components/editor/print/print-transport', () => ({
  uploadPrintImage: vi.fn(async () => '/local-image/print_upload_mock.png'),
  describeError: vi.fn((e: unknown) => String(e)),
  withTimeout: vi.fn(async (p: Promise<unknown>) => p),
  UPLOAD_TIMEOUT_MS: 120_000,
  EXPORT_TIMEOUT_MS: 600_000,
}));

vi.mock('../src/lib/canvas/konva-export-utils', () => ({
  captureStageBlob: vi.fn(async () => new Blob(['png-bytes'], { type: 'image/png' })),
  swapNodeImagesForCapture: vi.fn(async () => () => {}),
}));

const makeLayout = (overrides: Partial<Record<string, unknown>> = {}) =>
  ({
    imageWidthMM: 90,
    imageHeightMM: 120,
    gapMM: 2,
    actualCopies: 1,
    paperWidth: 210,
    paperHeight: 297,
    grid: {
      safeCols: 2,
      actualRows: 1,
      gridWidth: 182,
      gridHeight: 120,
      offsetX: 14,
      offsetY: 14,
      cellWidth: 92,
      cellHeight: 122,
    },
    ...overrides,
  }) as unknown as ReturnType<typeof usePrintLayout>;

const makeSlot = (overrides: Partial<CanvasSlot> = {}): CanvasSlot => ({
  id: 'slot-1',
  cellIndex: 0,
  x: 0.1,
  y: 0.2,
  w: 0.5,
  h: 0.4,
  ...overrides,
});

const makeCollageContext = (
  overrides: Partial<CollagePayloadContext> = {},
): CollagePayloadContext => ({
  layout: makeLayout(),
  slots: [makeSlot()],
  canvasWidth: 900,
  canvasHeight: 1200,
  collageTemplate: null,
  collageMargin: 0,
  collageGap: 0,
  collageRadius: 12,
  collageStrokeWidth: 0,
  collageStrokeColor: '#112233',
  collageShowCutLines: false,
  collageShowEndCutLine: false,
  ...overrides,
});

describe('Decorative collage print payload', () => {
  it('keeps an imageless fill with its geometry, radius and copy template', () => {
    const built = buildCollagePayload(
      makeCollageContext({
        layout: makeLayout({ actualCopies: 4 }),
        slots: [makeSlot({ bgColor: '#224466', rotation: 270, flipX: true })],
      }),
    );

    expect(built.items).toHaveLength(1);
    expect(built.items[0]).toMatchObject({
      imageSrc: '',
      bgColor: '#224466',
      x: 23,
      y: 38,
      w: 45,
      h: 48,
      slotAspect: 45 / 48,
      borderWidthMM: 0,
      borderColor: '#112233',
      rotation: 270,
      flipX: true,
      copies: 4,
      copyCols: 2,
      copyStepX: 92,
      copyStepY: 122,
    });
    expect(built.items[0].cornerRadiusMM).toBeCloseTo(1.2);
    expect(built.composition).toBeUndefined();
  });

  it('keeps border-only slots without inserting a fake source or fill', () => {
    const built = buildCollagePayload(
      makeCollageContext({
        slots: [makeSlot({ bgColor: 'transparent' })],
        collageStrokeWidth: 5,
      }),
    );

    expect(built.items).toHaveLength(1);
    expect(built.items[0]).toMatchObject({
      imageSrc: '',
      bgColor: 'transparent',
      borderWidthMM: 0.5,
      borderColor: '#112233',
      x: 23,
      y: 38,
      w: 45,
      h: 48,
      copies: 1,
      copyStepX: 0,
      copyStepY: 0,
    });
  });

  it('preserves mixed image and decoration order without expanding repeated copies over IPC', () => {
    const built = buildCollagePayload(
      makeCollageContext({
        layout: makeLayout({ actualCopies: 4 }),
        slots: [
          makeSlot({ id: 'photo', imageSrc: '/local-image/photo.png', flipY: true }),
          makeSlot({ id: 'fill', bgColor: '#ff8800', x: 0.5 }),
          makeSlot({ id: 'empty' }),
          makeSlot({ id: 'transparent', bgColor: ' TRANSPARENT ' }),
        ],
      }),
    );

    expect(built.items).toHaveLength(2);
    expect(built.items.map((item) => item.imageSrc)).toEqual(['/local-image/photo.png', '']);
    expect(built.items[0].flipY).toBe(true);
    expect(built.items[1].bgColor).toBe('#ff8800');
    expect(built.items[1].x).toBe(59);
    for (const item of built.items) {
      expect(item.copies).toBe(4);
      expect(item.copyCols).toBe(2);
      expect(item.copyStepX).toBe(92);
      expect(item.copyStepY).toBe(122);
    }
  });

  it.each([
    { bgColor: undefined, borderWidth: 0, borderColor: '#112233' },
    { bgColor: '', borderWidth: 2, borderColor: '' },
    { bgColor: 'transparent', borderWidth: 2, borderColor: ' TRANSPARENT ' },
    { bgColor: '  ', borderWidth: 0, borderColor: '#112233' },
  ])('skips unstyled empty slots ($bgColor, $borderWidth, $borderColor)', (style) => {
    const built = buildCollagePayload(
      makeCollageContext({
        slots: [makeSlot({ bgColor: style.bgColor })],
        collageStrokeWidth: style.borderWidth,
        collageStrokeColor: style.borderColor,
      }),
    );

    expect(built.items).toEqual([]);
  });
});

const makeImageElement = (overrides: Partial<ImageElement> = {}): ImageElement =>
  ({
    id: 'el-1',
    type: 'image',
    x: 0.1,
    y: 0.2,
    width: 0.5,
    height: 0.4,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    imageSrc: '/local-image/photo-a.png',
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    flipX: false,
    flipY: false,
    cornerRadius: 0,
    ...overrides,
  }) as ImageElement;

const baseCtx = {
  // stage وهمي — لا يُستخدم فعلياً في مسار التركيب المؤهل (composition path)
  stage: { fake: 'stage' } as unknown as Parameters<typeof buildSinglePayload>[0]['stage'],
  layout: makeLayout(),
  elements: [makeImageElement()],
  canvasWidth: 900,
  canvasHeight: 1200,
  backgroundColor: '#ffffff',
  backgroundGradientColor2: null,
  printDpi: 300,
  printShowCutLines: true,
  printShowEndCutLine: true,
  printCutLineStyle: 'dashed' as const,
};

describe('عقد حمولة الوضع الحر (Single Payload Contract)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('H2: عناصر التركيب تُرسل بـ slotAspect=0 — تمديد Konva لا قصّ cover في Go', async () => {
    const built = await buildSinglePayload({
      ...baseCtx,
      elements: [
        makeImageElement({ id: 'el-a', imageSrc: '/local-image/photo-a.png' }),
        makeImageElement({
          id: 'el-b',
          imageSrc: '/local-image/photo-b.png',
          // عنصر مُمدَّد بغير نسبة مصدره — أخطر حالة لهذا العقد
          x: 0.05,
          y: 0.05,
          width: 0.9,
          height: 0.1,
        }),
      ],
    });

    expect(built).not.toBeNull();
    expect(built!.items).toHaveLength(2);
    for (const item of built!.items) {
      // صفر = بلا اقتصاص تغطية في computeCropFromSlot ⇒ تُمدَّد الصورة كاملة
      // داخل مستطيلها تماماً كما يعرضها Konva (image-node يضبط width/height)
      expect(item.slotAspect).toBe(0);
      expect(item.zoom).toBe(1);
      expect(item.dragX).toBe(0);
      expect(item.dragY).toBe(0);
    }
  });

  it('M3: النسخ تُوسَّع على جانب Go — لا تكرار عناصر عبر IPC', async () => {
    const layout = makeLayout({ actualCopies: 4 });
    const built = await buildSinglePayload({
      ...baseCtx,
      layout,
      elements: [
        makeImageElement({ id: 'el-a', imageSrc: '/local-image/photo-a.png' }),
        makeImageElement({ id: 'el-b', imageSrc: '/local-image/photo-b.png' }),
      ],
    });

    expect(built).not.toBeNull();
    // عنصران قالبيان فقط — ليس 2×4=8 (كان التكرار يجاوز حد Go البالغ 1000
    // عند 48 نسخة × 21 عنصراً)
    expect(built!.items).toHaveLength(2);
    for (const item of built!.items) {
      expect(item.copies).toBe(4);
      expect(item.copyCols).toBe(2);
      expect(item.copyStepX).toBe(92);
      expect(item.copyStepY).toBe(122);
      // الإحداثيات عند كتلة النسخة الأولى + هندسة العنصر — Go يضيف الخطوات
      // (copyStepX/copyStepY) عند التوسيع: 14 + (0.1×900px × 90مم/900px) = 23مم
      expect(item.x).toBe(23);
      // 14 + (0.2×1200px × 120مم/1200px) = 38مم
      expect(item.y).toBe(38);
    }
  });

  it('M3 (مسار الالتقاط): عنصر واحد قالبي مع copies بدل نسخة لكل ورقة', async () => {
    const layout = makeLayout({ actualCopies: 3 });
    // تدوير غير صفري يجعل التركيب غير مؤهل ⇒ مسار الالتقاط (capture)
    const built = await buildSinglePayload({
      ...baseCtx,
      layout,
      elements: [makeImageElement({ rotation: 45 })],
    });

    expect(built).not.toBeNull();
    expect(built!.items).toHaveLength(1);
    const item = built!.items[0];
    expect(item.imageSrc).toBe('/local-image/print_upload_mock.png');
    expect(item.copies).toBe(3);
    expect(item.copyCols).toBe(2);
    expect(item.x).toBe(14);
    expect(item.w).toBe(90);
    expect(item.h).toBe(120);
  });

  it('نسخة واحدة: copies=1 بلا توسيع والأبعاد عند الكتلة الأولى', async () => {
    const built = await buildSinglePayload({ ...baseCtx });

    expect(built).not.toBeNull();
    expect(built!.items).toHaveLength(1);
    expect(built!.items[0].copies).toBe(1);
    // 14 + (0.1×900px × 90مم/900px) = 23مم
    expect(built!.items[0].x).toBe(23);
    // 14 + (0.2×1200px × 120مم/1200px) = 38مم
    expect(built!.items[0].y).toBe(38);
  });

  it('خطوط القص تُحوَّل كما هي إلى إحداثيات Go', async () => {
    const built = await buildSinglePayload({ ...baseCtx });

    expect(built).not.toBeNull();
    expect(built!.cutLines.length).toBeGreaterThan(0);
    for (const l of built!.cutLines) {
      expect(typeof l.x1).toBe('number');
      expect(typeof l.y2).toBe('number');
    }
  });

  it('نمط cropmarks: خط النهاية الممتد لا يُرسل — يوسّع صندوق زوايا القص في Go', async () => {
    const isFullWidthHorizontal = (l: { x1: number; x2: number; y1: number; y2: number }) =>
      l.y1 === l.y2 && l.x1 === 0 && l.x2 === 210;

    const dashed = await buildSinglePayload({ ...baseCtx });
    // في النمط المتقطع خط النهاية الممتد على عرض الورقة موجود (مرجع المقارنة)
    expect(dashed!.cutLines.some(isFullWidthHorizontal)).toBe(true);

    const cropmarks = await buildSinglePayload({ ...baseCtx, printCutLineStyle: 'cropmarks' });
    expect(cropmarks).not.toBeNull();
    // خطوط الشبكة الداخلية تبقى، وخط الورقة الممتد يُحجب
    expect(cropmarks!.cutLines.length).toBeGreaterThan(0);
    expect(cropmarks!.cutLines.some(isFullWidthHorizontal)).toBe(false);
  });
});
