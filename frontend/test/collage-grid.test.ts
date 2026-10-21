import { describe, it, expect } from 'vitest';
import { deriveGridFromCells, getTemplateGrid } from '../src/lib/canvas/collage-grid';
import type { CollageTemplate } from '../src/lib/templates/types';

/** يبني خانات شبكة منتظمة كما تبنيها قوالب الكولاج (نسب 0..1). */
function gridCells(rows: number, cols: number): CollageTemplate['cells'] {
  return Array.from({ length: rows * cols }, (_, i) => ({
    x: (i % cols) / cols,
    y: Math.floor(i / cols) / rows,
    w: 1 / cols,
    h: 1 / rows,
  }));
}

function template(overrides: Partial<CollageTemplate>): CollageTemplate {
  return {
    id: 'test',
    name: 'قالب اختبار',
    slots: 0,
    cells: [],
    ...overrides,
  };
}

describe('deriveGridFromCells', () => {
  it('يستنتج 6 صفوف × 5 أعمدة من قالب الثلاثين صورة', () => {
    expect(deriveGridFromCells(gridCells(6, 5))).toEqual({
      rows: 6,
      cols: 5,
      source: 'cells',
    });
  });

  it('يستنتج 4×4 من قالب الست عشرة صورة', () => {
    expect(deriveGridFromCells(gridCells(4, 4))).toEqual({
      rows: 4,
      cols: 4,
      source: 'cells',
    });
  });

  it('يعيد null للخانات غير المنتظمة (عدد الخانات لا يساوي حاصل الضرب)', () => {
    const irregular = [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    ];
    expect(deriveGridFromCells(irregular)).toBeNull();
  });

  it('يعيد null للمصفوفة الفارغة أو الغائبة', () => {
    expect(deriveGridFromCells([])).toBeNull();
    expect(deriveGridFromCells(null)).toBeNull();
    expect(deriveGridFromCells(undefined)).toBeNull();
  });
});

describe('getTemplateGrid', () => {
  it('يفضّل physicalLayout على إحداثيات الخانات', () => {
    expect(
      getTemplateGrid(
        template({
          cells: gridCells(4, 4),
          physicalLayout: { type: 'iq-national-id', rows: 1, cols: 2 },
        }),
      ),
    ).toEqual({ rows: 1, cols: 2, source: 'physical' });
  });

  it('يرجع لإحداثيات الخانات عند غياب physicalLayout', () => {
    expect(getTemplateGrid(template({ cells: gridCells(6, 5) }))).toEqual({
      rows: 6,
      cols: 5,
      source: 'cells',
    });
  });

  it('يعيد null لقالب غير موجود أو شبكة غير منتظمة', () => {
    expect(getTemplateGrid(null)).toBeNull();
    expect(getTemplateGrid(undefined)).toBeNull();
    expect(
      getTemplateGrid(
        template({
          cells: [
            { x: 0, y: 0, w: 0.5, h: 0.5 },
            { x: 0.5, y: 0, w: 0.5, h: 0.5 },
            { x: 0, y: 0.5, w: 0.5, h: 0.5 },
          ],
        }),
      ),
    ).toBeNull();
  });
});
