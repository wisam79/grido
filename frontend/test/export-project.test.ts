import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadBlob, quickExportPNG } from '../src/lib/export/export-project';
import { useEditorStore } from '../src/lib/editor-store';
import * as AppGo from '../wailsjs/go/main/App';
import * as ExportImage from '../src/lib/export/export-image';
import { CanvasTooLargeError } from '../src/lib/export/export-limits';
import { toast } from 'sonner';

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
    useEditorStore.getState().reset();
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
        '*.png'
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
        '*.jpg;*.jpeg'
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
        '*.png;*.jpg;*.jpeg'
      );
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
        new CanvasTooLargeError(8000, 7000)
      );

      await quickExportPNG();

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('الأبعاد كبيرة جداً للتصدير (8000×7000 بكسل ≈ 56.0 ميجابكسل) — الحد الأقصى 50 ميجابكسل')
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

