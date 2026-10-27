import { describe, it, expect } from 'vitest';

import { computeSheetGrid } from '@/lib/print/print-layout-math';

import { buildMidpointCutLines, calculatePrintCutLines } from './cut-lines-utils';

const A4 = { paperWidth: 210, paperHeight: 297 };

function assertValid(
  lines: { x1: number; y1: number; x2: number; y2: number }[],
  paperWidth: number,
  paperHeight: number,
) {
  expect(lines.length).toBeGreaterThan(0);
  for (const l of lines) {
    for (const v of [l.x1, l.y1, l.x2, l.y2]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(Math.min(l.x1, l.x2)).toBeGreaterThanOrEqual(-0.001);
    expect(Math.max(l.x1, l.x2)).toBeLessThanOrEqual(paperWidth + 0.001);
    expect(Math.min(l.y1, l.y2)).toBeGreaterThanOrEqual(-0.001);
    expect(Math.max(l.y1, l.y2)).toBeLessThanOrEqual(paperHeight + 0.001);
  }
}

describe('calculatePrintCutLines', () => {
  it('single mode: passport 35x45mm, 8 copies on A4 -> grid with full cut lines', () => {
    const imageWidthMM = 35;
    const imageHeightMM = 45;
    const gapMM = 2;
    const effectiveMarginMM = 5;
    const availableWidthMM = 200;
    const availableHeightMM = 287;
    const cols = Math.floor((availableWidthMM + gapMM) / (imageWidthMM + gapMM)); // 5
    const autoCount = 5 * Math.floor((availableHeightMM + gapMM) / (imageHeightMM + gapMM)); // 30
    const actualCopies = Math.min(8, autoCount); // 8

    const grid = computeSheetGrid({
      cols,
      actualCopies,
      imageWidthMM,
      imageHeightMM,
      gapMM,
      effectiveMarginMM,
      availableWidthMM,
      availableHeightMM,
    });

    const offsetX = grid.offsetX;
    const offsetY = grid.offsetY;

    const lines = calculatePrintCutLines({
      mode: 'single',
      actualCopies,
      imageWidthMM,
      imageHeightMM,
      gapMM,
      paperWidth: A4.paperWidth,
      paperHeight: A4.paperHeight,
      grid,
    });

    assertValid(lines, A4.paperWidth, A4.paperHeight);

    const vertical = lines.filter((l) => Math.abs(l.x1 - l.x2) < 0.001);
    const horizontal = lines.filter((l) => Math.abs(l.y1 - l.y2) < 0.001);

    expect(vertical.map((l) => l.x1)).toEqual([
      expect.closeTo(offsetX, 1e-6),
      expect.closeTo(offsetX + 1 * (imageWidthMM + gapMM) - gapMM / 2, 1e-6),
      expect.closeTo(offsetX + 2 * (imageWidthMM + gapMM) - gapMM / 2, 1e-6),
      expect.closeTo(offsetX + 3 * (imageWidthMM + gapMM) - gapMM / 2, 1e-6),
      expect.closeTo(offsetX + 4 * (imageWidthMM + gapMM) - gapMM / 2, 1e-6),
      expect.closeTo(offsetX + grid.gridWidth, 1e-6),
    ]);
    expect(vertical).toHaveLength(6);

    expect(horizontal.map((l) => l.y1)).toEqual([
      expect.closeTo(offsetY, 1e-6),
      expect.closeTo(offsetY + 1 * (imageHeightMM + gapMM) - gapMM / 2, 1e-6),
      expect.closeTo(offsetY + grid.gridHeight, 1e-6),
    ]);
    expect(horizontal).toHaveLength(3);

    const endLine = horizontal[horizontal.length - 1];
    expect(endLine.isBottomEnd).toBe(true);
    expect(endLine.x1).toBeCloseTo(0, 1e-6);
    expect(endLine.x2).toBeCloseTo(A4.paperWidth, 1e-6);

    for (const v of vertical) {
      expect(v.y1).toBeCloseTo(offsetY, 1e-6);
      expect(v.y2).toBeCloseTo(offsetY + grid.gridHeight, 1e-6);
    }

    const noEnd = calculatePrintCutLines({
      mode: 'single',
      actualCopies,
      imageWidthMM,
      imageHeightMM,
      gapMM,
      paperWidth: A4.paperWidth,
      paperHeight: A4.paperHeight,
      showEndCutLine: false,
      grid,
    });
    expect(noEnd.filter((l) => l.isBottomEnd)).toHaveLength(0);
    expect(noEnd).toHaveLength(8);
  });

  it('single mode: 2 copies on a 5-column grid -> only cut lines for the 2 active columns (no ghost cut lines)', () => {
    const imageWidthMM = 35;
    const imageHeightMM = 45;
    const gapMM = 2;
    const actualCopies = 2;
    const cols = 5;
    const grid = computeSheetGrid({
      cols,
      actualCopies,
      imageWidthMM,
      imageHeightMM,
      gapMM,
      effectiveMarginMM: 0,
      availableWidthMM: 210,
      availableHeightMM: 297,
    });

    const lines = calculatePrintCutLines({
      mode: 'single',
      actualCopies,
      imageWidthMM,
      imageHeightMM,
      gapMM,
      paperWidth: A4.paperWidth,
      paperHeight: A4.paperHeight,
      grid,
    });

    const vertical = lines.filter((l) => Math.abs(l.x1 - l.x2) < 0.001);
    // Left edge (0), separator between copy 0 and copy 1 (36mm), right edge of copy 1 (72mm) -> Exactly 3 vertical lines, not 6!
    expect(vertical).toHaveLength(3);
    expect(vertical.map((l) => l.x1)).toEqual([
      expect.closeTo(0, 1e-6),
      expect.closeTo(36, 1e-6),
      expect.closeTo(72, 1e-6),
    ]);
  });

  it('single mode: full-page A4 canvas -> cut lines at the 4 paper edges', () => {
    const lines = calculatePrintCutLines({
      mode: 'single',
      actualCopies: 1,
      imageWidthMM: 210,
      imageHeightMM: 297,
      gapMM: 2,
      paperWidth: 210,
      paperHeight: 297,
      grid: computeSheetGrid({
        cols: 1,
        actualCopies: 1,
        imageWidthMM: 210,
        imageHeightMM: 297,
        gapMM: 2,
        effectiveMarginMM: 0,
        availableWidthMM: 210,
        availableHeightMM: 297,
      }),
    });

    assertValid(lines, 210, 297);
    const vertical = lines.filter((l) => Math.abs(l.x1 - l.x2) < 0.001);
    const horizontal = lines.filter((l) => Math.abs(l.y1 - l.y2) < 0.001);

    expect(vertical.map((l) => l.x1)).toEqual([0, 210]);
    expect(horizontal.map((l) => l.y1)).toEqual([0, 297]);
  });

  it('zero-gap collage: boundaries that merely touch (float error) keep their separator line', () => {
    // 0.1 + 0.2 = 0.30000000000000004 > 0.3 — التداخل القديم الصارم كان يدمج
    // الفترتين فيحذف خط القص بين خانتين متلاصقتين (فجوة صفر في التخطيط الفيزيائي).
    const cut = buildMidpointCutLines({
      xIntervals: [
        { start: 0.1, end: 0.1 + 0.2 },
        { start: 0.3, end: 0.5 },
      ],
      yIntervals: [{ start: 0, end: 1 }],
      gapX: 0,
      gapY: 0,
      paperWidth: 1,
      paperHeight: 1,
    });

    expect(cut).not.toBeNull();
    expect(cut!.xCutLines).toHaveLength(3);
    expect(cut!.xCutLines[1]).toBeCloseTo(0.3, 6);
  });

  it('real overlap still merges: no cut line may run through overlapping images', () => {
    const cut = buildMidpointCutLines({
      xIntervals: [
        { start: 0.1, end: 0.4 },
        { start: 0.3, end: 0.5 },
      ],
      yIntervals: [{ start: 0, end: 1 }],
      gapX: 0,
      gapY: 0,
      paperWidth: 1,
      paperHeight: 1,
    });

    expect(cut).not.toBeNull();
    // تداخل فعلي 0.1مم ⇒ فترة واحدة [0.1, 0.5] وخطان فقط
    expect(cut!.xCutLines).toHaveLength(2);
    expect(cut!.xCutLines[0]).toBeCloseTo(0.1, 6);
    expect(cut!.xCutLines[1]).toBeCloseTo(0.5, 6);
  });

  it('collage mode: 2x2 slots on 100x150mm paper -> 6 cut lines at slot boundaries', () => {
    const imageWidthMM = 100;
    const imageHeightMM = 150;
    const canvasWidth = 1181;
    const canvasHeight = 1772;
    const collageMargin = 10;
    const collageGap = 10;
    const effectiveMarginMM = 0;
    const availableWidthMM = 100;
    const availableHeightMM = 150;
    const cols = 1;
    const actualCopies = 1;

    const slots = [
      { id: 's1', cellIndex: 0, x: 0, y: 0, w: 0.5, h: 0.5, imageSrc: '/local-image/a.png' },
      { id: 's2', cellIndex: 1, x: 0.5, y: 0, w: 0.5, h: 0.5, imageSrc: '/local-image/b.png' },
      { id: 's3', cellIndex: 2, x: 0, y: 0.5, w: 0.5, h: 0.5, imageSrc: '/local-image/c.png' },
      { id: 's4', cellIndex: 3, x: 0.5, y: 0.5, w: 0.5, h: 0.5, imageSrc: '/local-image/d.png' },
    ];

    const lines = calculatePrintCutLines({
      mode: 'collage',
      actualCopies,
      imageWidthMM,
      imageHeightMM,
      gapMM: 2,
      paperWidth: 100,
      paperHeight: 150,
      slots,
      collageMargin,
      collageGap,
      canvasWidth,
      canvasHeight,
      grid: computeSheetGrid({
        cols,
        actualCopies,
        imageWidthMM,
        imageHeightMM,
        gapMM: 2,
        effectiveMarginMM,
        availableWidthMM,
        availableHeightMM,
      }),
    });

    assertValid(lines, 100, 150);

    const vertical = lines.filter((l) => Math.abs(l.x1 - l.x2) < 0.001);
    const horizontal = lines.filter((l) => Math.abs(l.y1 - l.y2) < 0.001);
    expect(vertical).toHaveLength(3);
    expect(horizontal).toHaveLength(3);

    // Every cut line must fall inside the paper and be strictly ordered
    for (let i = 1; i < vertical.length; i++) {
      expect(vertical[i].x1).toBeGreaterThan(vertical[i - 1].x1);
    }
    for (let i = 1; i < horizontal.length; i++) {
      expect(horizontal[i].y1).toBeGreaterThan(horizontal[i - 1].y1);
    }

    // Left edge of the first cell, midpoint between columns, right edge of the last cell
    const scalePxToMM = imageWidthMM / canvasWidth;
    const availWMM = imageWidthMM - 2 * (collageMargin * scalePxToMM);
    const gapMMCut = collageGap * scalePxToMM;
    const cellLeft = collageMargin * scalePxToMM + 0.5 * availWMM * 0 + gapMMCut / 2;
    expect(vertical[0].x1).toBeCloseTo(Math.max(0, cellLeft - gapMMCut / 2), 1);
    expect(vertical[1].x1).toBeCloseTo(50, 1);
    expect(vertical[2].x1).toBeCloseTo(cellLeft + availWMM - gapMMCut / 2, 1);

    // Bottom end line spans the full paper width
    const endLine = horizontal[horizontal.length - 1];
    expect(endLine.isBottomEnd).toBe(true);
    expect(endLine.x1).toBeCloseTo(0, 1e-6);
    expect(endLine.x2).toBeCloseTo(100, 1e-6);
  });
});
