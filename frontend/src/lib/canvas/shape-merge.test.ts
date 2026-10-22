import { pathFromPathData } from 'path-bool';
import { describe, expect, it } from 'vitest';

import { mergePaths } from './path-boolean';
import { normalizeSegments, segmentsBounds } from './path-geometry';
import { shapeElementToSegments } from './shape-to-path';
import { getSvgPathBounds } from './svg-path-bounds';

import type { CubicSeg, Vec } from './path-geometry';
import type { ShapeElement } from '@/lib/store/types';

const CW = 1000;
const CH = 1000;

function shape(patch: Partial<ShapeElement>): ShapeElement {
  return {
    id: 'x',
    type: 'shape',
    shape: 'rect',
    x: 0,
    y: 0,
    width: 0.1,
    height: 0.1,
    rotation: 0,
    opacity: 1,
    zIndex: 10,
    ...patch,
  } as ShapeElement;
}

function segsOf(patch: Partial<ShapeElement>): CubicSeg[] {
  const segs = shapeElementToSegments(shape(patch), CW, CH);
  expect(segs).not.toBeNull();
  return segs!;
}

function boxOf(segs: CubicSeg[]) {
  const box = segmentsBounds(segs);
  expect(box).not.toBeNull();
  return box!;
}

const endOf = (seg: CubicSeg): Vec => seg[seg.length - 1] as Vec;

/** عدد المسارات الفرعية = عدد الانقطاعات بين نهاية قِطعة وبداية التالية */
function subpathCount(segs: CubicSeg[]): number {
  let count = 0;
  let prev: Vec | null = null;
  for (const seg of segs) {
    if (!prev || Math.abs(prev[0] - seg[1][0]) > 1e-6 || Math.abs(prev[1] - seg[1][1]) > 1e-6) {
      count += 1;
    }
    prev = endOf(seg);
  }
  return count;
}

/** مساحة بمسح الأحذية — صالحة للمسارات المستقيمة (مستطيلات ومضلعات) */
function areaOf(segs: CubicSeg[]): number {
  let area = 0;
  for (const seg of segs) {
    const p0 = seg[1];
    const p1 = endOf(seg);
    area += p0[0] * p1[1] - p1[0] * p0[1];
  }
  return Math.abs(area) / 2;
}

