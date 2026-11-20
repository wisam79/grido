import Konva from 'konva';
import { SceneCanvas } from 'konva/lib/Canvas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createElementSpaceSceneFunc,
  getFillProps,
} from '../src/components/editor/konva/elements/fill-utils';
import { TEXT_COLOR_DEFAULT } from '../src/lib/canvas/canvas-colors';
import { multiplyAffine, type AffineMatrix } from '../src/lib/canvas/fill-paint';
import { renderFittedBranch } from '../src/lib/export/export-canvas-fitted';

vi.mock('../src/lib/io/fonts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/io/fonts')>()),
  ensureElementsFontsLoaded: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/lib/export/export-primitives', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/export/export-primitives')>()),
  loadImage: vi.fn(async () => ({ width: 100, height: 50 })),
}));

afterEach(() => vi.restoreAllMocks());

import type { CanvasElement, ShapeElement, TextElement } from '../src/lib/editor-store';

function textElement(patch: Partial<TextElement>): CanvasElement {
  return {
    id: 't1',
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    text: 'hello',
    fontSize: 20,
    ...patch,
  } as CanvasElement;
}

function shapeElement(patch: Partial<ShapeElement>): CanvasElement {
  return {
    id: 's1',
    type: 'shape',
    shape: 'rect',
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    ...patch,
  } as CanvasElement;
}

describe('getFillProps', () => {
  it('resets fill priority for solid text fills', () => {
    expect(getFillProps(textElement({ color: '#112233' }), 100, 50)).toMatchObject({
      fillPriority: 'color',
      fill: '#112233',
    });
  });

  it('declares linear gradients explicitly so a previous pattern priority cannot win', () => {
    const props = getFillProps(
      textElement({
        fillType: 'linear',
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: 1, y: 1 },
      }),
      200,
      100,
    );
    expect(props.fillPriority).toBe('linear-gradient');
    expect(props.fillLinearGradientStartPoint).toEqual({ x: 0, y: 0 });
    expect(props.fillLinearGradientEndPoint).toEqual({ x: 200, y: 100 });
  });

  it.each(['radial', 'image'] as const)(
    'keeps a text decoration color without overriding the %s fill',
    (fillType) => {
      const props = getFillProps(
        textElement({ fillType, color: '#2468ac', fillImageSrc: 'photo.png' }),
        100,
        50,
        { width: 100, height: 50 } as HTMLImageElement,
      );
      expect(props.fill).toBe('#2468ac');
      expect(props.fillPriority).toBe(fillType === 'radial' ? 'radial-gradient' : 'pattern');
      expect(props.fillLinearGradientColorStops).toBeUndefined();
    },
  );

  it('falls back to the element color until the fill image is loaded', () => {
    expect(
      getFillProps(
        shapeElement({ fillType: 'image', fillImageSrc: 'photo.png', fill: '#abcdef' }),
        100,
        50,
      ),
    ).toMatchObject({ fillPriority: 'color', fill: '#abcdef' });
  });
});

