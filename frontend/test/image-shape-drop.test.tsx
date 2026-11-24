import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ElementMenuSection } from '../src/components/editor/canvas/context-menu/element-menu-section';
import { useImageDrop } from '../src/components/editor/canvas/use-image-drop';
import { CanvasDropTargetHighlight } from '../src/components/editor/konva/layers/konva-overlay-layer';
import {
  resetCanvasInteraction,
  useCanvasInteraction,
} from '../src/lib/canvas/canvas-interaction-store';
import { dispatchNativeImageDrop } from '../src/lib/canvas/native-image-drop';
import { useEditorStore } from '../src/lib/editor-store';
import type { CanvasElement, ShapeElement } from '../src/lib/store/types';
import type Konva from 'konva';

vi.mock('react-konva', () => ({
  Layer: ({ children, ...props }: Record<string, unknown>) => (
    <div data-konva="Layer" data-name={props.name ? String(props.name) : undefined}>
      {children as React.ReactNode}
    </div>
  ),
  Group: ({ children, name, listening }: Record<string, unknown>) => (
    <div
      data-konva="Group"
      data-name={name ? String(name) : undefined}
      data-listening={String(listening)}
    >
      {children as React.ReactNode}
    </div>
  ),
  Ellipse: (props: Record<string, unknown>) => (
    <div
      data-konva="Ellipse"
      data-listening={String(props.listening)}
      data-stroke-scale-enabled={String(props.strokeScaleEnabled)}
    />
  ),
  Path: (props: Record<string, unknown>) => (
    <div
      data-konva="Path"
      data-listening={String(props.listening)}
      data-stroke-scale-enabled={String(props.strokeScaleEnabled)}
      data-path={String(props.data ?? '')}
    />
  ),
  Rect: (props: Record<string, unknown>) => (
    <div
      data-konva="Rect"
      data-listening={String(props.listening)}
      data-stroke-scale-enabled={String(props.strokeScaleEnabled)}
    />
  ),
  Star: (props: Record<string, unknown>) => (
    <div
      data-konva="Star"
      data-listening={String(props.listening)}
      data-stroke-scale-enabled={String(props.strokeScaleEnabled)}
    />
  ),
  RegularPolygon: (props: Record<string, unknown>) => (
    <div
      data-konva="RegularPolygon"
      data-listening={String(props.listening)}
      data-stroke-scale-enabled={String(props.strokeScaleEnabled)}
    />
  ),
  Ring: (props: Record<string, unknown>) => (
    <div
      data-konva="Ring"
      data-listening={String(props.listening)}
      data-stroke-scale-enabled={String(props.strokeScaleEnabled)}
    />
  ),
  Arc: (props: Record<string, unknown>) => (
    <div
      data-konva="Arc"
      data-listening={String(props.listening)}
      data-stroke-scale-enabled={String(props.strokeScaleEnabled)}
    />
  ),
  Wedge: (props: Record<string, unknown>) => (
    <div
      data-konva="Wedge"
      data-listening={String(props.listening)}
      data-stroke-scale-enabled={String(props.strokeScaleEnabled)}
    />
  ),
}));

const mocks = vi.hoisted(() => ({
  stageRef: { current: null as Konva.Stage | null },
  upload: vi.fn(),
  dimensions: vi.fn(),
  measure: vi.fn(),
}));
vi.mock('@/lib/canvas/stage-context', () => ({ useStageRef: () => mocks.stageRef }));
vi.mock('@/lib/io/media-upload', () => ({ uploadMediaBlob: mocks.upload }));
vi.mock('@/lib/canvas/measure-image', () => ({ measureImageAspect: mocks.measure }));
vi.mock('@/lib/canvas/image-dimensions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/canvas/image-dimensions')>()),
  resolveBatchImageAspectRatios: mocks.dimensions,
}));

