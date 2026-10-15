import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveImageAspectRatio,
  resolveBatchImageAspectRatios,
  getCachedImageAspectRatio,
  setCachedImageAspectRatio,
  clearImageAspectRatioCache,
} from '../src/lib/canvas/image-dimensions';
import { measureImageAspect } from '../src/lib/canvas/measure-image';
import * as AppWails from '../wailsjs/go/main/App';

vi.mock('../wailsjs/go/main/App', () => ({
  GetImageDimensions: vi.fn(),
  GetBatchImageDimensions: vi.fn(),
}));

describe('image-dimensions & measure-image acceleration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearImageAspectRatioCache();
  });

  it('resolves aspect ratio via GetImageDimensions and caches result in memory', async () => {
    vi.mocked(AppWails.GetImageDimensions).mockResolvedValueOnce({
      width: 1200,
      height: 800,
      orientation: 1,
      isRotated: false,
    });

    const src = '/local-image/img_123.jpg';
    const aspect1 = await resolveImageAspectRatio(src);
    expect(aspect1).toBe(1.5);
    expect(AppWails.GetImageDimensions).toHaveBeenCalledTimes(1);

    // Second call must be served from in-memory cache without calling Go again
    const aspect2 = await resolveImageAspectRatio(src);
    expect(aspect2).toBe(1.5);
    expect(AppWails.GetImageDimensions).toHaveBeenCalledTimes(1);
    expect(getCachedImageAspectRatio(src)).toBe(1.5);
  });

  it('correctly swaps width and height when isRotated is true', async () => {
    vi.mocked(AppWails.GetImageDimensions).mockResolvedValueOnce({
      width: 1200,
      height: 800,
      orientation: 6,
      isRotated: true,
    });

    const src = '/local-image/img_rotated.jpg';
    const aspect = await resolveImageAspectRatio(src);
    expect(aspect).toBeCloseTo(800 / 1200, 5);
    expect(getCachedImageAspectRatio(src)).toBeCloseTo(800 / 1200, 5);
  });

  it('resolves batch aspect ratios in a single GetBatchImageDimensions IPC call', async () => {
    const srcs = ['/local-image/a.jpg', '/local-image/b.jpg', '/local-image/c.jpg'];

    vi.mocked(AppWails.GetBatchImageDimensions).mockResolvedValueOnce({
      '/local-image/a.jpg': { width: 1000, height: 500, orientation: 1, isRotated: false },
      '/local-image/b.jpg': { width: 600, height: 600, orientation: 1, isRotated: false },
      '/local-image/c.jpg': { width: 800, height: 1200, orientation: 6, isRotated: true },
    });

    const resultMap = await resolveBatchImageAspectRatios(srcs);

    expect(AppWails.GetBatchImageDimensions).toHaveBeenCalledTimes(1);
    expect(AppWails.GetBatchImageDimensions).toHaveBeenCalledWith(srcs);

    expect(resultMap.get('/local-image/a.jpg')).toBe(2.0);
    expect(resultMap.get('/local-image/b.jpg')).toBe(1.0);
    expect(resultMap.get('/local-image/c.jpg')).toBe(1.5);

    // All should now be present in the cache
    expect(getCachedImageAspectRatio('/local-image/a.jpg')).toBe(2.0);
    expect(getCachedImageAspectRatio('/local-image/b.jpg')).toBe(1.0);
    expect(getCachedImageAspectRatio('/local-image/c.jpg')).toBe(1.5);

    // Subsequent batch call with the same srcs should NOT invoke Go
    const secondResult = await resolveBatchImageAspectRatios(srcs);
    expect(AppWails.GetBatchImageDimensions).toHaveBeenCalledTimes(1);
    expect(secondResult.get('/local-image/a.jpg')).toBe(2.0);
  });

  it('measureImageAspect immediately returns cached aspect ratio without DOM Image instantiation', async () => {
    setCachedImageAspectRatio('/local-image/cached.jpg', 1.75);

    const aspect = await measureImageAspect('/local-image/cached.jpg');
    expect(aspect).toBe(1.75);
    expect(AppWails.GetImageDimensions).not.toHaveBeenCalled();
  });
});
