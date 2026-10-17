import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { PrintDialog } from '../src/components/editor/dialogs/print-dialog';
import { useEditorStore } from '../src/lib/editor-store';
import { TooltipProvider } from '../src/components/ui/tooltip';

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

    // افتراضياً sRGB بلا تحذير
    expect(screen.queryByText(/سيُحفظ الملف TIFF/)).not.toBeInTheDocument();

    await act(async () => {
      useEditorStore.getState().setPrintSettings({ colorSpace: 'CMYK' });
    });

    await waitFor(() => {
      expect(screen.getByText(/سيُحفظ الملف TIFF بفصل أحبار/)).toBeInTheDocument();
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
