import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildDefaultStickerParams } from '../src/features/stickers/lib/sticker-design/build-svg';
import { renderSvgToPngBlob } from '../src/features/stickers/lib/svg-rasterizer';
import { useStickerInsertActions } from '../src/features/stickers/lib/use-sticker-insert-actions';
import { ALL_STICKER_TEMPLATES } from '../src/features/stickers/templates';
import { useEditorStore } from '../src/lib/editor-store';
import { uploadMediaBlob } from '../src/lib/io/media-upload';

vi.mock('../src/features/stickers/lib/svg-rasterizer', () => ({ renderSvgToPngBlob: vi.fn() }));
vi.mock('../src/features/stickers/lib/sheet-generator', () => ({
  generateStickerSheetBlob: vi.fn().mockResolvedValue(new Blob(['sheet'])),
}));
vi.mock('../src/lib/io/media-upload', () => ({ uploadMediaBlob: vi.fn() }));
vi.mock('../src/lib/wails-env', () => ({ wailsIsDesktop: () => true }));
vi.mock('../src/lib/canvas/image-dimensions', () => ({
  resolveImageAspectRatio: vi.fn().mockResolvedValue(2),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const template = ALL_STICKER_TEMPLATES[0];
const params = buildDefaultStickerParams(template);
function setup(edit = false) {
  const source = { templateId: template.id, params };
  if (edit) useEditorStore.getState().addImageElement('/local-image/original.png', 1, source);
  const id = useEditorStore.getState().elements[0]?.id;
  const cancelledRef = { current: false };
  const onOpenChange = vi.fn();
  const hook = renderHook(
    ({ open }) =>
      useStickerInsertActions({
        open,
        editingElement: edit ? { id, source } : null,
        selectedTemplate: template,
        params,
        svgString: '<svg xmlns="http://www.w3.org/2000/svg"/>',
        exportableSvg: '',
        cancelledRef,
        onOpenChange,
      }),
    { initialProps: { open: true } },
  );
  return { ...hook, onOpenChange, id };
}

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().reset();
  useEditorStore.getState().setMode('single');
  vi.mocked(renderSvgToPngBlob).mockResolvedValue(new Blob(['png']));
  vi.mocked(uploadMediaBlob).mockResolvedValue({ imageSrc: '/local-image/sticker.png' });
});

describe('sticker insert attempt ownership', () => {
  it('does not upload a closed/reopened old raster or clear the newer attempt', async () => {
    const old = deferred<Blob>();
    const next = deferred<Blob>();
    vi.mocked(renderSvgToPngBlob)
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(next.promise);
    const view = setup();
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = view.result.current.handleInsertSingle();
    });
    view.rerender({ open: false });
    view.rerender({ open: true });
    act(() => {
      second = view.result.current.handleInsertSingle();
    });
    await act(async () => {
      old.resolve(new Blob(['old']));
      await first;
    });
    expect(uploadMediaBlob).not.toHaveBeenCalled();
    expect(view.result.current.isInserting).toBe(true);
    await act(async () => {
      next.resolve(new Blob(['next']));
      await second;
    });
    expect(useEditorStore.getState().elements).toHaveLength(1);
    expect(view.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('ignores upload completion after a new document opens', async () => {
    const pending = deferred<Awaited<ReturnType<typeof uploadMediaBlob>>>();
    vi.mocked(uploadMediaBlob).mockReturnValueOnce(pending.promise);
    const view = setup();
    let request!: Promise<void>;
    await act(async () => {
      request = view.result.current.handleInsertSingle();
    });
    useEditorStore.getState().reset();
    await act(async () => {
      pending.resolve({ imageSrc: '/local-image/old.png' });
      await request;
    });
    expect(useEditorStore.getState().elements).toHaveLength(0);
    expect(view.onOpenChange).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it.each(['deleted', 'locked', 'replaced'] as const)(
    'does not overwrite or recreate a %s re-edit target',
    async (change) => {
      const pending = deferred<Blob>();
      vi.mocked(renderSvgToPngBlob).mockReturnValueOnce(pending.promise);
      const view = setup(true);
      let request!: Promise<void>;
      act(() => {
        request = view.result.current.handleInsertSingle();
      });
      if (change === 'deleted') useEditorStore.setState({ elements: [] });
      else
        useEditorStore
          .getState()
          .updateElement(
            view.id,
            change === 'locked' ? { locked: true } : { imageSrc: '/local-image/replaced.png' },
          );
      const before = useEditorStore.getState().elements;
      await act(async () => {
        pending.resolve(new Blob(['png']));
        await request;
      });
      expect(useEditorStore.getState().elements).toBe(before);
      expect(view.onOpenChange).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    },
  );

  it('uses restored freeform dimensions for the re-edit aspect and keeps sheets independent', async () => {
    const view = setup(true);
    const width = useEditorStore.getState().elements[0].width;
    useEditorStore.setState({
      freeformCanvasWidth: 1000,
      freeformCanvasHeight: 1000,
      mode: 'collage',
      canvasWidth: 4000,
      canvasHeight: 1000,
    });
    await act(async () => {
      await view.result.current.handleInsertSingle();
    });
    expect(useEditorStore.getState().elements[0].height).toBeCloseTo(width / 2);
    await act(async () => {
      await view.result.current.handleInsertSheet();
    });
    expect(useEditorStore.getState().elements).toHaveLength(2);
    const sheet = useEditorStore.getState().elements[1];
    expect(sheet.type).toBe('image');
    if (sheet.type !== 'image') throw new Error('Expected an inserted sheet image');
    expect(sheet.stickerSource).toBeUndefined();
  });
});
