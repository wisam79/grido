import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ExportPrintSheet } from '@bindings/grido/internal/handlers/printhandler';

import { uploadPrintImage } from '../src/components/editor/print/print-transport';
import { exportCanvas } from '../src/lib/export/export-canvas';
import { buildCmykPrintRequest, basename, runCmykExport } from '../src/lib/export/export-cmyk';

// ─────────────────────────────────────────────────────────────────────────────
// export-cmyk.test.ts — مسار تصدير CMYK (TIFF/JPEG)
//
// يقفل ثلاثة عقود:
//   1. حمولة الطباعة: عنصر واحد يملأ الورقة، بلا علامات قص، colorSpace='cmyk'
//      و exportFormat مطابق للصيغة المختارة.
//   2. تسلسل التنفيذ: لقطة RGB ← رفع ← ExportPrintSheet ← قراءة /local-image/.
//   3. الأخطاء: التقاط فاشل، أو نتيجة Go فاشلة، أو مسار غير صالح ⇒ رمي صريح
//      (لا ملف صامت ولا "[object Object]").
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../src/lib/export/export-canvas', () => ({
  exportCanvas: vi.fn(),
}));

// نبقي withTimeout/EXPORT_TIMEOUT_MS الحقيقية ونحاكي الرفع فقط
vi.mock('../src/components/editor/print/print-transport', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/components/editor/print/print-transport')>();
  return { ...actual, uploadPrintImage: vi.fn() };
});

vi.mock('@bindings/grido/internal/handlers/printhandler', () => ({
  ExportPrintSheet: vi.fn(),
}));

const mockExportCanvas = vi.mocked(exportCanvas);
const mockUpload = vi.mocked(uploadPrintImage);
const mockExportPrintSheet = vi.mocked(ExportPrintSheet);

const captureParams = {
  stage: null,
  format: 'tiff' as const,
  dpi: 300,
  paperWidthMM: 210,
  paperHeightMM: 297,
  backgroundColor: '#ffffff',
};

describe('buildCmykPrintRequest', () => {
  it('يطابق صيغة CMYK وصيغة الملف المختارة', () => {
    const req = buildCmykPrintRequest({
      imageSrc: '/local-image/print_canvas_1.png',
      paperWidthMM: 210,
      paperHeightMM: 297,
      dpi: 300,
      backgroundColor: '#ffffff',
      format: 'tiff',
    });

    expect(req.colorSpace).toBe('cmyk');
    expect(req.exportFormat).toBe('tiff');
    expect(req.dpi).toBe(300);
    expect(req.backgroundColor).toBe('#ffffff');
  });

  it('يبني عنصراً واحداً يملأ الورقة تماماً بلا هوامش ولا خطوط قص', () => {
    const req = buildCmykPrintRequest({
      imageSrc: '/local-image/a.png',
      paperWidthMM: 210,
      paperHeightMM: 297,
      dpi: 300,
      backgroundColor: '#000000',
      format: 'jpeg',
    });

    expect(req.marginMM).toBe(0);
    expect(req.gapMM).toBe(0);
    expect(req.showCutLines).toBe(false);
    expect(req.cutLines).toEqual([]);
    expect(req.items).toHaveLength(1);

    const [item] = req.items;
    expect(item.imageSrc).toBe('/local-image/a.png');
    expect(item.x).toBe(0);
    expect(item.y).toBe(0);
    expect(item.w).toBe(210);
    expect(item.h).toBe(297);
    expect(item.copies).toBe(1);
  });

  it('يستنتج الاتجاه من أبعاد الورقة (عرضي عند العرض > الطول)', () => {
    const base = {
      imageSrc: '/local-image/a.png',
      dpi: 300,
      backgroundColor: '#ffffff',
      format: 'jpeg' as const,
    };

    expect(
      buildCmykPrintRequest({ ...base, paperWidthMM: 297, paperHeightMM: 210 }).orientation,
    ).toBe('landscape');
    expect(
      buildCmykPrintRequest({ ...base, paperWidthMM: 210, paperHeightMM: 297 }).orientation,
    ).toBe('portrait');
  });

  it('يمرر صيغة JPEG كما اختارها المستخدم (لا يُجبرها على TIFF)', () => {
    const req = buildCmykPrintRequest({
      imageSrc: '/local-image/a.png',
      paperWidthMM: 100,
      paperHeightMM: 100,
      dpi: 150,
      backgroundColor: '#ffffff',
      format: 'jpeg',
    });
    expect(req.exportFormat).toBe('jpeg');
  });
});

