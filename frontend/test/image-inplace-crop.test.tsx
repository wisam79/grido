import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import Konva from 'konva';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageCropOverlay } from '../src/components/editor/canvas/image-crop-overlay';
import { URLImage } from '../src/components/editor/konva/elements/image-node';
import { useKeyboardShortcuts } from '../src/hooks/use-keyboard-shortcuts';
import {
  resetCanvasInteraction,
  useCanvasInteraction,
} from '../src/lib/canvas/canvas-interaction-store';
import { getDisplayImage } from '../src/lib/canvas/display-image';
import { setCachedImageDimensions } from '../src/lib/canvas/image-dimensions';
import { captureStageBlob } from '../src/lib/canvas/konva-export-utils';
import { useEditorStore } from '../src/lib/editor-store';
import { renderFittedBranch } from '../src/lib/export/export-canvas-fitted';
import {
  clampImageCropPan,
  clampImageCropZoom,
  computeImageCrop,
  drawImageCover,
  hasCustomImageCrop,
  normalizeImageCropFraming,
  panImageCropByDelta,
} from '../src/lib/export/export-primitives';
import { runFreeformPreflight } from '../src/lib/export/freeform-preflight';
import { buildSingleComposition } from '../src/lib/print/single-print-composition';
import { CanvasElementSchema, parseSanitizedCanvasElements } from '../src/lib/schema';

import type { ElementProps } from '../src/components/editor/konva/elements/types';
import type { ImageElement } from '../src/lib/store/types';

const konvaRendered = vi.hoisted(() => ({
  source: null as HTMLImageElement | null,
  imageProps: {} as Record<string, unknown>,
  node: null as unknown,
}));

vi.mock('@/hooks/use-async-image', () => ({ useAsyncImage: () => [konvaRendered.source] }));
vi.mock('@/hooks/use-display-image', () => ({
  useDisplayImage: (image: HTMLImageElement) => getDisplayImage(image),
}));
vi.mock('@/hooks/use-sticker-display-raster', () => ({ useStickerDisplayRaster: () => null }));
vi.mock('@/hooks/use-filter-cache', () => ({ useFilterCache: () => vi.fn() }));
vi.mock('@/hooks/use-konva-drag', () => ({
  useKonvaDrag: () => ({ onDragStart: vi.fn(), onDragEnd: vi.fn() }),
}));
vi.mock('react-konva', () => ({
  Group: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Rect: () => null,
  Shape: () => null,
  Image: (props: Record<string, unknown>) => {
    konvaRendered.imageProps = props;
    const ref = props.ref as React.RefObject<unknown>;
    ref.current = konvaRendered.node;
    return null;
  },
}));

class MockLoadedImage {
  naturalWidth = 4096;
  naturalHeight = 2048;
  width = 4096;
  height = 2048;
  complete = true;
  crossOrigin: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  set src(value: string) {
    this._src = value;
    if (value) queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
}

function makeImageElement(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: 'img-1',
    type: 'image',
    imageSrc: '/local-image/portrait.png',
    x: 0.1,
    y: 0.1,
    width: 0.5,
    height: 0.5,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    visible: true,
    ...overrides,
  };
}

let stage: Konva.Stage | undefined;
let paints: Array<{ canvas: HTMLCanvasElement; args: unknown[] }>;

beforeEach(() => {
  vi.clearAllMocks();
  paints = [];
  konvaRendered.imageProps = {};
  konvaRendered.node = null;
  resetCanvasInteraction();
  useEditorStore.getState().reset();
  vi.stubGlobal('Image', MockLoadedImage);

  const source = new Image();
  Object.defineProperties(source, {
    naturalWidth: { value: 4096 },
    naturalHeight: { value: 2048 },
    width: { value: 4096 },
    height: { value: 2048 },
    complete: { value: true },
  });
  konvaRendered.source = source;

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    const canvas = this;
    return new Proxy(
      {
        canvas,
        getImageData: () => ({ data: new Uint8ClampedArray(400).fill(40) }),
        drawImage: (...args: unknown[]) => paints.push({ canvas, args }),
      },
      { get: (target, key) => Reflect.get(target, key) ?? (() => {}) },
    ) as unknown as CanvasRenderingContext2D;
  });
});

