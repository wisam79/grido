import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  ExportPrintSheet,
  PrintNative,
  PrintDirect,
  PollJobStatus,
} from '@bindings/grido/internal/handlers/printhandler';

import {
  usePrintExport,
  type PrintExportContext,
  type PrintExecuteOptions,
} from '../src/components/editor/print/use-print-export';

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
//   6. عقد الطباعة المباشرة (GDI): sRGB فقط — وأي فشل يسقط بأمان لحوار النظام.
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
  PrintDirect: vi.fn(() =>
    Promise.resolve({ success: true, jobId: 42, status: 'Printed', error: '' }),
  ),
  PollJobStatus: vi.fn(() =>
    Promise.resolve({ success: true, jobId: 42, status: 'Completed', error: '' }),
  ),
  GetSupportedPapers: vi.fn(() => Promise.resolve({ success: true, papers: [], error: '' })),
}));

// طلب GDI المولّد createFrom يُمرَّر كما هو حتى تظل التأكيدات على القيم المرسلة
// (مع تمرير بقية النماذج الحقيقية — بنّاء الحمولة يستخدمها للتصدير الفعلي)
vi.mock('@bindings/grido/internal/core/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bindings/grido/internal/core/domain')>();
  return {
    ...actual,
    DirectPrintRequest: { createFrom: vi.fn((input: unknown) => input) },
  };
});

vi.mock('@bindings/grido/app', () => ({
  SetTaskbarProgress: vi.fn(() => Promise.resolve()),
  LogFrontendError: vi.fn(() => Promise.resolve()),
}));

const mockExportPrintSheet = vi.mocked(ExportPrintSheet);
const mockPrintNative = vi.mocked(PrintNative);
const mockPrintDirect = vi.mocked(PrintDirect);
const mockPollJobStatus = vi.mocked(PollJobStatus);
const mockToastError = vi.mocked(toast.error);
const mockToastSuccess = vi.mocked(toast.success);
const mockToastWarning = vi.mocked(toast.warning);

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

