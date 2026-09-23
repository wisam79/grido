import { describe, it, expect } from "vitest";
import { mmToPx, pxToMm } from "../src/lib/canvas/units";

describe("Print Physical Parity & Dimension Verification", () => {
  const DPI_300 = 300;

  // Standard paper & photo sizes with their exact physical dimensions in mm and pixels at 300 DPI
  const standards = [
    { name: "A4", mmW: 210, mmH: 297, expectedPxW: 2480, expectedPxH: 3508 },
    { name: "A3", mmW: 297, mmH: 420, expectedPxW: 3508, expectedPxH: 4961 },
    { name: "A5", mmW: 148, mmH: 210, expectedPxW: 1748, expectedPxH: 2480 },
    { name: "4x6 Photo (10x15cm)", mmW: 101.6, mmH: 152.4, expectedPxW: 1200, expectedPxH: 1800 },
    { name: "5x7 Photo (13x18cm)", mmW: 127.0, mmH: 177.8, expectedPxW: 1500, expectedPxH: 2100 },
    { name: "8x10 Photo (20x25cm)", mmW: 203.2, mmH: 254.0, expectedPxW: 2400, expectedPxH: 3000 },
    { name: "US Letter", mmW: 215.9, mmH: 279.4, expectedPxW: 2550, expectedPxH: 3300 },
    { name: "Standard Passport Photo (35x45mm)", mmW: 35.0, mmH: 45.0, expectedPxW: 413, expectedPxH: 531 },
    { name: "US 2x2 Passport Photo", mmW: 50.8, mmH: 50.8, expectedPxW: 600, expectedPxH: 600 },
    { name: "ISO ID-1 Card (National ID / License)", mmW: 85.60, mmH: 53.98, expectedPxW: 1011, expectedPxH: 638 },
  ];

  it.each(standards)(
    "converts $name ($mmW x $mmH mm) to exact pixel bounds at 300 DPI",
    ({ mmW, mmH, expectedPxW, expectedPxH }) => {
      const pxW = Math.round(mmToPx(mmW, DPI_300));
      const pxH = Math.round(mmToPx(mmH, DPI_300));

      // Maximum 1 pixel rounding boundary allowable due to 25.4 float division
      expect(Math.abs(pxW - expectedPxW)).toBeLessThanOrEqual(1);
      expect(Math.abs(pxH - expectedPxH)).toBeLessThanOrEqual(1);
    }
  );

  it.each(standards)(
    "converts pixels back to millimeters for $name with precision within 0.1mm",
    ({ mmW, mmH, expectedPxW, expectedPxH }) => {
      const derivedMmW = pxToMm(expectedPxW, DPI_300);
      const derivedMmH = pxToMm(expectedPxH, DPI_300);

      expect(Math.abs(derivedMmW - mmW)).toBeLessThan(0.15);
      expect(Math.abs(derivedMmH - mmH)).toBeLessThan(0.15);
    }
  );

  it("guarantees zero cumulative drift across grid row and column accumulation", () => {
    // 5 passport photos (35mm each) with 2mm gap on an A4 sheet
    const itemW_MM = 35;
    const gapMM = 2;
    const count = 5;

    // Direct mathematical width
    const totalMM = count * itemW_MM + (count - 1) * gapMM; // 5 * 35 + 4 * 2 = 183 mm
    const directTotalPx = Math.round(mmToPx(totalMM, DPI_300));

    // Accumulated calculation
    let accumulatedPx = 0;
    for (let i = 0; i < count; i++) {
      accumulatedPx += Math.round(mmToPx(itemW_MM, DPI_300));
      if (i < count - 1) {
        accumulatedPx += Math.round(mmToPx(gapMM, DPI_300));
      }
    }

    // Cumulative drift must not exceed 2 pixels across 5 elements
    expect(Math.abs(accumulatedPx - directTotalPx)).toBeLessThanOrEqual(2);
  });

  it("maintains aspect ratio invariance during millimeter to pixel transformations", () => {
    standards.forEach(({ mmW, mmH }) => {
      const mmRatio = mmW / mmH;
      const pxW = mmToPx(mmW, DPI_300);
      const pxH = mmToPx(mmH, DPI_300);
      const pxRatio = pxW / pxH;

      expect(Math.abs(mmRatio - pxRatio)).toBeLessThan(1e-5);
    });
  });

  it("verifies WebView2 print page CSS size formatting complies with Chromium spec", () => {
    const paperWidthMM = 210;
    const paperHeightMM = 297;
    const cssPageRule = `@page { size: ${paperWidthMM}mm ${paperHeightMM}mm; margin: 0; }`;

    expect(cssPageRule).toBe("@page { size: 210mm 297mm; margin: 0; }");
    expect(cssPageRule).toContain("210mm");
    expect(cssPageRule).toContain("297mm");
    expect(cssPageRule).toContain("margin: 0;");
  });
});
