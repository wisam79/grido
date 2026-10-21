import { describe, expect, it, vi } from 'vitest';

import {
  buildGradientFill,
  glyphPatternMatrix,
  inverseGlyphTransform,
  multiplyAffine,
  resolveElementFill,
  toGlyphLocal,
  type AffineMatrix,
} from '../src/lib/canvas/fill-paint';

import type { CanvasElement } from '../src/lib/editor-store';

function glyphMatrix(glyph: { x: number; y: number; rotation: number }): AffineMatrix {
  const rad = (glyph.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos, sin, -sin, cos, glyph.x, glyph.y];
}

describe('fill-paint', () => {
  it('multiplies affine matrices in apply order', () => {
    expect(multiplyAffine([1, 0, 0, 1, 5, 7], [2, 0, 0, 2, 1, 1])).toEqual([2, 0, 0, 2, 6, 8]);
  });

  it('inverts a rigid glyph transform exactly', () => {
    const glyph = { x: 40, y: -12, rotation: 73 };
    const product = multiplyAffine(inverseGlyphTransform(glyph), glyphMatrix(glyph));
    const expected: AffineMatrix = [1, 0, 0, 1, 0, 0];
    product.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
  });

  it('maps a point back to glyph local space', () => {
    expect(toGlyphLocal({ x: 15, y: 25 }, { x: 10, y: 20, rotation: 0 })).toEqual({
      x: 5,
      y: 5,
    });
  });

  it('keeps the element pattern fixed after each glyph rotation', () => {
    const elementMatrix: AffineMatrix = [1, 0, 0, 1, 100, 50];
    const glyph = { x: 30, y: 20, rotation: 45 };
    const patternMatrix = glyphPatternMatrix(elementMatrix, glyph);
    const effective = multiplyAffine(glyphMatrix(glyph), patternMatrix);
    effective.forEach((value, index) => {
      expect(value).toBeCloseTo(elementMatrix[index], 10);
    });
  });

  it('builds an element-space gradient with mapped endpoints', () => {
    const addColorStop = vi.fn();
    const createLinearGradient = vi.fn().mockReturnValue({ addColorStop });
    const ctx = { createLinearGradient } as unknown as CanvasRenderingContext2D;
    const el = {
      type: 'text',
      fillType: 'linear',
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: 1, y: 1 },
      fillLinearGradientColorStops: [0, '#000000', 1, '#ffffff'],
    } as unknown as CanvasElement;

    const gradient = buildGradientFill(ctx, el, 200, 100, (point) => ({
      x: point.x + 10,
      y: point.y + 20,
    }));

    expect(gradient).not.toBeNull();
    expect(createLinearGradient).toHaveBeenCalledWith(10, 20, 210, 120);
    expect(addColorStop).toHaveBeenCalledTimes(2);
  });

  it('falls back to the text color for solid fills', () => {
    const ctx = {} as CanvasRenderingContext2D;
    const el = {
      type: 'text',
      fillType: 'solid',
      color: '#123456',
    } as unknown as CanvasElement;
    expect(resolveElementFill(ctx, el, 100, 50)).toBe('#123456');
  });
});
