import { describe, it, expect, beforeAll } from 'vitest';
import {
  computeSourceCrop,
  toLocalCorners,
  warpSourceImage,
} from '../src/components/editor/document-scanner/core/warp-pipeline';
import type { Point } from '../src/components/editor/document-scanner/core/types';

/**
 * محاكاة كانفس ثنائي الأبعاد في jsdom (jsdom لا ينفّذ Canvas فعلياً).
 * تدعم الصيغ الثلاث لـ drawImage: 3 و5 و9 وسائط.
 */
interface MockCanvas {
  width: number;
  height: number;
  _mockData: Uint8ClampedArray;
}

function createMockContext(canvas: MockCanvas) {
  const ensure = () => {
    const needed = (canvas.width || 1) * (canvas.height || 1) * 4;
    if (!canvas._mockData || canvas._mockData.length !== needed) {
      canvas._mockData = new Uint8ClampedArray(needed);
    }
    return canvas._mockData;
  };

  return {
    canvas,
    createImageData: (cw: number, ch: number) => ({
      data: new Uint8ClampedArray(cw * ch * 4),
      width: cw,
      height: ch,
    }),
    putImageData: (
      imgData: { data: Uint8ClampedArray; width: number; height: number },
      dx = 0,
      dy = 0,
    ) => {
      const dest = ensure();
      const destW = canvas.width || 1;
      for (let y = 0; y < imgData.height; y++) {
        for (let x = 0; x < imgData.width; x++) {
          const sIdx = (y * imgData.width + x) * 4;
          const dIdx = ((dy + y) * destW + (dx + x)) * 4;
          if (dIdx >= 0 && dIdx + 3 < dest.length) {
            dest[dIdx] = imgData.data[sIdx];
            dest[dIdx + 1] = imgData.data[sIdx + 1];
            dest[dIdx + 2] = imgData.data[sIdx + 2];
            dest[dIdx + 3] = imgData.data[sIdx + 3];
          }
        }
      }
    },
    getImageData: (sx = 0, sy = 0, sw?: number, sh?: number) => {
      const gw = sw ?? canvas.width ?? 1;
      const gh = sh ?? canvas.height ?? 1;
      const src = ensure();
      const srcW = canvas.width || 1;
      const out = new Uint8ClampedArray(gw * gh * 4);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const sIdx = ((sy + y) * srcW + (sx + x)) * 4;
          const dIdx = (y * gw + x) * 4;
          if (sIdx >= 0 && sIdx + 3 < src.length) {
            out[dIdx] = src[sIdx];
            out[dIdx + 1] = src[sIdx + 1];
            out[dIdx + 2] = src[sIdx + 2];
            out[dIdx + 3] = src[sIdx + 3];
          }
        }
      }
      return { data: out, width: gw, height: gh } as unknown as ImageData;
    },
    drawImage: (src: MockCanvas, ...args: number[]) => {
      if (!src || !src._mockData) return;
      const dest = ensure();
      const destW = canvas.width || 1;
      const srcW = src.width || 1;

      let sx = 0;
      let sy = 0;
      let sw = srcW;
      let sh = src.height || 1;
      let dx = 0;
      let dy = 0;
      let dw = sw;
      let dh = sh;

      if (args.length === 2) {
        [dx, dy] = args;
      } else if (args.length === 4) {
        [dx, dy, dw, dh] = args;
      } else if (args.length >= 8) {
        [sx, sy, sw, sh, dx, dy, dw, dh] = args;
      }

      const srcData = src._mockData;
      for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
          const srcX = sx + Math.floor((x * sw) / dw);
          const srcY = sy + Math.floor((y * sh) / dh);
          const sIdx = (srcY * srcW + srcX) * 4;
          const dIdx = ((dy + y) * destW + (dx + x)) * 4;
          if (sIdx >= 0 && sIdx + 3 < srcData.length && dIdx >= 0 && dIdx + 3 < dest.length) {
            dest[dIdx] = srcData[sIdx];
            dest[dIdx + 1] = srcData[sIdx + 1];
            dest[dIdx + 2] = srcData[sIdx + 2];
            dest[dIdx + 3] = srcData[sIdx + 3];
          }
        }
      }
    },
    translate: () => {},
    rotate: () => {},
    clearRect: () => {},
  };
}

function makeSourceCanvas(width: number, height: number, rgba: [number, number, number, number]) {
  const canvas: MockCanvas = {
    width,
    height,
    _mockData: new Uint8ClampedArray(width * height * 4),
  };
  for (let i = 0; i < width * height; i++) {
    canvas._mockData[i * 4] = rgba[0];
    canvas._mockData[i * 4 + 1] = rgba[1];
    canvas._mockData[i * 4 + 2] = rgba[2];
    canvas._mockData[i * 4 + 3] = rgba[3];
  }
  return canvas;
}

describe('warp-pipeline', () => {
  beforeAll(() => {
    (HTMLCanvasElement.prototype as any).getContext = function (this: HTMLCanvasElement) {
      const mock = this as any as MockCanvas;
      mock._mockData = mock._mockData ?? new Uint8ClampedArray(0);
      return createMockContext(mock);
    };
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

    const ctx = createMockContext(result as unknown as MockCanvas);
    const pixel = ctx.getImageData(20, 20, 1, 1).data;
    expect(pixel[0]).toBe(220);
    expect(pixel[1]).toBe(30);
    expect(pixel[2]).toBe(40);
    expect(pixel[3]).toBe(255);
  });
});
