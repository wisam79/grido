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
import { triggerMemoryTrim } from '../src/lib/memory-trim';
import {
  SelectExportDirectory,
  SetTaskbarProgress,
  SendNotification,
} from '../wailsjs/go/main/App';

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

vi.mock('../src/lib/memory-trim', () => ({ triggerMemoryTrim: vi.fn() }));

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

  describe('export attempt ownership', () => {
    const renderSession = () => {
      useEditorStore.setState({ mode: 'single', elements: [] });
      const onOpenChange = vi.fn();
      const ui = (open: boolean) => (
        <TooltipProvider>
          <ExportDialog open={open} onOpenChange={onOpenChange} />
        </TooltipProvider>
      );
      const view = render(ui(true));
      return { ...view, setOpen: (open: boolean) => view.rerender(ui(open)), onOpenChange };
    };

    it('does not revive a pending capture when closed and reopened without another export', async () => {
      const capture = deferred<Blob | null>();
      mockExportCanvas.mockReturnValueOnce(capture.promise);
      const session = renderSession();
      fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
      await waitFor(() => expect(mockExportCanvas).toHaveBeenCalledTimes(1));

      session.setOpen(false);
      session.setOpen(true);
      await act(async () => capture.resolve(new Blob(['cancelled capture'])));

      expect(mockDownloadBlob).not.toHaveBeenCalled();
      expect(SendNotification).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(session.onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'تصدير' })).toBeEnabled();
    });

    it.each(['resolve', 'reject'] as const)(
      'does not let an old capture %s clear a newer export state',
      async (completion) => {
        const oldCapture = deferred<Blob | null>();
        const newCapture = deferred<Blob | null>();
        mockExportCanvas
          .mockReturnValueOnce(oldCapture.promise)
          .mockReturnValueOnce(newCapture.promise);
        const session = renderSession();
        fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
        await waitFor(() => expect(mockExportCanvas).toHaveBeenCalledTimes(1));
        session.setOpen(false);
        session.setOpen(true);
        fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
        await waitFor(() => expect(mockExportCanvas).toHaveBeenCalledTimes(2));
        vi.mocked(SetTaskbarProgress).mockClear();
        vi.mocked(triggerMemoryTrim).mockClear();

        try {
          await act(async () => {
            if (completion === 'resolve') oldCapture.resolve(new Blob(['old capture']));
            else oldCapture.reject(new Error('old capture failed'));
          });

          expect(mockDownloadBlob).not.toHaveBeenCalled();
          expect(toast.error).not.toHaveBeenCalled();
          expect(session.onOpenChange).not.toHaveBeenCalled();
          expect(screen.getByRole('button', { name: 'جاري التصدير ...' })).toBeDisabled();
          expect(SetTaskbarProgress).not.toHaveBeenCalled();
          expect(triggerMemoryTrim).not.toHaveBeenCalled();
        } finally {
          await act(async () => newCapture.resolve(new Blob(['new capture'])));
        }
        expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
        expect(session.onOpenChange).toHaveBeenCalledTimes(1);
      },
    );

    it('ignores an old save result while a newer capture owns progress', async () => {
      const oldSave = deferred<string>();
      const newCapture = deferred<Blob | null>();
      mockDownloadBlob.mockReturnValueOnce(oldSave.promise);
      const session = renderSession();
      fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
      await waitFor(() => expect(mockDownloadBlob).toHaveBeenCalledTimes(1));
      session.setOpen(false);
      session.setOpen(true);
      mockExportCanvas.mockReturnValueOnce(newCapture.promise);
      fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
      await waitFor(() => expect(mockExportCanvas).toHaveBeenCalledTimes(2));
      vi.mocked(SetTaskbarProgress).mockClear();

      try {
        await act(async () => oldSave.resolve('success'));
        expect(toast.success).not.toHaveBeenCalled();
        expect(SendNotification).not.toHaveBeenCalled();
        expect(session.onOpenChange).not.toHaveBeenCalled();
        expect(SetTaskbarProgress).not.toHaveBeenCalled();
        expect(screen.getByText('جاري إنشاء الصورة...')).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'جاري التصدير ...' })).toBeDisabled();
      } finally {
        await act(async () => newCapture.resolve(new Blob(['new capture'])));
      }
      expect(mockDownloadBlob).toHaveBeenCalledTimes(2);
      expect(session.onOpenChange).toHaveBeenCalledTimes(1);
    });

    it('invalidates a pending capture on unmount', async () => {
      const capture = deferred<Blob | null>();
      mockExportCanvas.mockReturnValueOnce(capture.promise);
      const session = renderSession();
      fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
      await waitFor(() => expect(mockExportCanvas).toHaveBeenCalledTimes(1));
      session.unmount();
      await act(async () => capture.resolve(new Blob(['unmounted capture'])));

      expect(mockDownloadBlob).not.toHaveBeenCalled();
      expect(SendNotification).not.toHaveBeenCalled();
      expect(session.onOpenChange).not.toHaveBeenCalled();
    });
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
        expect.any(AbortSignal),
      );
      expect(mockDownloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.any(String),
        undefined,
        150,
        undefined,
        expect.any(AbortSignal),
      );
    });
  });

  describe('batch result reporting', () => {
    const startBatch = (withBleed = false) => {
      useEditorStore.setState({
        mode: 'collage',
        template: null,
        collageTemplate: null,
        canvasWidth: 1200,
        canvasHeight: 600,
        collageMargin: 0,
        collageGap: 0,
        showBleedGuides: withBleed,
        bleedMarginMM: 3,
        slots: [0, 1, 2].map((index) => ({
          id: `photo-${index}`,
          cellIndex: index,
          x: index / 3,
          y: 0,
          w: 1 / 3,
          h: 1,
          imageSrc: `/local-image/photo-${index}.jpg`,
          zoom: 1,
          dragX: 0,
          dragY: 0,
        })),
        printSettings: { ...useEditorStore.getState().printSettings, dpi: 150 },
      });
      if (withBleed)
        useEditorStore.setState({
          template: {
            id: 'custom',
            name: 'Custom',
            width: 1200,
            height: 600,
            widthMM: 203.2,
            heightMM: 101.6,
            dpi: 150,
            category: 'collage',
            background: '#fff',
            backgroundHint: '',
          },
          printSettings: { ...useEditorStore.getState().printSettings, dpi: 600 },
        });
      const onOpenChange = vi.fn();
      const ui = (open: boolean) => (
        <TooltipProvider>
          <ExportDialog open={open} onOpenChange={onOpenChange} />
        </TooltipProvider>
      );
      const view = render(ui(true));
      fireEvent.click(screen.getByRole('switch', { name: 'تصدير الصور كملفات منفصلة' }));
      return { ...view, onOpenChange, setOpen: (open: boolean) => view.rerender(ui(open)) };
    };

    it('applies selected bleed/marks/DPI to every blob and reaches 100 only after the last save', async () => {
      const blobs = [0, 1, 2].map((n) => new Blob([`raw-${n}`]));
      const processed = [0, 1, 2].map((n) => new Blob([`bleed-${n}`]));
      blobs.forEach((blob) => vi.mocked(exportSlotCanvas).mockResolvedValueOnce(blob));
      processed.forEach((blob) => vi.mocked(applyBleedAndCropMarks).mockResolvedValueOnce(blob));
      const lastSave = deferred<string>();
      mockDownloadBlob
        .mockResolvedValueOnce('success')
        .mockResolvedValueOnce('success')
        .mockReturnValueOnce(lastSave.promise);
      const session = startBatch(true);
      fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
      await waitFor(() => expect(mockDownloadBlob).toHaveBeenCalledTimes(3));
      expect(SelectExportDirectory).toHaveBeenCalledTimes(1);
      expect(applyBleedAndCropMarks).toHaveBeenCalledTimes(3);
      const signal = mockDownloadBlob.mock.calls[0][5];
      blobs.forEach((blob, index) => {
        expect(exportSlotCanvas).toHaveBeenNthCalledWith(index + 1, `photo-${index}`, 'png', 0.95);
        expect(applyBleedAndCropMarks).toHaveBeenNthCalledWith(
          index + 1,
          blob,
          3,
          true,
          'png',
          0.95,
          150,
          signal,
        );
        expect(mockDownloadBlob).toHaveBeenNthCalledWith(
          index + 1,
          processed[index],
          expect.stringMatching(/\.png$/),
          'C:/mock/export',
          150,
          undefined,
          signal,
        );
      });
      expect(screen.getByText('جاري حفظ الصورة 3 من 3...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { name: 'الصور المحفوظة' })).toHaveAttribute(
        'aria-valuenow',
        '66',
      );
      expect(SetTaskbarProgress).not.toHaveBeenCalledWith(100, 'normal');
      expect(toast.success).not.toHaveBeenCalled();
      expect(session.onOpenChange).not.toHaveBeenCalled();
      await act(async () => lastSave.resolve('success'));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          'حُفظت 3 من 3 صورة؛ تعذر 0؛ أُلغي 0؛ لم تُعالج 0.',
          expect.any(Object),
        ),
      );
      expect(SetTaskbarProgress).toHaveBeenCalledWith(100, 'normal');
      expect(SendNotification).toHaveBeenCalledTimes(1);
      expect(session.onOpenChange).toHaveBeenCalledWith(false);
    });

    it.each(['cancel', 'error'] as const)(
      'distinguishes zero-save %s from success',
      async (outcome) => {
        mockDownloadBlob.mockResolvedValueOnce(outcome === 'cancel' ? '' : '"Permission denied"');
        const session = startBatch();
        await clickExportAndSettle();
        const summary =
          outcome === 'cancel'
            ? 'حُفظت 0 من 3 صورة؛ تعذر 0؛ أُلغي 1؛ لم تُعالج 2.'
            : 'حُفظت 0 من 3 صورة؛ تعذر 1؛ أُلغي 0؛ لم تُعالج 2.';
        expect(outcome === 'cancel' ? toast.info : toast.error).toHaveBeenCalledWith(
          expect.stringContaining(summary),
        );
        expect(screen.getByRole('status')).toHaveTextContent(summary);
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.warning).not.toHaveBeenCalled();
        expect(session.onOpenChange).not.toHaveBeenCalled();
        expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
        expect(exportSlotCanvas).toHaveBeenCalledTimes(1);
      },
    );

    it('reports directory cancellation without counting unattempted files as cancelled saves', async () => {
      vi.mocked(SelectExportDirectory).mockResolvedValueOnce('');
      const session = startBatch();
      await clickExportAndSettle();
      expect(screen.getByRole('status')).toHaveTextContent(
        'حُفظت 0 من 3 صورة؛ تعذر 0؛ أُلغي 0؛ لم تُعالج 3.',
      );
      expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('قبل اختيار المجلد'));
      expect(mockDownloadBlob).not.toHaveBeenCalled();
      expect(exportSlotCanvas).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(session.onOpenChange).not.toHaveBeenCalled();
    });

    it.each(['bleed', 'save'] as const)(
      'ignores stale batch %s after close/reopen',
      async (step) => {
        const pending = deferred<Blob>();
        const pendingSave = deferred<string>();
        if (step === 'bleed')
          vi.mocked(applyBleedAndCropMarks).mockReturnValueOnce(pending.promise);
        else mockDownloadBlob.mockReturnValueOnce(pendingSave.promise);
        const session = startBatch(true);
        fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
        await waitFor(() =>
          expect(
            step === 'bleed' ? applyBleedAndCropMarks : mockDownloadBlob,
          ).toHaveBeenCalledTimes(1),
        );
        const signal = vi.mocked(applyBleedAndCropMarks).mock.calls[0][6];
        session.setOpen(false);
        session.setOpen(true);
        vi.mocked(SetTaskbarProgress).mockClear();
        vi.mocked(triggerMemoryTrim).mockClear();
        await act(async () => {
          if (step === 'bleed') pending.resolve(new Blob(['late']));
          else pendingSave.resolve('success');
        });
        expect(signal?.aborted).toBe(true);
        expect(exportSlotCanvas).toHaveBeenCalledTimes(1);
        expect(mockDownloadBlob).toHaveBeenCalledTimes(step === 'bleed' ? 0 : 1);
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.warning).not.toHaveBeenCalled();
        expect(SendNotification).not.toHaveBeenCalled();
        expect(SetTaskbarProgress).not.toHaveBeenCalled();
        expect(triggerMemoryTrim).not.toHaveBeenCalled();
        expect(session.onOpenChange).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'تصدير' })).toBeEnabled();
      },
    );

    it.each(['cancel', 'refused', 'reject', 'capture-null'] as const)(
      'reports partial %s counts and stops without retrying',
      async (outcome) => {
        mockDownloadBlob.mockResolvedValueOnce('success');
        if (outcome === 'cancel') mockDownloadBlob.mockResolvedValueOnce('');
        if (outcome === 'refused') mockDownloadBlob.mockResolvedValueOnce('"Access denied"');
        if (outcome === 'reject') mockDownloadBlob.mockRejectedValueOnce(new Error('Disk full'));
        if (outcome === 'capture-null')
          vi.mocked(exportSlotCanvas)
            .mockResolvedValueOnce(new Blob(['one']))
            .mockResolvedValueOnce(null);
        const session = startBatch();
        await clickExportAndSettle();
        const summary =
          outcome === 'cancel'
            ? 'حُفظت 1 من 3 صورة؛ تعذر 0؛ أُلغي 1؛ لم تُعالج 1.'
            : 'حُفظت 1 من 3 صورة؛ تعذر 1؛ أُلغي 0؛ لم تُعالج 1.';
        expect(screen.getByRole('status')).toHaveTextContent(summary);
        expect(toast.warning).toHaveBeenCalledWith(
          expect.stringContaining(summary),
          expect.any(Object),
        );
        if (outcome === 'refused')
          expect(screen.getByRole('status')).toHaveTextContent('Access denied');
        if (outcome === 'reject') expect(screen.getByRole('status')).toHaveTextContent('Disk full');
        expect(exportSlotCanvas).toHaveBeenCalledTimes(2);
        expect(mockDownloadBlob).toHaveBeenCalledTimes(outcome === 'capture-null' ? 1 : 2);
        expect(SelectExportDirectory).toHaveBeenCalledTimes(1);
        expect(SetTaskbarProgress).not.toHaveBeenCalledWith(100, 'normal');
        expect(toast.success).not.toHaveBeenCalled();
        expect(SendNotification).not.toHaveBeenCalled();
        expect(session.onOpenChange).not.toHaveBeenCalled();
      },
    );
  });

  it.each(['rgb', 'cmyk'] as const)(
    'shows actual steps until the %s save resolves and does not reupload',
    async (branch) => {
      const save = deferred<string>();
      mockDownloadBlob.mockReturnValueOnce(save.promise);
      const onOpenChange = vi.fn();
      renderWithProviders(<ExportDialog open onOpenChange={onOpenChange} />);
      if (branch === 'cmyk') fireEvent.click(screen.getByText('CMYK'));
      fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
      await waitFor(() => expect(mockDownloadBlob).toHaveBeenCalledTimes(1));
      expect(
        screen.getByText(branch === 'cmyk' ? 'جاري حفظ ملف CMYK...' : 'جاري حفظ الصورة...'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(SetTaskbarProgress).toHaveBeenCalledWith(0, 'indeterminate');
      expect(SetTaskbarProgress).not.toHaveBeenCalledWith(50, 'normal');
      expect(SetTaskbarProgress).not.toHaveBeenCalledWith(100, 'normal');
      expect(toast.success).not.toHaveBeenCalled();
      await act(async () => save.resolve(''));
      expect(screen.getByRole('status')).toHaveTextContent('تم إلغاء التصدير');
      expect(toast.info).toHaveBeenCalledWith('تم إلغاء التصدير');
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
    },
  );

  describe('مدخل فضاء الألوان CMYK', () => {
    it('يعرض RGB افتراضياً مع صيغتي PNG/JPG فقط', () => {
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText('فضاء الألوان')).toBeInTheDocument();
      expect(screen.getByText('CMYK')).toBeInTheDocument();
      expect(screen.queryByText('TIFF')).not.toBeInTheDocument();
      expect(screen.queryByText(/قد يختلف التباين/)).not.toBeInTheDocument();
    });

    it('يبدّل الصيغة إلى TIFF فقط ويخفي PNG/JPG عند اختيار CMYK', () => {
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

      fireEvent.click(screen.getByText('CMYK'));

      expect(screen.getByText('TIFF')).toBeInTheDocument();
      expect(screen.queryByText('JPEG')).not.toBeInTheDocument();
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

    it('لا يعرض أي سطح JPEG أو منزلق جودة في وضع CMYK', () => {
      renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

      fireEvent.click(screen.getByText('CMYK'));
      expect(screen.queryByText('جودة الصورة')).not.toBeInTheDocument();
      expect(screen.queryByText('JPEG')).not.toBeInTheDocument();
      expect(screen.getByText('TIFF').closest('button')).toHaveAttribute('aria-pressed', 'true');
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
      expect(params.signal).toBeInstanceOf(AbortSignal);
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
      const [blob, filename, , , sourceFilename, signal] = mockDownloadBlob.mock.calls[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(String(filename)).toMatch(/_CMYK\.tif$/);
      expect(sourceFilename).toBe('print_1.tif');
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(toast.success).toHaveBeenCalled();
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it('aborts the active round on close and stale CMYK work cannot save or toast', async () => {
      const cmyk = deferred<{ blob: Blob; sourceFilename: string }>();
      mockRunCmykExport.mockReturnValueOnce(cmyk.promise);
      const handleOpenChange = vi.fn();
      renderWithProviders(<ExportDialog open={true} onOpenChange={handleOpenChange} />);

      fireEvent.click(screen.getByText('CMYK'));
      fireEvent.click(screen.getByRole('button', { name: 'تصدير' }));
      await waitFor(() => expect(mockRunCmykExport).toHaveBeenCalledTimes(1));
      const signal = mockRunCmykExport.mock.calls[0][0].signal;
      fireEvent.click(screen.getByRole('button', { name: 'إيقاف التصدير' }));

      expect(signal?.aborted).toBe(true);
      await act(async () => cmyk.resolve({ blob: new Blob(['late']), sourceFilename: 'late.tif' }));
      expect(mockDownloadBlob).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(SendNotification).not.toHaveBeenCalled();
      expect(handleOpenChange).toHaveBeenCalledWith(false);
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
