import { describe, it, expect } from "vitest";
import {
  computeBlockPosition,
  computeSheetGrid,
  computeSlotAspect,
  computeSlotRectMM,
} from "../src/lib/print/print-layout-math";

describe("computeSheetGrid", () => {
  it("centers a small grid within the available area (A4, margin 10)", () => {
    const grid = computeSheetGrid({
      cols: 2,
      actualCopies: 2,
      imageWidthMM: 80,
      imageHeightMM: 60,
      gapMM: 5,
      effectiveMarginMM: 10,
      availableWidthMM: 190,
      availableHeightMM: 277,
    });

    expect(grid.safeCols).toBe(2);
    expect(grid.actualRows).toBe(1);
    expect(grid.gridWidth).toBe(165);
    expect(grid.gridHeight).toBe(60);
    expect(grid.offsetX).toBe(22.5);
    expect(grid.offsetY).toBe(118.5);
    expect(grid.cellWidth).toBe(85);
    expect(grid.cellHeight).toBe(65);
  });

  it("clamps cols to 1 and rows to 1 (no NaN on degenerate input)", () => {
    const grid = computeSheetGrid({
      cols: 0,
      actualCopies: 0,
      imageWidthMM: 80,
      imageHeightMM: 60,
      gapMM: 5,
      effectiveMarginMM: 10,
      availableWidthMM: 190,
      availableHeightMM: 277,
    });

    expect(grid.safeCols).toBe(1);
    expect(grid.actualRows).toBe(1);
    expect(Number.isFinite(grid.offsetX)).toBe(true);
    expect(Number.isFinite(grid.offsetY)).toBe(true);
  });

  it("leaves offset at the margin when the grid is wider than the paper", () => {
    const grid = computeSheetGrid({
      cols: 3,
      actualCopies: 6,
      imageWidthMM: 80,
      imageHeightMM: 60,
      gapMM: 5,
      effectiveMarginMM: 10,
      availableWidthMM: 190,
      availableHeightMM: 277,
    });

    expect(grid.gridWidth).toBe(250);
    expect(grid.offsetX).toBe(10);
    expect(grid.offsetY).toBe(86);
  });
});

describe("computeBlockPosition", () => {
  const grid = computeSheetGrid({
    cols: 2,
    actualCopies: 4,
    imageWidthMM: 80,
    imageHeightMM: 60,
    gapMM: 5,
    effectiveMarginMM: 10,
    availableWidthMM: 190,
    availableHeightMM: 277,
  });

  it("maps copy index to col/row and block origin in mm", () => {
    const b0 = computeBlockPosition(0, grid);
    expect(b0).toEqual({ col: 0, row: 0, xMM: grid.offsetX, yMM: grid.offsetY });

    const b1 = computeBlockPosition(1, grid);
    expect(b1).toEqual({ col: 1, row: 0, xMM: grid.offsetX + grid.cellWidth, yMM: grid.offsetY });

    const b2 = computeBlockPosition(2, grid);
    expect(b2).toEqual({ col: 0, row: 1, xMM: grid.offsetX, yMM: grid.offsetY + grid.cellHeight });
  });
});

