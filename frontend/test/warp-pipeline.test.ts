import { describe, it, expect, beforeAll } from 'vitest';

import {
  createMockContext,
  installScannerCanvasMock,
  makeSourceCanvas,
} from './helpers/scanner-canvas-mock';
import {
  computeSourceCrop,
  toLocalCorners,
  warpSourceImage,
} from '../src/components/editor/document-scanner/core/warp-pipeline';

import type { Point } from '../src/components/editor/document-scanner/core/types';

describe('warp-pipeline', () => {
  beforeAll(() => {
    installScannerCanvasMock();
  });

  it('crops the source to the document area with a safety margin', () => {
    const corners: Point[] = [
      { x: 20, y: 30 },
      { x: 80, y: 30 },
      { x: 80, y: 90 },
      { x: 20, y: 90 },
    ];

    const crop = computeSourceCrop(corners, 100, 120);
    expect(crop.x).toBe(18);
    expect(crop.y).toBe(28);
    expect(crop.width).toBe(65);
    expect(crop.height).toBe(65);

    const local = toLocalCorners(corners, crop);
    expect(local[0]).toEqual({ x: 2, y: 2 });
    expect(local[2]).toEqual({ x: 62, y: 62 });
  });

  it('clamps the crop inside the source bounds', () => {
    const corners: Point[] = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 500 },
      { x: 0, y: 500 },
    ];
    const crop = computeSourceCrop(corners, 100, 100);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
    expect(crop.width).toBeLessThanOrEqual(100);
    expect(crop.height).toBeLessThanOrEqual(100);
  });

  it('produces a warped canvas of the requested size from the cropped region', () => {
    const source = makeSourceCanvas(100, 100, [220, 30, 40, 255]);
    const corners: Point[] = [
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 90, y: 90 },
      { x: 10, y: 90 },
    ];

    const result = warpSourceImage(source as unknown as CanvasImageSource, 100, 100, {
      corners,
      targetW: 40,
      targetH: 40,
      filterMode: 'original',
      rotation: 0,
    });

    expect(result.width).toBe(40);
    expect(result.height).toBe(40);

    const ctx = createMockContext(result as unknown as Parameters<typeof createMockContext>[0]);
    const pixel = ctx.getImageData(20, 20, 1, 1).data;
    expect(pixel[0]).toBe(220);
    expect(pixel[1]).toBe(30);
    expect(pixel[2]).toBe(40);
    expect(pixel[3]).toBe(255);
  });
});
