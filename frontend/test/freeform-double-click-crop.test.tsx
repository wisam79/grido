import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenFile, SaveImageFromBase64 } from '@bindings/grido/app';

import { ContextMenu } from '../src/components/editor/canvas/context-menu';
import { EditorCanvas } from '../src/components/editor/canvas/editor-canvas';
import { REEDIT_STICKER_EVENT } from '../src/components/editor/dialogs/sticker-reedit-bus';
import { ImageStyleProperties } from '../src/components/editor/properties/panels/image-properties';
import { TooltipProvider } from '../src/components/ui/tooltip';
import {
  resetCanvasInteraction,
  useCanvasInteraction,
} from '../src/lib/canvas/canvas-interaction-store';
import { commitImageElementCrop } from '../src/lib/canvas/image-crop-commit';
import { setCachedImageDimensions } from '../src/lib/canvas/image-dimensions';
import { useEditorStore } from '../src/lib/editor-store';
import { advanceDocumentSession } from '../src/lib/io/document-session';

import type {
  CanvasElement,
  ImageElement,
  StickerElementSource,
  TextElement,
} from '../src/lib/store/types';

let desktopMode = false;
let nextCropPayload: {
  cropped: string;
  dims?: { width: number; height: number };
  isActiveValue: boolean;
} = {
  cropped: 'data:image/png;base64,Y3JvcHBlZA==',
  dims: { width: 400, height: 800 },
  isActiveValue: true,
};

const capturedHandlers: {
  handleDoubleClick?: (el: CanvasElement) => void;
} = {};

vi.mock('../src/lib/wails-env', () => ({
  wailsIsDesktop: () => desktopMode,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@bindings/grido/app', () => ({
  OpenFile: vi.fn(() => Promise.resolve('data:image/png;base64,unexpected-openfile')),
  SaveImageFromBase64: vi.fn(() => Promise.resolve('/local-image/saved-crop.png')),
  GetImageDimensions: vi.fn(() => Promise.resolve({ width: 800, height: 600 })),
  GetBatchImageDimensions: vi.fn(() => Promise.resolve({})),
  ProcessLocalImageFile: vi.fn((p: string) => Promise.resolve(p)),
  EnhanceImageWithAI: vi.fn(() => Promise.resolve('')),
  ApplyMaskToImage: vi.fn(() => Promise.resolve('')),
  LogFrontendError: vi.fn(() => Promise.resolve()),
}));

vi.mock('../src/components/editor/konva/konva-canvas', () => ({
  KonvaCanvas: ({ handleDoubleClick }: { handleDoubleClick: (el: CanvasElement) => void }) => {
    capturedHandlers.handleDoubleClick = handleDoubleClick;
    return <div data-testid="mock-konva-canvas" />;
  },
}));

vi.mock('../src/components/editor/dialogs/crop-dialog', () => ({
  CropDialog: ({
    open,
    onOpenChange,
    imageSrc,
    originalImageSrc,
    onCropSave,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageSrc: string;
    originalImageSrc?: string;
    onCropSave: (
      croppedBase64: string,
      dims?: { width: number; height: number },
      isActive?: () => boolean,
    ) => void | boolean | Promise<void | boolean>;
  }) => {
    if (!open) return null;
    return (
      <div
        data-testid="mock-crop-dialog"
        data-image-src={imageSrc}
        data-original-src={originalImageSrc ?? ''}
      >
        <button
          type="button"
          onClick={() => {
            void Promise.resolve(
              onCropSave(
                nextCropPayload.cropped,
                nextCropPayload.dims,
                () => nextCropPayload.isActiveValue,
              ),
            ).then((committed) => {
              if (committed !== false) {
                onOpenChange(false);
              }
            });
          }}
        >
          تطبيق القص التجريبي
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          إغلاق القص التجريبي
        </button>
      </div>
    );
  },
}));