describe('element-space shape paint under native geometry transforms', () => {
  const identity: AffineMatrix = [1, 0, 0, 1, 0, 0];
  const nearMatrix = (actual: AffineMatrix, expected: AffineMatrix) =>
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]));

  function affineContext(initial: AffineMatrix) {
    let matrix = initial;
    const stack: AffineMatrix[] = [];
    const gradientMatrices: AffineMatrix[] = [];
    const fills: AffineMatrix[] = [];
    const ctx = {
      save: () => stack.push(matrix),
      restore: () => {
        matrix = stack.pop()!;
      },
      transform: (...args: AffineMatrix) => {
        matrix = multiplyAffine(matrix, args);
      },
      createLinearGradient: vi.fn((..._args: number[]) => {
        gradientMatrices.push(matrix);
        return { addColorStop: vi.fn() };
      }),
      createRadialGradient: vi.fn((..._args: number[]) => {
        gradientMatrices.push(matrix);
        return { addColorStop: vi.fn() };
      }),
      createPattern: vi.fn(() => ({ setTransform: vi.fn() })),
      fill: () => fills.push(matrix),
      fillStyle: '',
    };
    return { ctx, gradientMatrices, fills };
  }

  it.each(['linear', 'radial', 'image'] as const)(
    'paints %s in element space for shifted paths with nonuniform scaling and rotated patterns',
    (fillType) => {
      const el = shapeElement({
        shape: 'path',
        fillType,
        fillImageSrc: 'pattern.png',
        fillImageRotation: 35,
      });
      const shapeToElement: AffineMatrix = [3, 0, 0, 5, -30, 100];
      const inverse: AffineMatrix = [1 / 3, 0, 0, 1 / 5, 10, -20];
      const recording = affineContext(shapeToElement);
      const nativeFill = vi.fn();
      const shape = {
        _fillFunc: nativeFill,
        _sceneFunc(context: Konva.Context) {
          this._fillFunc(context);
        },
      };
      const scene = createElementSpaceSceneFunc(
        el,
        300,
        200,
        { width: 100, height: 50 } as HTMLImageElement,
        inverse,
      );
      scene(
        { _context: recording.ctx } as unknown as Konva.Context,
        shape as unknown as Konva.Shape,
      );
      nearMatrix(recording.fills[0], identity);
      recording.gradientMatrices.forEach((matrix) => nearMatrix(matrix, identity));
      expect(shape._fillFunc).toBe(nativeFill);
      const args =
        fillType === 'radial'
          ? recording.ctx.createRadialGradient.mock.calls[0]
          : recording.ctx.createLinearGradient.mock.calls[0];
      if (fillType === 'radial') expect(args).toEqual([150, 100, 0, 150, 100, 150]);
      if (fillType === 'linear') expect(args).toEqual([0, 0, 300, 200]);
    },
  );

  it.each(['arc', 'wedge'] as const)(
    'does not rotate %s gradients with its -90-degree geometry',
    (shapeType) => {
      const recording = affineContext([0, -1, 1, 0, 150, 100]);
      const nativeFill = vi.fn();
      const shape = {
        _fillFunc: nativeFill,
        _sceneFunc(context: Konva.Context) {
          this._fillFunc(context);
        },
      };
      createElementSpaceSceneFunc(
        shapeElement({ shape: shapeType, fillType: 'linear' }),
        300,
        200,
        null,
        [0, 1, -1, 0, 100, -150],
      )({ _context: recording.ctx } as unknown as Konva.Context, shape as unknown as Konva.Shape);
      nearMatrix(recording.gradientMatrices[0], identity);
      nearMatrix(recording.fills[0], identity);
    },
  );

  it('restores the native fill hook and Canvas state on paint failure', () => {
    const recording = affineContext(identity);
    recording.ctx.fill = () => {
      throw new Error('paint failed');
    };
    const nativeFill = vi.fn();
    const shape = {
      _fillFunc: nativeFill,
      _sceneFunc(context: Konva.Context) {
        this._fillFunc(context);
      },
    };
    expect(() =>
      createElementSpaceSceneFunc(
        shapeElement({ fillType: 'linear' }),
        100,
        50,
        null,
        identity,
      )({ _context: recording.ctx } as unknown as Konva.Context, shape as unknown as Konva.Shape),
    ).toThrow('paint failed');
    expect(shape._fillFunc).toBe(nativeFill);
  });

  it('fallback thin-arrow shaft stays at the same half-height as Konva instead of inventing a 16px box', async () => {
    const ctx = new Proxy(
      {
        moveTo: vi.fn(),
        lineTo: vi.fn(),
      },
      { get: (target, key) => Reflect.get(target, key) ?? (() => {}) },
    ) as unknown as CanvasRenderingContext2D;
    await renderFittedBranch(
      ctx,
      [
        shapeElement({
          shape: 'arrow',
          width: 0.1,
          height: 0.002,
          strokeWidth: 4,
        }),
      ],
      1000,
      1000,
    );
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 1);
    expect(ctx.lineTo).toHaveBeenCalledWith(86, 1);
  });

  it('fallback path fill applies geometry once and leaves stroke scaling unchanged', async () => {
    class RecordedPath {
      transforms: unknown[] = [];
      constructor(_path?: string) {}
      addPath(_path: unknown, transform: unknown) {
        this.transforms.push(transform);
      }
    }
    vi.stubGlobal('Path2D', RecordedPath);
    try {
      const ctx = new Proxy(
        {
          fill: vi.fn(),
          stroke: vi.fn(),
          scale: vi.fn(),
          translate: vi.fn(),
          createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        },
        { get: (target, key) => Reflect.get(target, key) ?? (() => {}) },
      ) as unknown as CanvasRenderingContext2D;
      await renderFittedBranch(
        ctx,
        [
          shapeElement({
            shape: 'path',
            width: 0.3,
            height: 0.2,
            fillType: 'linear',
            strokeWidth: 2,
            svgPath: 'M10,-20 L110,-20 L110,20 L10,20 Z',
          }),
        ],
        1000,
        1000,
      );
      const fitted = vi.mocked(ctx.fill).mock.calls[0][0] as unknown as RecordedPath;
      expect(fitted.transforms).toEqual([{ a: 3, b: 0, c: 0, d: 5, e: -30, f: 100 }]);
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 300, 200);
      expect(ctx.scale).toHaveBeenCalledWith(3, 5);
      expect(ctx.stroke).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

type Paint =
  | string
  | {
      kind: string;
      addColorStop?: ReturnType<typeof vi.fn>;
      setTransform?: ReturnType<typeof vi.fn>;
    };

/** Real Konva layout/scene code, with only Canvas2D paint operations recorded. */
function recordingContext() {
  const strokes: Paint[] = [];
  const fills: Paint[] = [];
  const states: Array<{ fillStyle: Paint; strokeStyle: Paint; font: string; filter: string }> = [];
  const ctx = {
    font: '20px Arial',
    fillStyle: '#000000' as Paint,
    strokeStyle: '#000000' as Paint,
    filter: 'none',
    lineWidth: 1,
    save() {
      states.push({
        fillStyle: this.fillStyle,
        strokeStyle: this.strokeStyle,
        font: this.font,
        filter: this.filter,
      });
    },
    restore() {
      const saved = states.pop();
      if (saved) Object.assign(this, saved);
    },
    scale: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    getImageData: () => ({
      data: new Uint8ClampedArray(400).map((_, i) => (i % 4 === 3 ? 255 : 40)),
    }),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillText() {
      fills.push(this.fillStyle);
    },
    stroke() {
      strokes.push(this.strokeStyle);
    },
    measureText: (text: string) => ({
      width: text.length * 10,
      fontBoundingBoxAscent: 15,
      fontBoundingBoxDescent: 5,
    }),
    createLinearGradient: () => ({ kind: 'linear', addColorStop: vi.fn() }),
    createRadialGradient: () => ({ kind: 'radial', addColorStop: vi.fn() }),
    createPattern: () => ({ kind: 'pattern', setTransform: vi.fn() }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, strokes, fills };
}

describe('text decoration paint parity — Konva and manual export', () => {
  it.each([
    ['radial', 'underline', '#2468ac'],
    ['radial', 'line-through', '#9a286d'],
    ['image', 'underline', '#2468ac'],
    ['image', 'line-through', '#9a286d'],
    ['radial', 'underline', undefined],
    ['image', 'line-through', undefined],
    ['solid', 'underline', '#135724'],
    ['linear', 'line-through', '#135724'],
  ] as const)(
    '%s %s uses the same documented decoration paint with color %s',
    async (fillType, textDecoration, color) => {
      const el = textElement({
        text: 'AB\nCD',
        width: 0.2,
        height: 0.05,
        fontFamily: 'Arial',
        color,
        fillType,
        textDecoration,
        fillImageSrc: fillType === 'image' ? 'photo.png' : undefined,
      }) as TextElement;
      const preview = recordingContext();
      const dummy = recordingContext();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(dummy.ctx);
      const node = new Konva.Text({
        text: el.text,
        width: 200,
        fontSize: 20,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        align: 'center',
        textDecoration,
        ...getFillProps(el, 200, 48, { width: 100, height: 50 } as HTMLImageElement),
      });
      const canvas = new SceneCanvas({ width: 200, height: 48, pixelRatio: 1 });
      const context = canvas.getContext();
      context._context = preview.ctx;
      node._sceneFunc(context);
      node.destroy();

      const exported = recordingContext();
      await renderFittedBranch(exported.ctx, [el], 1000, 1000);

      const expectedDecoration =
        fillType === 'linear'
          ? expect.objectContaining({ kind: 'linear' })
          : color || TEXT_COLOR_DEFAULT;
      expect(preview.strokes).toHaveLength(2);
      expect(preview.strokes).toEqual([expectedDecoration, expectedDecoration]);
      expect(exported.strokes).toEqual([expectedDecoration]); // Batched across both lines.
      const expectedFill =
        fillType === 'solid'
          ? color || TEXT_COLOR_DEFAULT
          : expect.objectContaining({ kind: fillType === 'image' ? 'pattern' : fillType });
      expect(preview.fills).toEqual([expectedFill, expectedFill]);
      expect(exported.fills).toEqual([expectedFill, expectedFill]);
    },
  );

  it('translates gradient coordinates by originX/originY for centroid-centered shapes', () => {
    const el = textElement({
      fillType: 'linear',
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 1, y: 1 },
      fillLinearGradientColorStops: [0, '#000000', 1, '#ffffff'],
    });
    const props = getFillProps(el, 100, 60, null, { originX: -50, originY: -30 });
    expect(props.fillLinearGradientStartPoint).toEqual({ x: -50, y: -30 });
    expect(props.fillLinearGradientEndPoint).toEqual({ x: 50, y: 30 });
  });
});
