import { afterEach, describe, it, expect, vi } from 'vitest';

import { curvedTextNaturalHeightPx } from '../src/lib/canvas/curved-text-metrics';
import {
  AUTO_TEXT_MAX_WIDTH_RATIO,
  AUTO_TEXT_MIN_WIDTH_PX,
  clampAutoTextWidthPx,
  fitTextGeometry,
  measureTextContentHeightPx,
  measureTextNaturalWidthPx,
  resolveTextBoxAnchorOffsetPx,
  resolveTextSizing,
} from '../src/lib/canvas/text-fit';
import * as textMeasure from '../src/lib/canvas/text-measure';
import { constrainTransformerBox } from '../src/lib/canvas/transform-anchors';

afterEach(() => vi.restoreAllMocks());

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

describe('text-fit — curved multiline measurement', () => {
  const source = {
    text: 'AB\nCD',
    fontFamily: 'Arial',
    fontSize: 20,
    width: 0.1,
    height: 0.1,
    x: 0.2,
    y: 0.3,
    rotation: 30,
    textSizing: 'auto' as const,
    curve: 55,
  };

  it.each([55, -55])('measures the whole flattened arc and preserves raw text (%s)', (curve) => {
    const width = vi
      .spyOn(textMeasure, 'measureTextWidthPx')
      .mockImplementation(({ text }) =>
        Math.max(...text.split('\n').map((line) => line.length * 10)),
      );
    const element = { ...source, curve };
    expect(measureTextNaturalWidthPx(element)).toBe(52);
    expect(measureTextContentHeightPx(element, 52)).toBeCloseTo(
      curvedTextNaturalHeightPx(50, 52, 20, curve),
      8,
    );
    expect(width.mock.calls.every(([spec]) => spec.text === 'AB CD')).toBe(true);
    expect(fitTextGeometry(element, 1000, 1000)).toEqual(
      fitTextGeometry({ ...element, text: 'AB CD' }, 1000, 1000),
    );
    expect(element.text).toBe('AB\nCD');
  });

  it('measures with the same supported weight as the loaded face', () => {
    const width = vi.spyOn(textMeasure, 'measureTextWidthPx').mockReturnValue(50);
    const height = vi.spyOn(textMeasure, 'measureTextHeightPx').mockReturnValue(24);
    fitTextGeometry({ ...source, curve: 0, fontFamily: 'Cairo', fontWeight: 800 }, 1000, 1000);
    expect(width).toHaveBeenCalledWith(expect.objectContaining({ fontWeight: 700 }));
    expect(height).toHaveBeenCalledWith(expect.objectContaining({ fontWeight: 700 }), 52);
  });

  it('leaves straight content multiline and measures height from all its lines', () => {
    vi.spyOn(textMeasure, 'measureTextWidthPx').mockImplementation(({ text }) =>
      Math.max(...text.split('\n').map((line) => line.length * 10)),
    );
    const height = vi
      .spyOn(textMeasure, 'measureTextHeightPx')
      .mockImplementation(({ text }) => text.split('\n').length * 24);
    const straight = { ...source, curve: 0 };
    const fit = fitTextGeometry(straight, 1000, 1000);
    expect(fit?.widthPx).toBe(24);
    expect(fit?.heightPx).toBe(48);
    expect(height).toHaveBeenCalledWith(expect.objectContaining({ text: 'AB\nCD' }), 24);
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

describe('constrainTransformerBox — text rotation around center', () => {
  it('preserves Konva rotateAroundCenter coordinates when activeAnchor is rotater', () => {
    const oldBox = { x: 100, y: 200, width: 300, height: 80, rotation: 0 };
    // مركز الصندوق الأصلي = (250, 240). عند الدوران 90° (π/2 rad) حول المركز،
    // يصبح أصل الصندوق الجديد (250 + 40, 240 - 150) = (290, 90)
    const rad = Math.PI / 2;
    const rotatedBox = {
      x: 290,
      y: 90,
      width: 300,
      height: 80,
      rotation: rad,
    };

    const result = constrainTransformerBox(oldBox, rotatedBox, true, 'rotater');
    expect(result).toEqual(rotatedBox);

    // التحقق من ثبات المركز الهندسي بعد تطبيق القيد
    const centerAfterX =
      result.x + (result.width * Math.cos(rad) - result.height * Math.sin(rad)) / 2;
    const centerAfterY =
      result.y + (result.width * Math.sin(rad) + result.height * Math.cos(rad)) / 2;
    expect(centerAfterX).toBeCloseTo(250, 6);
    expect(centerAfterY).toBeCloseTo(240, 6);
  });

  it('still projects side/top handles onto the local width axis for text', () => {
    const oldBox = { x: 100, y: 200, width: 300, height: 80, rotation: 0 };
    const draggedTopCenter = { x: 100, y: 160, width: 300, height: 120, rotation: 0 };

    const result = constrainTransformerBox(oldBox, draggedTopCenter, true, 'top-center');
    expect(result.x).toBeCloseTo(100, 6);
    expect(result.y).toBeCloseTo(200, 6);
    expect(result.height).toBeCloseTo(80, 6);
  });
});