const originalMaskAction = useEditorStore.getState().maskSelectedImageWithShape;
function makeShape(patch: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: 'frame',
    type: 'shape',
    shape: 'ellipse',
    fill: '#123456',
    x: 0.1,
    y: 0.1,
    width: 0.6,
    height: 0.6,
    rotation: 45,
    opacity: 1,
    zIndex: 1,
    ...patch,
  };
}
function installStage(hitId: string | null, point = { x: 75, y: 100 }) {
  const root = { id: () => hitId || '' };
  const hit = hitId
    ? { findAncestor: (predicate: (node: unknown) => boolean) => (predicate(root) ? root : null) }
    : null;
  const getIntersection = vi.fn(() => hit);
  const setPointersPositions = vi.fn();
  mocks.stageRef.current = {
    setPointersPositions,
    getPointerPosition: () => point,
    getIntersection,
  } as unknown as Konva.Stage;
  return { setPointersPositions, getIntersection, point };
}
function dragOver(
  overrides: Partial<{
    clientX: number;
    clientY: number;
    types: string[];
    items: Array<{ kind: string; type: string }>;
  }> = {},
) {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    clientX: overrides.clientX ?? 500,
    clientY: overrides.clientY ?? 350,
    dataTransfer: {
      types: overrides.types ?? ['Files'],
      items: overrides.items ?? [{ kind: 'file', type: 'image/png' }],
      dropEffect: 'none',
    },
  } as unknown as React.DragEvent;
}
function drop(files = [new File(['photo'], 'photo.png', { type: 'image/png' })]) {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    clientX: 500,
    clientY: 350,
    dataTransfer: { files },
  } as unknown as React.DragEvent;
}
function seed(elements: CanvasElement[] = [makeShape()]) {
  useEditorStore.setState({ mode: 'single', elements });
  useEditorStore.getState().pushHistory();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetCanvasInteraction();
  useEditorStore.setState({ maskSelectedImageWithShape: originalMaskAction });
  useEditorStore.getState().reset();
  mocks.stageRef.current = null;
  mocks.measure.mockReset().mockResolvedValue(1.5);
  mocks.upload.mockImplementation(async (file: File) => ({
    imageSrc: `/local-image/${file.name}`,
  }));
  mocks.dimensions.mockImplementation(
    async (sources: string[]) => new Map(sources.map((source) => [source, 1.5])),
  );
});
afterEach(() => {
  resetCanvasInteraction();
  useEditorStore.setState({ maskSelectedImageWithShape: originalMaskAction });
  vi.restoreAllMocks();
});

