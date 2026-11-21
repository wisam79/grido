import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { renderPixelPreviewOverride } = vi.hoisted(() => ({
  renderPixelPreviewOverride: {
    fn: null as
      | ((
          ...args: unknown[]
        ) => Promise<{ url: string; naturalW: number; naturalH: number } | null>)
      | null,
  },
}));

vi.mock('@/components/editor/print/print-pixel-preview', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/editor/print/print-pixel-preview')>();
  return {
    ...actual,
    renderPixelFilterPreview: (...args: unknown[]) =>
      renderPixelPreviewOverride.fn
        ? renderPixelPreviewOverride.fn(...args)
        : actual.renderPixelFilterPreview(
            ...(args as Parameters<typeof actual.renderPixelFilterPreview>),
          ),
  };
});

import {
  buildPixelPreviewCacheKey,
  renderPixelFilterPreview,
} from '@/components/editor/print/print-pixel-preview';
import { SheetPreview } from '@/components/editor/print/print-preview';

import type { SheetGrid } from '@/lib/print/print-layout-math';
import type { CanvasSlot } from '@/lib/store/types';

const grid: SheetGrid = {
  safeCols: 1,
  actualRows: 1,
  gridWidth: 100,
  gridHeight: 100,
  offsetX: 0,
  offsetY: 0,
  cellWidth: 100,
  cellHeight: 100,
};

const baseSlot: CanvasSlot = {
  id: 'slot-1',
  cellIndex: 0,
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  imageSrc: 'data:image/png;base64,orig',
  zoom: 1,
  dragX: 0,
  dragY: 0,
  rotation: 0,
  flipX: true,
  flipY: false,
  filter: 'pixelate',
  cropMode: 'centered',
};