describe("computeSlotRectMM", () => {
  const block = { xMM: 22.5, yMM: 86 };
  const image = { widthMM: 80, heightMM: 60 };

  it("computes a full-grid slot without margins/gaps", () => {
    const rect = computeSlotRectMM(block, { x: 0, y: 0, w: 1, h: 1 }, image, { marginXMM: 0, marginYMM: 0 }, { gapXMM: 0, gapYMM: 0 });
    expect(rect.xMM).toBe(22.5);
    expect(rect.yMM).toBe(86);
    expect(rect.wMM).toBe(80);
    expect(rect.hMM).toBe(60);
  });

  it("computes a half-grid slot with margins and gaps", () => {
    const rect = computeSlotRectMM(
      block,
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      image,
      { marginXMM: 2, marginYMM: 2 },
      { gapXMM: 1, gapYMM: 1 }
    );
    expect(rect.xMM).toBe(22.5 + 2 + 0.5);
    expect(rect.yMM).toBe(86 + 2 + 0.5);
    expect(rect.wMM).toBe(0.5 * 76 - 1);
    expect(rect.hMM).toBe(0.5 * 56 - 1);
  });

  it("is bit-identical to the mm-domain formula used by buildItems/cut-lines", () => {
    const canvasWidth = 2480;
    const canvasHeight = 3508;
    const collageMargin = 120;
    const collageGap = 60;
    const slot = { x: 0.25, y: 0.1, w: 0.4, h: 0.7 };

    const scalePxToMM = image.widthMM / canvasWidth;
    const marginMM = collageMargin * scalePxToMM;
    const gapMMv = collageGap * scalePxToMM;
    const availWMM = image.widthMM - 2 * marginMM;
    const availHMM = image.heightMM - 2 * marginMM;
    const expected = {
      xMM: block.xMM + marginMM + slot.x * availWMM + gapMMv / 2,
      yMM: block.yMM + marginMM + slot.y * availHMM + gapMMv / 2,
      wMM: slot.w * availWMM - gapMMv,
      hMM: slot.h * availHMM - gapMMv,
    };

    const actual = computeSlotRectMM(
      block,
      slot,
      image,
      { marginXMM: marginMM, marginYMM: marginMM },
      { gapXMM: gapMMv, gapYMM: gapMMv }
    );

    expect(actual.xMM).toBe(expected.xMM);
    expect(actual.yMM).toBe(expected.yMM);
    expect(actual.wMM).toBe(expected.wMM);
    expect(actual.hMM).toBe(expected.hMM);
  });

  it("is equivalent to the per-axis percentage formula used by the collage preview", () => {
    const canvasWidth = 2480;
    const canvasHeight = 3508;
    const collageMargin = 120;
    const collageGap = 60;

    const marginX_pct = collageMargin / canvasWidth;
    const marginY_pct = collageMargin / canvasHeight;
    const gapX_pct = collageGap / canvasWidth;
    const gapY_pct = collageGap / canvasHeight;
    const availW_pct = 1 - 2 * marginX_pct;
    const availH_pct = 1 - 2 * marginY_pct;

    for (const slot of [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.25, y: 0.1, w: 0.4, h: 0.7 },
      { x: 0.5, y: 0.5, w: 0.3, h: 0.2 },
    ]) {
      const actual = computeSlotRectMM(
        block,
        slot,
        image,
        { marginXMM: marginX_pct * image.widthMM, marginYMM: marginY_pct * image.heightMM },
        { gapXMM: gapX_pct * image.widthMM, gapYMM: gapY_pct * image.heightMM }
      );

      const expected = {
        xMM: block.xMM + (marginX_pct + slot.x * availW_pct + gapX_pct / 2) * image.widthMM,
        yMM: block.yMM + (marginY_pct + slot.y * availH_pct + gapY_pct / 2) * image.heightMM,
        wMM: (slot.w * availW_pct - gapX_pct) * image.widthMM,
        hMM: (slot.h * availH_pct - gapY_pct) * image.heightMM,
      };

      expect(Math.abs(actual.xMM - expected.xMM)).toBeLessThan(1e-9);
      expect(Math.abs(actual.yMM - expected.yMM)).toBeLessThan(1e-9);
      expect(Math.abs(actual.wMM - expected.wMM)).toBeLessThan(1e-9);
      expect(Math.abs(actual.hMM - expected.hMM)).toBeLessThan(1e-9);
    }
  });

  it("documents the known Y-axis divergence between the print path and the preview on non-square canvases", () => {
    // مسار الطباعة الفعلي (buildItems) يطبّق مقياساً موحداً مشتقاً من canvasWidth على المحورين،
    // بينما المعاينة تحسب هامش/فجوة Y عبر canvasHeight.
    // التباعد موجود في الكود الأصلي قبل إعادة الهيكلة — يُحفظ عمداً في المرحلة 1
    // (إصلاحه تغيير سلوكي مؤجل) — X متطابق عملياً، وY يختلف بنسبة محدودة.
    const canvasWidth = 2480;
    const canvasHeight = 3508;
    const collageMargin = 120;
    const collageGap = 60;
    const slot = { x: 0.25, y: 0.1, w: 0.4, h: 0.7 };

    const scalePxToMM = image.widthMM / canvasWidth;
    const uniform = computeSlotRectMM(
      block,
      slot,
      image,
      { marginXMM: collageMargin * scalePxToMM, marginYMM: collageMargin * scalePxToMM },
      { gapXMM: collageGap * scalePxToMM, gapYMM: collageGap * scalePxToMM }
    );
    const preview = computeSlotRectMM(
      block,
      slot,
      image,
      {
        marginXMM: (collageMargin / canvasWidth) * image.widthMM,
        marginYMM: (collageMargin / canvasHeight) * image.heightMM,
      },
      {
        gapXMM: (collageGap / canvasWidth) * image.widthMM,
        gapYMM: (collageGap / canvasHeight) * image.heightMM,
      }
    );

    expect(Math.abs(uniform.xMM - preview.xMM)).toBeLessThan(1e-6);
    expect(Math.abs(uniform.wMM - preview.wMM)).toBeLessThan(1e-6);
    expect(Math.abs(uniform.yMM - preview.yMM)).toBeGreaterThan(0.1);
    expect(Math.abs(uniform.yMM - preview.yMM)).toBeLessThan(5);
  });
});

describe("computeSlotAspect", () => {
  it("computes the aspect ratio of a slot on the canvas", () => {
    expect(computeSlotAspect({ w: 0.5, h: 0.5 }, 2480, 3508)).toBeCloseTo(2480 / 3508, 10);
    expect(computeSlotAspect({ w: 1, h: 0.5 }, 2480, 3508)).toBeCloseTo((2 * 2480) / 3508, 10);
  });

  it("returns 0 for empty slots", () => {
    expect(computeSlotAspect({ w: 0, h: 0 }, 2480, 3508)).toBe(0);
  });
});