class MockImage {
  width = 300;
  height = 600;
  naturalWidth = 300;
  naturalHeight = 600;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  set src(val: string) {
    this._src = val;
    if (!val) return;
    queueMicrotask(() => {
      if (val === 'broken://image') {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
  get src() {
    return this._src;
  }
}

function makeStickerSource(): StickerElementSource {
  return {
    templateId: 'stamp_demo',
    params: {
      fields: { title: 'ختم تجريبي' },
      primaryColor: '#111827',
      secondaryColor: '#2563eb',
      backgroundColor: '#ffffff',
      isTransparent: false,
    },
    svg: '<svg viewBox="0 0 100 100"><rect width="100" height="100"/></svg>',
  };
}

function makeImageElement(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: 'img-1',
    type: 'image',
    imageSrc: '/local-image/original.png',
    x: 0.1,
    y: 0.1,
    width: 0.4,
    height: 0.4,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    ...overrides,
  };
}

function makeTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'txt-1',
    type: 'text',
    text: 'نص تجريبي',
    x: 0.2,
    y: 0.2,
    width: 0.3,
    height: 0.1,
    fontSize: 24,
    fontFamily: 'Cairo',
    rotation: 0,
    opacity: 1,
    zIndex: 2,
    ...overrides,
  };
}

function seedFreeformStore(elements: CanvasElement[]) {
  useEditorStore.setState({
    mode: 'single',
    canvasWidth: 1000,
    canvasHeight: 1000,
    elements,
    selectedId: elements[0]?.id ?? null,
    selectedIds: elements[0] ? [elements[0].id] : [],
    editingTextId: null,
    history: [],
    historyIndex: -1,
  });
  useEditorStore.getState().pushHistory();
}

beforeEach(() => {
  vi.clearAllMocks();
  desktopMode = false;
  nextCropPayload = {
    cropped: 'data:image/png;base64,Y3JvcHBlZA==',
    dims: { width: 400, height: 800 },
    isActiveValue: true,
  };
  capturedHandlers.handleDoubleClick = undefined;
  resetCanvasInteraction();
  useEditorStore.getState().reset();
  vi.stubGlobal('Image', MockImage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('commitImageElementCrop — unified crop commit helper', () => {
  it('sets originalImageSrc on first crop, computes height from aspect ratio, updates lastEditedImage, and pushes history', async () => {
    const el = makeImageElement({ imageSrc: 'photo-v1.png', width: 0.4, height: 0.4 });
    seedFreeformStore([el]);

    const ok = await commitImageElementCrop({
      elementId: el.id,
      expectedImageSrc: 'photo-v1.png',
      cropped: 'photo-cropped-1.png',
      dims: { width: 400, height: 800 },
    });

    expect(ok).toBe(true);
    const updated = useEditorStore.getState().elements[0] as ImageElement;
    expect(updated.imageSrc).toBe('photo-cropped-1.png');
    expect(updated.originalImageSrc).toBe('photo-v1.png');
    expect(updated.height).toBeCloseTo(0.8, 6);
    expect(useEditorStore.getState().lastEditedImage).toBe('photo-cropped-1.png');
    expect(useEditorStore.getState().lastEditedImageAspect).toBeCloseTo(0.5, 6);
    expect(useEditorStore.getState().history).toHaveLength(2);
  });

  it('preserves existing originalImageSrc across subsequent crops', async () => {
    const el = makeImageElement({
      imageSrc: 'photo-cropped-1.png',
      originalImageSrc: 'photo-raw.png',
      width: 0.4,
      height: 0.8,
    });
    seedFreeformStore([el]);

    const ok = await commitImageElementCrop({
      elementId: el.id,
      expectedImageSrc: 'photo-cropped-1.png',
      cropped: 'photo-cropped-2.png',
      dims: { width: 800, height: 400 },
    });

    expect(ok).toBe(true);
    const updated = useEditorStore.getState().elements[0] as ImageElement;
    expect(updated.imageSrc).toBe('photo-cropped-2.png');
    expect(updated.originalImageSrc).toBe('photo-raw.png');
    expect(updated.height).toBeCloseTo(0.2, 6);
  });

  it('decodes image dimensions when dims are omitted and preserves originalImageSrc', async () => {
    const el = makeImageElement({ imageSrc: 'photo-v1.png', width: 0.3, height: 0.3 });
    seedFreeformStore([el]);

    const ok = await commitImageElementCrop({
      elementId: el.id,
      expectedImageSrc: 'photo-v1.png',
      cropped: 'data:image/png;base64,ZGVjb2Rl',
    });

    expect(ok).toBe(true);
    const updated = useEditorStore.getState().elements[0] as ImageElement;
    expect(updated.originalImageSrc).toBe('photo-v1.png');
    // MockImage reports 300x600 -> aspect 0.5 -> newHeight = (0.3 * 1) / 0.5 = 0.6
    expect(updated.height).toBeCloseTo(0.6, 6);
  });

  it('persists desktop data:image/ crops via SaveImageFromBase64 when wailsIsDesktop is true', async () => {
    desktopMode = true;
    vi.mocked(SaveImageFromBase64).mockResolvedValueOnce('/local-image/desktop-crop.png');
    const el = makeImageElement({ imageSrc: '/local-image/raw.png' });
    seedFreeformStore([el]);

    const ok = await commitImageElementCrop({
      elementId: el.id,
      expectedImageSrc: '/local-image/raw.png',
      cropped: 'data:image/png;base64,ZGVza3RvcA==',
      dims: { width: 500, height: 500 },
    });

    expect(ok).toBe(true);
    expect(SaveImageFromBase64).toHaveBeenCalledWith('data:image/png;base64,ZGVza3RvcA==');
    const updated = useEditorStore.getState().elements[0] as ImageElement;
    expect(updated.imageSrc).toBe('/local-image/desktop-crop.png');
    expect(updated.originalImageSrc).toBe('/local-image/raw.png');
  });

  it('rejects commit cleanly without mutating store when stale, unmounted, locked, deleted, or document changed', async () => {
    const el = makeImageElement({ imageSrc: 'photo-v1.png' });
    seedFreeformStore([el]);

    expect(
      await commitImageElementCrop({
        elementId: el.id,
        expectedImageSrc: 'photo-v1.png',
        cropped: 'cropped.png',
        dims: { width: 200, height: 200 },
        isActive: () => false,
      }),
    ).toBe(false);

    expect(
      await commitImageElementCrop({
        elementId: el.id,
        expectedImageSrc: 'photo-v1.png',
        cropped: 'cropped.png',
        dims: { width: 200, height: 200 },
        isMounted: () => false,
      }),
    ).toBe(false);

    expect(
      await commitImageElementCrop({
        elementId: el.id,
        expectedImageSrc: 'different.png',
        cropped: 'cropped.png',
        dims: { width: 200, height: 200 },
      }),
    ).toBe(false);

    useEditorStore.getState().updateElement(el.id, { locked: true });
    expect(
      await commitImageElementCrop({
        elementId: el.id,
        expectedImageSrc: 'photo-v1.png',
        cropped: 'cropped.png',
        dims: { width: 200, height: 200 },
      }),
    ).toBe(false);

    useEditorStore.getState().updateElement(el.id, { locked: false });
    advanceDocumentSession();
    expect(
      await commitImageElementCrop({
        elementId: el.id,
        expectedImageSrc: 'photo-v1.png',
        cropped: 'cropped.png',
        dims: { width: 200, height: 200 },
        session: 0,
      }),
    ).toBe(false);

    seedFreeformStore([]);
    expect(
      await commitImageElementCrop({
        elementId: el.id,
        expectedImageSrc: 'photo-v1.png',
        cropped: 'cropped.png',
        dims: { width: 200, height: 200 },
      }),
    ).toBe(false);

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('logs and shows an error toast when saving fails on a still-current element', async () => {
    desktopMode = true;
    vi.mocked(SaveImageFromBase64).mockRejectedValueOnce(new Error('disk full'));
    const el = makeImageElement({ imageSrc: '/local-image/raw.png' });
    seedFreeformStore([el]);

    const ok = await commitImageElementCrop({
      elementId: el.id,
      expectedImageSrc: '/local-image/raw.png',
      cropped: 'data:image/png;base64,ZmFpbA==',
      dims: { width: 200, height: 200 },
    });

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalled();
    expect((useEditorStore.getState().elements[0] as ImageElement).imageSrc).toBe(
      '/local-image/raw.png',
    );
  });
});

describe('ImageStyleProperties — crop saves originalImageSrc and enables restore', () => {
  function PropertiesHarness() {
    const element = useEditorStore((s) => s.elements[0] as ImageElement);
    const updateElement = useEditorStore((s) => s.updateElement);
    return (
      <TooltipProvider>
        <ImageStyleProperties element={element} onUpdate={updateElement} />
      </TooltipProvider>
    );
  }

  it('records originalImageSrc upon crop and restores it via استعادة الأصل', async () => {
    const el = makeImageElement({ imageSrc: '/local-image/initial.png', width: 0.4, height: 0.4 });
    seedFreeformStore([el]);

    render(<PropertiesHarness />);

    expect(screen.queryByRole('button', { name: 'استعادة الأصل' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'قص وتدوير' }));
    await screen.findByTestId('mock-crop-dialog');
    fireEvent.click(screen.getByRole('button', { name: 'تطبيق القص التجريبي' }));

    await waitFor(() => {
      const stored = useEditorStore.getState().elements[0] as ImageElement;
      expect(stored.imageSrc).toBe('data:image/png;base64,Y3JvcHBlZA==');
      expect(stored.originalImageSrc).toBe('/local-image/initial.png');
    });

    expect(screen.getByRole('button', { name: 'استعادة الأصل' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'مقارنة الأصل' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'استعادة الأصل' }));

    const restored = useEditorStore.getState().elements[0] as ImageElement;
    expect(restored.imageSrc).toBe('/local-image/initial.png');
    expect(restored.originalImageSrc).toBeUndefined();
    expect(useEditorStore.getState().history).toHaveLength(3);
  });
});

describe('ContextMenu — ElementMenuSection crop awaits unified commit', () => {
  it('preserves originalImageSrc, updates height, pushes history, and closes menu', async () => {
    desktopMode = true;
    vi.mocked(SaveImageFromBase64).mockResolvedValueOnce('/local-image/menu-cropped.png');
    const el = makeImageElement({ imageSrc: '/local-image/menu-raw.png', width: 0.4, height: 0.4 });
    seedFreeformStore([el]);
    const onClose = vi.fn();

    render(
      <TooltipProvider>
        <ContextMenu
          position={{ x: 100, y: 100 }}
          target={{ type: 'element', id: el.id }}
          onClose={onClose}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'قص وتدوير' }));
    await screen.findByTestId('mock-crop-dialog');
    fireEvent.click(screen.getByRole('button', { name: 'تطبيق القص التجريبي' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    const updated = useEditorStore.getState().elements[0] as ImageElement;
    expect(updated.imageSrc).toBe('/local-image/menu-cropped.png');
    expect(updated.originalImageSrc).toBe('/local-image/menu-raw.png');
    expect(updated.height).toBeCloseTo(0.8, 6);
    expect(useEditorStore.getState().history).toHaveLength(2);
  });
});

describe('EditorCanvas — smart handleDoubleClick routing (FF-01)', () => {
  it('re-edits a sticker element via REEDIT_STICKER_EVENT without opening CropDialog or OpenFile', () => {
    const sticker = makeImageElement({
      id: 'sticker-1',
      imageSrc: '/local-image/sticker.png',
      stickerSource: makeStickerSource(),
    });
    seedFreeformStore([sticker]);

    const reeditListener = vi.fn();
    window.addEventListener(REEDIT_STICKER_EVENT, reeditListener);

    try {
      render(
        <TooltipProvider>
          <EditorCanvas />
        </TooltipProvider>,
      );

      expect(capturedHandlers.handleDoubleClick).toBeDefined();
      act(() => {
        capturedHandlers.handleDoubleClick!(sticker);
      });

      expect(reeditListener).toHaveBeenCalledTimes(1);
      const evt = reeditListener.mock.calls[0][0] as CustomEvent<{ elementId: string }>;
      expect(evt.detail).toEqual({ elementId: 'sticker-1' });
      expect(OpenFile).not.toHaveBeenCalled();
      expect(screen.queryByTestId('mock-crop-dialog')).not.toBeInTheDocument();
    } finally {
      window.removeEventListener(REEDIT_STICKER_EVENT, reeditListener);
    }
  });

  it('enters in-place crop on double-clicking a regular image and supports advanced CropDialog with originalImageSrc preservation', async () => {
    setCachedImageDimensions('/local-image/photo.png', 1600, 800);
    const photo = makeImageElement({
      id: 'photo-1',
      imageSrc: '/local-image/photo.png',
      width: 0.4,
      height: 0.4,
    });
    seedFreeformStore([photo]);

    const reeditListener = vi.fn();
    window.addEventListener(REEDIT_STICKER_EVENT, reeditListener);

    try {
      render(
        <TooltipProvider>
          <EditorCanvas />
        </TooltipProvider>,
      );

      act(() => {
        capturedHandlers.handleDoubleClick!(photo);
      });

      expect(await screen.findByTestId('image-crop-overlay')).toBeInTheDocument();
      expect(useCanvasInteraction.getState().croppingElementId).toBe('photo-1');
      expect(reeditListener).not.toHaveBeenCalled();
      expect(OpenFile).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'قص وتدوير متقدم' }));

      const dialog = await screen.findByTestId('mock-crop-dialog');
      expect(dialog).toHaveAttribute('data-image-src', '/local-image/photo.png');
      expect(dialog).toHaveAttribute('data-original-src', '');
      expect(useCanvasInteraction.getState().croppingElementId).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'تطبيق القص التجريبي' }));

      await waitFor(() => {
        expect(screen.queryByTestId('mock-crop-dialog')).not.toBeInTheDocument();
      });

      const updated = useEditorStore.getState().elements[0] as ImageElement;
      expect(updated.imageSrc).toBe('data:image/png;base64,Y3JvcHBlZA==');
      expect(updated.originalImageSrc).toBe('/local-image/photo.png');
      expect(updated.cropZoom).toBeUndefined();
      expect(updated.cropPanX).toBeUndefined();
      expect(updated.cropPanY).toBeUndefined();
      expect(updated.height).toBeCloseTo(0.8, 6);
      expect(useEditorStore.getState().history).toHaveLength(2);
    } finally {
      window.removeEventListener(REEDIT_STICKER_EVENT, reeditListener);
    }
  });

  it('ignores double-clicks on locked elements and while in printMode', () => {
    const lockedSticker = makeImageElement({
      id: 'locked-sticker',
      locked: true,
      stickerSource: makeStickerSource(),
    });
    const lockedPhoto = makeImageElement({
      id: 'locked-photo',
      locked: true,
      imageSrc: '/local-image/locked.png',
    });
    const unlockedPhoto = makeImageElement({
      id: 'unlocked-photo',
      locked: false,
      imageSrc: '/local-image/unlocked.png',
    });
    seedFreeformStore([lockedSticker, lockedPhoto, unlockedPhoto]);

    const reeditListener = vi.fn();
    window.addEventListener(REEDIT_STICKER_EVENT, reeditListener);

    try {
      const { rerender } = render(
        <TooltipProvider>
          <EditorCanvas printMode={false} />
        </TooltipProvider>,
      );

      act(() => {
        capturedHandlers.handleDoubleClick!(lockedSticker);
        capturedHandlers.handleDoubleClick!(lockedPhoto);
      });

      expect(reeditListener).not.toHaveBeenCalled();
      expect(screen.queryByTestId('mock-crop-dialog')).not.toBeInTheDocument();
      expect(useCanvasInteraction.getState().croppingElementId).toBeNull();
      expect(OpenFile).not.toHaveBeenCalled();

      rerender(
        <TooltipProvider>
          <EditorCanvas printMode={true} />
        </TooltipProvider>,
      );

      act(() => {
        capturedHandlers.handleDoubleClick!(unlockedPhoto);
      });

      expect(reeditListener).not.toHaveBeenCalled();
      expect(screen.queryByTestId('mock-crop-dialog')).not.toBeInTheDocument();
    } finally {
      window.removeEventListener(REEDIT_STICKER_EVENT, reeditListener);
    }
  });

  it('still enters inline text editing on double-clicking an unlocked text element', () => {
    const textEl = makeTextElement({ id: 'txt-edit' });
    seedFreeformStore([textEl]);

    render(
      <TooltipProvider>
        <EditorCanvas />
      </TooltipProvider>,
    );

    act(() => {
      capturedHandlers.handleDoubleClick!(textEl);
    });

    expect(useEditorStore.getState().editingTextId).toBe('txt-edit');
  });
});
