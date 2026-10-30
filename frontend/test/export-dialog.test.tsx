import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ExportDialog } from '../src/components/editor/dialogs/export-dialog';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';
import {
  exportCanvas,
  exportSlotCanvas,
  downloadBlob,
  runCmykExport,
  applyBleedAndCropMarks,
} from '../src/lib/export';
import { SelectExportDirectory } from '../wailsjs/go/main/App';

// مسار CMYK: لقطة الكانفاس تُرفع ثم يحوّلها محرك الطباعة في Go، فنقرأ الملف الناتج.
vi.mock('../src/lib/export', () => ({
  exportCanvas: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
  downloadBlob: vi.fn(() => Promise.resolve('success')),
  exportSlotCanvas: vi.fn(() => Promise.resolve(new Blob(['slot'], { type: 'image/png' }))),
  applyBleedAndCropMarks: vi.fn((canvas) => Promise.resolve(canvas)),
  runCmykExport: vi.fn(() =>
    Promise.resolve({
      blob: new Blob(['cmyk'], { type: 'image/tiff' }),
      sourceFilename: 'print_1.tif',
    }),
  ),
  CanvasTooLargeError: class CanvasTooLargeError extends Error {},
}));

vi.mock('../wailsjs/go/main/App', () => ({
  SelectExportDirectory: vi.fn(() => Promise.resolve('')),
  SetTaskbarProgress: vi.fn(() => Promise.resolve()),
  SendNotification: vi.fn(() => Promise.resolve()),
  OpenFolder: vi.fn(() => Promise.resolve()),
  SaveFileDialog: vi.fn(() => Promise.resolve('success')),
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('../src/lib/canvas/stage-context', () => ({
  useStageRef: () => ({ current: null }),
}));

const mockRunCmykExport = vi.mocked(runCmykExport);
const mockDownloadBlob = vi.mocked(downloadBlob);
const mockExportCanvas = vi.mocked(exportCanvas);

/** ينقر «تصدير» ثم ينتظر setTimeout(50) الذي يؤجل بدء العملية داخل الحوار. */
const clickExportAndSettle = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
    await new Promise((r) => setTimeout(r, 90));
  });
  await waitFor(() => expect(screen.getByRole('button', { name: 'تصدير' })).toBeEnabled());
};

class DecodedImage {
  static fail = false;
  naturalWidth = 1200;
  naturalHeight = 1200;
  width = 120;
  height = 120;
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() =>
      DecodedImage.fail ? this.onerror?.(new Error('unreadable')) : this.onload?.(),
    );
  }
}