async function runPrint(
  context: PrintExportContext,
  onDone: () => void = () => {},
  options?: PrintExecuteOptions,
) {
  const { result } = renderHook((props: PrintExportContext) => usePrintExport(props), {
    initialProps: context,
  });
  await act(async () => {
    await result.current.handlePrint(5, onDone, options);
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
      composition?: unknown;
    };
    expect(payload.items).toHaveLength(1);
    expect(payload.cutLines.length).toBeGreaterThan(0);
    expect(typeof payload.cutLines[0].x1).toBe('number');
    expect(typeof payload.cutLines[0].y2).toBe('number');

    // 5) 🖨️ حارس انحدار v1.16.0: تمرير مفتاح `composition: undefined` عبر
    // createFrom المولّد يبني CanvasComposition أصفاراً (Nullable+default {})
    // فيرفضه Go («يجب أن تكون أكبر من صفر») ويفشل كل تصدير. المفتاح يجب أن
    // يُحذف كلياً حين لا يوجد تركيب حقيقي.
    expect(payload.composition).toBeUndefined();
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

  // ─── عقد الطباعة المباشرة (GDI Direct Spooling) ───

  it('يستدعي PrintDirect بطلب spooling كامل ويسلّم onDone عند النجاح (sRGB)', async () => {
    const onDone = vi.fn();
    await runPrint(makeContext({ printColorSpace: 'sRGB' }), onDone, {
      directPrint: true,
      printerName: 'HP LaserJet',
    });

    expect(mockPrintDirect).toHaveBeenCalledTimes(1);
    expect(mockPrintDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        printerName: 'HP LaserJet',
        filePath: 'C:/mock/sheet.png',
        paperWidthMM: 210,
        paperHeightMM: 297,
        orientation: 'landscape',
        copies: 1,
        color: true,
        // هامش 5مم ⇒ ليست بلا حواف
        borderless: false,
      }),
    );
    // النجاح المباشر لا يمر بحوار النظام إطلاقاً
    expect(mockPrintNative).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('تم إرسال الورقة بنجاح'));
  });

  it.each([
    { borderlessOption: true, expectedBorderless: true },
    { borderlessOption: false, expectedBorderless: false },
    { borderlessOption: undefined, expectedBorderless: false },
  ])(
    'يمرر borderless=$expectedBorderless بناءً على خيار الورقة لا الهامش',
    async ({ borderlessOption, expectedBorderless }) => {
      const { result } = renderHook((props: PrintExportContext) => usePrintExport(props), {
        initialProps: makeContext({ printColorSpace: 'sRGB' }),
      });
      await act(async () => {
        await result.current.handlePrint(0, () => {}, {
          directPrint: true,
          printerName: 'X',
          borderless: borderlessOption,
        });
      });

      expect(mockPrintDirect).toHaveBeenCalledWith(
        expect.objectContaining({ borderless: expectedBorderless }),
      );
    },
  );

  it('يمرر paperId و formName إلى PrintDirect لفرض مقاس الورق المعتمد', async () => {
    const { result } = renderHook((props: PrintExportContext) => usePrintExport(props), {
      initialProps: makeContext({ printColorSpace: 'sRGB' }),
    });
    await act(async () => {
      await result.current.handlePrint(0, () => {}, {
        directPrint: true,
        printerName: 'Epson L805',
        formName: '10 x 15 cm (4 x 6 in)',
        paperId: 260,
      });
    });

    expect(mockPrintDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        printerName: 'Epson L805',
        formName: '10 x 15 cm (4 x 6 in)',
        paperId: 260,
      }),
    );
  });

  it('لا يستدعي PrintDirect أبداً مع فضاء CMYK (GDI يرسم RGB فقط)', async () => {
    // مخرج CMYK يُصدَّر TIFF بفصل أحبار لا يفكّه المحرك — الطلب المباشر يُتجاهل
    // ويسقط لمسار حوار النظام (المُجدوَل بعد أنيميشن الإغلاق).
    await runPrint(makeContext({ printColorSpace: 'CMYK' }), () => {}, {
      directPrint: true,
      printerName: 'HP LaserJet',
    });

    expect(mockExportPrintSheet).toHaveBeenCalledWith(
      expect.objectContaining({ exportFormat: 'tiff', colorSpace: 'CMYK' }),
    );
    expect(mockPrintDirect).not.toHaveBeenCalled();
  });

  it('عند فشل الطباعة المباشرة: يعرض تنبيهاً صريحاً بالخطأ للمستخدم دون حوار المتصفح', async () => {
    mockPrintDirect.mockResolvedValueOnce({
      success: false,
      jobId: 0,
      status: '',
      error: 'OpenPrinter failed: 5',
    } as Awaited<ReturnType<typeof PrintDirect>>);

    await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
      printerName: 'HP LaserJet',
    });

    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('تعذرت الطباعة'));
    expect(mockExportPrintSheet).toHaveBeenCalledTimes(1);
  });

  it('يمرر اسم قالب الورق (formName) إلى طلب PrintDirect عند توفره', async () => {
    await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
      directPrint: true,
      printerName: 'Epson L8050',
      formName: 'A4 (Borderless)',
    });

    expect(mockPrintDirect).toHaveBeenCalledTimes(1);
    expect(mockPrintDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        printerName: 'Epson L8050',
        formName: 'A4 (Borderless)',
      }),
    );
  });

  it('يراقب حالة المهمة خلفياً عبر PollJobStatus بعد نجاح إرسال PrintDirect', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      mockPrintDirect.mockResolvedValueOnce({
        success: true,
        jobId: 88,
        status: 'Spooling',
        error: '',
      } as Awaited<ReturnType<typeof PrintDirect>>);

      await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
        directPrint: true,
        printerName: 'Canon Pro-1000',
      });

      expect(mockPrintDirect).toHaveBeenCalledTimes(1);
      expect(mockPollJobStatus).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1600);
      });

      expect(mockPollJobStatus).toHaveBeenCalledWith('Canon Pro-1000', 88);
    } finally {
      vi.useRealTimers();
    }
  });

  it('يُظهر تنبيه خطأ إذا كشف PollJobStatus عطلاً في المهمة بعد الإرسال', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      mockPrintDirect.mockResolvedValueOnce({
        success: true,
        jobId: 99,
        status: 'Spooling',
        error: '',
      } as Awaited<ReturnType<typeof PrintDirect>>);
      mockPollJobStatus.mockResolvedValueOnce({
        success: false,
        jobId: 99,
        status: 'Out of Paper',
        error: 'نفد الورق من الدرج الخلفي',
      } as Awaited<ReturnType<typeof PollJobStatus>>);

      await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
        directPrint: true,
        printerName: 'Canon Pro-1000',
      });

      await act(async () => {
        vi.advanceTimersByTime(1600);
      });

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('تنبيه الطابعة للمهمة #99: نفد الورق من الدرج الخلفي'),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('يتعامل بأمان مع استثناءات PrintDirect ويعرض رسالة خطأ صريحة للمستخدم', async () => {
    mockPrintDirect.mockRejectedValueOnce(new Error('RPC connection closed unexpectedly'));

    await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
      printerName: 'HP LaserJet',
    });

    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('تعذرت الطباعة'));
    expect(mockExportPrintSheet).toHaveBeenCalledTimes(1);
  });

  it('يتعامل مع مهلة PrintDirect بتنبيه خاص ويمنع السقوط التلقائي تفادياً للطباعة المزدوجة', async () => {
    const onDone = vi.fn();
    mockPrintDirect.mockRejectedValueOnce(new Error('PrintDirect: انتهت المهلة (30 ث)'));

    await runPrint(makeContext({ printColorSpace: 'sRGB' }), onDone, {
      directPrint: true,
      printerName: 'HP LaserJet',
    });

    expect(mockToastWarning).toHaveBeenCalledWith(
      expect.stringContaining('تأخرت الطباعة المباشرة عن المهلة'),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mockPrintNative).not.toHaveBeenCalled();
  });

  it('يمرر مصفوفة عناصر فارغة إذا كانت الخانات فارغة في وضع الكولاج', async () => {
    await runPrint(makeContext({ slots: [] }));

    expect(mockExportPrintSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [],
      }),
    );
  });

  it('يمرر اسم طابعة فارغاً إذا لم يُحدد في الخيارات لتمكين السقوط للطابعة الافتراضية', async () => {
    await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
      directPrint: true,
      printerName: '',
    });

    expect(mockPrintDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        printerName: '',
      }),
    );
  });

  it('يعرض اسم الطابعة المخصصة ورقم المهمة بدقة في إشعار النجاح', async () => {
    mockPrintDirect.mockResolvedValueOnce({
      success: true,
      jobId: 105,
      status: 'Spooling',
      error: '',
    } as Awaited<ReturnType<typeof PrintDirect>>);

    await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
      directPrint: true,
      printerName: 'Epson Stylus Pro 4900',
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining(
        'تم إرسال الورقة بنجاح إلى طابعة Epson Stylus Pro 4900 (المهمة #105)',
      ),
    );
  });

  it('يتجاهل استدعاء PollJobStatus إذا أعادت الطباعة المباشرة jobId صفرياً أو غير معرف', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      mockPrintDirect.mockResolvedValueOnce({
        success: true,
        jobId: 0,
        status: 'Printed',
        error: '',
      } as Awaited<ReturnType<typeof PrintDirect>>);

      await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
        directPrint: true,
        printerName: 'Brother HL-L2350DW',
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockPollJobStatus).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('يحظر تماماً استدعاء PrintDirect عند اختيار فضاء ألوان CMYK ويُعلن نجاح تصدير ملف المطبعة', async () => {
    await runPrint(makeContext({ printColorSpace: 'CMYK' }), () => {}, {
      printerName: 'Epson L8050',
    });

    // يجب ألا يُستدعى PrintDirect أبداً لأن GDI يدعم RGB فقط ومخرج CMYK هو TIFF
    expect(mockPrintDirect).not.toHaveBeenCalled();
    expect(mockExportPrintSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        colorSpace: 'CMYK',
        exportFormat: 'tiff',
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('تم تصدير ورقة الطباعة للمطبعة (TIFF CMYK)'),
    );
  });

  it('يمرر بدقة معلمات borderless و paperId إلى PrintDirect عند طلب طباعة بدون حواف', async () => {
    await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
      directPrint: true,
      printerName: 'Canon Pro-1000',
      borderless: true,
      paperId: 43,
      formName: 'Postcard (Borderless)',
    });

    expect(mockPrintDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        printerName: 'Canon Pro-1000',
        borderless: true,
        paperId: 43,
        formName: 'Postcard (Borderless)',
      }),
    );
  });

  it('يتعامل بدقة مع أخطاء طابور الطباعة الميدانية (انحشار الورق وحالة عدم الاتصال)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      mockPrintDirect.mockResolvedValueOnce({
        success: true,
        jobId: 101,
        status: 'Spooling',
        error: '',
      } as Awaited<ReturnType<typeof PrintDirect>>);
      mockPollJobStatus.mockResolvedValueOnce({
        success: false,
        jobId: 101,
        status: 'Error',
        error: 'انحشار في مسار الورق (Paper Jam)',
      } as Awaited<ReturnType<typeof PollJobStatus>>);

      await runPrint(makeContext({ printColorSpace: 'sRGB' }), () => {}, {
        directPrint: true,
        printerName: 'DNP DS-RX1',
      });

      await act(async () => {
        vi.advanceTimersByTime(1600);
      });

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('تنبيه الطابعة للمهمة #101: انحشار في مسار الورق (Paper Jam)'),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('يتجاهل نتائج PrintDirect المتأخرة عند استدعاء cancelExport (حماية الجيل والإلغاء)', async () => {
    let resolveFirstPrint: (val: unknown) => void = () => {};
    const firstPrintPromise = new Promise((resolve) => {
      resolveFirstPrint = resolve;
    });

    mockPrintDirect.mockReturnValueOnce(firstPrintPromise as never);

    const onDone = vi.fn();
    const { result } = renderHook((props: PrintExportContext) => usePrintExport(props), {
      initialProps: makeContext({ printColorSpace: 'sRGB' }),
    });

    // 1. إطلاق المهمة الأولى
    act(() => {
      void result.current.executePrint(0, onDone, {
        directPrint: true,
        printerName: 'Epson 1',
      });
    });

    // 2. المستخدم يلغي التصدير أثناء الإرسال
    act(() => {
      result.current.cancelExport();
    });

    // 3. اكتمال المهمة الأولى المتأخرة
    await act(async () => {
      resolveFirstPrint({
        success: true,
        jobId: 101,
        status: 'Spooling',
        error: '',
      });
    });

    // النتيجة الملغاة يجب ألا تستدعي onDone ولا تعرض إشعار نجاح
    expect(onDone).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
