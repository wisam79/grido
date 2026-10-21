import { describe, expect, it } from 'vitest';

import {
  assertRasterBudget,
  checkRasterBudget,
  MAX_RASTER_PIXELS,
  MAX_RASTER_SIDE,
} from '@/features/stickers/lib/export-limits';

describe('sticker export pixel budget', () => {
  it('accepts A4 at 300 DPI', () => {
    const result = checkRasterBudget(2480, 3508);
    expect(result.ok).toBe(true);
    expect(result.pixels).toBeLessThan(MAX_RASTER_PIXELS);
  });

  it('rejects A3 at 600 DPI before allocating a canvas', () => {
    const result = checkRasterBudget(7016, 9921);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('MP');
  });

  it('rejects invalid and oversized dimensions', () => {
    expect(checkRasterBudget(Number.NaN, 100).ok).toBe(false);
    expect(checkRasterBudget(0, 100).ok).toBe(false);
    expect(checkRasterBudget(-10, 100).ok).toBe(false);
    expect(checkRasterBudget(MAX_RASTER_SIDE + 1, 10).ok).toBe(false);
  });

  it('throws a user-facing Arabic error from assertRasterBudget', () => {
    expect(() => assertRasterBudget(7016, 9921)).toThrow(/MP/);
    expect(() => assertRasterBudget(2480, 3508)).not.toThrow();
  });
});