describe('ExportDialog Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
    DecodedImage.fail = false;
    vi.stubGlobal('Image', DecodedImage);
    vi.mocked(SelectExportDirectory).mockResolvedValue('C:/mock/export');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('renders dialog elements when open is true', () => {
    renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('تصدير الصورة')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
    expect(screen.getByText('JPG')).toBeInTheDocument();
  });

  it('toggles format between PNG and JPG', () => {
    renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

    const jpgBtn = screen.getByText('JPG');
    fireEvent.click(jpgBtn);

    // When JPG is selected, quality slider should be shown
    expect(screen.getByText('جودة الصورة')).toBeInTheDocument();
  });

  it('renders crop marks setting row', () => {
    renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('علامات القص الإرشادية')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', () => {
    const handleOpenChange = vi.fn();
    renderWithProviders(<ExportDialog open={true} onOpenChange={handleOpenChange} />);

    const cancelBtn = screen.getByText('إلغاء');
    fireEvent.click(cancelBtn);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  describe('R-04: preflight covers every export branch', () => {
    const setupCollage = (zoom = 1) => {
      useEditorStore.setState({
        mode: 'collage',
        template: null,
        collageTemplate: null,
        canvasWidth: 2400,
        canvasHeight: 1200,
        collageMargin: 0,
        collageGap: 0,
        slots: [
          {
            id: 'photo',
            cellIndex: 0,
            x: 0,
            y: 0,
            w: 0.5,
            h: 1,
            imageSrc: '/local-image/photo.jpg',
            zoom,
            dragX: 0,
            dragY: 0,
          },
        ],
        printSettings: { ...useEditorStore.getState().printSettings, dpi: 300 },
      });
    };
    const selectBranch = (branch: string) => {
      if (branch === 'cmyk') fireEvent.click(screen.getByText('CMYK'));
      if (branch === 'batch')
        fireEvent.click(screen.getByRole('switch', { name: 'تصدير الصور كملفات منفصلة' }));
    };

    it.each(['rgb', 'cmyk', 'batch'])(
      'blocks unreadable sources before rendering or saving in %s',
      async (branch) => {
        setupCollage();
        DecodedImage.fail = true;
        renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);
        selectBranch(branch);
        await clickExportAndSettle();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('تعذر قراءة صورة الخانة'));
        expect(mockExportCanvas).not.toHaveBeenCalled();
        expect(mockRunCmykExport).not.toHaveBeenCalled();
        expect(exportSlotCanvas).not.toHaveBeenCalled();
        expect(SelectExportDirectory).not.toHaveBeenCalled();
        expect(mockDownloadBlob).not.toHaveBeenCalled();
      },
    );

    it.each(['rgb', 'cmyk', 'batch'])(
      'uses per-slot physical size with a cold cache in %s',
      async (branch) => {
        setupCollage();
        renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);
        selectBranch(branch);
        await clickExportAndSettle();
        // The slot is 1200px = 101.6mm, not the 2400px page (203.2mm).
        expect(toast.warning).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
        expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
        if (branch === 'batch') expect(exportSlotCanvas).toHaveBeenCalledWith('photo', 'png', 0.95);
        if (branch === 'cmyk')
          expect(mockRunCmykExport).toHaveBeenCalledWith(
            expect.objectContaining({
              paperWidthMM: 203.2,
              paperHeightMM: 101.6,
              dpi: 300,
            }),
          );
      },
    );

    it.each(['rgb', 'cmyk', 'batch'])('warns at zoom 2 without blocking %s', async (branch) => {
      setupCollage(2);
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);
      selectBranch(branch);
      await clickExportAndSettle();
      expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('≈ 150DPI'));
      expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
    });

    it('uses exported DPI rather than different project DPI for geometry and bleed', async () => {
      setupCollage();
      useEditorStore.setState({
        template: {
          id: 'custom',
          name: 'Custom',
          width: 2400,
          height: 1200,
          widthMM: 999,
          heightMM: 999,
          dpi: 150,
          category: 'collage',
          background: '#fff',
          backgroundHint: '',
        },
        printSettings: { ...useEditorStore.getState().printSettings, dpi: 600 },
      });
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);
      await clickExportAndSettle();
      expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('≈ 150DPI'));
      expect(applyBleedAndCropMarks).toHaveBeenCalledWith(
        expect.any(Blob),
        0,
        false,
        'png',
        0.95,
        150,
      );
      expect(mockDownloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.any(String),
        undefined,
        150,
      );
    });
  });

  describe('مدخل فضاء الألوان CMYK', () => {
    it('يعرض RGB افتراضياً مع صيغتي PNG/JPG فقط', () => {
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('فضاء الألوان')).toBeInTheDocument();
      expect(screen.getByText('CMYK')).toBeInTheDocument();
      expect(screen.queryByText('TIFF')).not.toBeInTheDocument();
      expect(screen.queryByText(/قد يختلف التباين/)).not.toBeInTheDocument();
    });

    it('يبدّل الصيغ إلى TIFF/JPEG ويخفي PNG/JPG عند اختيار CMYK', () => {
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

      fireEvent.click(screen.getByText('CMYK'));

      expect(screen.getByText('TIFF')).toBeInTheDocument();
      expect(screen.getByText('JPEG')).toBeInTheDocument();
      expect(screen.queryByText('PNG')).not.toBeInTheDocument();
      expect(screen.queryByText('JPG')).not.toBeInTheDocument();
      expect(screen.getByText(/CMYK لمطابع الأوفست/)).toBeInTheDocument();
    });

    it('يخفي النزيف وعلامات القص (مسار RGB فقط) في وضع CMYK', () => {
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

      fireEvent.click(screen.getByText('CMYK'));

      expect(screen.queryByText('علامات القص الإرشادية')).not.toBeInTheDocument();
      expect(screen.queryByText('هامش النزيف والقص')).not.toBeInTheDocument();
    });

    it('يظهر منزلق الجودة لـ JPEG فقط (TIFF بلا فقد)', () => {
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

      fireEvent.click(screen.getByText('CMYK'));
      expect(screen.queryByText('جودة الصورة')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('JPEG'));
      expect(screen.getByText('جودة الصورة')).toBeInTheDocument();
    });

    it('يمرر صيغة CMYK عبر المسار الخلفي ويحفظ بامتداد .tif', async () => {
      const handleOpenChange = vi.fn();
      renderWithProviders(<ExportDialog open={true} onOpenChange={handleOpenChange} />);

      fireEvent.click(screen.getByText('CMYK'));
      await clickExportAndSettle();

      expect(mockRunCmykExport).toHaveBeenCalledTimes(1);
      const params = mockRunCmykExport.mock.calls[0][0];
      expect(params.stage).toBeNull();
      expect(params.format).toBe('tiff');
      expect(params.dpi).toBe(300);
      expect(params.backgroundColor).toBe('#FFFFFF');
      // هندسة صفرية الانحراف: mmToPx(mm, dpi) == canvasPx (الافتراضي 2480×3508 @300DPI)
      const canvasWidth = useEditorStore.getState().canvasWidth;
      const canvasHeight = useEditorStore.getState().canvasHeight;
      expect(params.paperWidthMM).toBeCloseTo((canvasWidth * 25.4) / 300, 6);
      expect(params.paperHeightMM).toBeCloseTo((canvasHeight * 25.4) / 300, 6);
      expect(Math.round((params.paperWidthMM * 300) / 25.4)).toBe(canvasWidth);
      expect(Math.round((params.paperHeightMM * 300) / 25.4)).toBe(canvasHeight);
      // مسار RGB (التقاط Kanva مباشر) لا يُستدعى في وضع CMYK
      expect(mockExportCanvas).not.toHaveBeenCalled();

      expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
      const [blob, filename] = mockDownloadBlob.mock.calls[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(String(filename)).toMatch(/_CMYK\.tif$/);
      expect(toast.success).toHaveBeenCalled();
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it('يحفظ بامتداد .jpg عند اختيار JPEG', async () => {
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

      fireEvent.click(screen.getByText('CMYK'));
      fireEvent.click(screen.getByText('JPEG'));
      await clickExportAndSettle();

      expect(mockRunCmykExport.mock.calls[0][0].format).toBe('jpeg');
      expect(String(mockDownloadBlob.mock.calls[0][1])).toMatch(/_CMYK\.jpg$/);
    });

    it('يعرض خطأً صريحاً عند فشل التحويل الخلفي', async () => {
      mockRunCmykExport.mockRejectedValueOnce(new Error('CMYK encode failed'));
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

      fireEvent.click(screen.getByText('CMYK'));
      await clickExportAndSettle();

      expect(toast.error).toHaveBeenCalledWith('CMYK encode failed');
      expect(mockDownloadBlob).not.toHaveBeenCalled();
    });
  });
});