describe('FF-04 browser shape drops', () => {
  it('uses the native Konva viewport hit and fills the frame in one undo step', async () => {
    const frame = makeShape();
    seed([frame]);
    const stage = installStage('frame');
    const initial = useEditorStore.getState().history.length;
    const { result } = renderHook(() => useImageDrop({ current: null }));
    await act(async () => {
      await result.current.handleDrop(drop());
    });
    expect(stage.setPointersPositions).toHaveBeenCalledWith({ clientX: 500, clientY: 350 });
    expect(stage.getIntersection).toHaveBeenCalledWith(stage.point);
    expect(useEditorStore.getState().elements).toHaveLength(1);
    expect(useEditorStore.getState().elements[0]).toMatchObject({
      ...frame,
      fillType: 'image',
      fillImageSrc: '/local-image/photo.png',
      fillImageFit: 'cover',
    });
    expect(useEditorStore.getState().history).toHaveLength(initial + 1);
    act(() => useEditorStore.getState().undo());
    expect(useEditorStore.getState().elements[0]).toEqual(frame);
  });

  it('does not turn a hole or native hit miss into a rectangular shape target', async () => {
    seed([makeShape({ shape: 'ring', innerRadius: 0.4 })]);
    installStage(null);
    const innerRef = {
      current: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }),
      } as HTMLDivElement,
    };
    const { result } = renderHook(() => useImageDrop(innerRef));
    await act(async () => {
      await result.current.handleDrop(drop());
    });
    expect(useEditorStore.getState().elements[0].fillImageSrc).toBeUndefined();
    expect(
      useEditorStore.getState().elements.filter((element) => element.type === 'image'),
    ).toHaveLength(1);
  });

  it.each(['image', 'locked', 'line', 'hidden'] as const)(
    'does not penetrate a topmost %s target',
    async (kind) => {
      const foreground: CanvasElement =
        kind === 'image'
          ? {
              id: 'front',
              type: 'image',
              imageSrc: '/local-image/front.png',
              x: 0,
              y: 0,
              width: 1,
              height: 1,
              opacity: 1,
              rotation: 0,
              zIndex: 2,
            }
          : makeShape({
              id: 'front',
              zIndex: 2,
              locked: kind === 'locked',
              shape: kind === 'line' ? 'line' : 'ellipse',
              visible: kind !== 'hidden',
            });
      seed([makeShape(), foreground]);
      installStage('front');
      const { result } = renderHook(() => useImageDrop({ current: null }));
      await act(async () => {
        await result.current.handleDrop(drop());
      });
      expect(useEditorStore.getState().elements[0].fillImageSrc).toBeUndefined();
    },
  );

  it.each([
    {
      files: ['failed.png', 'a.png', 'b.png', 'c.png'],
      overflow: ['/local-image/b.png', '/local-image/c.png'],
    },
    { files: ['a.png', 'b.png'], overflow: ['/local-image/b.png'] },
  ])(
    'fills the target with the first readable image, inserts overflow, and undoes all in one step ($overflow.length overflow)',
    async ({ files: fileNames, overflow }) => {
      seed();
      installStage('frame');
      mocks.upload.mockImplementation(async (file: File) => {
        if (file.name === 'failed.png') throw new Error('upload failed');
        return { imageSrc: `/local-image/${file.name}` };
      });
      vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (
        this: FileReader,
      ) {
        queueMicrotask(() => this.dispatchEvent(new ProgressEvent('error')));
      });
      const initialHistory = useEditorStore.getState().history.length;
      const { result } = renderHook(() => useImageDrop({ current: null }));
      const files = fileNames.map((name) => new File(['photo'], name, { type: 'image/png' }));
      await act(async () => {
        await result.current.handleDrop(drop(files));
      });
      const elements = useEditorStore.getState().elements;
      expect(elements.find((element) => element.id === 'frame')?.fillImageSrc).toBe(
        '/local-image/a.png',
      );
      expect(
        elements.filter((element) => element.type === 'image').map((element) => element.imageSrc),
      ).toEqual(overflow);
      expect(useEditorStore.getState().history).toHaveLength(initialHistory + 1);
      act(() => useEditorStore.getState().undo());
      const undone = useEditorStore.getState().elements;
      expect(undone.find((element) => element.id === 'frame')?.fillImageSrc).toBeUndefined();
      expect(undone.filter((element) => element.type === 'image')).toHaveLength(0);
    },
  );

  it.each([true, false])(
    'falls back to canvas image insertion when dropping onto a grouped shape (lockedSibling=%s)',
    async (lockedSibling) => {
      seed([
        makeShape({ id: 'behind', zIndex: 1 }),
        makeShape({ id: 'front', zIndex: 2, groupId: 'grp' }),
        makeShape({ id: 'sibling', zIndex: 3, groupId: 'grp', locked: lockedSibling, x: 0.8 }),
      ]);
      installStage('front');
      const { result } = renderHook(() => useImageDrop({ current: null }));
      await act(async () => {
        await result.current.handleDrop(drop());
      });
      const elements = useEditorStore.getState().elements;
      expect(elements.find((element) => element.id === 'front')?.fillImageSrc).toBeUndefined();
      expect(elements.find((element) => element.id === 'behind')?.fillImageSrc).toBeUndefined();
      expect(
        elements.filter((element) => element.type === 'image').map((element) => element.imageSrc),
      ).toEqual(['/local-image/photo.png']);
    },
  );

  it.each(['document', 'target', 'lock', 'group', 'dimensions', 'mode'] as const)(
    'rejects a stale %s while upload is pending',
    async (change) => {
      seed();
      installStage('frame');
      const upload = deferred<{ imageSrc: string }>();
      mocks.upload.mockReturnValue(upload.promise);
      const { result } = renderHook(() => useImageDrop({ current: null }));
      let pending!: Promise<void>;
      act(() => {
        pending = result.current.handleDrop(drop());
      });
      act(() => {
        const state = useEditorStore.getState();
        if (change === 'document') state.reset();
        else if (change === 'dimensions') state.setCanvasSize(800, 600);
        else if (change === 'mode') state.setMode('collage');
        else if (change === 'group') {
          useEditorStore.setState((current) => ({
            elements: [
              ...current.elements.map((el) => (el.id === 'frame' ? { ...el, groupId: 'grp' } : el)),
              makeShape({ id: 'sibling', groupId: 'grp', x: 0.8 }),
            ],
          }));
        } else state.updateElement('frame', change === 'lock' ? { locked: true } : { x: 0.2 });
      });
      const before = useEditorStore.getState().elements;
      await act(async () => {
        upload.resolve({ imageSrc: '/local-image/photo.png' });
        await pending;
      });
      expect(useEditorStore.getState().elements).toBe(before);
      expect(result.current.isLoading).toBe(false);
    },
  );

  it('rejects document switches while resolving source dimensions', async () => {
    seed();
    installStage('frame');
    const dimensions = deferred<Map<string, number>>();
    mocks.dimensions.mockReturnValue(dimensions.promise);
    const { result } = renderHook(() => useImageDrop({ current: null }));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.handleDrop(drop());
    });
    await waitFor(() => expect(mocks.dimensions).toHaveBeenCalled());
    act(() => useEditorStore.getState().reset());
    await act(async () => {
      dimensions.resolve(new Map());
      await pending;
    });
    expect(useEditorStore.getState().elements).toEqual([]);
  });

  it.each(['mode', 'dimensions'] as const)(
    'invalidates %s round-trips instead of accepting the old drop',
    async (change) => {
      seed();
      installStage('frame');
      const upload = deferred<{ imageSrc: string }>();
      mocks.upload.mockReturnValue(upload.promise);
      const { result } = renderHook(() => useImageDrop({ current: null }));
      let pending!: Promise<void>;
      act(() => {
        pending = result.current.handleDrop(drop());
      });
      const original = useEditorStore.getState();
      act(() => {
        if (change === 'mode') {
          original.setMode('collage');
          original.setMode('single');
        } else {
          original.setCanvasSize(800, 600);
          original.setCanvasSize(original.canvasWidth, original.canvasHeight);
        }
      });
      const before = useEditorStore.getState().elements;
      await act(async () => {
        upload.resolve({ imageSrc: '/local-image/photo.png' });
        await pending;
      });
      expect(useEditorStore.getState().elements).toBe(before);
    },
  );

  it('resets loading when disabled and does not revive cancelled work after re-enabling', async () => {
    seed();
    installStage('frame');
    const upload = deferred<{ imageSrc: string }>();
    mocks.upload.mockReturnValueOnce(upload.promise);
    const innerRef = { current: null };
    const { result, rerender } = renderHook(({ enabled }) => useImageDrop(innerRef, enabled), {
      initialProps: { enabled: true },
    });
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.handleDrop(drop());
    });
    expect(result.current.isLoading).toBe(true);
    rerender({ enabled: false });
    rerender({ enabled: true });
    expect(result.current.isLoading).toBe(false);
    await act(async () => {
      upload.resolve({ imageSrc: '/local-image/cancelled.png' });
      await pending;
    });
    expect(useEditorStore.getState().elements[0].fillImageSrc).toBeUndefined();
    await act(async () => {
      await result.current.handleDrop(drop());
    });
    expect(useEditorStore.getState().elements[0].fillImageSrc).toBe('/local-image/photo.png');
  });

  it('blocks print-mode drops and aborts uploads when the hook is unmounted', async () => {
    const print = renderHook(() => useImageDrop({ current: null }, false));
    await act(async () => {
      await print.result.current.handleDrop(drop());
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    print.unmount();
    const upload = deferred<{ imageSrc: string }>();
    mocks.upload.mockReturnValue(upload.promise);
    const editor = renderHook(() => useImageDrop({ current: null }));
    let pending!: Promise<void>;
    act(() => {
      pending = editor.result.current.handleDrop(drop());
    });
    const signal = mocks.upload.mock.calls[0][2] as AbortSignal;
    editor.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      upload.resolve({ imageSrc: '/local-image/photo.png' });
      await pending;
    });
    expect(useEditorStore.getState().elements).toEqual([]);
  });
});

