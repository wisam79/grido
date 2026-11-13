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
