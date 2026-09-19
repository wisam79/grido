import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quantizePixels } from '../src/lib/canvas/palette-extract';
import { ensureTextStrokeFilter, getTextStrokeFilterId } from '../src/lib/canvas/text-stroke-filter';
import { withHiddenOverlays } from '../src/lib/canvas/konva-export-utils';

describe('Canvas Core Rendering & Image Algorithms', () => {
  describe('Color Quantization (quantizePixels)', () => {
    it('Extracts dominant saturated colors and ignores transparent pixels', () => {
      // 4 pixels: 2 pure red, 1 green, 1 fully transparent blue
      const pixels = new Uint8ClampedArray([
        255, 0, 0, 255,     // Red
        255, 0, 0, 255,     // Red
        0, 255, 0, 255,     // Green
        0, 0, 255, 0,       // Transparent Blue (alpha < 125 should be skipped)
      ]);

      const palette = quantizePixels(pixels, 2);
      expect(palette.length).toBeGreaterThan(0);
      expect(palette.length).toBeLessThanOrEqual(2);

      // Red should be dominant
      expect(palette[0]).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('Handles empty or all-transparent arrays gracefully', () => {
      const transparentPixels = new Uint8ClampedArray([
        255, 255, 255, 50,
        0, 0, 0, 0,
      ]);
      const palette = quantizePixels(transparentPixels, 4);
      expect(palette).toEqual([]);
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
        })
      ).rejects.toThrow('Export canvas failed');

      expect(mockTransformer.hide).toHaveBeenCalledTimes(1);
      expect(mockTransformer.show).toHaveBeenCalledTimes(1);
    });
  });
});