describe('basename', () => {
  it('يستخرج الاسم من مسار ويندوز', () => {
    expect(basename('C:\\Users\\x\\Exports\\print_123.tif')).toBe('print_123.tif');
  });

  it('يستخرج الاسم من مسار POSIX', () => {
    expect(basename('/home/x/exports/print_9.jpeg')).toBe('print_9.jpeg');
  });

  it('يعيد نصاً فارغاً للمسار الفارغ', () => {
    expect(basename('')).toBe('');
  });
});

describe('runCmykExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExportCanvas.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    mockUpload.mockResolvedValue('/local-image/print_canvas_7.png');
    mockExportPrintSheet.mockResolvedValue({
      success: true,
      filePath: 'C:\\Users\\x\\Exports\\print_7.tif',
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  interface MockFetchResponse {
    ok?: boolean;
    status?: number;
    blob?: () => Promise<Blob>;
  }

  const stubFetch = (response: MockFetchResponse) => {
    const fullResponse = {
      ok: response.ok ?? (response.status ? response.status >= 200 && response.status < 300 : true),
      status: response.status ?? 200,
      blob: response.blob ?? (() => Promise.resolve(new Blob())),
    } as unknown as Response;
    const fetchMock = vi.fn(() => Promise.resolve(fullResponse));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('يمر بالسلسلة كاملة: لقطة ← رفع ← تحويل ← قراءة الملف الناتج', async () => {
    const fetchMock = stubFetch({
      status: 200,
      blob: () => Promise.resolve(new Blob(['tiff'], { type: 'image/tiff' })),
    });

    const result = await runCmykExport(captureParams);

    expect(mockExportCanvas).toHaveBeenCalledWith('png', 1, null);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockExportPrintSheet).toHaveBeenCalledTimes(1);

    const sent = mockExportPrintSheet.mock.calls[0][0];
    expect(sent.colorSpace).toBe('cmyk');
    expect(sent.exportFormat).toBe('tiff');
    expect(sent.items[0].imageSrc).toBe('/local-image/print_canvas_7.png');

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/local-image/print_7.tif'));
    expect(result.sourceFilename).toBe('print_7.tif');
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('يرسل exportFormat=jpeg عندما يختار المستخدم JPEG', async () => {
    stubFetch({
      status: 200,
      blob: () => Promise.resolve(new Blob(['jpg'], { type: 'image/jpeg' })),
    });

    await runCmykExport({ ...captureParams, format: 'jpeg' });

    expect(mockExportPrintSheet.mock.calls[0][0].exportFormat).toBe('jpeg');
  });

  it('يرمي برسالة عربية عند فشل التقاط الكانفاس', async () => {
    mockExportCanvas.mockResolvedValue(null);

    await expect(runCmykExport(captureParams)).rejects.toThrow('تعذر التقاط التصميم للتصدير');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('يرمي برسالة Go عند فشل التحويل الخلفي', async () => {
    mockExportPrintSheet.mockResolvedValue({
      success: false,
      error: 'CMYK encode failed',
    } as never);

    await expect(runCmykExport(captureParams)).rejects.toThrow('CMYK encode failed');
  });

  it('يرمي عندما تنجح النتيجة بلا مسار ملف', async () => {
    mockExportPrintSheet.mockResolvedValue({ success: true, filePath: '' } as never);

    await expect(runCmykExport(captureParams)).rejects.toThrow('فشل توليد ملف CMYK');
  });

  it('يرمي عند تعذر قراءة الملف الناتج من الخادم المحلي', async () => {
    stubFetch({ status: 404, ok: false });

    await expect(runCmykExport(captureParams)).rejects.toThrow('HTTP 404');
  });

  it('يرمي عند فشل رفع اللقطة قبل الوصول إلى Go', async () => {
    mockUpload.mockRejectedValue(new Error('upload failed: HTTP 500'));

    await expect(runCmykExport(captureParams)).rejects.toThrow('upload failed');
    expect(mockExportPrintSheet).not.toHaveBeenCalled();
  });

  it('يتخطى تنزيل الـ Blob عبر الشبكة عند تفعيل skipBlobFetch للحفظ المباشر من القرص', async () => {
    const fetchMock = stubFetch({ status: 200 });

    const result = await runCmykExport({ ...captureParams, skipBlobFetch: true });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.sourceFilename).toBe('print_7.tif');
    expect(result.blob.size).toBe(0);
  });
});
