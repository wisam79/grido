import { describe, it, expect } from "vitest";
import {
  canvasMm,
  findPaperByMm,
  formatDimensions,
  formatGuideMeasurement,
  mmToPx,
  pxToMm,
} from "./units";

describe("canvas units", () => {
  it("converts px <-> mm losslessly at 300dpi", () => {
    expect(pxToMm(1181, 300)).toBeCloseTo(100, 0);
    expect(mmToPx(100, 300)).toBeCloseTo(1181, 0);
  });

  it("reports canvas millimetres with unified rounding", () => {
    expect(canvasMm(2480, 3508, 300)).toEqual({ wMM: 210, hMM: 297 });
  });

  it("formats dimensions per unit", () => {
    expect(formatDimensions(2480, 3508, 300, "px")).toBe("2480 × 3508 px");
    expect(formatDimensions(2480, 3508, 300, "mm")).toBe("210.0 × 297.0 mm");
    expect(formatDimensions(2480, 3508, 300, "cm")).toBe("21.0 × 29.7 cm");
    expect(formatDimensions(2480, 3508, 300, "in")).toBe("8.27 × 11.69 in");
  });

  it("matches papers orientation-tolerantly", () => {
    const papers = [
      { id: "a4", widthMM: 210, heightMM: 297 },
      { id: "p4x6", widthMM: 102, heightMM: 152 },
    ];
    expect(findPaperByMm(210, 297, papers)?.id).toBe("a4");
    expect(findPaperByMm(297, 210, papers)?.id).toBe("a4");
    expect(findPaperByMm(100, 100, papers)).toBeUndefined();
  });

  it("formats guide measurements per unit", () => {
    expect(formatGuideMeasurement(0.5, false, "mm", 210, 297, 2480, 3508)).toBe("105.0 mm");
    expect(formatGuideMeasurement(0.5, true, "px", 210, 297, 2480, 3508)).toBe("1754 px");
    expect(formatGuideMeasurement(2, false, "mm", 210, 297, 2480, 3508)).toBe("210.0 mm");
  });
});
