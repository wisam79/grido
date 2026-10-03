import { describe, it, expect, vi, beforeEach } from 'vitest';
import Konva from 'konva';
import { quantizePixels, buildColorHarmony } from '../src/lib/canvas/palette-extract';
import {
  ensureTextStrokeFilter,
  getTextStrokeFilterId,
} from '../src/lib/canvas/text-stroke-filter';
import { withHiddenOverlays } from '../src/lib/canvas/konva-export-utils';
import { getKonvaFilters } from '../src/lib/filters/konva-filters';
import {
  applyLuminanceThreshold,
  applyNearestPixelate,
  isPixelFilter,
  PIXELATE_BLOCK_PX,
} from '../src/lib/filters/pixel-filters';
import {
  RING_INNER_RATIO,
  resolveRingInnerRadius,
  ringInnerRadiusMax,
  ringOuterRadius,
} from '../src/lib/canvas/ring-geometry';
import { buildAdjustmentCSS, buildCSSFilter } from '../src/lib/utils';
import { isSpaceHandledByTarget } from '../src/components/editor/canvas/use-canvas-viewport';
import { CanvasElementSchema } from '../src/lib/schema';

describe('Canvas Core Rendering & Image Algorithms', () => {
  describe('Color Quantization (quantizePixels)', () => {
    it('Extracts dominant saturated colors and ignores transparent pixels', () => {
      // 4 pixels: 2 pure red, 1 green, 1 fully transparent blue
      const pixels = new Uint8ClampedArray([
        255,
        0,
        0,
        255, // Red
        255,
        0,
        0,
        255, // Red
        0,
        255,
        0,
        255, // Green
        0,
        0,
        255,
        0, // Transparent Blue (alpha < 125 should be skipped)
      ]);

      const palette = quantizePixels(pixels, 2);
      expect(palette.length).toBeGreaterThan(0);
      expect(palette.length).toBeLessThanOrEqual(2);

      // Red should be dominant
      expect(palette[0]).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('Handles empty or all-transparent arrays gracefully', () => {
      const transparentPixels = new Uint8ClampedArray([255, 255, 255, 50, 0, 0, 0, 0]);
      const palette = quantizePixels(transparentPixels, 4);
      expect(palette).toEqual([]);
    });
  });

  describe('Color Harmonies (buildColorHarmony)', () => {
    it('Generates complementary pair with valid hex output', () => {
      const pair = buildColorHarmony('#c0392b', 'complementary');
      expect(pair).toHaveLength(2);
      pair.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
      expect(pair[0].toLowerCase()).toBe('#c0392b');
      expect(pair[1].toLowerCase()).not.toBe('#c0392b');
    });

    it('Generates analogous and triadic sets with base included', () => {
      const analogous = buildColorHarmony('#2980b9', 'analogous');
      expect(analogous).toHaveLength(3);
      expect(analogous[1].toLowerCase()).toBe('#2980b9');

      const triadic = buildColorHarmony('#2980b9', 'triadic');
      expect(triadic).toHaveLength(3);
      expect(triadic[0].toLowerCase()).toBe('#2980b9');
      expect(new Set(triadic.map((c) => c.toLowerCase())).size).toBe(3);
    });

    it('Falls back to base color for invalid input', () => {
      expect(buildColorHarmony('not-a-color', 'complementary')).toEqual(['not-a-color']);
    });
  });

  describe('Morphological Text Stroke Filter (ensureTextStrokeFilter)', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('Generates deterministic and sanitized filter IDs', () => {
      const id1 = getTextStrokeFilterId(2.5, '#FF0000');
      const id2 = getTextStrokeFilterId(2.5, 'ff0000');
      expect(id1).toBe(id2);
      expect(id1).toBe('grido-text-stroke-2.5-ff0000');
    });

    it('Creates SVG defs container with feMorphology operator="dilate"', () => {
      const filterId = ensureTextStrokeFilter(3, '#000000');
      expect(filterId).toBeTruthy();

      const container = document.getElementById('grido-text-stroke-filters-container');
      expect(container).not.toBeNull();
      expect(container?.tagName.toLowerCase()).toBe('svg');

      const filterElem = document.getElementById(filterId);
      expect(filterElem).not.toBeNull();

      const morph = filterElem?.querySelector('feMorphology');
      expect(morph).not.toBeNull();
      expect(morph?.getAttribute('operator')).toBe('dilate');
      expect(morph?.getAttribute('radius')).toBe('3');

      // Calling again returns existing filter without duplicates
      const secondCallId = ensureTextStrokeFilter(3, '#000000');
      expect(secondCallId).toBe(filterId);
      expect(document.querySelectorAll(`filter#${filterId}`).length).toBe(1);
    });

    it('Returns empty string when radius <= 0', () => {
      expect(ensureTextStrokeFilter(0, '#000')).toBe('');
      expect(ensureTextStrokeFilter(-1, '#000')).toBe('');
    });
  });

  describe('Konva Export Overlays Management (withHiddenOverlays)', () => {
    it('Hides overlays before export and restores them even on error', async () => {
      const mockTransformer = { hide: vi.fn(), show: vi.fn() };
      const mockGrid = { hide: vi.fn(), show: vi.fn() };

      const mockStage = {
        find: (selector: string) => {
          if (selector === 'Transformer') return [mockTransformer];
          if (selector === '.grid-layer') return [mockGrid];
          return [];
        },
        batchDraw: vi.fn(),
      } as any;

      // 1. Success case
      const result = await withHiddenOverlays(mockStage, 2, () => 'export_ok');
      expect(result).toBe('export_ok');
      expect(mockTransformer.hide).toHaveBeenCalledTimes(1);
      expect(mockGrid.hide).toHaveBeenCalledTimes(1);
      expect(mockTransformer.show).toHaveBeenCalledTimes(1);
      expect(mockGrid.show).toHaveBeenCalledTimes(1);
      expect(mockStage.batchDraw).toHaveBeenCalledTimes(2);

      // 2. Exception case: ensure overlays are restored in finally block
      mockTransformer.hide.mockClear();
      mockTransformer.show.mockClear();

      await expect(
        withHiddenOverlays(mockStage, 2, () => {
          throw new Error('Export canvas failed');
        }),
      ).rejects.toThrow('Export canvas failed');

      expect(mockTransformer.hide).toHaveBeenCalledTimes(1);
      expect(mockTransformer.show).toHaveBeenCalledTimes(1);
    });
  });

  describe('Konva Filters Integration (getKonvaFilters)', () => {
    it('configures pixelate filter with pixelSize', () => {
      const res = getKonvaFilters({ filter: 'pixelate' });
      expect(res.pixelSize).toBe(10);
      expect(res.filters.length).toBeGreaterThan(0);
    });

    it('configures threshold filter with threshold ratio', () => {
      const res = getKonvaFilters({ filter: 'threshold' });
      expect(res.threshold).toBe(0.5);
      expect(res.filters.length).toBeGreaterThan(0);
    });

    it('returns empty filters for default unedited image', () => {
      const res = getKonvaFilters({ filter: 'none' });
      expect(res.filters).toHaveLength(0);
      expect(res.brightness).toBe(1);
      expect(res.contrast).toBe(0);
      expect(res.saturation).toBe(0);
    });

    it('applies color adjustments before the pixel filter (Go order)', () => {
      const konvaFilters = Konva.Filters as unknown as Record<string, unknown>;
      const res = getKonvaFilters({ filter: 'pixelate', brightness: 130 });

      const brightnessAt = res.filters.indexOf(
        konvaFilters.Brightness as unknown as (typeof res.filters)[number],
      );
      const pixelateAt = res.filters.indexOf(
        konvaFilters.NearestNeighborPixelate as unknown as (typeof res.filters)[number],
      );

      expect(brightnessAt).toBeGreaterThanOrEqual(0);
      expect(pixelateAt).toBeGreaterThan(brightnessAt);
    });
  });

  describe('Pixel Filters parity with Go print pipeline', () => {
    it('threshold keys on luminance and preserves alpha', () => {
      const data = new Uint8ClampedArray([
        255,
        0,
        0,
        255, // red — luminance 76 → black
        0,
        0,
        0,
        255, // black → black
        255,
        255,
        255,
        255, // white → white
        255,
        255,
        255,
        40, // white but transparent → stays transparent
      ]);

      applyLuminanceThreshold(data, 0.5);

      expect([data[0], data[1], data[2], data[3]]).toEqual([0, 0, 0, 255]);
      expect([data[4], data[5], data[6], data[7]]).toEqual([0, 0, 0, 255]);
      expect([data[8], data[9], data[10], data[11]]).toEqual([255, 255, 255, 255]);
      expect([data[12], data[13], data[14], data[15]]).toEqual([255, 255, 255, 40]);
    });

    it('pixelate snaps each block to a single sampled color', () => {
      const width = 20;
      const height = 20;
      const data = new Uint8ClampedArray(width * height * 4);
      // left half red, right half blue — with 10px blocks each half must stay flat
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const red = x < 10;
          data[i] = red ? 255 : 0;
          data[i + 1] = 0;
          data[i + 2] = red ? 0 : 255;
          data[i + 3] = 255;
        }
      }

      applyNearestPixelate(data, width, height, PIXELATE_BLOCK_PX);

      const colorAt = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return `${data[i]},${data[i + 1]},${data[i + 2]}`;
      };
      expect(colorAt(0, 0)).toBe('255,0,0');
      expect(colorAt(9, 19)).toBe('255,0,0');
      expect(colorAt(10, 0)).toBe('0,0,255');
      expect(colorAt(19, 19)).toBe('0,0,255');
    });

    it('pixelate leaves an image smaller than one block untouched', () => {
      const data = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]);
      applyNearestPixelate(data, 2, 1, PIXELATE_BLOCK_PX);
      expect([...data]).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
    });

    it('identifies pixel filters and routes them away from CSS', () => {
      expect(isPixelFilter('pixelate')).toBe(true);
      expect(isPixelFilter('threshold')).toBe(true);
      expect(isPixelFilter('cinematic')).toBe(false);
      expect(isPixelFilter(undefined)).toBe(false);

      expect(buildCSSFilter({ filter: 'pixelate' })).not.toContain('pixelate');
      expect(buildAdjustmentCSS({ brightness: 120 })).toBe('brightness(120%)');
      expect(buildAdjustmentCSS({ brightness: 100 })).toBe('none');
      expect(buildAdjustmentCSS(undefined)).toBe('none');
      expect(buildCSSFilter({ filter: 'cinematic', contrast: 120 })).toContain('contrast(120%)');
    });
  });

  describe('Ring geometry', () => {
    it('keeps the inner radius positive and inside the outer radius', () => {
      const outer = ringOuterRadius(200, 200);
      expect(resolveRingInnerRadius(undefined, 200, 200)).toBe(200 * RING_INNER_RATIO);
      // أعلى من الخارج ⇒ يُحبس على الحد الأعلى
      expect(resolveRingInnerRadius(outer * 2, 200, 200)).toBe(ringInnerRadiusMax(200, 200));
      // صفر ⇒ يُرفع للحد الأدنى (تبقى الحلقة بحفرة بدل أن تصير قرصاً ممتلئاً)
      expect(resolveRingInnerRadius(0, 200, 200)).toBe(1);
      expect(ringInnerRadiusMax(200, 200)).toBeLessThan(outer);
      expect(ringInnerRadiusMax(8, 8)).toBe(3);
      expect(ringInnerRadiusMax(2, 2)).toBe(1);
      expect(ringOuterRadius(200, 200)).toBe(100);
    });
  });

  describe('Space-pan focus guard', () => {
    it('leaves space to controls that consume it', () => {
      for (const tag of ['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SUMMARY', 'SELECT']) {
        expect(isSpaceHandledByTarget({ tagName: tag } as HTMLElement)).toBe(true);
      }
      expect(isSpaceHandledByTarget({ tagName: 'DIV' } as HTMLElement)).toBe(false);
      expect(
        isSpaceHandledByTarget({ isContentEditable: true, tagName: 'DIV' } as HTMLElement),
      ).toBe(true);
      expect(isSpaceHandledByTarget(null)).toBe(false);
    });
  });

  describe('Rich Native Shapes & Vector Masking Schema', () => {
    it('validates polygon shape with sides parameter', () => {
      const parsed = CanvasElementSchema.safeParse({
        id: 'poly-1',
        type: 'shape',
        shape: 'polygon',
        sides: 6,
        x: 0,
        y: 0,
        width: 0.2,
        height: 0.2,
        rotation: 0,
        opacity: 1,
        zIndex: 1,
      });
      expect(parsed.success).toBe(true);
    });

    it('validates arrow shape with pointer parameters', () => {
      const parsed = CanvasElementSchema.safeParse({
        id: 'arrow-1',
        type: 'shape',
        shape: 'arrow',
        pointerLength: 14,
        pointerWidth: 14,
        x: 0,
        y: 0,
        width: 0.3,
        height: 0.1,
        rotation: 0,
        opacity: 1,
        zIndex: 1,
      });
      expect(parsed.success).toBe(true);
    });

    it('validates ring shape with innerRadius parameter', () => {
      const parsed = CanvasElementSchema.safeParse({
        id: 'ring-1',
        type: 'shape',
        shape: 'ring',
        innerRadius: 25,
        x: 0,
        y: 0,
        width: 0.2,
        height: 0.2,
        rotation: 0,
        opacity: 1,
        zIndex: 1,
      });
      expect(parsed.success).toBe(true);
    });

    it('validates image vector maskShape attribute', () => {
      const parsed = CanvasElementSchema.safeParse({
        id: 'img-1',
        type: 'image',
        imageSrc: 'data:image/png;base64,...',
        maskShape: 'circle',
        x: 0,
        y: 0,
        width: 0.4,
        height: 0.4,
        rotation: 0,
        opacity: 1,
        zIndex: 1,
      });
      expect(parsed.success).toBe(true);
    });
  });
});
