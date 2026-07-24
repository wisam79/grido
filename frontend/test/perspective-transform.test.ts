import { describe, it, expect, beforeAll } from "vitest";
import {
  sortCornerPoints,
  autoDetectDocumentCorners,
  warpPerspective,
  Point,
} from "../src/components/editor/document-scanner/perspective-transform";

describe("Perspective Transform & Document Scanner Utility Tests", () => {
  beforeAll(() => {
    // Mock HTMLCanvasElement.prototype.getContext for jsdom
    HTMLCanvasElement.prototype.getContext = function (contextId: string) {
      if (contextId === "2d") {
        return {
          createImageData: (w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4),
            width: w,
            height: h,
          }),
          putImageData: () => {},
          getImageData: () => ({
            data: new Uint8ClampedArray(100 * 100 * 4),
            width: 100,
            height: 100,
          }),
        } as unknown as CanvasRenderingContext2D;
      }
      return null;
    } as any;
  });

  it("should correctly sort quadrilateral corners in clockwise order (TL, TR, BR, BL)", () => {
    const unorderedPoints: Point[] = [
      { x: 100, y: 100 }, // BR
      { x: 0, y: 100 },   // BL
      { x: 100, y: 0 },   // TR
      { x: 0, y: 0 },     // TL
    ];

    const sorted = sortCornerPoints(unorderedPoints);

    expect(sorted[0]).toEqual({ x: 0, y: 0 });     // Top-Left
    expect(sorted[1]).toEqual({ x: 100, y: 0 });   // Top-Right
    expect(sorted[2]).toEqual({ x: 100, y: 100 }); // Bottom-Right
    expect(sorted[3]).toEqual({ x: 0, y: 100 });   // Bottom-Left
  });

  it("should auto detect corners fallback on empty/uniform image data", () => {
    const width = 100;
    const height = 100;
    const dummyData = new Uint8ClampedArray(width * height * 4);

    const imgData = { data: dummyData, width, height } as any;
    const corners = autoDetectDocumentCorners(imgData, width, height, width, height);

    expect(corners.length).toBe(4);
    expect(corners[0].x).toBe(5);
    expect(corners[0].y).toBe(5);
    expect(corners[2].x).toBe(95);
    expect(corners[2].y).toBe(95);
  });

  it("should auto detect corners when high-contrast document edges are present", () => {
    const width = 100;
    const height = 100;
    const dummyData = new Uint8ClampedArray(width * height * 4);

    // Draw a bright rectangle (document) from x=20..80, y=20..80
    for (let y = 20; y <= 80; y++) {
      for (let x = 20; x <= 80; x++) {
        const idx = (y * width + x) * 4;
        dummyData[idx] = 255;
        dummyData[idx + 1] = 255;
        dummyData[idx + 2] = 255;
        dummyData[idx + 3] = 255;
      }
    }

    const imgData = { data: dummyData, width, height } as any;
    const corners = autoDetectDocumentCorners(imgData, width, height, width, height);

    expect(corners.length).toBe(4);
    expect(corners[0].x).toBeGreaterThanOrEqual(15);
    expect(corners[0].y).toBeGreaterThanOrEqual(15);
    expect(corners[2].x).toBeLessThanOrEqual(85);
    expect(corners[2].y).toBeLessThanOrEqual(85);
  });

  it("should handle warpPerspective gracefully even with degenerate/collinear corner points without throwing NaN/Infinity errors", () => {
    const mockImageData = {
      data: new Uint8ClampedArray(100 * 100 * 4),
      width: 100,
      height: 100,
    };

    const mockCtx = {
      getImageData: () => mockImageData,
    } as unknown as CanvasRenderingContext2D;

    // Degenerate corners (all at same point)
    const degenerateCorners: Point[] = [
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      { x: 50, y: 50 },
    ];

    expect(() => {
      const resultCanvas = warpPerspective(
        mockCtx,
        100,
        100,
        degenerateCorners,
        50,
        50,
        "magic"
      );
      expect(resultCanvas.width).toBe(50);
      expect(resultCanvas.height).toBe(50);
    }).not.toThrow();
  });
});
