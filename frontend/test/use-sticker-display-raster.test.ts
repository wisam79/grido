import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rasterizeMock = vi.fn(
  async (_svg: string, width: number, height: number): Promise<HTMLCanvasElement> => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  },
);

const renderBlobMock = vi.fn(async (_svg: string, width: number, height: number): Promise<Blob> => {
  return new Blob([`${width}x${height}`], { type: 'image/png' });
});

vi.mock('@/features/stickers/lib/svg-rasterizer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/stickers/lib/svg-rasterizer')>();
  return {
    ...actual,
    rasterizeSvgToCanvas: (...args: Parameters<typeof actual.rasterizeSvgToCanvas>) =>
      rasterizeMock(args[0], args[1], args[2]),
    renderSvgToPngBlob: (...args: Parameters<typeof actual.renderSvgToPngBlob>) =>
      renderBlobMock(args[0], args[1] ?? 0, args[2] ?? 0),
  };
});

import {
  computeStickerCoverRasterSize,
  prepareStickerExportOverrides,
} from '@/features/stickers/lib/print-rerasterize';
import {
  clearStickerDisplayCache,
  MAX_STICKER_DISPLAY_DIM,
  useStickerDisplayRaster,
} from '@/hooks/use-sticker-display-raster';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import { swapNodeImagesForCapture } from '@/lib/canvas/konva-export-utils';
import { useEditorStore } from '@/lib/editor-store';

import type { ImageElement, StickerElementSource } from '@/lib/store/types';
import type Konva from 'konva';

function makeBaseImage(width: number, height: number): HTMLImageElement {
  return {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
  } as unknown as HTMLImageElement;
}

const SAMPLE_SOURCE: StickerElementSource = {
  templateId: 'fragile-badge',
  params: {
    fields: { title: 'FRAGILE', subtitle: 'HANDLE WITH CARE' },
    primaryColor: '#e11d48',
    secondaryColor: '#111827',
    backgroundColor: '#ffffff',
    isTransparent: false,
    fontFamily: 'Cairo',
  },
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><rect width="500" height="500" fill="#e11d48"/></svg>',
};

