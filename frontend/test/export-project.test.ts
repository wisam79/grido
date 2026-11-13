import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useEditorStore } from '../src/lib/editor-store';
import * as ExportImage from '../src/lib/export/export-image';
import { CanvasTooLargeError } from '../src/lib/export/export-limits';
import { downloadBlob, quickExportPNG } from '../src/lib/export/export-project';
import * as LocalApi from '../src/lib/local-api';
import * as AppGo from '../wailsjs/go/main/App';

vi.mock('../wailsjs/go/main/App', () => ({
  SaveFileDialog: vi.fn(),
}));

vi.mock('../src/lib/export/export-image', () => ({
  exportCanvas: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('ExportProject Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppGo.SaveFileDialog).mockReset();
    vi.mocked(ExportImage.exportCanvas).mockReset();
    useEditorStore.getState().reset();
    vi.spyOn(LocalApi, 'isLocalApiAvailable').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('downloadBlob', () => {
    it('passes PNG filter pattern when filename ends with .png', async () => {
      vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce('success');

      const blob = new Blob(['mock-image-data'], { type: 'image/png' });
      const res = await downloadBlob(blob, 'photo.png');

      expect(res).toBe('success');
      expect(AppGo.SaveFileDialog).toHaveBeenCalledWith(
        expect.stringContaining('data:image/png;base64,'),
        'photo.png',
        'PNG Image (*.png)',
        '*.png',
      );
    });

    it('passes JPEG filter pattern when filename ends with .jpg or .jpeg', async () => {
      vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce('success');

      const blob = new Blob(['mock-jpg-data'], { type: 'image/jpeg' });
      const res = await downloadBlob(blob, 'avatar.jpg');

      expect(res).toBe('success');
      expect(AppGo.SaveFileDialog).toHaveBeenCalledWith(
        expect.stringContaining('data:image/jpeg;base64,'),
        'avatar.jpg',
        'JPEG Image (*.jpg;*.jpeg)',
        '*.jpg;*.jpeg',
      );
    });

    it('uses fallback pattern for other image extensions', async () => {
      vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce('success');

      const blob = new Blob(['mock-data'], { type: 'image/webp' });
      const res = await downloadBlob(blob, 'image.webp');

      expect(res).toBe('success');
      expect(AppGo.SaveFileDialog).toHaveBeenCalledWith(
        expect.any(String),
        'image.webp',
        'Image File',
        '*.png;*.jpg;*.jpeg',
      );
    });

    it('fetches real TIFF bytes before IPC fallback when source-copy fails', async () => {
      const tiffBytes = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0]);
      vi.spyOn(LocalApi, 'isLocalApiAvailable').mockReturnValue(true);
      vi.spyOn(LocalApi, 'fetchLocalApi').mockResolvedValue(
        new Response('copy failed', { status: 500 }),
      );
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob([tiffBytes.slice()], { type: 'image/tiff' }),
        } as Response),
      );
      vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce('success');

      const result = await downloadBlob(
        new Blob([], { type: 'image/tiff' }),
        'CMYK.tif',
        undefined,
        undefined,
        'print_7.tif',
      );

      expect(result).toBe('success');
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/local-image/print_7.tif'), {
        signal: undefined,
      });
      expect(AppGo.SaveFileDialog).toHaveBeenCalledWith(
        expect.stringContaining('data:image/tiff;base64,'),
        'CMYK.tif',
        'TIFF Image (*.tif;*.tiff)',
        '*.tif;*.tiff',
      );
    });

    it('never sends an empty or invalid TIFF placeholder to IPC fallback', async () => {
      vi.spyOn(LocalApi, 'isLocalApiAvailable').mockReturnValue(false);
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => new Blob(['not-tiff']),
      } as Response);

      const result = await downloadBlob(
        new Blob([], { type: 'image/tiff' }),
        'CMYK.tif',
        undefined,
        undefined,
        'print_7.tif',
      );

      expect(result).toBe('error');
      expect(AppGo.SaveFileDialog).not.toHaveBeenCalled();
    });

    it('aborts local fetch and does not open IPC save', async () => {
      vi.spyOn(LocalApi, 'isLocalApiAvailable').mockReturnValue(false);
      const controller = new AbortController();
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_input, init) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('aborted', 'AbortError')),
              { once: true },
            );
          }),
      );
      const operation = downloadBlob(
        new Blob([], { type: 'image/tiff' }),
        'CMYK.tif',
        undefined,
        undefined,
        'print_7.tif',
        controller.signal,
      );
      controller.abort();

      await expect(operation).resolves.toBe('error');
      expect(AppGo.SaveFileDialog).not.toHaveBeenCalled();
    });

    it('handles FileReader / SaveFileDialog rejection and returns "error"', async () => {
      vi.mocked(AppGo.SaveFileDialog).mockRejectedValueOnce(new Error('IPC crash'));

      const blob = new Blob(['mock-data'], { type: 'image/png' });
      const res = await downloadBlob(blob, 'photo.png');

      expect(res).toBe('error');
    });
  });

  describe('quickExportPNG', () => {
    it('exports PNG successfully and triggers success toast', async () => {
      const mockBlob = new Blob(['test-png'], { type: 'image/png' });
      vi.mocked(ExportImage.exportCanvas).mockResolvedValueOnce(mockBlob);
      vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce('success');

      await quickExportPNG();

      expect(ExportImage.exportCanvas).toHaveBeenCalledWith('png');
      expect(toast.success).toHaveBeenCalledWith('تم تصدير الصورة بنجاح');
    });

    it('triggers info toast when user cancels save dialog', async () => {
      const mockBlob = new Blob(['test-png'], { type: 'image/png' });
      vi.mocked(ExportImage.exportCanvas).mockResolvedValueOnce(mockBlob);
      vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce(''); // cancelled

      await quickExportPNG();

      expect(toast.info).toHaveBeenCalledWith('تم إلغاء تصدير الصورة');
    });

    it('triggers error toast when save fails', async () => {
      const mockBlob = new Blob(['test-png'], { type: 'image/png' });
      vi.mocked(ExportImage.exportCanvas).mockResolvedValueOnce(mockBlob);
      vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce('error');

      await quickExportPNG();

      expect(toast.error).toHaveBeenCalledWith('فشل تصدير الصورة');
    });

    it('handles CanvasTooLargeError with specific 50MP guidance message', async () => {
      vi.mocked(ExportImage.exportCanvas).mockRejectedValueOnce(
        new CanvasTooLargeError(8000, 7000),
      );

      await quickExportPNG();

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'الأبعاد كبيرة جداً للتصدير (8000×7000 بكسل ≈ 56.0 ميجابكسل) — الحد الأقصى 50 ميجابكسل',
        ),
      );
      expect(AppGo.SaveFileDialog).not.toHaveBeenCalled();
    });

    it('handles null blob gracefully', async () => {
      vi.mocked(ExportImage.exportCanvas).mockResolvedValueOnce(null);

      await quickExportPNG();

      expect(toast.error).toHaveBeenCalledWith('تعذر تصدير الصورة');
      expect(AppGo.SaveFileDialog).not.toHaveBeenCalled();
    });
  });
});