describe('FF-04 correlated native canvas drops', () => {
  it.each([false, true])(
    'preserves concurrent collage imports (same target: %s)',
    async (sameTarget) => {
      useEditorStore.getState().setMode('collage');
      useEditorStore.setState({
        slots: [
          { id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.5, h: 1 },
          { id: 'b', cellIndex: 1, x: 0.5, y: 0, w: 0.5, h: 1 },
        ],
        collagePendingImages: [],
      });
      const slow = deferred<Map<string, number>>();
      mocks.dimensions.mockImplementation((sources: string[]) =>
        sources[0] === '/local-image/slow.png'
          ? slow.promise
          : Promise.resolve(new Map(sources.map((source) => [source, 1.5]))),
      );
      installStage('slot-a');
      const { result } = renderHook(() => useImageDrop({ current: null }));
      act(() => {
        dispatchNativeImageDrop({ phase: 'start', dropId: 'slow', x: 100, y: 100 });
      });
      installStage(sameTarget ? 'slot-a' : 'slot-b');
      act(() => {
        dispatchNativeImageDrop({ phase: 'start', dropId: 'fast', x: 200, y: 100 });
      });
      act(() => {
        dispatchNativeImageDrop({
          phase: 'complete',
          dropId: 'slow',
          images: ['/local-image/slow.png'],
        });
      });
      await act(async () => {
        dispatchNativeImageDrop({
          phase: 'complete',
          dropId: 'fast',
          images: ['/local-image/fast.png'],
        });
      });
      expect(result.current.isLoading).toBe(true);
      await act(async () => {
        slow.resolve(new Map([['/local-image/slow.png', 1.5]]));
      });
      const state = useEditorStore.getState();
      expect(state.slots.find((slot) => slot.id === (sameTarget ? 'a' : 'b'))?.imageSrc).toBe(
        '/local-image/fast.png',
      );
      if (sameTarget) expect(state.collagePendingImages).toEqual(['/local-image/slow.png']);
      else {
        expect(state.slots.find((slot) => slot.id === 'a')?.imageSrc).toBe('/local-image/slow.png');
        expect(state.collagePendingImages).toEqual([]);
      }
      expect(result.current.isLoading).toBe(false);
    },
  );
  it('uses the start target rather than re-hitting on completion, and ignores duplicate completion', async () => {
    seed([makeShape(), makeShape({ id: 'other', x: 0.8 })]);
    const stage = installStage('frame');
    renderHook(() => useImageDrop({ current: null }));
    act(() => {
      dispatchNativeImageDrop({ phase: 'start', dropId: 'native-1', x: 500, y: 350 });
    });
    stage.getIntersection.mockReturnValue(null);
    await act(async () => {
      dispatchNativeImageDrop({
        phase: 'complete',
        dropId: 'native-1',
        images: ['/local-image/native.png'],
      });
    });
    expect(
      useEditorStore.getState().elements.find((element) => element.id === 'frame')?.fillImageSrc,
    ).toBe('/local-image/native.png');
    expect(stage.getIntersection).toHaveBeenCalledTimes(1);
    const history = useEditorStore.getState().history.length;
    await act(async () => {
      dispatchNativeImageDrop({
        phase: 'complete',
        dropId: 'native-1',
        images: ['/local-image/native.png'],
      });
    });
    expect(useEditorStore.getState().history).toHaveLength(history);
  });

  it('rejects late native completions after a document switch', async () => {
    seed();
    installStage('frame');
    const { result } = renderHook(() => useImageDrop({ current: null }));
    act(() => {
      dispatchNativeImageDrop({ phase: 'start', dropId: 'old', x: 500, y: 350 });
    });
    expect(result.current.isLoading).toBe(true);
    act(() => useEditorStore.getState().reset());
    await act(async () => {
      dispatchNativeImageDrop({
        phase: 'complete',
        dropId: 'old',
        images: ['/local-image/old.png'],
      });
    });
    expect(useEditorStore.getState().elements).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps loading owned until all native requests finish, including failures', async () => {
    seed();
    installStage(null);
    const { result } = renderHook(() => useImageDrop({ current: null }));
    act(() => {
      dispatchNativeImageDrop({ phase: 'start', dropId: 'a' });
      dispatchNativeImageDrop({ phase: 'start', dropId: 'b' });
    });
    await act(async () => {
      dispatchNativeImageDrop({ phase: 'complete', dropId: 'a', images: [] });
    });
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      dispatchNativeImageDrop({ phase: 'complete', dropId: 'b', images: [] });
    });
    expect(result.current.isLoading).toBe(false);
  });
});

