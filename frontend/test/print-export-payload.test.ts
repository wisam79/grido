import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  usePrintExport,
  type PrintExportContext,
} from '../src/components/editor/print/use-print-export';
import { ExportPrintSheet, PrintNative } from '@bindings/grido/internal/handlers/printhandler';
import { toast } from 'sonner';
import type { usePrintLayout } from '../src/hooks/use-print-layout';
import type { CanvasSlot } from '../src/lib/store/types';

// ─────────────────────────────────────────────────────────────────────────────
// print-export-payload.test.ts — عقد حمولة الطباعة (PrintRequest Contract)
//
// يقفل الانحدارات التي كشفتها المراجعة المعمارية بعد تفكيك use-print-export.ts:
//   1. صيغة الإخراج: 'jpeg' (وليس 'png') — PNG على ورقة 50MP أثقل بمرات داخل WebView2.
//   2. خلفية الورقة: لون كانفاس المستخدم (وليس أبيض صلباً) — سلامة تصدير الكولاج.
//   3. الأبعاد والعناصر وعلامات القص والاتجاه تُمرَّر كما هي إلى Go.
//   4. تسلسل الإنهاء الآمن: onDone وتحرير pointerEvents قبل إطلاق حوار الطباعة.
//   5. حارس حدود الورقة يمنع الإرسال بدل القصّ الصامت في Go.
//
// المحاكاة على هوية الوحدة الفعلية (@bindings/grido/internal/handlers/printhandler)
// لا على جسر wailsjs/**، لأن المحرك يستورد الربطات المولدة مباشرةً.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@bindings/grido/internal/handlers/printhandler', () => ({
  ExportPrintSheet: vi.fn(() =>
    Promise.resolve({ success: true, filePath: 'C:/mock/sheet.png', htmlDoc: '' }),
  ),
  PrintNative: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('@bindings/grido/app', () => ({
  SetTaskbarProgress: vi.fn(() => Promise.resolve()),
  LogFrontendError: vi.fn(() => Promise.resolve()),
}));

const mockExportPrintSheet = vi.mocked(ExportPrintSheet);
const mockPrintNative = vi.mocked(PrintNative);
const mockToastError = vi.mocked(toast.error);

/** شبكة طباعة بمقاسات ثابتة: خانة واحدة في الورقة (14mm هامش داخلي + 90×120mm صورة) */
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

/** خانة كولاج واحدة تغطي الكانفاس بالكامل (الإحداثيات نسبية 0..1 بنمط مشروع Grido) */
const SLOT_SRC = '/local-image/slot-a.png';
const makeSlots = (): CanvasSlot[] => [
  {
    id: 'slot-1',
    cellIndex: 0,
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    imageSrc: SLOT_SRC,
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    zoom: 1,
    dragX: 0,
    dragY: 0,
  },
];

const makeContext = (overrides: Partial<PrintExportContext> = {}): PrintExportContext => ({
  layout: makeLayout(),
  mode: 'collage',
  elements: [],
  slots: makeSlots(),
  canvasWidth: 900,
  canvasHeight: 1200,
  backgroundColor: '#123456',
  collageTemplate: null,
  collageMargin: 0,
  collageGap: 0,
  collageRadius: 0,
  collageStrokeWidth: 0,
  collageStrokeColor: '#000000',
  collageShowCutLines: true,
  collageShowEndCutLine: true,
  printDpi: 300,
  printShowCutLines: true,
  printShowEndCutLine: true,
  printCutLineStyle: 'dashed',
  printOrientation: 'landscape',
  ...overrides,
});

async function runPrint(context: PrintExportContext, onDone: () => void = () => {}) {
  const { result } = renderHook((props: PrintExportContext) => usePrintExport(props), {
    initialProps: context,
  });
  await act(async () => {
    await result.current.handlePrint(5, onDone);
  });
  return result;
}

