import { describe, it, expect } from "vitest";
import { calculatePrintCutLines } from "../src/lib/cut-lines-utils";
import { computeSheetGrid } from "../src/lib/print-layout-math";

describe("calculatePrintCutLines", () => {
  it("should calculate correct cut lines for single mode on A4 paper", () => {
    const lines = calculatePrintCutLines({
      mode: "single",
      actualCopies: 2,
      imageWidthMM: 80,
      imageHeightMM: 60,
      gapMM: 5,
      paperWidth: 210,
      paperHeight: 297,
      grid: computeSheetGrid({
        cols: 2,
        actualCopies: 2,
        imageWidthMM: 80,
        imageHeightMM: 60,
        gapMM: 5,
        effectiveMarginMM: 10,
        availableWidthMM: 190,
        availableHeightMM: 277,
      }),
    });

    expect(lines.length).toBeGreaterThan(0);
    // Vertical cut lines should include left edge, midpoint, and right edge of the grid
    const verticalLines = lines.filter((l) => Math.abs(l.x1 - l.x2) < 0.01);
    expect(verticalLines.length).toBe(3);

    // Horizontal cut lines should include top edge and bottom edge (isBottomEnd)
    const horizontalLines = lines.filter((l) => Math.abs(l.y1 - l.y2) < 0.01);
    expect(horizontalLines.length).toBe(2);

    const bottomLine = horizontalLines.find((l) => l.isBottomEnd);
    expect(bottomLine).toBeDefined();
    expect(bottomLine?.x1).toBe(0);
    expect(bottomLine?.x2).toBe(210);
  });

  it("should calculate correct cut lines for collage mode with slots", () => {
    const slots = [
      { id: "1", x: 0, y: 0, w: 0.5, h: 0.5, imageSrc: "test1.jpg" },
      { id: "2", x: 0.5, y: 0, w: 0.5, h: 0.5, imageSrc: "test2.jpg" },
    ];

    const lines = calculatePrintCutLines({
      mode: "collage",
      actualCopies: 1,
      imageWidthMM: 180,
      imageHeightMM: 120,
      gapMM: 2,
      paperWidth: 210,
      paperHeight: 297,
      slots,
      collageMargin: 0,
      collageGap: 0,
      canvasWidth: 1800,
      canvasHeight: 1200,
      hasPhysical: false,
      grid: computeSheetGrid({
        cols: 1,
        actualCopies: 1,
        imageWidthMM: 180,
        imageHeightMM: 120,
        gapMM: 2,
        effectiveMarginMM: 10,
        availableWidthMM: 190,
        availableHeightMM: 277,
      }),
    });

    expect(lines.length).toBeGreaterThan(0);
    const verticalLines = lines.filter((l) => Math.abs(l.x1 - l.x2) < 0.01);
    // 2 slots side by side -> 3 vertical cut lines (left of slot 1, between 1 & 2, right of slot 2)
    expect(verticalLines.length).toBe(3);

    const horizontalLines = lines.filter((l) => Math.abs(l.y1 - l.y2) < 0.01);
    const bottomLine = horizontalLines.find((l) => l.isBottomEnd);
    expect(bottomLine).toBeDefined();
    // The bottom blue line must sit at the bottom of the slot row (offsetY + 60mm), NOT at the bottom of paper (297mm)!
    expect(bottomLine?.y1).toBeLessThan(200);
  });

  it("should omit bottom end cut line when showEndCutLine is false", () => {
    const lines = calculatePrintCutLines({
      mode: "single",
      actualCopies: 2,
      imageWidthMM: 80,
      imageHeightMM: 60,
      gapMM: 5,
      paperWidth: 210,
      paperHeight: 297,
      showEndCutLine: false,
      grid: computeSheetGrid({
        cols: 2,
        actualCopies: 2,
        imageWidthMM: 80,
        imageHeightMM: 60,
        gapMM: 5,
        effectiveMarginMM: 10,
        availableWidthMM: 190,
        availableHeightMM: 277,
      }),
    });

    const bottomLine = lines.find((l) => l.isBottomEnd);
    expect(bottomLine).toBeUndefined();
  });
});
