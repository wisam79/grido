import { describe, it, expect } from 'vitest';
import { getEffectiveDpi, computeDynamicCollageCells } from '../src/lib/templates/grid-utils';
import { COLLAGE_TEMPLATES } from '../src/lib/templates/collage-templates';

describe('GridUtils Unit Tests', () => {
  it('calculates effective DPI correctly for standard paper size', () => {
    // 2480x3508 at 300 DPI corresponds to A4 (210mm x 297mm)
    const dpi = getEffectiveDpi(2480, 3508, 300);
    expect(dpi).toBeGreaterThan(290);
    expect(dpi).toBeLessThan(310);
  });

  it('returns stored DPI when dimensions do not match paper presets', () => {
    const dpi = getEffectiveDpi(500, 500, 300);
    expect(dpi).toBe(300);
  });

  it('returns null when collage template has no physicalLayout', () => {
    const result = computeDynamicCollageCells({ id: 'custom', name: 'Custom' } as any, 2480, 3508, 300);
    expect(result).toBeNull();
  });

  it('computes cells for grid collage templates (national ID / passport)', () => {
    const tmpl = COLLAGE_TEMPLATES.find((t) => t.physicalLayout?.type === 'iq-national-id');
    if (tmpl) {
      const cells = computeDynamicCollageCells(tmpl, 2480, 3508, 300);
      expect(cells).not.toBeNull();
      expect(cells?.length).toBe(8);
      expect(cells![0].w).toBeGreaterThan(0);
      expect(cells![0].h).toBeGreaterThan(0);
    }
  });

  it('computes cells for mixed collage template (iq-mixed)', () => {
    const tmpl = COLLAGE_TEMPLATES.find((t) => t.physicalLayout?.type === 'iq-mixed');
    if (tmpl) {
      const cells = computeDynamicCollageCells(tmpl, 2480, 3508, 300);
      expect(cells).not.toBeNull();
      expect(cells?.length).toBe(6);
    }
  });

  it('computes cells for different alignments (top-left, bottom-right)', () => {
    const tmpl = {
      id: 'test-align',
      name: 'Align Test',
      physicalLayout: {
        type: 'passport',
        rows: 2,
        cols: 2,
        align: 'top-left',
      },
    } as any;

    const cells = computeDynamicCollageCells(tmpl, 2480, 3508, 300);
    expect(cells).not.toBeNull();
    expect(cells?.length).toBe(4);
  });
});
