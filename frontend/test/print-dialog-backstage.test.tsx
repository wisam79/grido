import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { PrintDialog } from '../src/components/editor/dialogs/print-dialog';
import { useEditorStore } from '../src/lib/editor-store';
import { TooltipProvider } from '../src/components/ui/tooltip';

vi.mock('../wailsjs/go/handlers/PrintHandler', () => ({
  GetPrinters: vi.fn(() =>
    Promise.resolve({
      success: true,
      printers: [
        { name: 'Brother DCP-T520W', isDefault: true },
        { name: 'EPSON L805 Series', isDefault: false },
      ],
    }),
  ),
  OpenPrinterPreferences: vi.fn(() => Promise.resolve({ success: true })),
  ExportPrintSheet: vi.fn(() => Promise.resolve({ success: true, filePath: 'mock.png' })),
  PrintNative: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('../wailsjs/go/main/App', () => ({
  SetTaskbarProgress: vi.fn(() => Promise.resolve()),
}));

describe('PrintDialog Backstage View Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
    useEditorStore.getState().setMode('single');
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('renders backstage view header, printer selector, and controls when open', async () => {
    renderWithProviders(<PrintDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('استوديو الطباعة')).toBeInTheDocument();
    expect(screen.getByText('العودة للمحرر')).toBeInTheDocument();
    expect(screen.getByText('معاينة الورقة المطبوعة')).toBeInTheDocument();
    expect(screen.getByText(/الطباعة باستخدام حوار النظام/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Brother DCP-T520W')).toBeInTheDocument();
    });
  });
});