describe('print-pixel-preview crop & cache key', () => {
  const OriginalImage = globalThis.Image;
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;

  let drawImageCalls: Array<unknown[]> = [];

  beforeEach(() => {
    renderPixelPreviewOverride.fn = null;
    drawImageCalls = [];

    class MockImage {
      naturalWidth = 1200;
      naturalHeight = 800;
      width = 1200;
      height = 800;
      crossOrigin: string | null = null;
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      private _src = '';
      get src() {
        return this._src;
      }
      set src(val: string) {
        this._src = val;
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }
    vi.stubGlobal('Image', MockImage);

    HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement) {
      const w = this.width || 100;
      const h = this.height || 100;
      return {
        drawImage: (...args: unknown[]) => {
          drawImageCalls.push(args);
        },
        getImageData: () => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        }),
        putImageData: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,baked');
  });

  afterEach(() => {
    vi.stubGlobal('Image', OriginalImage);
    HTMLCanvasElement.prototype.getContext = origGetContext;
    HTMLCanvasElement.prototype.toDataURL = origToDataURL;
    renderPixelPreviewOverride.fn = null;
    vi.restoreAllMocks();
  });

  it('buildPixelPreviewCacheKey reacts to zoom, dragX, dragY, rotation, and cropMode', () => {
    const base = buildPixelPreviewCacheKey('img://a', 'pixelate', baseSlot, 200, 200, 12);
    expect(
      buildPixelPreviewCacheKey('img://a', 'pixelate', { ...baseSlot, zoom: 2 }, 200, 200, 12),
    ).not.toBe(base);
    expect(
      buildPixelPreviewCacheKey('img://a', 'pixelate', { ...baseSlot, dragX: 50 }, 200, 200, 12),
    ).not.toBe(base);
    expect(
      buildPixelPreviewCacheKey('img://a', 'pixelate', { ...baseSlot, dragY: 30 }, 200, 200, 12),
    ).not.toBe(base);
    expect(
      buildPixelPreviewCacheKey('img://a', 'pixelate', { ...baseSlot, rotation: 90 }, 200, 200, 12),
    ).not.toBe(base);
    expect(
      buildPixelPreviewCacheKey(
        'img://a',
        'pixelate',
        { ...baseSlot, cropMode: 'legacy' },
        200,
        200,
        12,
      ),
    ).not.toBe(base);
  });

  it('renderPixelFilterPreview bakes dragX/dragY at zoom=1 into drawImage source crop', async () => {
    const res = await renderPixelFilterPreview(
      'data:image/png;base64,pan-z1',
      'pixelate',
      { ...baseSlot, zoom: 1, dragX: 200, dragY: 0, cropMode: 'centered' },
      { wMM: 40, hMM: 40 },
    );
    expect(res?.url).toBe('data:image/png;base64,baked');
    expect(drawImageCalls.length).toBe(1);
    const [, sx, sy, sw, sh] = drawImageCalls[0] as [unknown, number, number, number, number];
    expect(sx).toBe(400);
    expect(sy).toBe(0);
    expect(sw).toBe(800);
    expect(sh).toBe(800);
  });

  it('renderPixelFilterPreview uses swapped local aspect for 90deg rotation', async () => {
    await renderPixelFilterPreview(
      'data:image/png;base64,rot-90',
      'pixelate',
      { ...baseSlot, rotation: 90, zoom: 1, dragX: 0, dragY: 0, cropMode: 'centered' },
      { wMM: 40, hMM: 60 },
    );
    expect(drawImageCalls.length).toBe(1);
    const [, sx, sy, sw, sh, dx, dy, dw, dh] = drawImageCalls[0] as [
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
    expect(sx).toBe(0);
    expect(sy).toBe(0);
    expect(sw).toBe(1200);
    expect(sh).toBe(800);
    expect(dx).toBe(0);
    expect(dy).toBe(0);
    expect(dw).toBeGreaterThan(dh);
  });

  it('renderPixelFilterPreview differentiates legacy vs centered cropMode', async () => {
    await renderPixelFilterPreview(
      'data:image/png;base64,mode-legacy',
      'pixelate',
      { ...baseSlot, zoom: 2, dragX: 0, dragY: 0, cropMode: 'legacy' },
      { wMM: 60, hMM: 30 },
    );
    await renderPixelFilterPreview(
      'data:image/png;base64,mode-centered',
      'pixelate',
      { ...baseSlot, zoom: 2, dragX: 0, dragY: 0, cropMode: 'centered' },
      { wMM: 60, hMM: 30 },
    );
    expect(drawImageCalls.length).toBe(2);
    const [, legacySx, legacySy] = drawImageCalls[0] as [unknown, number, number];
    const [, centeredSx, centeredSy] = drawImageCalls[1] as [unknown, number, number];
    expect(legacySx).toBe(0);
    expect(legacySy).toBe(250);
    expect(centeredSx).toBe(300);
    expect(centeredSy).toBe(250);
  });

  it('applies base threshold recipe BEFORE user brightness adjustments (canonical filter order)', async () => {
    const putCalls: Array<Uint8ClampedArray> = [];
    HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement) {
      const w = this.width || 100;
      const h = this.height || 100;
      const buf = new Uint8ClampedArray(w * h * 4);
      // Mid-gray pixels (100 < 128 threshold); with brightness=200:
      // Canonical order (threshold -> brightness) produces 0; reversed order would produce 255.
      for (let i = 0; i < buf.length; i += 4) {
        buf[i] = 100;
        buf[i + 1] = 100;
        buf[i + 2] = 100;
        buf[i + 3] = 255;
      }
      return {
        drawImage: (...args: unknown[]) => {
          drawImageCalls.push(args);
        },
        getImageData: () => ({
          data: buf,
          width: w,
          height: h,
        }),
        putImageData: (img: ImageData) => {
          putCalls.push(new Uint8ClampedArray(img.data));
        },
      } as unknown as CanvasRenderingContext2D;
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    await renderPixelFilterPreview(
      'data:image/png;base64,threshold-order',
      'threshold',
      { ...baseSlot, filter: 'threshold', brightness: 200 },
      { wMM: 20, hMM: 20, dpi: 150 },
    );

    expect(putCalls).toHaveLength(1);
    expect(putCalls[0][0]).toBe(0);
    expect(putCalls[0][1]).toBe(0);
    expect(putCalls[0][2]).toBe(0);
    expect(putCalls[0][3]).toBe(255);
  });
});

describe('SheetPreview with active pixelPreviewSrc', () => {
  afterEach(() => {
    renderPixelPreviewOverride.fn = null;
    vi.restoreAllMocks();
  });

  it('does not double-apply zoom/pan/objectPosition while keeping rotate/flip T·R·S order', async () => {
    renderPixelPreviewOverride.fn = vi.fn().mockResolvedValue({
      url: 'data:image/png;base64,filtered-ok',
      naturalW: 1200,
      naturalH: 800,
    });

    const { container } = render(
      <SheetPreview
        grid={grid}
        count={1}
        imageWidthMM={100}
        imageHeightMM={100}
        gapMM={0}
        zoom={1}
        showCutLines={false}
        mode="collage"
        backgroundColor="#ffffff"
        previewImageSrc=""
        slots={[{ ...baseSlot, zoom: 2.2, dragX: 150, dragY: -40, rotation: 90, flipX: true }]}
      />,
    );

    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('data:image/png;base64,filtered-ok');
    });

    const img = container.querySelector('img')!;
    expect(img.style.objectPosition).toBe('');
    expect(img.style.transform).toBe('scale(1) rotate(90deg) scaleX(-1) scaleY(1)');
    expect(img.style.transform).not.toContain('translate(');
  });

  it('ignores stale async pixel preview results after slot pan changes', async () => {
    type Res = { url: string; naturalW: number; naturalH: number } | null;
    let resolveFirst!: (v: Res) => void;
    let resolveSecond!: (v: Res) => void;

    const spy = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Res>((res) => {
            resolveFirst = res;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Res>((res) => {
            resolveSecond = res;
          }),
      );
    renderPixelPreviewOverride.fn = spy;

    const { container, rerender } = render(
      <SheetPreview
        grid={grid}
        count={1}
        imageWidthMM={100}
        imageHeightMM={100}
        gapMM={0}
        zoom={1}
        showCutLines={false}
        mode="collage"
        backgroundColor="#ffffff"
        previewImageSrc=""
        slots={[{ ...baseSlot, dragX: 0 }]}
      />,
    );

    rerender(
      <SheetPreview
        grid={grid}
        count={1}
        imageWidthMM={100}
        imageHeightMM={100}
        gapMM={0}
        zoom={1}
        showCutLines={false}
        mode="collage"
        backgroundColor="#ffffff"
        previewImageSrc=""
        slots={[{ ...baseSlot, dragX: 120 }]}
      />,
    );

    expect(spy).toHaveBeenCalledTimes(2);
    resolveSecond({ url: 'data:image/png;base64,latest', naturalW: 1200, naturalH: 800 });

    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toBe('data:image/png;base64,latest');
    });

    resolveFirst({ url: 'data:image/png;base64,stale', naturalW: 1200, naturalH: 800 });
    await Promise.resolve();
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('data:image/png;base64,latest');
  });
});