describe('shape-to-path: geometry lands in paper-pixel space', () => {
  it('maps a plain rect onto its pixel box', () => {
    const segs = segsOf({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
    const box = boxOf(segs);
    expect(box.minX).toBeCloseTo(100, 6);
    expect(box.minY).toBeCloseTo(200, 6);
    expect(box.w).toBeCloseTo(300, 6);
    expect(box.h).toBeCloseTo(400, 6);
    expect(areaOf(segs)).toBeCloseTo(120000, 0);
  });

  it('rotates around the element origin exactly like the Konva node', () => {
    // Konva يدور حول أصل العقدة (x,y) لا حول مركزها — 90° تنقل الصندوق إلى
    // يسار الأصل بمقدار ارتفاعه. أي اختلاف هنا يعني أن المدموج لا يطابق المرئي.
    const base = boxOf(segsOf({ x: 0.4, y: 0.4, width: 0.2, height: 0.1 }));
    const rotated = boxOf(segsOf({ x: 0.4, y: 0.4, width: 0.2, height: 0.1, rotation: 90 }));
    expect(base.minX).toBeCloseTo(400, 6);
    expect(base.minY).toBeCloseTo(400, 6);
    expect(rotated.w).toBeCloseTo(base.h, 6);
    expect(rotated.h).toBeCloseTo(base.w, 6);
    expect(rotated.minX).toBeCloseTo(400 - base.h, 6);
    expect(rotated.minY).toBeCloseTo(400, 6);
  });

  it('keeps a flipped shape inside the same box', () => {
    const base = boxOf(segsOf({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }));
    const flipped = boxOf(
      segsOf({ x: 0.1, y: 0.1, width: 0.2, height: 0.2, flipX: true, flipY: true }),
    );
    expect(flipped.minX).toBeCloseTo(base.minX, 6);
    expect(flipped.minY).toBeCloseTo(base.minY, 6);
    expect(flipped.w).toBeCloseTo(base.w, 6);
    expect(flipped.h).toBeCloseTo(base.h, 6);
  });

  it('fills the element box with an ellipse', () => {
    const box = boxOf(segsOf({ shape: 'ellipse', x: 0.2, y: 0.2, width: 0.4, height: 0.2 }));
    expect(box.minX).toBeCloseTo(200, 1);
    expect(box.minY).toBeCloseTo(200, 1);
    expect(box.w).toBeCloseTo(400, 1);
    expect(box.h).toBeCloseTo(200, 1);
  });

  it('keeps the ring hole as a separate subpath', () => {
    const segs = segsOf({ shape: 'ring', x: 0.2, y: 0.2, width: 0.2, height: 0.2 });
    expect(boxOf(segs).w).toBeCloseTo(200, 1);
    expect(subpathCount(segs)).toBe(2);
  });

  it('builds a star with twice its point count as vertices', () => {
    const segs = segsOf({ shape: 'star', starPoints: 5, width: 0.2, height: 0.2 });
    expect(segs.every((s) => s[0] === 'L')).toBe(true);
    expect(segs.length).toBe(10);
  });

  it('honours the polygon side count', () => {
    expect(segsOf({ shape: 'polygon', sides: 6, width: 0.2, height: 0.2 }).length).toBe(6);
  });

  it('produces a pie wedge from the centre', () => {
    const segs = segsOf({ shape: 'wedge', arcAngle: 90, width: 0.2, height: 0.2 });
    expect(subpathCount(segs)).toBe(1);
    expect(boxOf(segs).w).toBeCloseTo(100, 1);
  });

  it('expands a line by its stroke width', () => {
    const box = boxOf(segsOf({ shape: 'line', width: 0.3, height: 0.001, strokeWidth: 20 }));
    expect(box.w).toBeCloseTo(300, 6);
    expect(box.h).toBeCloseTo(20, 6);
  });

  it('rejects degenerate elements', () => {
    expect(shapeElementToSegments(shape({ width: 0 }), CW, CH)).toBeNull();
    expect(shapeElementToSegments(shape({ height: -0.1 }), CW, CH)).toBeNull();
  });

  it('scales a stored svg path so its ink fills the element box', () => {
    const segs = shapeElementToSegments(
      shape({ shape: 'path', svgPath: 'M12,2 L22,22 L2,22 Z', width: 0.2, height: 0.2 }),
      CW,
      CH,
    )!;
    const box = boxOf(segs);
    // الحدود المحكمة للحبر (2..22) تُقاس إلى صندوق العنصر 200×200
    expect(box.w).toBeCloseTo(200, 1);
    expect(box.h).toBeCloseTo(200, 1);
    expect(areaOf(segs)).toBeCloseTo(20000, 0);
  });

  it('returns null for a path element without data', () => {
    expect(shapeElementToSegments(shape({ shape: 'path' }), CW, CH)).toBeNull();
  });
});

describe('path-boolean: merging layers', () => {
  const left = segsOf({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 });
  const right = segsOf({ x: 0.2, y: 0.1, width: 0.2, height: 0.2 });

  it('unions two overlapping squares with the exact area', () => {
    const merged = mergePaths([left, right], 'union')!;
    expect(merged.minX).toBeCloseTo(100, 6);
    expect(merged.w).toBeCloseTo(300, 6);
    expect(merged.h).toBeCloseTo(200, 6);
    const restored = normalizeSegments(pathFromPathData(merged.svgPath));
    expect(areaOf(restored)).toBeCloseTo(200 * 200 * 2 - 100 * 200, 0);
  });

  it('subtracts the later shape from the first', () => {
    const merged = mergePaths([left, right], 'subtract')!;
    expect(merged.minX).toBeCloseTo(100, 6);
    expect(merged.w).toBeCloseTo(100, 6);
    expect(merged.h).toBeCloseTo(200, 6);
  });

  it('cuts the union of the lower layers with only the topmost one', () => {
    const third = segsOf({ x: 0.3, y: 0.1, width: 0.2, height: 0.2 });
    // قاعدة = اتحاد اليسار واليمين (100..400)، والقاطع الطبقة الأخيرة وحدها (300..500)
    const merged = mergePaths([left, right, third], 'subtract')!;
    expect(merged.minX).toBeCloseTo(100, 6);
    expect(merged.w).toBeCloseTo(200, 6);
    expect(merged.h).toBeCloseTo(200, 6);
  });

  it('intersects down to the overlap', () => {
    const merged = mergePaths([left, right], 'intersect')!;
    expect(merged.minX).toBeCloseTo(200, 6);
    expect(merged.w).toBeCloseTo(100, 6);
    expect(merged.h).toBeCloseTo(200, 6);
  });

  it('excludes the overlap keeping both wings', () => {
    const merged = mergePaths([left, right], 'exclude')!;
    expect(merged.minX).toBeCloseTo(100, 6);
    expect(merged.w).toBeCloseTo(300, 6);
    expect(normalizeSegments(pathFromPathData(merged.svgPath)).length).toBeGreaterThan(0);
  });

  it('unions three shapes in one call', () => {
    const third = segsOf({ x: 0.3, y: 0.1, width: 0.2, height: 0.2 });
    const merged = mergePaths([left, right, third], 'union')!;
    expect(merged.w).toBeCloseTo(400, 6);
    expect(merged.h).toBeCloseTo(200, 6);
  });

  it('normalizes the stored path to its own origin so the renderer scales it 1:1', () => {
    const merged = mergePaths([left, right], 'union')!;
    const bounds = getSvgPathBounds(merged.svgPath);
    expect(bounds.minX).toBeCloseTo(0, 4);
    expect(bounds.minY).toBeCloseTo(0, 4);
    expect(bounds.w).toBeCloseTo(merged.w, 4);
    expect(bounds.h).toBeCloseTo(merged.h, 4);
    expect(boxOf(normalizeSegments(pathFromPathData(merged.svgPath))).minX).toBeCloseTo(0, 4);
  });

  it('closes subpaths explicitly so strokes and fills agree', () => {
    const merged = mergePaths([left, right], 'union')!;
    expect(merged.svgPath.endsWith('Z')).toBe(true);
  });

  it('returns null when the operation empties the shape', () => {
    const far = segsOf({ x: 0.8, y: 0.8, width: 0.1, height: 0.1 });
    expect(mergePaths([left, far], 'intersect')).toBeNull();
    const covering = segsOf({ x: 0, y: 0, width: 1, height: 1 });
    expect(mergePaths([left, covering], 'subtract')).toBeNull();
  });

  it('keeps a ring hole through a union', () => {
    const ring = segsOf({ shape: 'ring', x: 0.1, y: 0.1, width: 0.2, height: 0.2 });
    const merged = mergePaths(
      [ring, segsOf({ x: 0.5, y: 0.5, width: 0.1, height: 0.1 })],
      'union',
    )!;
    const restored = normalizeSegments(pathFromPathData(merged.svgPath));
    expect(subpathCount(restored)).toBe(3);
  });

  it('passes a single shape through and rejects an empty input', () => {
    const single = mergePaths([left], 'union')!;
    expect(single.w).toBeCloseTo(200, 6);
    expect(single.h).toBeCloseTo(200, 6);
    expect(mergePaths([], 'union')).toBeNull();
  });
});