describe('عقد حمولة الطباعة (PrintRequest Contract)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.pointerEvents = '';
  });

  afterEach(() => {
    document.body.style.pointerEvents = '';
  });

  it('يرسل الصيغة JPEG وخلفية الكولاج وأبعاد الورقة والعناصر وعلامات القص', async () => {
    await runPrint(makeContext());

    expect(mockExportPrintSheet).toHaveBeenCalledTimes(1);
    expect(mockExportPrintSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        // 1) الصيغة: JPEG لا PNG (يبقى هذا السطر حارس الانحدار)
        exportFormat: 'jpeg',
        // 2) خلفية الورقة من لون كانفاس المستخدم — لا أبيض صلباً
        backgroundColor: '#123456',
        // 3) أبعاد الورقة والهوامش وعلامات القص والاتجاه
        paperWidthMM: 210,
        paperHeightMM: 297,
        marginMM: 5,
        gapMM: 2,
        dpi: 300,
        showCutLines: true,
        cutLineStyle: 'dashed',
        colorSpace: 'sRGB',
        orientation: 'landscape',
        // 4) عناصر الورقة: خانة الكولاج بمقاساتها المحسوبة بالمليمتر
        items: [
          expect.objectContaining({
            imageSrc: SLOT_SRC,
            x: 14,
            y: 14,
            w: 90,
            h: 120,
            copies: 1,
            copyCols: 2,
            slotAspect: 0.75,
          }),
        ],
      }),
    );

    const payload = mockExportPrintSheet.mock.calls[0][0] as unknown as {
      cutLines: Array<Record<string, unknown>>;
      items: Array<{ imageSrc: string }>;
    };
    expect(payload.items).toHaveLength(1);
    expect(payload.cutLines.length).toBeGreaterThan(0);
    expect(typeof payload.cutLines[0].x1).toBe('number');
    expect(typeof payload.cutLines[0].y2).toBe('number');
  });

  it('يحرّر pointerEvents ويسلّم onDone بعد نجاح التصدير (تسلسل الإنهاء الآمن)', async () => {
    const teardown: {
      pointerEvents: string | null;
      exportCalls: number;
      printNativeCalls: number;
    } = {
      pointerEvents: null,
      exportCalls: -1,
      printNativeCalls: -1,
    };
    const onDone = vi.fn(() => {
      teardown.pointerEvents = document.body.style.pointerEvents;
      teardown.exportCalls = mockExportPrintSheet.mock.calls.length;
      teardown.printNativeCalls = mockPrintNative.mock.calls.length;
    });

    const result = await runPrint(makeContext(), onDone);

    expect(onDone).toHaveBeenCalledTimes(1);
    // onDone يُنادى بعد نجاح ExportPrintSheet وقبل أي إطلاق لحوار الطباعة
    expect(teardown.exportCalls).toBe(1);
    // لا يبقى أي قفل pointer-events على الصفحة لحظة إغلاق الحوار
    expect(teardown.pointerEvents).toBe('');
    // ولم تبدأ الطباعة التراجعية قبل إغلاق الحوار (تسلسل الإنهاء الآمن)
    expect(teardown.printNativeCalls).toBe(0);
    expect(result.current.isExporting).toBe(false);
  });

  it('يطبّق الخلفية الاحتياطية والاتجاه الافتراضي عند غياب القيم', async () => {
    await runPrint(
      makeContext({ backgroundColor: '', printOrientation: undefined, collageShowCutLines: false }),
    );

    expect(mockExportPrintSheet).toHaveBeenCalledTimes(1);
    expect(mockExportPrintSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundColor: '#ffffff',
        orientation: 'portrait',
        showCutLines: false,
      }),
    );
  });

  it('يمنع الإرسال إلى Go برسالة عربية عند تجاوز العنصر لحدود الورقة', async () => {
    const result = await runPrint(makeContext({ layout: makeLayout({ imageWidthMM: 300 }) }));

    expect(mockExportPrintSheet).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining('لا يمكن التصدير: بعض خلايا الكولاج تتجاوز حدود الورقة'),
    );
    expect(result.current.isExporting).toBe(false);
  });

  // ─── RV-16-H1: نمط خطوط القص المختار يُرسل في وضع الكولاج أيضاً ───
  it('يرسل نمط خطوط القص الذي اختاره المستخدم في وضع الكولاج (لا «متقطع» مفروض)', async () => {
    await runPrint(makeContext({ printCutLineStyle: 'solid' }));

    expect(mockExportPrintSheet).toHaveBeenCalledTimes(1);
    expect(mockExportPrintSheet).toHaveBeenCalledWith(
      expect.objectContaining({ cutLineStyle: 'solid' }),
    );
  });

  it('يسقط إلى «متقطع» فقط عند غياب النمط كلياً', async () => {
    await runPrint(makeContext({ printCutLineStyle: undefined }));

    expect(mockExportPrintSheet).toHaveBeenCalledWith(
      expect.objectContaining({ cutLineStyle: 'dashed' }),
    );
  });

  // ─── RV-16-M3: الحارس يفحص الحدود بعد توسيع النسخ الشبكية ───
  it('يقبل شبكة نسخ موسّعة تبقى داخل الورقة (الحارس يحسب آخر خلية لا الأولى)', async () => {
    // نسختان في عمودين: أقصى امتداد = 14 + 1×92 + 90 = 196مم ≤ 210مم
    const result = await runPrint(
      makeContext({
        layout: makeLayout({
          actualCopies: 2,
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
        }),
      }),
    );

    expect(mockExportPrintSheet).toHaveBeenCalledTimes(1);
    const payload = mockExportPrintSheet.mock.calls[0][0] as {
      items: Array<{ copies?: number; copyCols?: number }>;
    };
    expect(payload.items[0].copies).toBe(2);
    expect(payload.items[0].copyCols).toBe(2);
    expect(result.current.isExporting).toBe(false);
  });

  it('يمنع شبكة نسخ موسّعة تتجاوز حدود الورقة وإن كانت أول خلية داخلها', async () => {
    // أول خلية تنتهي عند 14+90=104مم (كانت تمر بالحارس القديم) لكن خطوة
    // النسخ 300مم تدفع الخلية الثانية إلى 14+300+90=404مم خارج الورقة
    const result = await runPrint(
      makeContext({
        layout: makeLayout({
          actualCopies: 2,
          grid: {
            safeCols: 2,
            actualRows: 1,
            gridWidth: 690,
            gridHeight: 120,
            offsetX: 14,
            offsetY: 14,
            cellWidth: 300,
            cellHeight: 122,
          },
        }),
      }),
    );

    expect(mockExportPrintSheet).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('تتجاوز حدود الورقة'));
    expect(result.current.isExporting).toBe(false);
  });
});
