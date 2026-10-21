import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PrintDialog } from '../src/components/editor/dialogs/print-dialog';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';

const STORAGE_KEY = 'grido-print-selected-printer';

// قائمة الطابعات وطابعة النظام الافتراضية — نتحكم بهما لكل اختبار
const getPrintersMock = vi.fn();
const getDefaultPrinterMock = vi.fn();
const openPrefsMock = vi.fn((_name: string) => Promise.resolve({ success: true }));

vi.mock('../wailsjs/go/handlers/PrintHandler', () => ({
  ExportPrintSheet: vi.fn(() => Promise.resolve({ success: true, filePath: 'mock.png' })),
  PrintNative: vi.fn(() => Promise.resolve({ success: true })),
  GetPrinters: () => getPrintersMock(),
  GetDefaultPrinterName: () => getDefaultPrinterMock(),
  OpenPrinterPreferences: (name: string) => openPrefsMock(name),
  GetSupportedPapers: vi.fn(() => Promise.resolve({ success: true, papers: [] })),
}));

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

const EPSON = 'EPSON L805 Series';
const BROTHER = 'Brother DCP-T520W';

describe('PrintDialog — مزامنة الطابعة المبدئية (الخيار 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getDefaultPrinterMock.mockResolvedValue('');
    openPrefsMock.mockResolvedValue({ success: true });
    act(() => {
      useEditorStore.getState().reset();
      useEditorStore.getState().setMode('single');
    });
  });

  const renderDialog = () =>
    render(
      <TooltipProvider>
        <PrintDialog open={true} onOpenChange={vi.fn()} />
      </TooltipProvider>,
    );

  const clickPropertiesAndGetName = async (): Promise<string | undefined> => {
    const prefsBtn = screen.getByText('الخصائص');
    await waitFor(() => expect(prefsBtn.closest('button')).not.toBeDisabled());
    await act(async () => {
      fireEvent.click(prefsBtn);
    });
    const calls = openPrefsMock.mock.calls;
    return calls[calls.length - 1]?.[0];
  };

  it('يفضّل الطابعة المحفوظة من جلسة سابقة على الافتراضية', async () => {
    localStorage.setItem(STORAGE_KEY, BROTHER);
    getPrintersMock.mockResolvedValue({
      success: true,
      printers: [
        { name: EPSON, isDefault: true },
        { name: BROTHER, isDefault: false },
      ],
    });

    renderDialog();
    expect(await clickPropertiesAndGetName()).toBe(BROTHER);
  });

  it('يطابق طابعة النظام الافتراضية بالاسم عند غياب وسم isDefault', async () => {
    getPrintersMock.mockResolvedValue({
      success: true,
      printers: [
        { name: EPSON, isDefault: false },
        { name: BROTHER, isDefault: false },
      ],
    });
    getDefaultPrinterMock.mockResolvedValue(BROTHER);

    renderDialog();
    expect(await clickPropertiesAndGetName()).toBe(BROTHER);
  });

  it('يعرض طابعة النظام الافتراضية وحدها عندما يفشل استعلام القائمة', async () => {
    getPrintersMock.mockResolvedValue({ success: true, printers: [] });
    getDefaultPrinterMock.mockResolvedValue(EPSON);

    renderDialog();
    expect(await clickPropertiesAndGetName()).toBe(EPSON);
  });
});
