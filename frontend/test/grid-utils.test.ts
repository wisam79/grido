import { describe, it, expect } from 'vitest';

import { COLLAGE_TEMPLATES } from '../src/lib/templates/collage-templates';
import {
  getEffectiveDpi,
  computeDynamicCollageCells,
  getPhysicalMaxMarginMM,
} from '../src/lib/templates/grid-utils';

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
    const result = computeDynamicCollageCells(
      { id: 'custom', name: 'Custom' } as any,
      2480,
      3508,
      300,
    );
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

  it('returns null instead of negative cells when the margin swallows the paper', () => {
    const tmpl = COLLAGE_TEMPLATES.find((t) => t.physicalLayout?.type === 'iq-national-id');
    if (!tmpl) return;
    // ورقة 4×6 إنش (102×152 مم) عند 300DPI مع هامش 100 مم — كان يولّد خلايا سالبة
    const pxPerMM = 300 / 25.4;
    const cells = computeDynamicCollageCells(
      tmpl,
      102 * pxPerMM,
      152 * pxPerMM,
      300,
      0,
      100 * pxPerMM,
    );
    expect(cells).toBeNull();
  });

  it('keeps every physical cell at or above 1 mm at the maximum allowed margin', () => {
    const tmpl = COLLAGE_TEMPLATES.find((t) => t.physicalLayout?.type === 'iq-national-id');
    if (!tmpl) return;
    const paperWmm = 102;
    const paperHmm = 152;
    const maxMarginMM = getPhysicalMaxMarginMM(tmpl, paperWmm, paperHmm, 2, 1);
    expect(maxMarginMM).not.toBeNull();
    expect(maxMarginMM!).toBeGreaterThan(0);
    expect(maxMarginMM!).toBeLessThan(paperWmm / 2);

    const pxPerMM = 300 / 25.4;
    const cells = computeDynamicCollageCells(
      tmpl,
      paperWmm * pxPerMM,
      paperHmm * pxPerMM,
      300,
      2 * pxPerMM,
      maxMarginMM! * pxPerMM,
    )!;
    const minWmm = Math.min(...cells.map((c) => c.w)) * paperWmm;
    const minHmm = Math.min(...cells.map((c) => c.h)) * paperHmm;
    expect(minWmm).toBeGreaterThanOrEqual(0.99);
    expect(minHmm).toBeGreaterThanOrEqual(0.99);
  });
});
