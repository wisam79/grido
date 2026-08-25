import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ExportDialog } from '../src/components/editor/dialogs/export-dialog';
import { useEditorStore } from '../src/lib/editor-store';
import { TooltipProvider } from '../src/components/ui/tooltip';

vi.mock('../src/lib/export', () => ({
  exportCanvas: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
  downloadBlob: vi.fn(() => Promise.resolve('success')),
  exportSlotCanvas: vi.fn(() => Promise.resolve(new Blob(['slot'], { type: 'image/png' }))),
  applyBleedAndCropMarks: vi.fn((canvas) => Promise.resolve(canvas)),
  CanvasTooLargeError: class CanvasTooLargeError extends Error {},
}));

vi.mock('../src/lib/canvas/stage-context', () => ({
  useStageRef: () => ({ current: null }),
}));

describe('ExportDialog Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('renders dialog elements when open is true', () => {
    renderWithProviders(<ExportDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('تصدير الصورة')).toBeInTheDocument();
    expect(screen.getByText('احفظ الصورة بأبعاد القالب المحدد بدقة عالية للطباعة')).toBeInTheDocument();
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
});
