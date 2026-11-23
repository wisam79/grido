import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { URLImage } from '../src/components/editor/konva/elements/image-node';
import {
  buildMaskPath,
  MASK_SHAPES,
  maskPathToSvg,
  traceMaskPath,
} from '../src/lib/canvas/mask-geometry';
import { renderFittedBranch } from '../src/lib/export/export-canvas-fitted';
import { computeImageCrop } from '../src/lib/export/export-primitives';
import type { ElementProps } from '../src/components/editor/konva/elements/types';
import type { MaskShape } from '../src/lib/canvas/mask-geometry';
import type { ImageElement } from '../src/lib/store/types';

type Operation = { name: string; args: unknown[]; shadow: string; composite: string; fill: string };
const rendered = vi.hoisted(() => ({
  source: null as HTMLImageElement | null,
  clip: undefined as ((ctx: CanvasRenderingContext2D) => void) | undefined,
  shapeProps: {} as Record<string, unknown>,
  imageProps: {} as Record<string, unknown>,
  filterKey: '',
}));
vi.mock('@/hooks/use-async-image', () => ({ useAsyncImage: () => [rendered.source] }));
vi.mock('@/hooks/use-display-image', () => ({ useDisplayImage: () => rendered.source }));
vi.mock('@/hooks/use-sticker-display-raster', () => ({ useStickerDisplayRaster: () => null }));
vi.mock('@/hooks/use-filter-cache', () => ({
  useFilterCache: (options: { filterKey: string }) => {
    rendered.filterKey = options.filterKey;
    return vi.fn();
  },
}));
vi.mock('@/hooks/use-konva-drag', () => ({
  useKonvaDrag: () => ({ onDragStart: vi.fn(), onDragEnd: vi.fn() }),
}));
vi.mock('react-konva', () => ({
  Group: (props: { clipFunc?: typeof rendered.clip; children?: React.ReactNode }) => {
    if ('clipFunc' in props) rendered.clip = props.clipFunc;
    return <>{props.children}</>;
  },
  Rect: () => null,
  Shape: (props: Record<string, unknown>) => {
    rendered.shapeProps = props;
    return null;
  },
  Image: (props: Record<string, unknown>) => {
    rendered.imageProps = props;
    return null;
  },
}));

