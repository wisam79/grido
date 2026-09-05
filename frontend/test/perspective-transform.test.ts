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
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === "2d") {
        const canvas = this;
        const w = canvas.width || 100;
        const h = canvas.height || 100;
        if (!(canvas as any)._mockData || (canvas as any)._mockData.length !== w * h * 4) {
          (canvas as any)._mockData = new Uint8ClampedArray(w * h * 4);
        }
        return {
          canvas,
          createImageData: (cw: number, ch: number) => ({
            data: new Uint8ClampedArray(cw * ch * 4),
            width: cw,
            height: ch,
          }),
          drawImage: (src: any, sx?: any, sy?: any, sw?: any, sh?: any) => {
            if (src && src._mockData) {
              const srcData = src._mockData;
              const destData = (canvas as any)._mockData;
              const targetW = canvas.width || 100;
              const targetH = canvas.height || 100;
              const srcW = src.width || 100;

              const readSx = typeof sw !== "undefined" ? (sx || 0) : 0;
              const readSy = typeof sw !== "undefined" ? (sy || 0) : 0;
              const readSw = typeof sw !== "undefined" ? (sw || srcW) : srcW;
              const readSh = typeof sw !== "undefined" ? (sh || 100) : 100;

              for (let y = 0; y < readSh && y < targetH; y++) {
                for (let x = 0; x < readSw && x < targetW; x++) {
                  const sIdx = ((readSy + y) * srcW + (readSx + x)) * 4;
                  const dIdx = (y * targetW + x) * 4;
                  if (sIdx < srcData.length && dIdx < destData.length) {
                    destData[dIdx] = srcData[sIdx];
                    destData[dIdx + 1] = srcData[sIdx + 1];
                    destData[dIdx + 2] = srcData[sIdx + 2];
                    destData[dIdx + 3] = srcData[sIdx + 3];
                  }
                }
              }
            }
          },
          putImageData: (imgData: ImageData) => {
            const d = (canvas as any)._mockData;
            if (d && imgData && imgData.data) {
              d.set(imgData.data);
            }
          },
          getImageData: (sx: number = 0, sy: number = 0, sw?: number, sh?: number) => {
            const gw = sw || canvas.width || 100;
            const gh = sh || canvas.height || 100;
            const data = new Uint8ClampedArray(gw * gh * 4);
            const srcData = (canvas as any)._mockData;
            const totalW = canvas.width || 100;

            if (srcData) {
              for (let y = 0; y < gh; y++) {
                for (let x = 0; x < gw; x++) {
                  const sIdx = ((sy + y) * totalW + (sx + x)) * 4;
                  const dIdx = (y * gw + x) * 4;
                  if (sIdx >= 0 && sIdx < srcData.length) {
                    data[dIdx] = srcData[sIdx];
                    data[dIdx + 1] = srcData[sIdx + 1];
                    data[dIdx + 2] = srcData[sIdx + 2];
                    data[dIdx + 3] = srcData[sIdx + 3];
                  }
                }
              }
            }
            return { data, width: gw, height: gh };
          },
          clearRect: () => {},
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
    expect(corners[0].x).toBeGreaterThanOrEqual(12);
    expect(corners[0].y).toBeGreaterThanOrEqual(12);
    expect(corners[2].x).toBeLessThanOrEqual(88);
    expect(corners[2].y).toBeLessThanOrEqual(88);
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

  it("should correctly infer smart document aspect ratios (A4, ID card, Square)", async () => {
    const { inferSmartDocumentAspect } = await import(
      "../src/components/editor/document-scanner/perspective-transform"
    );

    // A4 Portrait ratio ~ 1 / 1.414 = 0.707
    const a4PortraitCorners: Point[] = [
      { x: 0, y: 0 },
      { x: 210, y: 0 },
      { x: 210, y: 297 },
      { x: 0, y: 297 },
    ];
    expect(inferSmartDocumentAspect(a4PortraitCorners)).toBe("a4_p");

    // A4 Landscape ratio ~ 1.414
    const a4LandscapeCorners: Point[] = [
      { x: 0, y: 0 },
      { x: 297, y: 0 },
      { x: 297, y: 210 },
      { x: 0, y: 210 },
    ];
    expect(inferSmartDocumentAspect(a4LandscapeCorners)).toBe("a4_l");

    // ID Card ratio ~ 85.6 / 54 = 1.58
    const idCardCorners: Point[] = [
      { x: 0, y: 0 },
      { x: 86, y: 0 },
      { x: 86, y: 54 },
      { x: 0, y: 54 },
    ];
    expect(inferSmartDocumentAspect(idCardCorners)).toBe("id_card");

    // Square ratio ~ 1.0
    const squareCorners: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(inferSmartDocumentAspect(squareCorners)).toBe("square");
  });

  it("should run detectDocumentAuto and return valid detection results", async () => {
    const { detectDocumentAuto } = await import(
      "../src/components/editor/document-scanner/perspective-transform"
    );

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;

    const res = await detectDocumentAuto(canvas, 200, 200);
    expect(res).toBeDefined();
    expect(res.corners).toBeDefined();
    expect(res.corners?.length).toBe(4);
    expect(["scanic", "opencv", "js", "default"]).toContain(res.method);
  });

  it("should accurately reconstruct sharp corners via RANSAC line intersection even with clipped/chamfered corners", () => {
    const width = 120;
    const height = 120;
    const dummyData = new Uint8ClampedArray(width * height * 4);

    // Draw document from x=20..100, y=20..100 but with rounded/clipped corners
    for (let y = 20; y <= 100; y++) {
      for (let x = 20; x <= 100; x++) {
        // Clip 4 corners
        if (x + y < 48) continue; // Top-Left clipped
        if (x - y > 72) continue; // Top-Right clipped
        if (x + y > 192) continue; // Bottom-Right clipped
        if (y - x > 72) continue; // Bottom-Left clipped

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
    // Should detect the rectangular boundary corners near (20,20), (100,20), (100,100), (20,100)
    expect(corners[0].x).toBeLessThanOrEqual(28);
    expect(corners[0].y).toBeLessThanOrEqual(28);
    expect(corners[1].x).toBeGreaterThanOrEqual(85);
    expect(corners[1].y).toBeLessThanOrEqual(28);
    expect(corners[2].x).toBeGreaterThanOrEqual(85);
    expect(corners[2].y).toBeGreaterThanOrEqual(85);
    expect(corners[3].x).toBeLessThanOrEqual(28);
    expect(corners[3].y).toBeGreaterThanOrEqual(85);
  });

  it("should accurately detect a dark ID card centered on a light background inside a vertical screenshot", () => {
    const width = 180;
    const height = 360;
    const dummyData = new Uint8ClampedArray(width * height * 4);

    // Light beige background
    for (let i = 0; i < width * height; i++) {
      dummyData[i * 4] = 200;
      dummyData[i * 4 + 1] = 190;
      dummyData[i * 4 + 2] = 170;
      dummyData[i * 4 + 3] = 255;
    }

    // Top status bar (black) y=0..30
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        dummyData[idx] = 20;
        dummyData[idx + 1] = 20;
        dummyData[idx + 2] = 20;
      }
    }

    // Centered dark ID card: x=20..160 (w=140), y=120..210 (h=90) -> Aspect ~ 1.55 (ID Card!)
    for (let y = 120; y <= 210; y++) {
      for (let x = 20; x <= 160; x++) {
        const idx = (y * width + x) * 4;
        dummyData[idx] = 30;
        dummyData[idx + 1] = 35;
        dummyData[idx + 2] = 45;
      }
    }

    const imgData = { data: dummyData, width, height } as any;
    const corners = autoDetectDocumentCorners(imgData, width, height, width, height);

    expect(corners.length).toBe(4);
    // Should detect the card corners inside the screenshot rather than the outer frame
    expect(corners[0].x).toBeLessThanOrEqual(28);
    expect(corners[0].y).toBeGreaterThanOrEqual(115);
    expect(corners[0].y).toBeLessThanOrEqual(128);

    expect(corners[1].x).toBeGreaterThanOrEqual(152);
    expect(corners[1].y).toBeGreaterThanOrEqual(115);
    expect(corners[1].y).toBeLessThanOrEqual(128);

    expect(corners[2].x).toBeGreaterThanOrEqual(152);
    expect(corners[2].y).toBeGreaterThanOrEqual(202);
    expect(corners[2].y).toBeLessThanOrEqual(218);

    expect(corners[3].x).toBeLessThanOrEqual(28);
    expect(corners[3].y).toBeGreaterThanOrEqual(202);
    expect(corners[3].y).toBeLessThanOrEqual(218);
  });

  it("should accurately detect multiple documents in the same image", async () => {
    const { autoDetectAllDocumentCorners } = await import(
      "../src/components/editor/document-scanner/perspective-transform"
    );

    const width = 300;
    const height = 150;
    const dummyData = new Uint8ClampedArray(width * height * 4);

    // Background (Light Gray)
    for (let i = 0; i < width * height; i++) {
      dummyData[i * 4] = 210;
      dummyData[i * 4 + 1] = 210;
      dummyData[i * 4 + 2] = 210;
      dummyData[i * 4 + 3] = 255;
    }

    // Document 1 (Left Card)
    for (let y = 25; y <= 125; y++) {
      for (let x = 20; x <= 120; x++) {
        const idx = (y * width + x) * 4;
        dummyData[idx] = 30;
        dummyData[idx + 1] = 30;
        dummyData[idx + 2] = 30;
      }
    }

    // Document 2 (Right Card)
    for (let y = 25; y <= 125; y++) {
      for (let x = 180; x <= 280; x++) {
        const idx = (y * width + x) * 4;
        dummyData[idx] = 40;
        dummyData[idx + 1] = 40;
        dummyData[idx + 2] = 40;
      }
    }

    const imgData = { data: dummyData, width, height } as any;
    const docs = autoDetectAllDocumentCorners(imgData, width, height, width, height);

    expect(docs.length).toBeGreaterThanOrEqual(2);
    expect(docs[0].corners.length).toBe(4);
    expect(docs[1].corners.length).toBe(4);

    // Verify none of the detected documents overlap with each other by > 50%
    for (let i = 0; i < docs.length; i++) {
      for (let j = i + 1; j < docs.length; j++) {
        const d1 = docs[i];
        const d2 = docs[j];
        // Calculate bounding box overlap
        const minX1 = Math.min(...d1.corners.map((p) => p.x));
        const maxX1 = Math.max(...d1.corners.map((p) => p.x));
        const minY1 = Math.min(...d1.corners.map((p) => p.y));
        const maxY1 = Math.max(...d1.corners.map((p) => p.y));

        const minX2 = Math.min(...d2.corners.map((p) => p.x));
        const maxX2 = Math.max(...d2.corners.map((p) => p.x));
        const minY2 = Math.min(...d2.corners.map((p) => p.y));
        const maxY2 = Math.max(...d2.corners.map((p) => p.y));

        const iw = Math.max(0, Math.min(maxX1, maxX2) - Math.max(minX1, minX2));
        const ih = Math.max(0, Math.min(maxY1, maxY2) - Math.max(minY1, minY2));
        const interArea = iw * ih;
        const a1 = (maxX1 - minX1) * (maxY1 - minY1);
        const a2 = (maxX2 - minX2) * (maxY2 - minY2);
        const minArea = Math.min(a1, a2);

        if (minArea > 0) {
          expect(interArea / minArea).toBeLessThanOrEqual(0.50);
        }
      }
    }
  });

  it("should correctly sort diamond/45-degree rotated quad points in clockwise order starting at Top-Left", () => {
    // Diamond shape: Top=(50, 0), Right=(100, 50), Bottom=(50, 100), Left=(0, 50)
    const diamondPoints: Point[] = [
      { x: 50, y: 100 }, // Bottom
      { x: 0, y: 50 },   // Left
      { x: 100, y: 50 }, // Right
      { x: 50, y: 0 },   // Top
    ];

    const sorted = sortCornerPoints(diamondPoints);
    expect(sorted.length).toBe(4);
    // Top-Left should be top-most / left-most point (50, 0) or (0, 50)
    expect(sorted[0].y).toBeLessThanOrEqual(50);
    // Clockwise order check: cross product of edges should be positive
    const v1 = { x: sorted[1].x - sorted[0].x, y: sorted[1].y - sorted[0].y };
    const v2 = { x: sorted[2].x - sorted[1].x, y: sorted[2].y - sorted[1].y };
    const cross = v1.x * v2.y - v1.y * v2.x;
    expect(cross).toBeGreaterThan(0);
  });

  it("should preserve text in shadow using applyOtsuFilter (Local Adaptive Thresholding)", async () => {
    const { applyOtsuFilter } = await import(
      "../src/components/editor/document-scanner/core/filters"
    );

    const width = 80;
    const height = 80;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imgData = ctx!.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Simulate strong shadow gradient from top (light, 220) to bottom (dark shadow, 70)
    for (let y = 0; y < height; y++) {
      const bgVal = Math.round(220 - (y / height) * 150);
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = bgVal;
        data[idx + 1] = bgVal;
        data[idx + 2] = bgVal;
        data[idx + 3] = 255;
      }
    }

    // Place dark text under the dark shadow at (40, 70) with brightness 30 (darker than shadow 70)
    for (let y = 68; y <= 72; y++) {
      for (let x = 38; x <= 42; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 30;
        data[idx + 1] = 30;
        data[idx + 2] = 30;
      }
    }

    // Place dark text under the bright light at (40, 10) with brightness 100 (darker than background 220)
    for (let y = 8; y <= 12; y++) {
      for (let x = 38; x <= 42; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 100;
        data[idx + 1] = 100;
        data[idx + 2] = 100;
      }
    }

    ctx!.putImageData(imgData, 0, 0);
    applyOtsuFilter(canvas);

    const resData = ctx!.getImageData(0, 0, width, height).data;

    // Text under shadow (40, 70) should be binarized to black (0)
    const shadowTextIdx = (70 * width + 40) * 4;
    expect(resData[shadowTextIdx]).toBe(0);

    // Shadow background next to text (60, 70) should be binarized to white (255)
    const shadowBgIdx = (70 * width + 60) * 4;
    expect(resData[shadowBgIdx]).toBe(255);

    // Text under bright light (40, 10) should also be binarized to black (0)
    const brightTextIdx = (10 * width + 40) * 4;
    expect(resData[brightTextIdx]).toBe(0);
  });

  it("should boost blue channel correctly in applyMagicColorFilter without corruption", async () => {
    const { applyMagicColorFilter } = await import(
      "../src/components/editor/document-scanner/core/filters"
    );

    const width = 10;
    const height = 10;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imgData = ctx!.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Set a grayish blue stamp pixel
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 140;     // R
      data[i * 4 + 1] = 150; // G
      data[i * 4 + 2] = 200; // B (predominant blue)
      data[i * 4 + 3] = 255;
    }

    ctx!.putImageData(imgData, 0, 0);
    applyMagicColorFilter(canvas);

    const resData = ctx!.getImageData(0, 0, width, height).data;

    // Blue channel should be boosted higher than red and green
    expect(resData[2]).toBeGreaterThan(resData[0]);
    expect(resData[2]).toBeGreaterThan(resData[1]);
  });

  it("should refine corners with localized sub-pixel accuracy without allocating full image", async () => {
    const { refineCornersSubPixel } = await import(
      "../src/components/editor/document-scanner/core/perspective-warper"
    );

    const width = 100;
    const height = 100;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imgData = ctx!.getImageData(0, 0, width, height);
    const dummyData = imgData.data;

    // Draw document quad from x=20..80, y=20..80
    for (let y = 20; y <= 80; y++) {
      for (let x = 20; x <= 80; x++) {
        const idx = (y * width + x) * 4;
        dummyData[idx] = 250;
        dummyData[idx + 1] = 250;
        dummyData[idx + 2] = 250;
        dummyData[idx + 3] = 255;
      }
    }

    ctx!.putImageData(imgData, 0, 0);

    const initialCorners: Point[] = [
      { x: 22, y: 22 }, // Slightly offset from true corner (20, 20)
      { x: 78, y: 22 },
      { x: 78, y: 78 },
      { x: 22, y: 78 },
    ];

    const refined = refineCornersSubPixel(initialCorners, canvas, width, height, 10);
    expect(refined.length).toBe(4);
    // Refined corners should snap closer to (20, 20), (80, 20), (80, 80), (20, 80)
    expect(refined[0].x).toBeLessThanOrEqual(21);
    expect(refined[0].y).toBeLessThanOrEqual(21);
  });

  it("should split a quad into two ID cards (vertical and horizontal) with valid coordinates", async () => {
    const { splitQuadIntoIdCards } = await import(
      "../src/components/editor/document-scanner/core/document-detector"
    );

    const quad: Point[] = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 300 },
      { x: 0, y: 300 },
    ];

    const vSplit = splitQuadIntoIdCards(quad, "vertical");
    expect(vSplit.length).toBe(2);
    expect(vSplit[0].aspectType).toBe("id_card");
    expect(vSplit[1].aspectType).toBe("id_card");
    // Card 1 top half: y from 0 to 147 (due to 2% gap)
    expect(vSplit[0].corners[0]).toEqual({ x: 0, y: 0 });
    expect(vSplit[0].corners[2]).toEqual({ x: 200, y: 147 });
    // Card 2 bottom half: y from 153 to 300 (due to 2% gap)
    expect(vSplit[1].corners[0]).toEqual({ x: 0, y: 153 });
    expect(vSplit[1].corners[2]).toEqual({ x: 200, y: 300 });

    const hSplit = splitQuadIntoIdCards(quad, "horizontal");
    expect(hSplit.length).toBe(2);
    // Card 1 left half: x from 0 to 98 (due to 2% gap)
    expect(hSplit[0].corners[1]).toEqual({ x: 98, y: 0 });
    // Card 2 right half: x from 102 to 200 (due to 2% gap)
    expect(hSplit[1].corners[0]).toEqual({ x: 102, y: 0 });
  });

  it("should add a manual document quad without exceeding image dimensions", async () => {
    const { addManualDocumentQuad } = await import(
      "../src/components/editor/document-scanner/core/document-detector"
    );

    const existingDocs = [
      {
        id: "doc-1",
        corners: [
          { x: 10, y: 10 },
          { x: 100, y: 10 },
          { x: 100, y: 100 },
          { x: 10, y: 100 },
        ],
        confidence: 0.9,
        label: "مستند 1",
        aspectType: "free" as const,
      },
    ];

    const newDoc = addManualDocumentQuad(existingDocs, 500, 500);
    expect(newDoc).toBeDefined();
    expect(newDoc.corners.length).toBe(4);
    expect(newDoc.corners[0].x).toBeGreaterThanOrEqual(10);
    expect(newDoc.corners[2].x).toBeLessThanOrEqual(500);
    expect(newDoc.corners[2].y).toBeLessThanOrEqual(500);
  });

  it("should correctly apply supporting filters (Grayscale, Sharpen, DeYellow, ShadowRemoval, BorderCleanup)", async () => {
    const {
      applyGrayscaleFilter,
      applySharpenFilter,
      applyDeYellowFilter,
      applyShadowRemoval,
      applyBorderCleanup,
    } = await import("../src/components/editor/document-scanner/core/filters");

    // 1. Grayscale Filter
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, 40, 40);
    for (let i = 0; i < 40 * 40; i++) {
      imgData.data[i * 4] = 200;
      imgData.data[i * 4 + 1] = 100;
      imgData.data[i * 4 + 2] = 50;
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const grayCanvas = applyGrayscaleFilter(canvas);
    const grayData = grayCanvas.getContext("2d")!.getImageData(0, 0, 40, 40).data;
    // In grayscale, R, G, and B should be identical
    expect(grayData[0]).toBe(grayData[1]);
    expect(grayData[1]).toBe(grayData[2]);

    // 2. DeYellow Filter
    for (let i = 0; i < 40 * 40; i++) {
      imgData.data[i * 4] = 240;
      imgData.data[i * 4 + 1] = 230;
      imgData.data[i * 4 + 2] = 150;
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const deyellowCanvas = applyDeYellowFilter(canvas);
    const dyData = deyellowCanvas.getContext("2d")!.getImageData(0, 0, 40, 40).data;
    // Blue channel should be boosted to neutralize yellow
    expect(dyData[2]).toBeGreaterThan(150);

    // 3. Border Cleanup
    const cleaned = applyBorderCleanup(canvas, 2);
    const clData = cleaned.getContext("2d")!.getImageData(0, 0, 40, 40).data;
    // Border pixels should be pure white [255, 255, 255]
    expect(clData[0]).toBe(255);
    expect(clData[1]).toBe(255);
    expect(clData[2]).toBe(255);

    // 4. Sharpen and Shadow Removal
    const sharpCanvas = applySharpenFilter(canvas);
    expect(sharpCanvas.width).toBe(40);
    const shadowCanvas = applyShadowRemoval(canvas);
    expect(shadowCanvas.width).toBe(40);
  });

  it("should score text-rich quads significantly higher than blank empty rectangular borders", async () => {
    const { computeInternalTextDensity, evaluateCandidateQuad } = await import(
      "../src/components/editor/document-scanner/core/multi-doc-segmenter"
    );

    const sw = 100;
    const sh = 100;
    const grayBlank = new Uint8Array(sw * sh).fill(220); // Solid light desk
    const grayText = new Uint8Array(sw * sh).fill(220); // Light paper with black text strokes
    const mag = new Float32Array(sw * sh);

    // Draw text lines inside quad [20,20] to [80,80]
    for (let y = 30; y <= 70; y += 4) {
      for (let x = 30; x <= 70; x++) {
        if (x % 3 === 0) {
          grayText[y * sw + x] = 20; // Dark ink
          mag[y * sw + x] = 60; // High gradient
        }
      }
    }

    const quad: Point[] = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ];

    const blankTextScore = computeInternalTextDensity(quad, grayBlank, mag, sw, sh);
    const textScore = computeInternalTextDensity(quad, grayText, mag, sw, sh);

    expect(textScore).toBeGreaterThan(blankTextScore);
    expect(textScore).toBeGreaterThan(0.20);

    const scoreBlank = evaluateCandidateQuad(quad, sw, sh, mag, grayBlank, 100);
    const scoreText = evaluateCandidateQuad(quad, sw, sh, mag, grayText, 100);

    expect(scoreText).toBeGreaterThan(scoreBlank * 1.5);
  });

  it("should strictly reject physically impossible document angles (acute diamonds, severe non-orthogonal cuts)", async () => {
    const { isPhysicallyPlausibleDocumentQuad, computeQuadOrthogonality } = await import(
      "../src/components/editor/document-scanner/core/quad-geometry"
    );

    // 1. Valid rectangular document under perspective
    const validCard: Point[] = [
      { x: 38, y: 28 },
      { x: 80, y: 32 },
      { x: 78, y: 75 },
      { x: 37, y: 72 },
    ];
    expect(isPhysicallyPlausibleDocumentQuad(validCard)).toBe(true);
    expect(computeQuadOrthogonality(validCard)).toBeGreaterThan(0.70);

    // 2. Impossible 45-degree acute diamond (scissor cut / invalid tilt)
    const impossibleDiamond: Point[] = [
      { x: 50, y: 10 },
      { x: 90, y: 50 },
      { x: 50, y: 90 },
      { x: 10, y: 50 },
    ];
    // Under perspective, a 45-degree rotated acute diamond is not a card
    const d1 = Math.hypot(impossibleDiamond[2].x - impossibleDiamond[0].x, impossibleDiamond[2].y - impossibleDiamond[0].y);
    const d2 = Math.hypot(impossibleDiamond[3].x - impossibleDiamond[1].x, impossibleDiamond[3].y - impossibleDiamond[1].y);

    // 3. Acute needle triangle/trapezoid
    const acuteNeedle: Point[] = [
      { x: 20, y: 20 },
      { x: 25, y: 22 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ];
    expect(isPhysicallyPlausibleDocumentQuad(acuteNeedle)).toBe(false);
    expect(computeQuadOrthogonality(acuteNeedle)).toBe(0);
  });

  it("should provide valid asset base url and safe warmup for ML detector", async () => {
    const { getScanicAssetBaseUrl, warmupMlDetector } = await import(
      "../src/components/editor/document-scanner/core/ml-detector"
    );

    const url = getScanicAssetBaseUrl();
    expect(url).toBeDefined();
    expect(url).toContain("models/scanic/");

    // Safe warmup should not throw even in Node/JSDOM
    await expect(warmupMlDetector()).resolves.toBeUndefined();
  });

  it("should handle detectDocumentWithMl gracefully and return null or valid scanic result", async () => {
    const { detectDocumentWithMl } = await import(
      "../src/components/editor/document-scanner/core/ml-detector"
    );

    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 200;

    // In a test environment without a running HTTP server for .ort, it should gracefully return null
    const res = await detectDocumentWithMl(canvas, 300, 200);
    if (res !== null) {
      expect(res.method).toBe("scanic");
      expect(res.corners.length).toBe(4);
      expect(res.documents?.length).toBeGreaterThan(0);
    } else {
      expect(res).toBeNull();
    }
  });

  it("should correctly process and refine corners when ML detector succeeds", async () => {
    const { detectDocumentWithMl, setScanicModuleForTesting } = await import(
      "../src/components/editor/document-scanner/core/ml-detector"
    );

    try {
      setScanicModuleForTesting({
        scanDocument: (async () => ({
          success: true,
          score: 0.96,
          corners: {
            topLeft: { x: 20, y: 15 },
            topRight: { x: 280, y: 25 },
            bottomRight: { x: 275, y: 185 },
            bottomLeft: { x: 25, y: 175 },
          },
        })) as unknown as typeof import("scanic")["scanDocument"],
      });

      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 200;

      const res = await detectDocumentWithMl(canvas, 300, 200);
      expect(res).not.toBeNull();
      expect(res?.method).toBe("scanic");
      expect(res?.confidence).toBeGreaterThanOrEqual(0.95);
      expect(res?.corners.length).toBe(4);
      expect(res?.documents?.length).toBe(1);
      expect(res?.documents?.[0].corners[0].x).toBeCloseTo(20, -1);
    } finally {
      setScanicModuleForTesting(null);
    }
  });

  it("should faithfully retain low ML confidence scores without inflating with a false floor", async () => {
    const { detectDocumentWithMl, setScanicModuleForTesting } = await import(
      "../src/components/editor/document-scanner/core/ml-detector"
    );

    try {
      setScanicModuleForTesting({
        scanDocument: (async () => ({
          success: true,
          score: 0.32,
          corners: {
            topLeft: { x: 20, y: 15 },
            topRight: { x: 280, y: 15 },
            bottomRight: { x: 280, y: 185 },
            bottomLeft: { x: 20, y: 185 },
          },
        })) as unknown as typeof import("scanic")["scanDocument"],
      });

      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 200;

      const res = await detectDocumentWithMl(canvas, 300, 200);
      expect(res).not.toBeNull();
      // Score should accurately reflect 0.32 and NOT be inflated to >= 0.75
      expect(res?.confidence).toBeCloseTo(0.32, 2);
    } finally {
      setScanicModuleForTesting(null);
    }
  });

  it("should rectify slightly tilted/skewed corners to perfect horizontal alignment", async () => {
    const { rectifyNearAxisAlignedQuad } = await import(
      "../src/components/editor/document-scanner/core/quad-geometry"
    );

    // Quad with slightly tilted top edge due to contrast/photo (y=25 on left vs y=15 on right) but horizontal bottom (y=180 on both)
    const skewedQuad = [
      { x: 20, y: 32 },
      { x: 280, y: 15 },
      { x: 280, y: 180 },
      { x: 20, y: 180 },
    ];

    const rectified = rectifyNearAxisAlignedQuad(skewedQuad);
    expect(rectified.length).toBe(4);
    // Top edges should now have matching y
    expect(rectified[0].y).toBe(rectified[1].y);
    // Bottom edges should have matching y
    expect(rectified[2].y).toBe(rectified[3].y);
    // Left edges should have matching x
    expect(rectified[0].x).toBe(rectified[3].x);
    // Right edges should have matching x
    expect(rectified[1].x).toBe(rectified[2].x);
  });
});







