import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { BatchInsertDialog } from '../src/components/editor/dialogs/batch-insert-dialog';
import { useEditorStore } from '../src/lib/editor-store';
import { TooltipProvider } from '../src/components/ui/tooltip';

vi.mock('../src/lib/io/file-dialog-utils', () => ({
  openImageFileDialog: vi.fn(() => Promise.resolve(['data:image/png;base64,mock1', 'data:image/png;base64,mock2'])),
  openDirectoryImageDialog: vi.fn(() => Promise.resolve(['data:image/png;base64,dir1'])),
}));

vi.mock('../wailsjs/go/main/App', () => ({
  SaveImageFromBase64: vi.fn((src) => Promise.resolve(src)),
}));

vi.mock('../src/lib/canvas/image-dimensions', () => ({
  resolveImageAspectRatio: vi.fn(() => Promise.resolve(1.5)),
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

  it('renders empty queue state when open with no images', () => {
    renderWithProviders(<BatchInsertDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('إدراج دفعة صور ومعاملات (Batch Studio)')).toBeInTheDocument();
    expect(screen.getByText('قائمة الصور فارغة')).toBeInTheDocument();
  });

  it('loads and displays initial images passed as prop', async () => {
    renderWithProviders(
      <BatchInsertDialog
        open={true}
        onOpenChange={vi.fn()}
        initialImages={['img1.jpg', 'img2.jpg']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('صورة 1')).toBeInTheDocument();
      expect(screen.getByText('صورة 2')).toBeInTheDocument();
      expect(screen.getByText(/2 صور/)).toBeInTheDocument();
    });
  });

  it('allows adding images via file dialog and executing batch insert', async () => {
    const handleOpenChange = vi.fn();
    renderWithProviders(
      <BatchInsertDialog open={true} onOpenChange={handleOpenChange} />
    );

    const addFilesBtn = screen.getByText('إضافة صور...');
    fireEvent.click(addFilesBtn);

    await waitFor(() => {
      expect(screen.getByText('صورة 1')).toBeInTheDocument();
    });

    const executeBtn = screen.getByText('إدراج في مساحة العمل');
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(handleOpenChange).toHaveBeenCalledWith(false);
      expect(useEditorStore.getState().elements.length).toBe(2);
    });
  });
});
