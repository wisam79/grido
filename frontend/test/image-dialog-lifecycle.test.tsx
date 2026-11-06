import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CropDialog } from '../src/components/editor/dialogs/crop-dialog';
import { RefineBgDialog } from '../src/components/editor/dialogs/refine-bg-dialog';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';
import { advanceDocumentSession } from '../src/lib/io/document-session';
import { uploadCanvasBlob } from '../src/lib/io/media-upload';

import type { UploadMediaResult } from '../src/lib/io/media-upload';

vi.mock('../src/lib/io/media-upload', () => ({ uploadCanvasBlob: vi.fn() }));
vi.mock('../src/lib/wails-env', () => ({ wailsIsDesktop: () => true }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('react-cropper', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    Cropper: forwardRef(function MockCropper(_props, ref) {
      useImperativeHandle(ref, () => ({
        cropper: {
          setAspectRatio: vi.fn(),
          getCroppedCanvas: () => {
            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 100;
            return canvas;
          },
        },
      }));
      return null;
    }),
  };
});

function deferredUpload() {
  let resolve!: (value: UploadMediaResult) => void;
  const promise = new Promise<UploadMediaResult>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

class LoadedImage {
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private value = '';
  set src(value: string) {
    this.value = value;
    if (value) queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this.value;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().reset();
  vi.stubGlobal('Image', LoadedImage);
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(['crop', 'refine'] as const)('%s dialog save ownership', (kind) => {
  const saveLabel = kind === 'crop' ? 'تطبيق القص' : 'حفظ';

  function setup() {
    const onSave = vi.fn();
    const onOpenChange = vi.fn();
    const frame = (open = true, imageSrc = '/local-image/original.png') => (
      <TooltipProvider>
        {kind === 'crop' ? (
          <CropDialog
            open={open}
            onOpenChange={onOpenChange}
            imageSrc={imageSrc}
            onCropSave={onSave}
          />
        ) : (
          <RefineBgDialog
            open={open}
            onOpenChange={onOpenChange}
            element={{ id: 'image-1', imageSrc }}
            onSave={onSave}
          />
        )}
      </TooltipProvider>
    );
    const view = render(frame());
    return { ...view, frame, onSave, onOpenChange };
  }

  async function startSave() {
    const button = screen.getByRole('button', { name: saveLabel });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(uploadCanvasBlob).toHaveBeenCalled());
  }

  it('applies a current completed save and closes the dialog', async () => {
    const pending = deferredUpload();
    vi.mocked(uploadCanvasBlob).mockReturnValueOnce(pending.promise);
    const view = setup();
    await startSave();

    await act(async () => pending.resolve({ imageSrc: '/local-image/accepted.png' }));

    expect(view.onSave).toHaveBeenCalledTimes(1);
    expect(view.onSave.mock.calls[0][0]).toBe('/local-image/accepted.png');
    expect(view.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes after its consumer commits the new image source', async () => {
    const pending = deferredUpload();
    vi.mocked(uploadCanvasBlob).mockReturnValueOnce(pending.promise);
    const view = setup();
    view.onSave.mockImplementation((imageSrc: string) => {
      view.rerender(view.frame(true, imageSrc));
      return true;
    });
    await startSave();

    await act(async () => pending.resolve({ imageSrc: '/local-image/accepted.png' }));

    expect(view.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not apply a pending upload after Cancel closes the dialog', async () => {
    const pending = deferredUpload();
    vi.mocked(uploadCanvasBlob).mockReturnValueOnce(pending.promise);
    const view = setup();
    await startSave();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(view.onOpenChange).toHaveBeenCalledWith(false);
    view.rerender(view.frame(false));
    view.onOpenChange.mockClear();

    await act(async () => pending.resolve({ imageSrc: '/local-image/obsolete.png' }));

    expect(view.onSave).not.toHaveBeenCalled();
    expect(view.onOpenChange).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('ignores a result after the image source is replaced', async () => {
    const pending = deferredUpload();
    vi.mocked(uploadCanvasBlob).mockReturnValueOnce(pending.promise);
    const view = setup();
    await startSave();
    view.rerender(view.frame(true, '/local-image/replacement.png'));

    await act(async () => pending.resolve({ imageSrc: '/local-image/obsolete.png' }));

    expect(view.onSave).not.toHaveBeenCalled();
    expect(view.onOpenChange).not.toHaveBeenCalled();
  });

  it('does not apply a result to a new document with the same source', async () => {
    const pending = deferredUpload();
    vi.mocked(uploadCanvasBlob).mockReturnValueOnce(pending.promise);
    const view = setup();
    await startSave();
    advanceDocumentSession();

    await act(async () => pending.resolve({ imageSrc: '/local-image/obsolete.png' }));

    expect(view.onSave).not.toHaveBeenCalled();
    expect(view.onOpenChange).not.toHaveBeenCalled();
  });

  it('does not apply a pending result after unmount', async () => {
    const pending = deferredUpload();
    vi.mocked(uploadCanvasBlob).mockReturnValueOnce(pending.promise);
    const view = setup();
    await startSave();
    view.unmount();

    await act(async () => pending.resolve({ imageSrc: '/local-image/obsolete.png' }));

    expect(view.onSave).not.toHaveBeenCalled();
    expect(view.onOpenChange).not.toHaveBeenCalled();
  });
});