afterEach(() => {
  stage?.destroy();
  stage = undefined;
  resetCanvasInteraction();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('FF-02 shared crop framing math & scale invariance', () => {
  it('computes default cover window identically at cropZoom=1 and centered pan', () => {
    const crop = computeImageCrop({ width: 4000, height: 1000 }, 1000, 1000);
    expect(crop).toEqual({ sx: 1500, sy: 0, sw: 1000, sh: 1000 });
  });

  it('keeps zoomed and panned crop windows strictly within image bounds', () => {
    const img = { width: 4000, height: 2000 };
    for (const cropPanX of [-1, 0, 1]) {
      for (const cropPanY of [-1, 0, 1]) {
        const crop = computeImageCrop(img, 1000, 1000, { cropZoom: 2, cropPanX, cropPanY });
        expect(crop.sw).toBeCloseTo(1000, 6);
        expect(crop.sh).toBeCloseTo(1000, 6);
        expect(crop.sx).toBeGreaterThanOrEqual(0);
        expect(crop.sy).toBeGreaterThanOrEqual(0);
        expect(crop.sx + crop.sw).toBeLessThanOrEqual(img.width + 1e-6);
        expect(crop.sy + crop.sh).toBeLessThanOrEqual(img.height + 1e-6);
      }
    }
  });

  it('guarantees 2x full-resolution scale invariance between 2048px proxy and 4096px original', () => {
    const framing = { cropZoom: 2.25, cropPanX: 0.4, cropPanY: -0.6 };
    const proxy = computeImageCrop({ width: 2048, height: 1024 }, 1200, 600, framing);
    const full = computeImageCrop({ width: 4096, height: 2048 }, 1200, 600, framing);
    expect(full.sx).toBeCloseTo(proxy.sx * 2, 6);
    expect(full.sy).toBeCloseTo(proxy.sy * 2, 6);
    expect(full.sw).toBeCloseTo(proxy.sw * 2, 6);
    expect(full.sh).toBeCloseTo(proxy.sh * 2, 6);
  });

  it('clamps out-of-range values and normalizes default framing away', () => {
    expect(clampImageCropZoom(undefined)).toBe(1);
    expect(clampImageCropZoom(0.2)).toBe(1);
    expect(clampImageCropZoom(12)).toBe(4);
    expect(clampImageCropPan(Number.NaN)).toBe(0);
    expect(clampImageCropPan(-5)).toBe(-1);
    expect(clampImageCropPan(5)).toBe(1);

    expect(hasCustomImageCrop({ cropZoom: 1, cropPanX: 0, cropPanY: 0 })).toBe(false);
    expect(hasCustomImageCrop({ cropZoom: 1.2 })).toBe(true);
    expect(normalizeImageCropFraming({ cropZoom: 1, cropPanX: 0, cropPanY: 0 })).toEqual({
      cropZoom: undefined,
      cropPanX: undefined,
      cropPanY: undefined,
    });
  });

  it('pans correctly across unrotated, 90-degree rotated, and flipped elements with edge clamping', () => {
    const img = { width: 2000, height: 2000 };
    const base = { cropZoom: 2, cropPanX: 0, cropPanY: 0 };

    // Dragging right (dxPaper > 0) shifts crop window left (cropPanX < 0)
    const unrotated = panImageCropByDelta({
      img,
      boxW: 500,
      boxH: 500,
      framing: base,
      dxPaper: 125,
      dyPaper: 0,
    });
    expect(unrotated.cropPanX).toBeCloseTo(-0.5, 6);
    expect(unrotated.cropPanY).toBeCloseTo(0, 6);

    // 90-degree clockwise rotation maps +dxPaper to -dyLocal -> +cropPanY
    const rotated = panImageCropByDelta({
      img,
      boxW: 500,
      boxH: 500,
      framing: base,
      dxPaper: 125,
      dyPaper: 0,
      rotation: 90,
    });
    expect(rotated.cropPanX).toBeCloseTo(0, 6);
    expect(rotated.cropPanY).toBeCloseTo(0.5, 6);

    // FlipX reverses horizontal drag response
    const flipped = panImageCropByDelta({
      img,
      boxW: 500,
      boxH: 500,
      framing: base,
      dxPaper: 125,
      dyPaper: 0,
      flipX: true,
    });
    expect(flipped.cropPanX).toBeCloseTo(0.5, 6);

    // Extreme delta clamps cleanly to [-1, 1]
    const extreme = panImageCropByDelta({
      img,
      boxW: 500,
      boxH: 500,
      framing: base,
      dxPaper: 99999,
      dyPaper: -99999,
    });
    expect(extreme).toEqual({ cropPanX: -1, cropPanY: 1 });
  });

  it('validates, clamps, and sanitizes crop fields in schema and clipboard ingestion', () => {
    const valid = CanvasElementSchema.parse(
      makeImageElement({ cropZoom: 2.5, cropPanX: -0.4, cropPanY: 0.7 }),
    );
    expect(valid.cropZoom).toBe(2.5);
    expect(valid.cropPanX).toBe(-0.4);
    expect(valid.cropPanY).toBe(0.7);

    const clamped = parseSanitizedCanvasElements([
      makeImageElement({ cropZoom: 99, cropPanX: -9, cropPanY: 9 }),
    ]);
    expect(clamped?.[0]).toMatchObject({ cropZoom: 4, cropPanX: -1, cropPanY: 1 });

    expect(() => CanvasElementSchema.parse(makeImageElement({ cropZoom: Number.NaN }))).toThrow();
    expect(() =>
      CanvasElementSchema.parse(makeImageElement({ cropPanX: Number.POSITIVE_INFINITY })),
    ).toThrow();
  });
});

describe('FF-02 geometric parity across Konva, 300+ DPI capture, export, preflight, and print', () => {
  it('matches Konva URLImage crop, full-res capture scaling, drawImageCover, and renderFittedBranch', async () => {
    const el = makeImageElement({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      cropZoom: 2,
      cropPanX: 0.5,
      cropPanY: -0.5,
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    stage = new Konva.Stage({ container, width: 1200, height: 600 });
    const layer = new Konva.Layer();
    const node = new Konva.Image();
    stage.add(layer);
    layer.add(node);
    vi.spyOn(stage, 'batchDraw').mockReturnValue(stage);
    vi.spyOn(layer, 'batchDraw').mockReturnValue(layer);
    konvaRendered.node = node;

    const props: ElementProps = {
      element: el,
      isSelected: true,
      canvasWidth: 1200,
      canvasHeight: 600,
      elementRef: { current: null },
      onMouseDown: vi.fn(),
      onTouchStart: vi.fn(),
      onClick: vi.fn(),
      onTap: vi.fn(),
      onChange: vi.fn(),
      allElements: [el],
      setActiveGuides: vi.fn(),
      altPressedRef: { current: false },
      getKonvaNode: () => null,
    };

    const view = render(<URLImage {...props} />);
    node.setAttrs(konvaRendered.imageProps as Konva.ImageConfig);

    // Display proxy is 2048x1024 (from 4096x2048 via display-image.ts)
    const expectedProxy = computeImageCrop({ width: 2048, height: 1024 }, 1200, 600, el);
    expect(konvaRendered.imageProps.cropX).toBe(Math.round(expectedProxy.sx));
    expect(konvaRendered.imageProps.cropY).toBe(Math.round(expectedProxy.sy));
    expect(konvaRendered.imageProps.cropWidth).toBe(Math.round(expectedProxy.sw));
    expect(konvaRendered.imageProps.cropHeight).toBe(Math.round(expectedProxy.sh));

    // drawImageCover uses identical source rectangle
    const directCanvas = document.createElement('canvas');
    const directCtx = directCanvas.getContext('2d')!;
    const fullImg = konvaRendered.source!;
    drawImageCover(directCtx, fullImg, 0, 0, 1200, 600, el);
    const expectedFull = computeImageCrop({ width: 4096, height: 2048 }, 1200, 600, el);
    expect(paints.at(-1)?.args).toEqual([
      fullImg,
      expectedFull.sx,
      expectedFull.sy,
      expectedFull.sw,
      expectedFull.sh,
      0,
      0,
      1200,
      600,
    ]);

    // renderFittedBranch forwards element crop framing into drawImageCover
    paints = [];
    const fittedCanvas = document.createElement('canvas');
    const fittedCtx = fittedCanvas.getContext('2d')!;
    await renderFittedBranch(fittedCtx, [el], 1200, 600);
    const fittedDraw = paints.find(
      (p) => p.args.length === 9 && p.args[5] === 0 && p.args[7] === 1200,
    );
    expect(fittedDraw?.args.slice(1)).toEqual([
      expectedFull.sx,
      expectedFull.sy,
      expectedFull.sw,
      expectedFull.sh,
      0,
      0,
      1200,
      600,
    ]);

    // High-DPI capture upgrades to 4096x2048 original and scales crop by 2x
    vi.spyOn(stage, 'toCanvas').mockImplementation(() => {
      expect(node.image()).toBe(fullImg);
      expect(node.cropX()).toBe(Math.round(expectedFull.sx));
      expect(node.cropY()).toBe(Math.round(expectedFull.sy));
      expect(node.cropWidth()).toBe(Math.round(expectedFull.sw));
      expect(node.cropHeight()).toBe(Math.round(expectedFull.sh));
      const c = document.createElement('canvas');
      c.toBlob = (cb) => cb(new Blob(['ok']));
      return c;
    });

    const blob = await captureStageBlob(stage, 2, 'image/png', undefined, undefined, {
      useFullResolution: true,
    });
    expect(blob).toBeInstanceOf(Blob);

    view.unmount();
    container.remove();
  });

  it('accounts for cropZoom in runFreeformPreflight effective DPI checks', () => {
    const img = { width: 3000, height: 3000 };
    const unzoomed = makeImageElement({ x: 0, y: 0, width: 1, height: 1 });
    const zoomed = makeImageElement({ x: 0, y: 0, width: 1, height: 1, cropZoom: 2 });

    const okResult = runFreeformPreflight({
      elements: [unzoomed],
      canvasWidthMM: 254,
      canvasHeightMM: 254,
      canvasWidthPx: 1000,
      canvasHeightPx: 1000,
      imageDimensions: new Map([[unzoomed.imageSrc, img]]),
      minDpi: 250,
    });
    expect(okResult).toEqual({ blocking: [], warnings: [] });

    // cropZoom=2 shrinks source window to 1500x1500 over 10in -> 150DPI warning
    const warnResult = runFreeformPreflight({
      elements: [zoomed],
      canvasWidthMM: 254,
      canvasHeightMM: 254,
      canvasWidthPx: 1000,
      canvasHeightPx: 1000,
      imageDimensions: new Map([[zoomed.imageSrc, img]]),
      minDpi: 250,
    });
    expect(warnResult.blocking).toEqual([]);
    expect(warnResult.warnings).toHaveLength(1);
    expect(warnResult.warnings[0].kind).toBe('low-resolution');
    expect(warnResult.warnings[0].message).toContain('150DPI');
  });

  it('routes custom-cropped images away from Go single fast path to Konva capture', () => {
    const baseInput = {
      canvasWidth: 1240,
      canvasHeight: 1754,
      canvasWidthMM: 101.6,
      canvasHeightMM: 152.4,
      backgroundColor: '#FFFFFF',
    };

    expect(
      buildSingleComposition({
        ...baseInput,
        elements: [makeImageElement()],
      }).eligible,
    ).toBe(true);

    const customRes = buildSingleComposition({
      ...baseInput,
      elements: [makeImageElement({ cropZoom: 1.5, cropPanX: 0.2 })],
    });
    expect(customRes.eligible).toBe(false);
    expect(customRes.reason).toContain('كادر');
  });
});

describe('FF-02 ImageCropOverlay interaction, single-step undo, and Escape cancel', () => {
  function seedAndRenderOverlay(initialElement?: Partial<ImageElement>) {
    const el = makeImageElement({
      imageSrc: '/local-image/crop-live.png',
      x: 0.1,
      y: 0.1,
      width: 0.5,
      height: 0.5,
      ...initialElement,
    });
    setCachedImageDimensions(el.imageSrc, 4096, 2048);
    useEditorStore.setState({
      mode: 'single',
      canvasWidth: 1000,
      canvasHeight: 1000,
      elements: [el],
      selectedId: el.id,
      selectedIds: [el.id],
      history: [],
      historyIndex: -1,
    });
    useEditorStore.getState().pushHistory();
    useCanvasInteraction.getState().setCroppingElementId(el.id);

    function Harness() {
      const croppingId = useCanvasInteraction((s) => s.croppingElementId);
      const elements = useEditorStore((s) => s.elements);
      const updateElement = useEditorStore((s) => s.updateElement);
      const pushHistory = useEditorStore((s) => s.pushHistory);
      return (
        <div id="canvas-area">
          <ImageCropOverlay
            printMode={false}
            croppingElementId={croppingId}
            elements={elements}
            displayW={1000}
            displayH={1000}
            canvasWidth={1000}
            canvasHeight={1000}
            updateElement={updateElement}
            pushHistory={pushHistory}
            onOpenAdvancedCrop={vi.fn()}
          />
        </div>
      );
    }

    const view = render(<Harness />);
    return { el, view };
  }

  it('commits live drag and zoom changes in a single Ctrl+Z history step without altering imageSrc', () => {
    const { el } = seedAndRenderOverlay();
    const frame = screen.getByTestId('image-crop-overlay');
    const zoomInBtn = screen.getByRole('button', { name: 'تكبير الكادر' });

    fireEvent.click(zoomInBtn);
    expect((useEditorStore.getState().elements[0] as ImageElement).cropZoom).toBeCloseTo(1.25, 4);
    expect(useEditorStore.getState().history).toHaveLength(1);

    fireEvent.pointerDown(frame, { button: 0, pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 260, clientY: 180 });
    fireEvent.pointerUp(frame, { pointerId: 1, clientX: 260, clientY: 180 });

    const liveAfterDrag = useEditorStore.getState().elements[0] as ImageElement;
    expect(liveAfterDrag.cropPanX).not.toBeUndefined();
    expect(useEditorStore.getState().history).toHaveLength(1);

    // Commit via Enter key
    fireEvent.keyDown(frame, { key: 'Enter' });

    expect(useCanvasInteraction.getState().croppingElementId).toBeNull();
    expect(screen.queryByTestId('image-crop-overlay')).not.toBeInTheDocument();
    expect(useEditorStore.getState().history).toHaveLength(2);

    const committed = useEditorStore.getState().elements[0] as ImageElement;
    expect(committed.imageSrc).toBe(el.imageSrc);
    expect(committed.cropZoom).toBeCloseTo(1.25, 4);

    // Single Ctrl+Z reverts framing non-destructively
    act(() => useEditorStore.getState().undo());
    const undone = useEditorStore.getState().elements[0] as ImageElement;
    expect(undone.imageSrc).toBe(el.imageSrc);
    expect(undone.cropZoom).toBeUndefined();
    expect(undone.cropPanX).toBeUndefined();
    expect(undone.cropPanY).toBeUndefined();
  });

  it('cancels uncommitted drag/zoom cleanly on Escape with zero history entries and preserves selection', () => {
    seedAndRenderOverlay({ cropZoom: 1.5, cropPanX: 0.25, cropPanY: -0.25 });
    const frame = screen.getByTestId('image-crop-overlay');

    fireEvent.click(screen.getByRole('button', { name: 'تكبير الكادر' }));
    expect((useEditorStore.getState().elements[0] as ImageElement).cropZoom).toBeCloseTo(1.75, 4);

    fireEvent.keyDown(frame, { key: 'Escape' });

    expect(useCanvasInteraction.getState().croppingElementId).toBeNull();
    expect(useEditorStore.getState().history).toHaveLength(1);
    const reverted = useEditorStore.getState().elements[0] as ImageElement;
    expect(reverted.cropZoom).toBe(1.5);
    expect(reverted.cropPanX).toBe(0.25);
    expect(reverted.cropPanY).toBe(-0.25);
    expect(useEditorStore.getState().selectedIds).toEqual(['img-1']);
  });

  it('pushes zero history when pressing Enter with unchanged framing, and supports reset button', () => {
    seedAndRenderOverlay({ cropZoom: 2, cropPanX: 0.3, cropPanY: -0.3 });
    const frame = screen.getByTestId('image-crop-overlay');

    fireEvent.keyDown(frame, { key: 'Enter' });
    expect(useEditorStore.getState().history).toHaveLength(1);

    // Re-enter crop mode, reset framing, and commit via Done button
    act(() => useCanvasInteraction.getState().setCroppingElementId('img-1'));
    fireEvent.click(screen.getByRole('button', { name: 'إعادة ضبط الكادر' }));
    fireEvent.click(screen.getByRole('button', { name: 'تم' }));

    expect(useEditorStore.getState().history).toHaveLength(2);
    const resetEl = useEditorStore.getState().elements[0] as ImageElement;
    expect(resetEl.cropZoom).toBeUndefined();
    expect(resetEl.cropPanX).toBeUndefined();
    expect(resetEl.cropPanY).toBeUndefined();
  });

  it('delegates window Escape/Enter shortcuts to active crop session without clearing selection or deleting element', () => {
    seedAndRenderOverlay();
    renderHook(() => useKeyboardShortcuts(true));

    fireEvent.click(screen.getByRole('button', { name: 'تكبير الكادر' }));
    expect((useEditorStore.getState().elements[0] as ImageElement).cropZoom).toBeCloseTo(1.25, 4);

    // Delete key must be ignored while cropping
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
      );
    });
    expect(useEditorStore.getState().elements).toHaveLength(1);

    // Escape on document.body (outside overlay) cancels crop without clearing selection
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    expect(useCanvasInteraction.getState().croppingElementId).toBeNull();
    expect(useEditorStore.getState().selectedIds).toEqual(['img-1']);
    expect((useEditorStore.getState().elements[0] as ImageElement).cropZoom).toBeUndefined();

    // Re-enter, change zoom, and press Enter from document.body to commit
    act(() => useCanvasInteraction.getState().setCroppingElementId('img-1'));
    fireEvent.click(screen.getByRole('button', { name: 'تكبير الكادر' }));
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
    });
    expect(useCanvasInteraction.getState().croppingElementId).toBeNull();
    expect(useEditorStore.getState().history).toHaveLength(2);
    expect((useEditorStore.getState().elements[0] as ImageElement).cropZoom).toBeCloseTo(1.25, 4);
  });
});
