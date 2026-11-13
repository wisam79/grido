import { describe, expect, it } from 'vitest';

import { runFreeformPreflight } from '../src/lib/export/freeform-preflight';

import type { ImageElement } from '../src/lib/store/types';

const imageElement = (overrides: Partial<ImageElement> = {}): ImageElement => ({
  id: 'image-1',
  type: 'image',
  imageSrc: '/local-image/photo.png',
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
  visible: true,
  ...overrides,
});

const run = (
  element: ImageElement,
  dimensions: { width: number; height: number },
  minDpi: number,
) =>
  runFreeformPreflight({
    elements: [element],
    canvasWidthMM: 254,
    canvasHeightMM: 254,
    canvasWidthPx: 1000,
    canvasHeightPx: 1000,
    imageDimensions: new Map([[element.imageSrc, dimensions]]),
    minDpi,
  });

describe('freeform cover preflight', () => {
  it('uses the actual wide-source cover window instead of full source dimensions', () => {
    const result = run(imageElement({ width: 1, height: 1 }), { width: 4000, height: 1000 }, 150);

    // Square cover retains only 1000×1000 source pixels over a 10×10in destination => 100DPI.
    expect(result.blocking).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      elementId: 'image-1',
      kind: 'low-resolution',
    });
    expect(result.warnings[0].message).toContain('≈ 100DPI');
  });

  it('uses the actual tall-source cover window at an extreme destination aspect', () => {
    const result = run(imageElement({ width: 1, height: 0.1 }), { width: 1000, height: 8000 }, 150);

    // A 10:1 destination keeps 1000×100 source pixels; both axes resolve to 100DPI.
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('≈ 100DPI');
  });

  it('does not warn when the visible cover window meets the threshold', () => {
    const result = run(imageElement(), { width: 3000, height: 3000 }, 250);

    expect(result).toEqual({ blocking: [], warnings: [] });
  });

  it('still blocks missing dimensions rather than estimating from layout', () => {
    const element = imageElement();
    const result = runFreeformPreflight({
      elements: [element],
      canvasWidthMM: 254,
      canvasHeightMM: 254,
      canvasWidthPx: 1000,
      canvasHeightPx: 1000,
      imageDimensions: new Map(),
    });

    expect(result.blocking).toHaveLength(1);
    expect(result.blocking[0]).toMatchObject({
      elementId: 'image-1',
      kind: 'unreadable',
    });
  });
});
