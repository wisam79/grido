import { describe, it, expect } from 'vitest';

import {
  AUTO_TEXT_MAX_WIDTH_RATIO,
  AUTO_TEXT_MIN_WIDTH_PX,
  clampAutoTextWidthPx,
  resolveTextBoxAnchorOffsetPx,
  resolveTextSizing,
} from '../src/lib/canvas/text-fit';

describe('text-fit — sizing rules', () => {
  it('treats legacy elements as fixed and only an explicit auto as auto', () => {
    expect(resolveTextSizing({})).toBe('fixed');
    expect(resolveTextSizing({ textSizing: 'fixed' })).toBe('fixed');
    expect(resolveTextSizing({ textSizing: 'auto' })).toBe('auto');
  });

  it('clamps auto width between the minimum box and 95% of the canvas', () => {
    expect(clampAutoTextWidthPx(4, 1000)).toBe(AUTO_TEXT_MIN_WIDTH_PX);
    expect(clampAutoTextWidthPx(200, 1000)).toBe(200);
    expect(clampAutoTextWidthPx(4000, 1000)).toBe(1000 * AUTO_TEXT_MAX_WIDTH_RATIO);
  });

  it('never exceeds the canvas even for tiny canvases', () => {
    const width = clampAutoTextWidthPx(50, 20);
    expect(width).toBe(AUTO_TEXT_MIN_WIDTH_PX);
  });
});

describe('text-fit — resize anchor offsets', () => {
  it('keeps the traditional centre growth and top edge without an anchor', () => {
    const offset = resolveTextBoxAnchorOffsetPx(undefined, 200, 80, 300, 100, 0);
    // العرض زاد 100 → الأصل يتزحزح نصف الفرق يساراً؛ الارتفاع ينمو للأسفل.
    expect(offset.dxPx).toBeCloseTo(-50, 6);
    expect(offset.dyPx).toBeCloseTo(0, 6);
  });

  it.each([
    ['top-left', 0, 0],
    ['top-right', -100, 0],
    ['bottom-left', 0, -20],
    ['bottom-right', -100, -20],
  ] as const)('holds the %s corner through a width and height change', (anchor, dx, dy) => {
    const offset = resolveTextBoxAnchorOffsetPx(anchor, 200, 80, 300, 100, 0);
    // الصندوق الجديد 300×100: الركن المسمّى يجب أن يبقى على إحداثياته القديمة.
    const oldCorner = {
      x: anchor.endsWith('right') ? 200 : 0,
      y: anchor.startsWith('bottom') ? 80 : 0,
    };
    const newCorner = {
      x: offset.dxPx + (anchor.endsWith('right') ? 300 : 0),
      y: offset.dyPx + (anchor.startsWith('bottom') ? 100 : 0),
    };
    expect(newCorner.x).toBeCloseTo(oldCorner.x, 6);
    expect(newCorner.y).toBeCloseTo(oldCorner.y, 6);
    expect(offset.dxPx).toBeCloseTo(dx, 6);
    expect(offset.dyPx).toBeCloseTo(dy, 6);
  });

  it('projects the anchor through the rotated local axes', () => {
    // دوران 90°: المحور المحلي x يشير للأسفل، لذا تثبيت الحافة اليمنى يحرّك
    // الأصل رأسياً بمقدار فرق العرض؛ الحافة العليا تتحرك أفقياً عكسياً.
    const topRight = resolveTextBoxAnchorOffsetPx('top-right', 200, 80, 300, 100, 90);
    expect(topRight.dxPx).toBeCloseTo(0, 6);
    expect(topRight.dyPx).toBeCloseTo(-100, 6);

    const bottomLeft = resolveTextBoxAnchorOffsetPx('bottom-left', 200, 80, 300, 100, 90);
    expect(bottomLeft.dxPx).toBeCloseTo(20, 6);
    expect(bottomLeft.dyPx).toBeCloseTo(0, 6);
  });

  it('does not move the anchor when the dimensions are unchanged', () => {
    for (const anchor of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      const offset = resolveTextBoxAnchorOffsetPx(anchor, 200, 80, 200, 80, 37);
      expect(offset.dxPx).toBeCloseTo(0, 6);
      expect(offset.dyPx).toBeCloseTo(0, 6);
    }
  });
});
