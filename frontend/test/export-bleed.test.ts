import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyBleedAndCropMarks, assertValidBleedMM } from '../src/lib/export/export-bleed';
import { CanvasTooLargeError } from '../src/lib/export/export-limits';
import { ProjectSchema } from '../src/lib/schema';

class FakeImage {
  static shouldFail = false;
  width = 100;
  height = 100;
  naturalWidth = 100;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => (FakeImage.shouldFail ? this.onerror?.() : this.onload?.()));
  }
}

function contextStub(): CanvasRenderingContext2D {
  return {
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('applyBleedAndCropMarks', () => {
  beforeEach(() => {
    FakeImage.shouldFail = false;
    vi.stubGlobal('Image', FakeImage);
    vi.stubGlobal('createImageBitmap', undefined);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contextStub());
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback, type) {
      callback(new Blob(['rendered'], { type: type ?? 'image/png' }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([Number.NaN, Infinity, -1, 20.01])('rejects invalid bleed %s', async (bleed) => {
    const source = new Blob(['source'], { type: 'image/png' });
    expect(() => assertValidBleedMM(bleed)).toThrow(RangeError);
    expect(() => ProjectSchema.parse({ bleedMarginMM: bleed })).toThrow();
    await expect(applyBleedAndCropMarks(source, bleed, false)).rejects.toThrow(RangeError);
  });

  it('accepts the canonical schema boundaries 0..20mm', () => {
    expect(ProjectSchema.parse({ bleedMarginMM: 0 }).bleedMarginMM).toBe(0);
    expect(ProjectSchema.parse({ bleedMarginMM: 20 }).bleedMarginMM).toBe(20);
  });

  it('returns the identical Blob for zero bleed', async () => {
    const source = new Blob(['source'], { type: 'image/png' });
    await expect(applyBleedAndCropMarks(source, 0, true)).resolves.toBe(source);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects expanded output above 50MP before creating a canvas', async () => {
    const created = vi.spyOn(document, 'createElement');
    class HugeImage extends FakeImage {
      override width = 7000;
      override height = 7000;
      override naturalWidth = 7000;
      override naturalHeight = 7000;
    }
    vi.stubGlobal('Image', HugeImage);

    await expect(
      applyBleedAndCropMarks(new Blob(['source']), 20, false, 'png', 0.95, 300),
    ).rejects.toBeInstanceOf(CanvasTooLargeError);
    expect(created).not.toHaveBeenCalledWith('canvas');
  });

  it('mirrors every edge and corner outside the original image bounds', async () => {
    const mirrored: Array<{ bounds: number[]; source: number[]; scale: number[] }> = [];
    let transform = { x: 0, y: 0, sx: 1, sy: 1 };
    const stack: (typeof transform)[] = [];
    const ctx = contextStub();
    ctx.save = () => stack.push({ ...transform });
    ctx.restore = () => {
      transform = stack.pop()!;
    };
    ctx.translate = (x, y) => {
      transform.x += x;
      transform.y += y;
    };
    ctx.scale = (x, y) => {
      transform.sx *= x;
      transform.sy *= y;
    };
    ctx.drawImage = ((...args: unknown[]) => {
      if (args.length !== 9) return;
      const [, sx, sy, sw, sh, dx, dy, dw, dh] = args as [
        unknown,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      const x0 = transform.x + dx * transform.sx;
      const y0 = transform.y + dy * transform.sy;
      const x1 = x0 + dw * transform.sx;
      const y1 = y0 + dh * transform.sy;
      mirrored.push({
        bounds: [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)],
        source: [sx, sy, sw, sh],
        scale: [transform.sx, transform.sy],
      });
    }) as CanvasRenderingContext2D['drawImage'];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);

    await applyBleedAndCropMarks(new Blob(['source']), 4, false, 'png', 0.95, 25.4);

    // 100×100 image starts at (4,4); each mirror lies in the outer 4px border.
    expect(mirrored).toEqual([
      { bounds: [0, 4, 4, 104], source: [0, 0, 4, 100], scale: [-1, 1] },
      { bounds: [104, 4, 108, 104], source: [96, 0, 4, 100], scale: [-1, 1] },
      { bounds: [4, 0, 104, 4], source: [0, 0, 100, 4], scale: [1, -1] },
      { bounds: [4, 104, 104, 108], source: [0, 96, 100, 4], scale: [1, -1] },
      { bounds: [0, 0, 4, 4], source: [0, 0, 4, 4], scale: [-1, -1] },
      { bounds: [104, 0, 108, 4], source: [96, 0, 4, 4], scale: [-1, -1] },
      { bounds: [0, 104, 4, 108], source: [0, 96, 4, 4], scale: [-1, -1] },
      { bounds: [104, 104, 108, 108], source: [96, 96, 4, 4], scale: [-1, -1] },
    ]);
  });

  it('throws explicit decode failure and always revokes the object URL', async () => {
    FakeImage.shouldFail = true;
    await expect(applyBleedAndCropMarks(new Blob(['broken']), 2, false)).rejects.toThrow(
      'تعذر فك ترميز',
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('throws when context or toBlob fails instead of returning the source', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(null);
    await expect(applyBleedAndCropMarks(new Blob(['source']), 2, false)).rejects.toThrow(
      'تعذر إنشاء سياق',
    );

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(contextStub());
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementationOnce((callback) =>
      callback(null),
    );
    await expect(applyBleedAndCropMarks(new Blob(['source']), 2, false)).rejects.toThrow(
      'تعذر ترميز',
    );
  });

  it('aborts decode work and revokes the object URL', async () => {
    class PendingImage extends FakeImage {
      override set src(_value: string) {}
    }
    vi.stubGlobal('Image', PendingImage);
    const controller = new AbortController();
    const operation = applyBleedAndCropMarks(
      new Blob(['source']),
      2,
      false,
      'png',
      0.95,
      300,
      controller.signal,
    );
    controller.abort();
    await expect(operation).rejects.toMatchObject({ name: 'AbortError' });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