describe('FF-04 collage import ownership', () => {
  it('keeps newer target edits and sends a rejected replacement to overflow after its internal measurement await', async () => {
    useEditorStore.getState().setMode('collage');
    useEditorStore.setState({
      slots: [
        {
          id: 'a',
          cellIndex: 0,
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          imageSrc: '/local-image/old.png',
          brightness: 100,
        },
      ],
      collagePendingImages: [],
    });
    const measure = deferred<number>();
    mocks.measure.mockImplementation((src: string) =>
      src === '/local-image/old.png' ? measure.promise : Promise.resolve(1.5),
    );
    installStage('slot-a');
    const { result } = renderHook(() => useImageDrop({ current: null }));
    act(() => {
      dispatchNativeImageDrop({ phase: 'start', dropId: 'edit-race', x: 100, y: 100 });
    });
    act(() => {
      dispatchNativeImageDrop({
        phase: 'complete',
        dropId: 'edit-race',
        images: ['/local-image/new.png'],
      });
    });
    await waitFor(() => expect(mocks.measure).toHaveBeenCalledTimes(2));
    act(() =>
      useEditorStore.setState((state) => ({
        slots: state.slots.map((slot) => ({ ...slot, brightness: 150 })),
      })),
    );
    const edited = useEditorStore.getState().slots[0];
    await act(async () => {
      measure.resolve(1.5);
    });
    expect(useEditorStore.getState().slots[0]).toBe(edited);
    expect(useEditorStore.getState().slots[0].imageSrc).toBe('/local-image/old.png');
    expect(useEditorStore.getState().collagePendingImages).toEqual(['/local-image/new.png']);
    expect(result.current.isLoading).toBe(false);
  });
  it('checks the receipt guard before the batch commit and preserves assignments, overflow and history on cancellation', async () => {
    useEditorStore.getState().setMode('collage');
    useEditorStore.setState({
      slots: [{ id: 'cell', cellIndex: 0, x: 0, y: 0, w: 1, h: 1 }],
      collagePendingImages: [],
    });
    const before = useEditorStore.getState();
    const isActive = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await act(async () => {
      await before.setSlotImagesBatch(
        [{ slotId: 'cell', src: '/local-image/cell.png' }],
        '/local-image/cell.png',
        ['/local-image/overflow.png'],
        isActive,
      );
    });
    expect(isActive).toHaveBeenCalledTimes(2);
    expect(useEditorStore.getState().slots).toBe(before.slots);
    expect(useEditorStore.getState().collagePendingImages).toBe(before.collagePendingImages);
    expect(useEditorStore.getState().history).toBe(before.history);
  });
});

