import { describe, it, expect } from 'vitest';

import {
  computeAdjacentSlotCandidate,
  getCollageGeometry,
  getSlotRect,
  isBakedCollageLayout,
} from '../src/lib/canvas/collage-geometry';
import { mmToPx } from '../src/lib/canvas/units';
import { COLLAGE_TEMPLATES } from '../src/lib/templates/collage-templates';
import { DEFAULT_COLLAGE_GAP_PX, DEFAULT_COLLAGE_MARGIN_PX } from '../src/lib/templates/constants';
import {
  getEffectiveDpi,
  computeDynamicCollageCells,
  getPhysicalMaxMarginMM,
} from '../src/lib/templates/grid-utils';

import type { CollageTemplate } from '../src/lib/templates/types';

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

  it.each([
    { template: null, baked: false },
    { template: {}, baked: false },
    { template: { metadata: { kind: 'grid' } }, baked: false },
    { template: { physicalLayout: {} }, baked: true },
    { template: { isBaked: true }, baked: true },
    { template: { isManual: true }, baked: true },
    { template: { metadata: { kind: 'freeform' } }, baked: true },
  ])(
    'classifies layout geometry without double-applying retained spacing: %j',
    ({ template, baked }) => {
      expect(isBakedCollageLayout(template)).toBe(baked);
      const geo = getCollageGeometry(1000, 1500, 30, 20, isBakedCollageLayout(template));
      const rect = getSlotRect({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, geo);
      expect(rect).toEqual(
        baked
          ? { left: 100, top: 300, width: 300, height: 600 }
          : { left: 134, top: 328, width: 262, height: 556 },
      );
    },
  );

  it('uses finite defaults only when physical spacing is omitted, preserving explicit zero', () => {
    const template: CollageTemplate = {
      id: 'spacing-defaults',
      name: 'Spacing defaults',
      slots: 2,
      cells: [],
      physicalLayout: { type: 'visa', rows: 1, cols: 2, align: 'top-left' },
    };
    const defaults = computeDynamicCollageCells(template, 2480, 3508, 300)!;
    expect(defaults).toEqual(
      computeDynamicCollageCells(
        template,
        2480,
        3508,
        300,
        DEFAULT_COLLAGE_GAP_PX,
        DEFAULT_COLLAGE_MARGIN_PX,
      ),
    );
    const zero = computeDynamicCollageCells(template, 2480, 3508, 300, 0, 0)!;
    expect(zero[0].x).toBe(0);
    expect(zero[0].y).toBe(0);
    expect(zero[1].x - zero[0].x - zero[0].w).toBeCloseTo(0, 12);
    expect(defaults[0].x).toBeGreaterThan(0);
    expect((defaults[1].x - defaults[0].x - defaults[0].w) * 2480).toBeCloseTo(
      DEFAULT_COLLAGE_GAP_PX,
      8,
    );
  });

  describe.each([0, 8])('scaled baked adjacency with %s mm gap', (gapMM) => {
    it.each(['horizontal', 'vertical'] as const)(
      'uses the observed gap in both axes from a %s neighbor',
      (axis) => {
        const horizontal = axis === 'horizontal';
        const canvasWidth = mmToPx(horizontal ? 65 : 200, 300);
        const canvasHeight = mmToPx(horizontal ? 200 : 85, 300);
        const requestedGap = mmToPx(gapMM, 300);
        const margin = mmToPx(3, 300);
        const template: CollageTemplate = {
          id: 'scaled-adjacent',
          name: 'Scaled adjacent',
          slots: 3,
          cells: [],
          physicalLayout: {
            type: 'visa',
            rows: horizontal ? 1 : 3,
            cols: horizontal ? 3 : 1,
            align: 'top-left',
          },
        };
        const generated = computeDynamicCollageCells(
          template,
          canvasWidth,
          canvasHeight,
          300,
          requestedGap,
          margin,
        )!;
        expect(generated).toHaveLength(3);
        // Remove the last generated cell, leaving an observed gap and an empty same-axis space.
        const slots = generated.slice(0, 2).map((cell, index) => ({ ...cell, id: String(index) }));
        const geo = getCollageGeometry(canvasWidth, canvasHeight, margin, requestedGap, true);
        const [first, second] = slots.map((slot) => getSlotRect(slot, geo));
        const observedGap = horizontal
          ? second.left - first.left - first.width
          : second.top - first.top - first.height;
        const scale = first.width / mmToPx(35, 300);
        expect(scale).toBeLessThan(1);
        expect(observedGap).toBeCloseTo(requestedGap * scale, 8);
        if (gapMM > 0) expect(observedGap).toBeLessThan(requestedGap);

        // For zero, deliberately retain a nonzero preference to prove zero beats the fallback.
        const preference = gapMM === 0 ? mmToPx(8, 300) : requestedGap;
        for (const crossAxis of [false, true]) {
          const direction = crossAxis
            ? horizontal
              ? 'bottom'
              : 'right'
            : horizontal
              ? 'right'
              : 'bottom';
          const source = crossAxis ? slots[0] : slots[1];
          const candidate = computeAdjacentSlotCandidate(
            source,
            direction,
            slots,
            geo,
            preference,
            true,
          );
          expect(candidate).not.toBeNull();
          const rect = getSlotRect(candidate!, geo);
          const sourceRect = getSlotRect(source, geo);
          if (!crossAxis) {
            expect(candidate!.x).toBeCloseTo(generated[2].x, 10);
            expect(candidate!.y).toBeCloseTo(generated[2].y, 10);
          }
          expect(rect.width).toBeCloseTo(sourceRect.width, 8);
          expect(rect.height).toBeCloseTo(sourceRect.height, 8);
          const actualGap =
            direction === 'right'
              ? rect.left - sourceRect.left - sourceRect.width
              : rect.top - sourceRect.top - sourceRect.height;
          expect(actualGap).toBeCloseTo(observedGap, 8);
        }
      },
    );
  });

  it.each([0, 24])('uses the requested %s px only with no aligned observation', (preference) => {
    const geo = getCollageGeometry(1000, 1600, 12, preference, true);
    const source = { id: 'a', x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
    const diagonal = { id: 'b', x: 0.7, y: 0.7, w: 0.1, h: 0.1 };
    for (const direction of ['right', 'bottom'] as const) {
      const candidate = computeAdjacentSlotCandidate(
        source,
        direction,
        [source, diagonal],
        geo,
        preference,
        true,
      );
      expect(candidate).not.toBeNull();
      const rect = getSlotRect(candidate!, geo);
      const sourceRect = getSlotRect(source, geo);
      const actualGap =
        direction === 'right'
          ? rect.left - sourceRect.left - sourceRect.width
          : rect.top - sourceRect.top - sourceRect.height;
      expect(actualGap).toBeCloseTo(preference, 8);
    }
  });

  it('does not discard an observed gap just because it exceeds half the source span', () => {
    const geo = getCollageGeometry(1000, 1600, 0, 30, true);
    const source = { id: 'a', x: 0.3, y: 0.1, w: 0.1, h: 0.1 };
    const neighbor = { id: 'b', x: 0.1, y: 0.1, w: 0.1, h: 0.1 };
    const candidate = computeAdjacentSlotCandidate(
      source,
      'bottom',
      [source, neighbor],
      geo,
      30,
      true,
    );
    expect(candidate).not.toBeNull();
    const rect = getSlotRect(candidate!, geo);
    const original = getSlotRect(source, geo);
    expect(rect.top - original.top - original.height).toBeCloseTo(100, 8);
  });

  it('keeps observed touching separate from a nonzero observation on the other axis', () => {
    const geo = getCollageGeometry(1000, 1600, 0, 40, true);
    const source = { id: 'a', x: 0.3, y: 0.3, w: 0.1, h: 0.1 };
    const slots = [
      source,
      { id: 'left', x: 0.2, y: 0.3, w: 0.1, h: 0.1 },
      { id: 'top', x: 0.3, y: 0.1, w: 0.1, h: 0.15 },
    ];
    const right = computeAdjacentSlotCandidate(source, 'right', slots, geo, 40, true)!;
    const bottom = computeAdjacentSlotCandidate(source, 'bottom', slots, geo, 40, true)!;
    expect(right.x).toBeCloseTo(0.4, 10);
    expect(bottom.y).toBeCloseTo(0.45, 10);
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
