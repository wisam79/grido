import { describe, it, expect, vi } from 'vitest';

import { drawCurvedText } from '../src/lib/canvas/curved-text-utils';

describe('Curved Text Drawing Tests', () => {
  it('does nothing when curve is 0 or text is empty', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 10 }),
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: '',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 20,
      fontFamily: 'Arial',
      curve: 50,
    });
    expect(mockCtx.fillText).not.toHaveBeenCalled();

    drawCurvedText(mockCtx, {
      text: 'Hello',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 20,
      fontFamily: 'Arial',
      curve: 0,
    });
    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });

  it('draws each character rotated along arc when curve is positive or negative', () => {
    const fillTextSpy = vi.fn();
    const rotateSpy = vi.fn();
    const translateSpy = vi.fn();

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: translateSpy,
      rotate: rotateSpy,
      fillText: fillTextSpy,
      strokeText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 15 }),
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: 'GRIDO',
      x: 0,
      y: 0,
      width: 300,
      height: 150,
      fontSize: 24,
      fontFamily: 'Cairo',
      curve: 60,
      stroke: '#000000',
      strokeWidth: 2,
    });

    // 5 characters in "GRIDO"
    expect(fillTextSpy).toHaveBeenCalledTimes(5);
    expect(rotateSpy).toHaveBeenCalledTimes(5);
    expect(translateSpy).toHaveBeenCalledTimes(5);
  });

  it('starts the arc from the right when the first strong direction is rtl', () => {
    const translateSpy = vi.fn();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: translateSpy,
      rotate: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 15 }),
      fillStyle: '#000000',
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: 'GRIDO',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 20,
      fontFamily: 'Cairo',
      curve: 50,
      direction: 'rtl',
    });

    // مركز القوس عند x=100؛ البداية RTL من يمين المركز
    expect(translateSpy.mock.calls[0][0]).toBeGreaterThan(100);
  });

  it('reverses embedded Latin runs inside an RTL curve to keep visual order', () => {
    const fillTextSpy = vi.fn();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: fillTextSpy,
      measureText: vi.fn().mockReturnValue({ width: 15 }),
      fillStyle: '#000000',
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: 'مرحبا Cd',
      x: 0,
      y: 0,
      width: 300,
      height: 150,
      fontSize: 24,
      fontFamily: 'Cairo',
      curve: 40,
      direction: 'rtl',
    });

    const drawn = fillTextSpy.mock.calls.map((call) => call[0]);
    expect(drawn.slice(-2)).toEqual(['d', 'C']);
  });

  it('resolves a per-glyph fill for gradient/pattern paints', () => {
    const fillTextSpy = vi.fn();
    const fillStyleForGlyph = vi.fn(() => '#ff0000');

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: fillTextSpy,
      measureText: vi.fn().mockReturnValue({ width: 10 }),
      fillStyle: '#000000',
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: 'AB',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 24,
      fontFamily: 'Cairo',
      curve: 40,
      fillStyle: fillStyleForGlyph,
    });

    expect(fillStyleForGlyph).toHaveBeenCalledTimes(2);
    expect(fillStyleForGlyph).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ rotation: expect.any(Number) }),
    );
    expect(mockCtx.fillStyle).toBe('#ff0000');
  });
});