describe('FF-04 contextual image/shape action', () => {
  it.each(['frame', 'photo'])(
    'offers the action when right-clicking %s and does not wrap a second history step',
    async (targetId) => {
      const photo: CanvasElement = {
        id: 'photo',
        type: 'image',
        imageSrc: '/local-image/photo.png',
        x: 0,
        y: 0,
        width: 0.5,
        height: 0.5,
        rotation: 0,
        opacity: 1,
        zIndex: 2,
      };
      seed([makeShape(), photo]);
      useEditorStore.getState().setSelectedIds(['frame', 'photo']);
      const action = vi.fn(async () => 'ok' as const);
      useEditorStore.setState({ maskSelectedImageWithShape: action });
      const onClose = vi.fn();
      const handleAction = vi.fn();
      render(
        <ElementMenuSection
          targetId={targetId}
          onClose={onClose}
          handleAction={handleAction}
          setCropTarget={vi.fn()}
          isRemovingBg={false}
          isEnhancing={false}
          handleRemoveBg={vi.fn()}
          handleEnhance={vi.fn()}
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getByRole('menuitem', { name: 'قنّع الصورة بهذا الشكل' }));
      });
      await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
      expect(handleAction).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  it('does not expose the action for locked or partial-group selections', () => {
    const photo: CanvasElement = {
      id: 'photo',
      type: 'image',
      imageSrc: '/local-image/photo.png',
      x: 0,
      y: 0,
      width: 0.5,
      height: 0.5,
      rotation: 0,
      opacity: 1,
      zIndex: 2,
      locked: true,
    };
    seed([makeShape(), photo]);
    useEditorStore.getState().setSelectedIds(['frame', 'photo']);
    render(
      <ElementMenuSection
        targetId="frame"
        onClose={vi.fn()}
        handleAction={vi.fn()}
        setCropTarget={vi.fn()}
        isRemovingBg={false}
        isEnhancing={false}
        handleRemoveBg={vi.fn()}
        handleEnhance={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('menuitem', { name: 'قنّع الصورة بهذا الشكل' }),
    ).not.toBeInTheDocument();
  });
});

describe('FF-04 dragOver target highlight lifecycle and overlay rendering', () => {
  it('tracks fillable hovered shapes on dragOver and clears on invalid targets, dragLeave, drop, native start, window events, disable and unmount', async () => {
    seed([
      makeShape(),
      makeShape({ id: 'line-shape', shape: 'line' }),
      makeShape({ id: 'locked-shape', locked: true }),
      makeShape({ id: 'grouped-shape', groupId: 'grp' }),
      makeShape({ id: 'grouped-sibling', groupId: 'grp', x: 0.8 }),
    ]);
    installStage('frame');
    const { result, rerender, unmount } = renderHook(
      ({ enabled }) => useImageDrop({ current: null }, enabled),
      {
        initialProps: { enabled: true },
      },
    );

    act(() => result.current.handleDragOver(dragOver()));
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBe('frame');

    act(() =>
      result.current.handleDragOver(dragOver({ items: [{ kind: 'file', type: 'text/plain' }] })),
    );
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBeNull();

    for (const badId of ['line-shape', 'locked-shape', 'grouped-shape', null] as const) {
      act(() => result.current.handleDragOver(dragOver()));
      expect(useCanvasInteraction.getState().dropTargetShapeId).toBe('frame');
      installStage(badId);
      act(() => result.current.handleDragOver(dragOver()));
      expect(useCanvasInteraction.getState().dropTargetShapeId).toBeNull();
      installStage('frame');
    }

    act(() => result.current.handleDragOver(dragOver()));
    act(() => useEditorStore.getState().setMode('collage'));
    act(() => result.current.handleDragOver(dragOver()));
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBeNull();
    act(() => useEditorStore.getState().setMode('single'));

    // Child-node dragLeave must not clear the highlight; leaving the viewport container must clear it.
    const container = document.createElement('div');
    const child = document.createElement('div');
    const outside = document.createElement('div');
    container.appendChild(child);

    act(() => result.current.handleDragOver(dragOver()));
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBe('frame');
    act(() =>
      result.current.handleDragLeave({
        currentTarget: container,
        relatedTarget: child,
      } as unknown as React.DragEvent),
    );
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBe('frame');
    act(() =>
      result.current.handleDragLeave({
        currentTarget: container,
        relatedTarget: outside,
      } as unknown as React.DragEvent),
    );
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBeNull();

    // Clearing via drop, native drop start, window dragend/blur, disable, and unmount.
    act(() => result.current.handleDragOver(dragOver()));
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBe('frame');
    await act(async () => {
      await result.current.handleDrop(
        drop([new File(['text'], 'notes.txt', { type: 'text/plain' })]),
      );
    });
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBeNull();

    act(() => result.current.handleDragOver(dragOver()));
    act(() => {
      dispatchNativeImageDrop({ phase: 'start', dropId: 'clear-on-native' });
      dispatchNativeImageDrop({ phase: 'complete', dropId: 'clear-on-native', images: [] });
    });
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBeNull();

    for (const eventName of ['dragend', 'blur'] as const) {
      act(() => result.current.handleDragOver(dragOver()));
      expect(useCanvasInteraction.getState().dropTargetShapeId).toBe('frame');
      act(() => {
        window.dispatchEvent(new Event(eventName));
      });
      expect(useCanvasInteraction.getState().dropTargetShapeId).toBeNull();
    }

    act(() => result.current.handleDragOver(dragOver()));
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBe('frame');
    rerender({ enabled: false });
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBeNull();

    rerender({ enabled: true });
    act(() => result.current.handleDragOver(dragOver()));
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBe('frame');
    unmount();
    expect(useCanvasInteraction.getState().dropTargetShapeId).toBeNull();
  });

  it('renders non-listening scaled-stroke CanvasDropTargetHighlight for ellipse/path/rect and nothing when invalid', () => {
    seed([
      makeShape({ id: 'ellipse-target', shape: 'ellipse' }),
      makeShape({ id: 'path-target', shape: 'path', svgPath: 'M0 0 L10 0 L10 10 Z' }),
      makeShape({ id: 'rect-target', shape: 'rect', radius: 12 }),
      makeShape({ id: 'locked-target', locked: true }),
      makeShape({ id: 'grouped-target', groupId: 'grp' }),
      makeShape({ id: 'grouped-sibling', groupId: 'grp', x: 0.8 }),
    ]);

    const { container } = render(<CanvasDropTargetHighlight />);
    expect(container.firstChild).toBeNull();

    for (const [id, expectedShape] of [
      ['ellipse-target', 'Ellipse'],
      ['path-target', 'Path'],
      ['rect-target', 'Rect'],
    ] as const) {
      act(() => useCanvasInteraction.getState().setDropTargetShapeId(id));
      const group = container.querySelector('[data-name="drop-target-highlight"]');
      const primitive = container.querySelector(`[data-konva="${expectedShape}"]`);
      expect(group).toHaveAttribute('data-listening', 'false');
      expect(primitive).toHaveAttribute('data-listening', 'false');
      expect(primitive).toHaveAttribute('data-stroke-scale-enabled', 'false');
    }

    for (const invalidId of ['missing-target', 'locked-target', 'grouped-target', null]) {
      act(() => useCanvasInteraction.getState().setDropTargetShapeId(invalidId));
      expect(container.firstChild).toBeNull();
    }
  });
});
