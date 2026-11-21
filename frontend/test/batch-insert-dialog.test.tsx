import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BatchInsertDialog } from '../src/components/editor/dialogs/batch-insert-dialog';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';
import { openImageFileDialog } from '../src/lib/io/file-dialog-utils';

vi.mock('../src/lib/io/file-dialog-utils', () => ({
  openImageFileDialog: vi.fn(() =>
    Promise.resolve(['data:image/png;base64,mock1', 'data:image/png;base64,mock2']),
  ),
  openDirectoryImageDialog: vi.fn(() => Promise.resolve(['data:image/png;base64,dir1'])),
}));

vi.mock('../wailsjs/go/main/App', () => ({
  SaveImageFromBase64: vi.fn((src) => Promise.resolve(src)),
}));

vi.mock('../src/lib/canvas/image-dimensions', () => ({
  resolveImageAspectRatio: vi.fn(() => Promise.resolve(1.5)),
  resolveBatchImageAspectRatios: vi.fn((srcs: string[]) =>
    Promise.resolve(new Map(srcs.map((s: string) => [s, 1.5]))),
  ),
}));

describe('BatchInsertDialog Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
    useEditorStore.getState().setMode('single');
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('ignores an old file picker and its finally after close/reopen', async () => {
    let finishOld!: (sources: string[]) => void;
    let finishNew!: (sources: string[]) => void;
    vi.mocked(openImageFileDialog)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishOld = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishNew = resolve;
        }),
      );
    const onOpenChange = vi.fn();
    const frame = (open: boolean) => (
      <TooltipProvider>
        <BatchInsertDialog open={open} onOpenChange={onOpenChange} />
      </TooltipProvider>
    );
    const view = render(frame(true));
    fireEvent.click(screen.getByText('إدراج صور'));
    view.rerender(frame(false));
    view.rerender(frame(true));
    fireEvent.click(screen.getByText('إدراج صور'));
    await act(async () => finishOld(['old.png']));
    expect(screen.queryByText('صورة 1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إدراج صور' })).toBeDisabled();
    await act(async () => finishNew(['new.png']));
    expect(screen.getByText('صورة 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إدراج صور' })).toBeEnabled();
  });

  it('hands collage overflow to the same store transaction and closes once', async () => {
    useEditorStore.getState().setMode('collage');
    useEditorStore.setState({ slots: [] });
    const onOpenChange = vi.fn();
    renderWithProviders(
      <BatchInsertDialog open onOpenChange={onOpenChange} initialImages={['one.png', 'two.png']} />,
    );
    await screen.findByText('صورة 1');
    fireEvent.click(screen.getByRole('button', { name: 'إدراج' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false), {
      timeout: 4000,
    });
    expect(useEditorStore.getState().collagePendingImages).toEqual(['one.png', 'two.png']);
  });

  it('renders empty queue state when open with no images', () => {
    renderWithProviders(<BatchInsertDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('إدراج دفعة')).toBeInTheDocument();
    expect(screen.getByText('قائمة الصور فارغة')).toBeInTheDocument();
  });

  it('loads and displays initial images passed as prop', async () => {
    renderWithProviders(
      <BatchInsertDialog
        open={true}
        onOpenChange={vi.fn()}
        initialImages={['img1.jpg', 'img2.jpg']}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('صورة 1')).toBeInTheDocument();
      expect(screen.getByText('صورة 2')).toBeInTheDocument();
      expect(screen.getByText(/2 صور/)).toBeInTheDocument();
    });
  });

  it('allows adding images via file dialog and executing batch insert', async () => {
    const handleOpenChange = vi.fn();
    renderWithProviders(<BatchInsertDialog open={true} onOpenChange={handleOpenChange} />);

    const addFilesBtn = screen.getByText('إدراج صور');
    fireEvent.click(addFilesBtn);

    await waitFor(() => {
      expect(screen.getByText('صورة 1')).toBeInTheDocument();
    });

    const executeBtn = screen.getByText('إدراج');
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(handleOpenChange).toHaveBeenCalledWith(false);
      expect(useEditorStore.getState().elements.length).toBe(2);
    });
  });
});