describe('useStickerDisplayRaster & crisp sticker resizing', () => {
  beforeEach(() => {
    clearStickerDisplayCache();
    rasterizeMock.mockClear();
    renderBlobMock.mockClear();
    useEditorStore.setState({ canvasZoom: 1 });
    useCanvasInteraction.setState({ isDragging: false, isTransforming: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null without rasterizing for ordinary non-sticker images', async () => {
    const baseImage = makeBaseImage(591, 591);
    const { result } = renderHook(() =>
      useStickerDisplayRaster({
        stickerSource: undefined,
        nodeW: 2000,
        nodeH: 2000,
        baseImage,
      }),
    );

    expect(result.current).toBeNull();
    await new Promise((r) => setTimeout(r, 90));
    expect(rasterizeMock).not.toHaveBeenCalled();
  });

  it('keeps initial PNG when sticker is smaller than or within initial raster resolution', async () => {
    const baseImage = makeBaseImage(591, 591);
    const { result } = renderHook(() =>
      useStickerDisplayRaster({
        stickerSource: SAMPLE_SOURCE,
        nodeW: 500,
        nodeH: 500,
        baseImage,
      }),
    );

    await new Promise((r) => setTimeout(r, 90));
    expect(result.current).toBeNull();
    expect(rasterizeMock).not.toHaveBeenCalled();
  });

  it('upgrades enlarged sticker cleanly and preserves sharper canvas on subsequent shrink (monotonic)', async () => {
    const baseImage = makeBaseImage(591, 591);
    const { result, rerender } = renderHook(
      ({ nodeW, nodeH }: { nodeW: number; nodeH: number }) =>
        useStickerDisplayRaster({
          stickerSource: SAMPLE_SOURCE,
          nodeW,
          nodeH,
          baseImage,
        }),
      { initialProps: { nodeW: 1800, nodeH: 1800 } },
    );

    await waitFor(
      () => {
        expect(result.current).not.toBeNull();
      },
      { timeout: 1000 },
    );

    expect(rasterizeMock).toHaveBeenCalledTimes(1);
    expect(result.current?.width).toBe(1800);
    expect(result.current?.height).toBe(1800);

    // التصغير لاحقاً يحتفظ بالنسخة الأعلى دقة بلا إعادة تصيير إضافية
    rerender({ nodeW: 900, nodeH: 900 });
    await new Promise((r) => setTimeout(r, 90));
    expect(rasterizeMock).toHaveBeenCalledTimes(1);
    expect(result.current?.width).toBe(1800);
  });

  it('waits until active transform gesture finishes before allocating upgraded raster', async () => {
    useCanvasInteraction.setState({ isTransforming: true });
    const baseImage = makeBaseImage(591, 591);
    const { result } = renderHook(() =>
      useStickerDisplayRaster({
        stickerSource: SAMPLE_SOURCE,
        nodeW: 1600,
        nodeH: 1600,
        baseImage,
      }),
    );

    await new Promise((r) => setTimeout(r, 100));
    expect(rasterizeMock).not.toHaveBeenCalled();
    expect(result.current).toBeNull();

    act(() => {
      useCanvasInteraction.setState({ isTransforming: false });
    });

    await waitFor(
      () => {
        expect(result.current?.width).toBe(1600);
      },
      { timeout: 1000 },
    );
    expect(rasterizeMock).toHaveBeenCalledTimes(1);
  });

  it('computes cover-safe raster sizes and caps proportionally at maxDim', () => {
    // نسبة عرضية 2:1 داخل صندوق 1000×1000 تحتاج 2000×1000 حتى لا يكبّر المحور الضيق
    expect(computeStickerCoverRasterSize(1000, 1000, 2, MAX_STICKER_DISPLAY_DIM)).toEqual({
      width: 2000,
      height: 1000,
    });

    // تقليص متناسب عند تجاوز السقف التفاعلي
    expect(computeStickerCoverRasterSize(4000, 2000, 2, MAX_STICKER_DISPLAY_DIM)).toEqual({
      width: MAX_STICKER_DISPLAY_DIM,
      height: Math.round(MAX_STICKER_DISPLAY_DIM / 2),
    });
  });

  it('prepareStickerExportOverrides skips already crisp stage stickers and upgrades blurry ones', async () => {
    const elSharp: ImageElement = {
      id: 'st-sharp',
      type: 'image',
      x: 0,
      y: 0,
      width: 0.5,
      height: 0.5,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      imageSrc: '/local-image/small.png',
      stickerSource: SAMPLE_SOURCE,
    };
    const elBlurry: ImageElement = {
      id: 'st-blurry',
      type: 'image',
      x: 0.2,
      y: 0.2,
      width: 1,
      height: 1,
      rotation: 0,
      opacity: 1,
      zIndex: 2,
      imageSrc: '/local-image/small2.png',
      stickerSource: SAMPLE_SOURCE,
    };

    const crispCanvas = document.createElement('canvas');
    crispCanvas.width = 1240;
    crispCanvas.height = 1754;
    const smallImg = makeBaseImage(591, 591);

    const mockStage = {
      findOne: (selector: string) => {
        if (selector === '#st-sharp') {
          return {
            findOne: () => ({ image: () => crispCanvas }),
          };
        }
        if (selector === '#st-blurry') {
          return {
            findOne: () => ({ image: () => smallImg }),
          };
        }
        return null;
      },
    } as unknown as Konva.Stage;

    const createUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:grido-crisp-sticker');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const result = await prepareStickerExportOverrides({
      elements: [elSharp, elBlurry],
      canvasWidth: 2480,
      canvasHeight: 3508,
      stageRef: mockStage,
    });

    // st-sharp = 1240×1754 يكفي لـ 0.5×2480 × 0.5×3508 → صفر إعادة تصيير
    // st-blurry = 591×591 داخل 2480×3508 (aspect=1 -> 3508×3508) → ترقية كاملة
    expect(renderBlobMock).toHaveBeenCalledTimes(1);
    expect(renderBlobMock).toHaveBeenCalledWith(SAMPLE_SOURCE.svg, 3508, 3508);
    expect(result.imageOverrides).toEqual([
      { nodeId: 'st-blurry', src: 'blob:grido-crisp-sticker' },
    ]);
    expect(result.srcOverrides.get('st-blurry')).toBe('blob:grido-crisp-sticker');
    expect(createUrlSpy).toHaveBeenCalledTimes(1);

    result.dispose();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:grido-crisp-sticker');
  });

  it('swapNodeImagesForCapture unwraps Group nodes holding an inner Image child', async () => {
    const initialImg = makeBaseImage(591, 591);
    let activeImg: unknown = initialImg;

    // محاكاة تحميل الصورة البديلة في jsdom
    const OrigImage = globalThis.Image;
    globalThis.Image = class MockLoadedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin: string | null = null;
      naturalWidth = 2400;
      naturalHeight = 2400;
      width = 2400;
      height = 2400;
      decode() {
        return Promise.resolve();
      }
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    } as unknown as typeof Image;

    try {
      const innerImageNode = {
        image: (next?: unknown) => {
          if (next !== undefined) activeImg = next;
          return activeImg;
        },
      };
      const groupNode = {
        findOne: (sel: string) => (sel === 'Image' ? innerImageNode : null),
      };
      const mockStage = {
        findOne: (sel: string) => (sel === '#group-sticker-1' ? groupNode : null),
        batchDraw: () => {},
      } as unknown as Konva.Stage;

      const restore = await swapNodeImagesForCapture(mockStage, [
        { nodeId: 'group-sticker-1', src: 'blob:upgraded' },
      ]);

      expect((activeImg as { naturalWidth: number }).naturalWidth).toBe(2400);
      restore();
      expect(activeImg).toBe(initialImg);
    } finally {
      globalThis.Image = OrigImage;
    }
  });
});
