import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePrintLayout } from "../src/hooks/use-print-layout";
import { createMockPrintSettings } from "./helpers/test-factories";
import type { PhotoTemplate } from "../src/lib/templates";

describe("usePrintLayout", () => {
  const passportTemplate: PhotoTemplate = {
    id: "passport-standard",
    name: "Standard Passport · 35×45 mm",
    width: 413,
    height: 531,
    widthMM: 35,
    heightMM: 45,
    dpi: 300,
    category: "passport",
    background: "#FFFFFF",
    backgroundHint: "White",
  };

  it("preserves exact 1:1 physical dimensions for passport photos on A4 when fitToPage is false", () => {
    const printSettings = createMockPrintSettings({
      paperWidthMM: 210,
      paperHeightMM: 297,
      orientation: "portrait",
      marginMM: 5,
      gapMM: 2,
      copiesPerSheet: 1,
      repeatMode: "all",
      fitToPage: false,
    });

    const { result } = renderHook(() =>
      usePrintLayout({
        template: passportTemplate,
        printSettings,
        canvasWidth: (35 / 25.4) * 300,
        canvasHeight: (45 / 25.4) * 300,
        mode: "single",
      })
    );

    // Exact 1:1 mm scale — must NOT blow up to page size
    expect(result.current.imageWidthMM).toBe(35);
    expect(result.current.imageHeightMM).toBe(45);
    expect(result.current.paperWidth).toBe(210);
    expect(result.current.paperHeight).toBe(297);
    expect(result.current.availableWidthMM).toBe(200); // 210 - 2*5
    expect(result.current.availableHeightMM).toBe(287); // 297 - 2*5
    expect(result.current.actualCopies).toBe(1);
    expect(result.current.cols).toBe(1);
    expect(result.current.rows).toBe(1);
  });

  it("scales up proportionally to fit margins when fitToPage is true for a single copy", () => {
    const printSettings = createMockPrintSettings({
      paperWidthMM: 210,
      paperHeightMM: 297,
      orientation: "portrait",
      marginMM: 5,
      copiesPerSheet: 1,
      repeatMode: "all",
      fitToPage: true,
    });

    const { result } = renderHook(() =>
      usePrintLayout({
        template: passportTemplate,
        printSettings,
        canvasWidth: 350,
        canvasHeight: 450,
        mode: "single",
      })
    );

    // Width available: 200mm, Height available: 287mm
    // Scale X: 200/35 = 5.714, Scale Y: 287/45 = 6.377
    // Min scale: 5.7142857 => Width = 200mm, Height = 45 * (200/35) = 257.14mm
    expect(result.current.imageWidthMM).toBeCloseTo(200, 2);
    expect(result.current.imageHeightMM).toBeCloseTo(257.14, 2);

    // Aspect ratio preserved
    const originalAspect = 35 / 45;
    const scaledAspect = result.current.imageWidthMM / result.current.imageHeightMM;
    expect(scaledAspect).toBeCloseTo(originalAspect, 4);
  });

  it("allocates a full row of copies when repeatMode is 'row'", () => {
    const printSettings = createMockPrintSettings({
      paperWidthMM: 210,
      paperHeightMM: 297,
      marginMM: 5,
      gapMM: 2,
      repeatMode: "row",
    });

    const { result } = renderHook(() =>
      usePrintLayout({
        template: passportTemplate,
        printSettings,
        canvasWidth: 350,
        canvasHeight: 450,
        mode: "single",
      })
    );

    // (200 + 2) / (35 + 2) = 202 / 37 = 5.45 => fitCols = 5
    expect(result.current.cols).toBe(5);
    expect(result.current.actualCopies).toBe(5);
    expect(result.current.rows).toBe(1);
    expect(result.current.imageWidthMM).toBe(35);
  });

  it("allocates a full column of copies when repeatMode is 'column'", () => {
    const printSettings = createMockPrintSettings({
      paperWidthMM: 210,
      paperHeightMM: 297,
      marginMM: 5,
      gapMM: 2,
      repeatMode: "column",
    });

    const { result } = renderHook(() =>
      usePrintLayout({
        template: passportTemplate,
        printSettings,
        canvasWidth: 350,
        canvasHeight: 450,
        mode: "single",
      })
    );

    // (287 + 2) / (45 + 2) = 289 / 47 = 6.14 => fitRows = 6
    expect(result.current.cols).toBe(1);
    expect(result.current.actualCopies).toBe(6);
    expect(result.current.rows).toBe(6);
  });

  it("prevents ghost columns when actualCopies is less than fitCols in repeatMode 'all'", () => {
    const printSettings = createMockPrintSettings({
      paperWidthMM: 210,
      paperHeightMM: 297,
      marginMM: 5,
      gapMM: 2,
      copiesPerSheet: 2,
      repeatMode: "all",
    });

    const { result } = renderHook(() =>
      usePrintLayout({
        template: passportTemplate,
        printSettings,
        canvasWidth: 350,
        canvasHeight: 450,
        mode: "single",
      })
    );

    // Only 2 copies requested on a sheet that can fit 5 cols
    expect(result.current.actualCopies).toBe(2);
    // cols MUST be 2, NOT 5!
    expect(result.current.cols).toBe(2);
    expect(result.current.rows).toBe(1);

    // Grid width should be 2 * 35 + 2 = 72mm (not 183mm)
    expect(result.current.grid.gridWidth).toBe(72);
  });

  it("swaps paper width and height when orientation is landscape", () => {
    const printSettings = createMockPrintSettings({
      paperWidthMM: 210,
      paperHeightMM: 297,
      orientation: "landscape",
      marginMM: 5,
    });

    const { result } = renderHook(() =>
      usePrintLayout({
        template: passportTemplate,
        printSettings,
        canvasWidth: 350,
        canvasHeight: 450,
        mode: "single",
      })
    );

    expect(result.current.paperWidth).toBe(297);
    expect(result.current.paperHeight).toBe(210);
    expect(result.current.availableWidthMM).toBe(287);
    expect(result.current.availableHeightMM).toBe(200);
  });

  it("downscales oversized content safely to fit printable area without distortion", () => {
    const oversizedTemplate: PhotoTemplate = {
      id: "poster-huge",
      name: "Huge Poster · 400×600 mm",
      width: 4000,
      height: 6000,
      widthMM: 400,
      heightMM: 600,
      dpi: 300,
      category: "personal",
      background: "#FFFFFF",
      backgroundHint: "White",
    };

    const printSettings = createMockPrintSettings({
      paperWidthMM: 210,
      paperHeightMM: 297,
      marginMM: 10,
      fitToPage: false,
    });

    const { result } = renderHook(() =>
      usePrintLayout({
        template: oversizedTemplate,
        printSettings,
        canvasWidth: 4000,
        canvasHeight: 6000,
        mode: "single",
      })
    );

    // Available: 190x277 mm
    // Content: 400x600 mm (exceeds paper)
    // Scale X = 190/400 = 0.475, Scale Y = 277/600 = 0.46166
    // Min scale = 0.46166
    expect(result.current.imageHeightMM).toBeCloseTo(277, 1);
    expect(result.current.imageWidthMM).toBeLessThanOrEqual(190);
    // Aspect ratio preserved
    expect(result.current.imageWidthMM / result.current.imageHeightMM).toBeCloseTo(400 / 600, 3);
  });

  it("derives image dimensions from canvas pixels and dpi when no template is provided", () => {
    const printSettings = createMockPrintSettings({
      paperWidthMM: 210,
      paperHeightMM: 297,
      dpi: 300,
      marginMM: 10,
    });

    // 1200 x 1800 px at 300 DPI = 4 x 6 inches = 101.6 x 152.4 mm
    const { result } = renderHook(() =>
      usePrintLayout({
        template: null,
        printSettings,
        canvasWidth: 1200,
        canvasHeight: 1800,
        mode: "single",
      })
    );

    expect(result.current.originalImageWidthMM).toBeCloseTo(101.6, 1);
    expect(result.current.originalImageHeightMM).toBeCloseTo(152.4, 1);
    expect(result.current.imageWidthMM).toBeCloseTo(101.6, 1);
    expect(result.current.imageHeightMM).toBeCloseTo(152.4, 1);
  });
});