class LoadedImage {
  width = 1200;
  height = 800;
  naturalWidth = 1200;
  naturalHeight = 800;
  complete = true;
  onload: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

let contexts: WeakMap<HTMLCanvasElement, { ctx: CanvasRenderingContext2D; ops: Operation[] }>;
function recorder(canvas = document.createElement('canvas')) {
  const existing = contexts.get(canvas);
  if (existing) return existing;
  const ops: Operation[] = [];
  const stack: Record<string, unknown>[] = [];
  const state: Record<string, unknown> = {
    canvas,
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    globalAlpha: 1,
    filter: 'none',
  };
  const ctx = new Proxy(state, {
    get(target, key) {
      if (key === 'save') return () => stack.push({ ...state });
      if (key === 'restore') return () => Object.assign(state, stack.pop());
      if (key === 'clearRect')
        return () => {
          ops.length = 0;
        };
      if (key === 'getImageData')
        return () => ({ data: new Uint8ClampedArray(16).fill(255), width: 2, height: 2 });
      return (
        Reflect.get(target, key) ??
        ((...args: unknown[]) =>
          ops.push({
            name: String(key),
            args,
            shadow: String(state.shadowColor),
            composite: String(state.globalCompositeOperation),
            fill: String(state.fillStyle),
          }))
      );
    },
  }) as unknown as CanvasRenderingContext2D;
  const result = { ctx, ops };
  contexts.set(canvas, result);
  return result;
}
function pathOps(ops: Operation[]) {
  return ops
    .filter((op) =>
      ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'arc', 'closePath'].includes(op.name),
    )
    .map(({ name, args }) => [name, ...args]);
}
function image(maskShape: MaskShape): ImageElement {
  return {
    id: 'photo',
    type: 'image',
    imageSrc: 'photo.png',
    x: 0.1,
    y: 0.2,
    width: 0.5,
    height: 0.5,
    opacity: 0.8,
    rotation: 90,
    flipX: true,
    flipY: true,
    zIndex: 1,
    maskShape,
    cornerRadius: 40,
    bgColor: '#abcdef',
    shadowOpacity: 0.5,
    shadowColor: '#000000',
    shadowBlur: 5,
    cropZoom: 2,
    cropPanX: 0.4,
    cropPanY: -0.3,
    filter: 'grayscale',
  };
}
function mount(element: ImageElement, width = 600, height = 400) {
  const props: ElementProps = {
    element,
    isSelected: true,
    canvasWidth: width,
    canvasHeight: height,
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
  return { ...render(<URLImage {...props} />), props };
}

beforeEach(() => {
  contexts = new WeakMap();
  rendered.clip = undefined;
  rendered.shapeProps = {};
  vi.stubGlobal('Image', LoadedImage);
  rendered.source = new Image();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return recorder(this).ctx;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('FF-03 pure mask geometry', () => {
  it.each(MASK_SHAPES)(
    '%s stays finite, closed, and scale-invariant at 300 and 600 DPI',
    (shape) => {
      // 50.8 x 33.866… mm at 300 DPI, doubled at 600 DPI.
      const base = buildMaskPath(shape, 600, 400);
      const doubled = buildMaskPath(shape, 1200, 800);
      expect(base[0][0]).toBe('M');
      expect(base.at(-1)).toEqual(['Z']);
      base.forEach((command, index) => {
        expect(doubled[index][0]).toBe(command[0]);
        command.slice(1).forEach((value, coordinate) => {
          expect(Number.isFinite(value)).toBe(true);
          const angle = command[0] === 'A' && coordinate >= 3;
          expect(doubled[index][coordinate + 1]).toBeCloseTo(Number(value) * (angle ? 1 : 2), 8);
        });
      });
      expect(maskPathToSvg(base)).not.toMatch(/NaN|Infinity/);
      expect(maskPathToSvg(base)).toMatch(/^M .* Z$/);
    },
  );
  it('keeps independent landmarks for the legacy circle, heart and star', () => {
    const circle = buildMaskPath('circle', 600, 400);
    expect(circle).toEqual([
      ['M', 500, 200],
      ['A', 300, 200, 200, 0, Math.PI],
      ['A', 300, 200, 200, Math.PI, Math.PI * 2],
      ['Z'],
    ]);
    expect(buildMaskPath('heart', 600, 400)).toEqual([
      ['M', 300, 120],
      ['C', 300, 0, 0, 0, 0, 120],
      ['C', 0, 260, 300, 260, 300, 400],
      ['C', 300, 260, 600, 260, 600, 120],
      ['C', 600, 0, 300, 0, 300, 120],
      ['Z'],
    ]);
    const star = buildMaskPath('star', 600, 400);
    expect(star).toHaveLength(11);
    expect(star[0][1]).toBeCloseTo(300);
    expect(star[0][2]).toBeCloseTo(0);
    expect(star[1][1]).toBeCloseTo(300 + Math.sin(Math.PI / 5) * 100);
    expect(star[1][2]).toBeCloseTo(200 - Math.cos(Math.PI / 5) * 100);
  });
  it('defines distinct arch, hexagon, diamond and twelve-point seal contours', () => {
    expect(buildMaskPath('arch', 600, 400)[1]).toEqual(['L', 0, 200]);
    expect(buildMaskPath('hexagon', 600, 400).slice(0, 3)).toEqual([
      ['M', 150, 0],
      ['L', 450, 0],
      ['L', 600, 200],
    ]);
    expect(buildMaskPath('diamond', 600, 400)).toEqual([
      ['M', 300, 0],
      ['L', 600, 200],
      ['L', 300, 400],
      ['L', 0, 200],
      ['Z'],
    ]);
    expect(buildMaskPath('seal', 600, 400)).toHaveLength(25);
    expect(
      new Set(MASK_SHAPES.map((shape) => maskPathToSvg(buildMaskPath(shape, 32, 32)))).size,
    ).toBe(8);
  });
  it('preserves missing-mask natural geometry and rejects invalid box dimensions', () => {
    expect(buildMaskPath(undefined, 100, 80)).toEqual(buildMaskPath('none', 100, 80));
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(buildMaskPath('circle', value, 100)).toEqual([]);
      expect(buildMaskPath('circle', 100, value)).toEqual([]);
    }
  });
});

describe('FF-03 renderer and shadow path parity', () => {
  it.each(
    MASK_SHAPES.filter((shape) => shape !== 'none').flatMap((shape) =>
      ['none', 'grayscale', 'pixelate'].map((filter) => ({ shape, filter })),
    ),
  )(
    '$shape shares clip geometry with shadow and fitted $filter export at both DPIs',
    async ({ shape, filter }) => {
      const element = { ...image(shape), filter };
      for (const scale of [1, 2]) {
        const view = mount(element, 600 * scale, 400 * scale);
        const expected = recorder();
        traceMaskPath(expected.ctx, buildMaskPath(shape, 300 * scale, 200 * scale));
        const clipped = recorder();
        rendered.clip!(clipped.ctx);
        expect(pathOps(clipped.ops)).toEqual(pathOps(expected.ops));
        expect(rendered.imageProps.cornerRadius).toBe(0);

        let caster: HTMLCanvasElement | undefined;
        (rendered.shapeProps.sceneFunc as (ctx: unknown) => void)({
          _context: {
            drawImage: (canvas: HTMLCanvasElement) => {
              caster = canvas;
            },
          },
          getCanvas: () => ({ getPixelRatio: () => scale }),
        });
        expect(pathOps(recorder(caster!).ops)).toEqual(pathOps(expected.ops));
        expect(recorder(caster!).ops.find((op) => op.name === 'clip')).toBeDefined();

        const output = recorder();
        await renderFittedBranch(output.ctx, [element], 600 * scale, 400 * scale);
        const finalDraws = output.ops.filter((op) => op.name === 'drawImage');
        expect(finalDraws).toHaveLength(1);
        expect(finalDraws[0].shadow).toBe('rgba(0, 0, 0, 0.500)');
        expect(output.ops.some((op) => op.name === 'clip' || op.name === 'fillRect')).toBe(false);
        expect(output.ops.filter((op) => op.name === 'rotate')[0].args).toEqual([Math.PI / 2]);
        expect(output.ops.filter((op) => op.name === 'scale')[0].args).toEqual([-1, -1]);
        const bitmap = finalDraws[0].args[0] as HTMLCanvasElement;
        expect(bitmap.width).toBe(300 * scale);
        expect(bitmap.height).toBe(200 * scale);
        const bitmapOps = recorder(bitmap).ops;
        expect(pathOps(bitmapOps)).toEqual(pathOps(expected.ops));
        const bg = bitmapOps.find((op) => op.name === 'fillRect');
        expect(bg).toMatchObject({
          composite: 'source-over',
          fill: '#abcdef',
          shadow: 'transparent',
        });
        const filtered = bitmapOps.find((op) => op.name === 'drawImage')!
          .args[0] as HTMLCanvasElement;
        const filteredOps = recorder(filtered).ops;
        expect(filteredOps.some((op) => op.name === 'clip' || op.name === 'fillRect')).toBe(false);
        expect(filteredOps.some((op) => op.name === 'putImageData')).toBe(filter !== 'none');
        const sourceDraw = filteredOps.find((op) => op.name === 'drawImage')!;
        const crop = computeImageCrop(
          { width: 1200, height: 800 },
          300 * scale,
          200 * scale,
          element,
        );
        expect(sourceDraw.args.slice(1, 5)).toEqual([crop.sx, crop.sy, crop.sw, crop.sh]);
        view.unmount();
      }
    },
  );
  it('invalidates filtered corner cache on natural/mask transitions but not between geometric masks', () => {
    const element = image('none');
    const view = mount(element);
    const naturalKey = rendered.filterKey;
    view.rerender(<URLImage {...view.props} element={{ ...element, maskShape: 'circle' }} />);
    expect(rendered.imageProps.cornerRadius).toBe(0);
    expect(rendered.filterKey).not.toBe(naturalKey);
    const maskedKey = rendered.filterKey;
    view.rerender(<URLImage {...view.props} element={{ ...element, maskShape: 'arch' }} />);
    expect(rendered.filterKey).toBe(maskedKey);
    view.rerender(<URLImage {...view.props} element={element} />);
    expect(rendered.filterKey).toBe(naturalKey);
    expect(rendered.imageProps.cornerRadius).toBe(40);
    view.unmount();
  });
  it.each(['transparent', undefined])(
    'clips transparent masked images without manufacturing a rectangular background (%s)',
    async (bgColor) => {
      const element = { ...image('heart'), bgColor, filter: 'pixelate' };
      const output = recorder();
      await renderFittedBranch(output.ctx, [element], 600, 400);
      const draws = output.ops.filter((op) => op.name === 'drawImage');
      expect(draws).toHaveLength(1);
      const bitmapOps = recorder(draws[0].args[0] as HTMLCanvasElement).ops;
      expect(bitmapOps.some((op) => op.name === 'fillRect')).toBe(false);
      expect(bitmapOps.some((op) => op.name === 'clip')).toBe(true);
    },
  );
  it('reuses one per-export mask composite surface without sharing it between exports', async () => {
    const first = recorder();
    await renderFittedBranch(
      first.ctx,
      [image('heart'), { ...image('star'), id: 'other' }],
      600,
      400,
    );
    const draws = first.ops.filter((op) => op.name === 'drawImage');
    expect(draws).toHaveLength(2);
    expect(draws[0].args[0]).toBe(draws[1].args[0]);
    const second = recorder();
    await renderFittedBranch(second.ctx, [image('circle')], 600, 400);
    expect(second.ops.find((op) => op.name === 'drawImage')!.args[0]).not.toBe(draws[0].args[0]);
  });
  it('keeps natural corner rounding and one background/image shadow composite', async () => {
    const element = image('none');
    const view = mount(element);
    expect(rendered.clip).toBeUndefined();
    expect(rendered.imageProps.cornerRadius).toBe(40);
    const output = recorder();
    await renderFittedBranch(output.ctx, [element], 600, 400);
    const draws = output.ops.filter((op) => op.name === 'drawImage');
    expect(draws).toHaveLength(1);
    const bitmapOps = recorder(draws[0].args[0] as HTMLCanvasElement).ops;
    expect(bitmapOps.filter((op) => op.name === 'roundRect')).toHaveLength(2);
    view.unmount();
  });
});
