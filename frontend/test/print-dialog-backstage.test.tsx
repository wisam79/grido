import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PrintDialog } from '../src/components/editor/dialogs/print-dialog';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';

vi.mock('../wailsjs/go/handlers/PrintHandler', () => ({
  ExportPrintSheet: vi.fn(() => Promise.resolve({ success: true, filePath: 'mock.png' })),
  PrintNative: vi.fn(() => Promise.resolve({ success: true })),
  GetPrinters: vi.fn(() =>
    Promise.resolve({
      success: true,
      printers: [
        { name: 'EPSON L805 Series', isDefault: true },
        { name: 'Brother DCP-T520W', isDefault: false },
      ],
    }),
  ),
  OpenPrinterPreferences: vi.fn(() => Promise.resolve({ success: true })),
  GetSupportedPapers: vi.fn(() => Promise.resolve({ success: true, papers: [] })),
}));

vi.mock('../wailsjs/go/main/App', () => ({
  SetTaskbarProgress: vi.fn(() => Promise.resolve()),
}));

// هوية الربطات المولدة الفعلية التي يستوردها محرك التصدير (use-print-export):
// printhandler من bindings مباشرةً، و SetTaskbarProgress/LogFrontendError من app —
// بلا هذا الاعتراض تنفَّذ الربطات الحقيقية وتحاول fetch إلى خادم Wails (ECONNREFUSED).
vi.mock('@bindings/grido/internal/handlers/printhandler', () => ({
  ExportPrintSheet: vi.fn(() => Promise.resolve({ success: true, filePath: 'mock.png' })),
  PrintNative: vi.fn(() => Promise.resolve({ success: true })),
  GetPrinters: vi.fn(() => Promise.resolve({ success: true, printers: [] })),
  OpenPrinterPreferences: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('@bindings/grido/app', () => ({
  SetTaskbarProgress: vi.fn(() => Promise.resolve()),
  LogFrontendError: vi.fn(() => Promise.resolve()),
  SaveImageFromBase64: vi.fn(() => Promise.resolve('success')),
}));

describe('PrintDialog Backstage View Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useEditorStore.getState().reset();
      useEditorStore.getState().setMode('single');
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('renders print preparation dialog and layout controls when open', () => {
    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('إعداد ومعاينة الطباعة')).toBeInTheDocument();
    expect(screen.getByText('معاينة الورقة المطبوعة')).toBeInTheDocument();
    expect(screen.getByText('الورقة والاتجاه')).toBeInTheDocument();
  });

  it('shows an empty-state message and one DPI value without claiming a 1:1 preview', () => {
    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('لا يوجد محتوى للطباعة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'طباعة الورقة' })).toBeDisabled();
    expect(screen.getAllByText('300 DPI')).toHaveLength(1);
    expect(screen.queryByText('1:1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('المعاينة مطابقة للورقة')).not.toBeInTheDocument();
  });

  it('fits both orientations and reconnects observation after reopening without changing print settings', async () => {
    const OriginalResizeObserver = globalThis.ResizeObserver;
    const observedViewports: Element[] = [];
    const disconnect = vi.fn();
    let notifyResize: ((width: number, height: number) => void) | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private target?: Element;
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
          if (target.getAttribute('data-testid') !== 'print-preview-viewport') return;
          this.target = target;
          observedViewports.push(target);
          notifyResize = (width, height) =>
            this.callback(
              [{ target, contentRect: { width, height } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            );
        }
        unobserve() {}
        disconnect() {
          if (this.target) disconnect(this.target);
        }
      },
    );
    try {
      act(() =>
        useEditorStore.getState().setPrintSettings({
          paperId: 'a4',
          paperWidthMM: 210,
          paperHeightMM: 297,
          orientation: 'portrait',
        }),
      );
      const view = renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);
      const firstViewport = screen.getByTestId('print-preview-viewport');
      expect(notifyResize).toBeDefined();
      act(() => notifyResize!(640, 480));
      const paper = screen.getByTestId('print-preview-paper');
      const scrollTo = vi.fn();
      Object.defineProperty(screen.getByTestId('print-preview-viewport'), 'scrollTo', {
        value: scrollTo,
      });
      expect(parseFloat(paper.style.height)).toBeCloseTo(416, 1);
      expect(parseFloat(paper.style.width) / parseFloat(paper.style.height)).toBeCloseTo(210 / 297);
      fireEvent.click(screen.getByRole('button', { name: 'اتجاه أفقي (عرضي)' }));
      expect(parseFloat(paper.style.width)).toBeCloseTo(576, 1);
      expect(parseFloat(paper.style.height)).toBeLessThanOrEqual(416);
      const settings = { ...useEditorStore.getState().printSettings };
      fireEvent.click(screen.getByRole('button', { name: 'تكبير المعاينة' }));
      expect(parseFloat(paper.style.width)).toBeCloseTo(576 * 1.1, 1);
      expect(useEditorStore.getState().printSettings).toEqual(settings);
      fireEvent.click(screen.getByRole('button', { name: 'ملاءمة' }));
      expect(parseFloat(paper.style.width)).toBeCloseTo(576, 1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
      view.rerender(
        <TooltipProvider>
          <PrintDialog open={false} onOpenChange={vi.fn()} />
        </TooltipProvider>,
      );
      await waitFor(() => expect(disconnect).toHaveBeenCalledWith(firstViewport));
      view.rerender(
        <TooltipProvider>
          <PrintDialog open={true} onOpenChange={vi.fn()} />
        </TooltipProvider>,
      );
      const nextViewport = await screen.findByTestId('print-preview-viewport');
      expect(nextViewport).not.toBe(firstViewport);
      expect(observedViewports).toContain(nextViewport);
      view.unmount();
      expect(disconnect).toHaveBeenCalledWith(nextViewport);
    } finally {
      vi.stubGlobal('ResizeObserver', OriginalResizeObserver);
    }
  });

  it('does not render redundant imposition controls in collage mode, keeping print backstage focused', () => {
    act(() => {
      useEditorStore.getState().setMode('collage');
      useEditorStore.getState().setCanvasSize(2970, 2100);
    });

    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);

    // حوار الطباعة نظيف وخالٍ من أدوات المونتاج والتكرار المكررة (المونتاج مكانه الكانفاس والكولاج)
    expect(screen.queryByText('المونتاج والتوزيع')).not.toBeInTheDocument();
    expect(screen.queryByText('نسخ/ورقة')).not.toBeInTheDocument();
    expect(screen.queryByText('المسافة (مم)')).not.toBeInTheDocument();
    expect(screen.queryByText('نمط التكرار')).not.toBeInTheDocument();
    expect(screen.queryByText('مونتاج تلقائي')).not.toBeInTheDocument();

    // عناصر التجهيز والإنهاء حاضرة بدقة
    expect(screen.getByText('الورقة والاتجاه')).toBeInTheDocument();
    expect(screen.getByText('خيارات الطباعة')).toBeInTheDocument();
  });

  it('automatically synchronizes paper orientation to landscape when canvas is landscape', async () => {
    act(() => {
      useEditorStore.getState().setCanvasSize(2970, 2100);
      useEditorStore.getState().setPrintSettings({ paperId: 'canvas', orientation: 'portrait' });
    });

    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(useEditorStore.getState().printSettings.orientation).toBe('landscape');
    });
  });

  it('allows toggling orientation between portrait and landscape', () => {
    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);

    const portraitBtn = screen.getByTitle('اتجاه رأسي (عمودي)');
    const landscapeBtn = screen.getByTitle('اتجاه أفقي (عرضي)');

    expect(portraitBtn).toBeInTheDocument();
    expect(landscapeBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(portraitBtn);
    });
    expect(useEditorStore.getState().printSettings.orientation).toBe('portrait');

    act(() => {
      fireEvent.click(landscapeBtn);
    });
    expect(useEditorStore.getState().printSettings.orientation).toBe('landscape');
  });

  it('renders print action button in footer with Enter key hint', () => {
    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);

    const printBtn = screen.getByText('طباعة الورقة');
    expect(printBtn).toBeInTheDocument();
    expect(printBtn.closest('button')).toHaveAttribute('aria-keyshortcuts', 'Enter');
  });

  it('renders finish and cut line controls cleanly without export format fallacies', () => {
    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('خيارات الطباعة')).toBeInTheDocument();
    expect(screen.getByText('طباعة بدون هوامش')).toBeInTheDocument();
    expect(screen.getByText('خطوط وعلامات القص')).toBeInTheDocument();
    // فضاء الألوان موجود الآن (sRGB/CMYK) — يحدد exportFormat تلقائياً (jpeg/tiff) فلا حاجة لاختيار صيغة منفصل
    expect(screen.getByText('فضاء الألوان')).toBeInTheDocument();
    expect(screen.queryByText('صيغة الإخراج')).not.toBeInTheDocument();
  });

  it('shows CMYK amber hint only when CMYK is selected', async () => {
    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);

    // افتراضياً sRGB بلا تحذير والزر يحمل نص طباعة الورقة
    expect(screen.queryByText(/سيُحفظ الملف TIFF/)).not.toBeInTheDocument();
    expect(screen.getByText('طباعة الورقة')).toBeInTheDocument();

    await act(async () => {
      useEditorStore.getState().setPrintSettings({ colorSpace: 'CMYK' });
    });

    await waitFor(() => {
      expect(screen.getByText(/سيُحفظ الملف TIFF بفصل أحبار/)).toBeInTheDocument();
      expect(screen.getByText('تصدير ملف المطبعة (TIFF)')).toBeInTheDocument();
    });
  });

  it('renders printer and paper preferences control and calls OpenPrinterPreferences', async () => {
    const { OpenPrinterPreferences } = await import('../wailsjs/go/handlers/PrintHandler');
    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('الطابعة')).toBeInTheDocument();
    const prefsBtn = screen.getByText('الخصائص');
    expect(prefsBtn).toBeInTheDocument();

    await waitFor(() => {
      expect(prefsBtn.closest('button')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(prefsBtn);
    });

    expect(OpenPrinterPreferences).toHaveBeenCalledWith('EPSON L805 Series');
  });
});
