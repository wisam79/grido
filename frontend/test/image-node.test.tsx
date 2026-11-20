import { act, render } from '@testing-library/react';
import Konva from 'konva';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { URLImage } from '../src/components/editor/konva/elements/image-node';
import { getDisplayImage } from '../src/lib/canvas/display-image';
import { captureStageBlob, isStageCaptureActive } from '../src/lib/canvas/konva-export-utils';
import type { ElementProps } from '../src/components/editor/konva/elements/types';
import type { ImageElement } from '../src/lib/store/types';

const rendered = vi.hoisted(() => ({
  source: null as HTMLImageElement | null,
  imageProps: {} as Record<string, unknown>,
  shapeProps: {} as Record<string, unknown>,
  node: null as unknown,
}));
vi.mock('@/hooks/use-async-image', () => ({ useAsyncImage: () => [rendered.source] }));
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
  Shape: (props: Record<string, unknown>) => {
    rendered.shapeProps = props;
    return null;
  },
  Image: (props: Record<string, unknown>) => {
    rendered.imageProps = props;
    const ref = props.ref as React.RefObject<unknown>;
    ref.current = rendered.node;
    return null;
  },
}));

let stage: Konva.Stage | undefined;
let paints: Array<{ canvas: HTMLCanvasElement; args: unknown[] }>;
beforeEach(() => {
  paints = [];
  rendered.imageProps = {};
  rendered.shapeProps = {};
  rendered.source = new Image();
  Object.defineProperties(rendered.source, {
    naturalWidth: { value: 4096 },
    naturalHeight: { value: 2048 },
    complete: { value: true },
  });
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
  vi.restoreAllMocks();
});

function renderImage() {
  const element: ImageElement = {
    id: 'photo',
    type: 'image',
    imageSrc: 'photo.png',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    opacity: 1,
    rotation: 0,
    zIndex: 1,
    maskShape: 'circle',
    shadowOpacity: 0.5,
    shadowColor: '#000000',
    shadowBlur: 5,
  };
  const props: ElementProps = {
    element,
    isSelected: true,
    canvasWidth: 1200,
    canvasHeight: 600,
    elementRef: { current: null },
    onMouseDown: vi.fn(),
    onTouchStart: vi.fn(),
    onClick: vi.fn(),
    onTap: vi.fn(),
    onChange: vi.fn(),
    allElements: [element],
    setActiveGuides: vi.fn(),
    altPressedRef: { current: false },
    getKonvaNode: () => null,
  };
  const view = render(
    <React.StrictMode>
      <URLImage {...props} />
    </React.StrictMode>,
  );
  return view;
}
function drawCaster(pixelRatio = 1) {
  const drawImage = vi.fn();
  const scene = rendered.shapeProps.sceneFunc as (ctx: Konva.Context) => void;
  scene({
    _context: { drawImage },
    getCanvas: () => ({ getPixelRatio: () => pixelRatio }),
  } as unknown as Konva.Context);
  return drawImage.mock.calls[0]?.[0] as HTMLCanvasElement;
}

describe('image shadow caster lifetime and capture source', () => {
  it('keeps a usable editor bitmap through StrictMode replay without reallocating it per draw', () => {
    rendered.node = null;
    const view = renderImage();
    const first = drawCaster();
    expect(first.width).toBe(1024);
    expect(first.height).toBe(512);
    expect(drawCaster()).toBe(first);
    view.unmount();
  });

  it.each(['success', 'abort'] as const)(
    'reads upgraded source/crop only inside serialized capture and restores editor bitmap on %s',
    async (outcome) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      stage = new Konva.Stage({ container, width: 1200, height: 600 });
      const layer = new Konva.Layer();
      const node = new Konva.Image();
      stage.add(layer);
      layer.add(node);
      vi.spyOn(stage, 'batchDraw').mockReturnValue(stage);
      vi.spyOn(layer, 'batchDraw').mockReturnValue(layer);
      rendered.node = node;
      const view = renderImage();
      node.setAttrs(rendered.imageProps as Konva.ImageConfig);
      const displayed = node.image();
      const crop = node.crop();
      stage.position({ x: 30, y: 40 });
      stage.scale({ x: 0.5, y: 0.5 });
      const editorBitmap = drawCaster();
      const callbacks: BlobCallback[] = [];
      let exported: HTMLCanvasElement | undefined;
      vi.spyOn(stage, 'toCanvas').mockImplementation(() => {
        expect(isStageCaptureActive(stage)).toBe(true);
        expect(node.image()).toBe(rendered.source);
        expect(node.cropWidth()).toBe(crop.width * 2);
        exported = drawCaster(2);
        expect(exported.width).toBe(2400);
        expect(exported.height).toBe(1200);
        expect(paints.find((p) => p.canvas === exported)?.args).toEqual([
          rendered.source,
          crop.x * 2,
          crop.y * 2,
          crop.width * 2,
          crop.height * 2,
          0,
          0,
          1200,
          600,
        ]);
        const canvas = document.createElement('canvas');
        canvas.toBlob = (callback) => callbacks.push(callback);
        return canvas;
      });
      const controller = new AbortController();
      const capture = captureStageBlob(stage, 2, 'image/png', undefined, undefined, {
        useFullResolution: true,
        signal: controller.signal,
      });
      const result = capture.then(
        (value) => ({ value, error: undefined }),
        (error: unknown) => ({ value: undefined, error }),
      );
      await vi.waitFor(() => expect(callbacks).toHaveLength(1));
      if (outcome === 'abort') controller.abort();
      else callbacks[0](new Blob(['capture']));
      const settled = await result;
      if (outcome === 'abort') expect(settled.error).toMatchObject({ name: 'AbortError' });
      else expect(settled.value).toBeInstanceOf(Blob);
      expect(node.image()).toBe(displayed);
      expect(node.crop()).toEqual(crop);
      expect(stage.position()).toEqual({ x: 30, y: 40 });
      expect(stage.scale()).toEqual({ x: 0.5, y: 0.5 });
      expect(isStageCaptureActive(stage)).toBe(false);
      expect(drawCaster()).toBe(editorBitmap);
      expect(exported).not.toBe(editorBitmap);
      await act(async () => view.unmount());
      container.remove();
    },
  );
});
