import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CancelPrintJob, ExportPrintSheet } from '@bindings/grido/internal/handlers/printhandler';

import { uploadPrintImage } from '../src/components/editor/print/print-transport';
import { exportCanvas } from '../src/lib/export/export-canvas';
import {
  assertValidTiffBlob,
  basename,
  buildCmykPrintRequest,
  isTiffBlobSignature,
  runCmykExport,
} from '../src/lib/export/export-cmyk';

vi.mock('../src/lib/export/export-canvas', () => ({ exportCanvas: vi.fn() }));
vi.mock('../src/components/editor/print/print-transport', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/components/editor/print/print-transport')>();
  return { ...actual, uploadPrintImage: vi.fn() };
});
vi.mock('@bindings/grido/internal/handlers/printhandler', () => ({
  ExportPrintSheet: vi.fn(),
  CancelPrintJob: vi.fn(() => Promise.resolve(undefined)),
}));

const mockExportCanvas = vi.mocked(exportCanvas);
const mockUpload = vi.mocked(uploadPrintImage);
const mockExportPrintSheet = vi.mocked(ExportPrintSheet);
const mockCancelPrintJob = vi.mocked(CancelPrintJob);
const TIFF_BYTES = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
const captureParams = {
  stage: null,
  format: 'tiff' as const,
  dpi: 300,
  paperWidthMM: 210,
  paperHeightMM: 297,
  backgroundColor: '#ffffff',
};

function tiffBlob(): Blob {
  return new Blob([TIFF_BYTES], { type: 'image/tiff' });
}

describe('buildCmykPrintRequest', () => {
  it('always builds a TIFF/CMYK full-sheet request', () => {
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
    expect(req.marginMM).toBe(0);
    expect(req.gapMM).toBe(0);
    expect(req.showCutLines).toBe(false);
    expect(req.cutLines).toEqual([]);
    expect(req.items).toHaveLength(1);
    expect(req.items[0]).toMatchObject({
      imageSrc: '/local-image/print_canvas_1.png',
      x: 0,
      y: 0,
      w: 210,
      h: 297,
      copies: 1,
    });
  });

  it('derives orientation from sheet dimensions', () => {
    const base = {
      imageSrc: '/local-image/a.png',
      dpi: 300,
      backgroundColor: '#ffffff',
      format: 'tiff' as const,
    };
    expect(
      buildCmykPrintRequest({ ...base, paperWidthMM: 297, paperHeightMM: 210 }).orientation,
    ).toBe('landscape');
    expect(
      buildCmykPrintRequest({ ...base, paperWidthMM: 210, paperHeightMM: 297 }).orientation,
    ).toBe('portrait');
  });
});

describe('TIFF validation', () => {
  it('accepts little- and big-endian TIFF signatures', () => {
    expect(isTiffBlobSignature(TIFF_BYTES)).toBe(true);
    expect(isTiffBlobSignature(new Uint8Array([0x4d, 0x4d, 0x00, 0x2a]))).toBe(true);
  });

  it('rejects empty and non-TIFF blobs', async () => {
    await expect(assertValidTiffBlob(new Blob())).rejects.toThrow('فارغ');
    await expect(assertValidTiffBlob(new Blob(['jpeg']))).rejects.toThrow('ليس TIFF');
  });
});

describe('basename', () => {
  it('extracts Windows and POSIX basenames', () => {
    expect(basename('C:\\Users\\x\\Exports\\print_123.tif')).toBe('print_123.tif');
    expect(basename('/home/x/exports/print_9.tiff')).toBe('print_9.tiff');
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

  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = (response: Partial<Response> = {}) => {
    const fullResponse = {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      blob: response.blob ?? (() => Promise.resolve(tiffBlob())),
    } as Response;
    const fetchMock = vi.fn(() => Promise.resolve(fullResponse));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('captures, uploads, converts, and returns a non-empty validated TIFF', async () => {
    const fetchMock = stubFetch();
    const result = await runCmykExport(captureParams);

    expect(mockExportCanvas).toHaveBeenCalledWith('png', 1, null);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    const request = mockExportPrintSheet.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(request.colorSpace).toBe('cmyk');
    expect(request.exportFormat).toBe('tiff');
    expect(request.jobId).toMatch(/^cmyk-/);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/local-image/print_7.tif'), {
      signal: undefined,
    });
    expect(result.sourceFilename).toBe('print_7.tif');
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it('rejects empty capture and invalid backend results explicitly', async () => {
    mockExportCanvas.mockResolvedValueOnce(new Blob());
    await expect(runCmykExport(captureParams)).rejects.toThrow('تعذر التقاط التصميم');
    expect(mockUpload).not.toHaveBeenCalled();

    mockExportCanvas.mockResolvedValueOnce(new Blob(['png']));
    mockExportPrintSheet.mockResolvedValueOnce({ success: false, error: 'CMYK failed' } as never);
    await expect(runCmykExport(captureParams)).rejects.toThrow('CMYK failed');
  });

  it('rejects non-TIFF filename and non-TIFF response bytes', async () => {
    mockExportPrintSheet.mockResolvedValueOnce({
      success: true,
      filePath: 'C:\\Exports\\print_7.jpg',
    } as never);
    await expect(runCmykExport(captureParams)).rejects.toThrow('مسار ملف CMYK TIFF');

    mockExportPrintSheet.mockResolvedValueOnce({
      success: true,
      filePath: 'C:\\Exports\\print_7.tif',
    } as never);
    stubFetch({ blob: () => Promise.resolve(new Blob(['not-tiff'])) });
    await expect(runCmykExport(captureParams)).rejects.toThrow('ليس TIFF');
  });

  it('rejects failed source fetch', async () => {
    stubFetch({ ok: false, status: 404 });
    await expect(runCmykExport(captureParams)).rejects.toThrow('HTTP 404');
  });

  it('aborts the owned backend job by client JobID', async () => {
    stubFetch();
    const pending = new Promise<never>(() => {}) as unknown as ReturnType<typeof ExportPrintSheet>;
    Object.assign(pending, {
      cancelOn: (signal: AbortSignal) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('cancelled', 'AbortError')),
            { once: true },
          );
        }),
    });
    mockExportPrintSheet.mockReturnValueOnce(pending);
    const controller = new AbortController();
    const operation = runCmykExport({ ...captureParams, signal: controller.signal });
    await vi.waitFor(() => expect(mockExportPrintSheet).toHaveBeenCalled());
    const jobId = (mockExportPrintSheet.mock.calls[0][0] as unknown as { jobId: string }).jobId;
    controller.abort();

    await expect(operation).rejects.toMatchObject({ name: 'AbortError' });
    expect(mockCancelPrintJob).toHaveBeenCalledWith(jobId);
  });
});
