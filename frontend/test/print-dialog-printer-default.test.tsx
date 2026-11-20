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
const papersMock = vi.fn();
const invocation = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('../src/components/editor/print/use-print-export', () => {
  const cancelExport = () => {};
  const handlePrint = vi.fn();
  const handlePrintRef = { current: handlePrint };
  const setPrintInvocation = (value: unknown) => {
    invocation.current = value;
  };
  return {
    usePrintExport: () => ({
      isExporting: false,
      cancelExport,
      handlePrint,
      handlePrintRef,
      setPrintInvocation,
    }),
  };
});

vi.mock('../wailsjs/go/handlers/PrintHandler', () => ({
  ExportPrintSheet: vi.fn(() => Promise.resolve({ success: true, filePath: 'mock.png' })),
  PrintNative: vi.fn(() => Promise.resolve({ success: true })),
  GetPrinters: () => getPrintersMock(),
  GetDefaultPrinterName: () => getDefaultPrinterMock(),
  OpenPrinterPreferences: (name: string) => openPrefsMock(name),
  GetSupportedPapers: () => papersMock(),
}));

vi.mock('@bindings/grido/internal/handlers/printhandler', () => ({
  ExportPrintSheet: vi.fn(() => Promise.resolve({ success: true, filePath: 'mock.png' })),
  PrintNative: vi.fn(() => Promise.resolve({ success: true })),
  GetPrinters: vi.fn(() => Promise.resolve({ success: true, printers: [] })),
  OpenPrinterPreferences: vi.fn(() => Promise.resolve({ success: true })),
  // 🛑 عقد الإلغاء الجديد (C4) — يُستدعى من cancelExport في use-print-export
  CancelActivePrintJobs: vi.fn(() => Promise.resolve(undefined)),
  CancelPrintJob: vi.fn(() => Promise.resolve(undefined)),
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
    papersMock.mockResolvedValue({ success: true, papers: [] });
    invocation.current = null;
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

  it.each([
    { papers: [], marginMM: 0, expected: false },
    {
      papers: [{ id: 9, name: 'A4', widthMM: 210, heightMM: 297, isBorderless: false }],
      marginMM: 0,
      expected: false,
    },
    {
      papers: [{ id: 9, name: 'A4 borderless', widthMM: 210, heightMM: 297, isBorderless: true }],
      marginMM: 0,
      expected: true,
    },
    {
      papers: [{ id: 9, name: 'A4 borderless', widthMM: 210, heightMM: 297, isBorderless: true }],
      marginMM: 5,
      expected: false,
    },
  ])(
    'requests borderless=$expected only with an explicitly capable matched form (margin $marginMM)',
    async ({ papers, marginMM, expected }) => {
      getPrintersMock.mockResolvedValue({
        success: true,
        printers: [{ name: EPSON, isDefault: true }],
      });
      papersMock.mockResolvedValue({ success: true, papers });
      act(() =>
        useEditorStore
          .getState()
          .setPrintSettings({ paperId: 'a4', paperWidthMM: 210, paperHeightMM: 297, marginMM }),
      );
      const view = renderDialog();
      await waitFor(() => expect(papersMock).toHaveBeenCalled());
      await act(async () => {
        await Promise.resolve();
      });
      expect(invocation.current).toMatchObject({ options: { borderless: expected } });
      view.unmount();
    },
  );

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
