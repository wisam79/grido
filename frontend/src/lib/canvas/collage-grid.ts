import type { CollageTemplate } from '@/lib/templates/types';

export interface DerivedCollageGrid {
  rows: number;
  cols: number;
  source: 'physical' | 'cells';
}

const roundCoord = (n: number) => Math.round(n * 1000) / 1000;

/** يستنتج شبكة منتظمة (صفوف × أعمدة) من إحداثيات الخانات فقط. */
export function deriveGridFromCells(
  cells: CollageTemplate['cells'] | null | undefined,
): DerivedCollageGrid | null {
  if (!cells || cells.length === 0) return null;
  const xs = new Set(cells.map((c) => roundCoord(c.x)));
  const ys = new Set(cells.map((c) => roundCoord(c.y)));
  if (xs.size * ys.size === cells.length) {
    return { rows: ys.size, cols: xs.size, source: 'cells' };
  }
  return null;
}

/** شبكة القالب المطبقة فعلياً: physicalLayout أولاً ثم إحداثيات الخانات. */
export function getTemplateGrid(
  template: CollageTemplate | null | undefined,
): DerivedCollageGrid | null {
  if (!template) return null;
  if (template.physicalLayout) {
    return {
      rows: template.physicalLayout.rows,
      cols: template.physicalLayout.cols,
      source: 'physical',
    };
  }
  return deriveGridFromCells(template.cells);
}
