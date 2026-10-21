import Konva from 'konva';
import { describe, it, expect } from 'vitest';

import {
  QUICK_SHAPES,
  SHAPE_CATALOG,
  SHAPE_CATEGORIES,
  getShapeByPath,
  shapesInCategory,
} from '../src/lib/io/shape-catalog';

describe('shape-catalog — مصدر الأشكال الوحيد لكل الواجهات', () => {
  it('المعرّفات فريدة وكل الفئات ممثلة والقائمة السريعة مأهولة', () => {
    const ids = SHAPE_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const cat of SHAPE_CATEGORIES) {
      expect(shapesInCategory(cat.id).length).toBeGreaterThan(0);
    }
    expect(QUICK_SHAPES.length).toBeGreaterThanOrEqual(12);
    expect(QUICK_SHAPES.every((s) => s.quickAccess)).toBe(true);
  });

  it('كل مسار SVG يُحلَّل بمحلل Konva بلا أخطاء (يكشف أي خطأ كتابي في المسار)', () => {
    const pathItems = SHAPE_CATALOG.filter((s) => s.kind === 'path');
    expect(pathItems.length).toBeGreaterThanOrEqual(20);

    for (const item of pathItems) {
      expect(item.path).toBeTruthy();
      expect(item.viewBox).toEqual({ w: 24, h: 24 });

      const segments = Konva.Path.parsePathData(item.path!);
      expect(segments.length).toBeGreaterThan(0);

      // البحث بالمسار يعيد نفس العنصر — يستخدمه Konva والتصدير لحساب الأبعاد
      expect(getShapeByPath(item.path!)?.id).toBe(item.id);
    }
  });

  it('الأنواع الأصلية الجديدة (arc/wedge/سهم مزدوج) مضبوطة في الكتالوج', () => {
    expect(SHAPE_CATALOG.find((s) => s.id === 'arc')?.kind).toBe('arc');
    expect(SHAPE_CATALOG.find((s) => s.id === 'wedge')?.kind).toBe('wedge');
    expect(SHAPE_CATALOG.find((s) => s.id === 'arc')?.path).toBeUndefined();
    expect(SHAPE_CATALOG.find((s) => s.id === 'arrow-double')?.defaults).toEqual({
      pointerAtBeginning: true,
    });
  });
});
