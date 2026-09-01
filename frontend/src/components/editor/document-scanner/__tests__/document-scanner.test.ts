import { describe, it, expect, beforeAll } from "vitest";
import {
  approxPolyDP,
  extractFourCornersFromHull,
  sortCornerPoints,
  inferSmartDocumentAspect,
  splitQuadIntoIdCards,
  addManualDocumentQuad,
  computePerspectiveTransform,
  rgbaToGrayscale,
  fastBoxBlur,
  computeOtsuThreshold,
  Point,
} from "../core";

describe("Document Scanner - Core Geometry & Vision", () => {
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === "2d") {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
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
          drawImage: (src: any) => {
            if (src && (src as any)._mockData) {
              const srcData = (src as any)._mockData;
              const destData = (canvas as any)._mockData;
              const len = Math.min(srcData.length, destData.length);
              for (let i = 0; i < len; i++) {
                destData[i] = srcData[i];
              }
            }
          },
          getImageData: (sx: number, sy: number, sw: number, sh: number) => {
            const data = new Uint8ClampedArray(sw * sh * 4);
            const src = (canvas as any)._mockData || new Uint8ClampedArray(sw * sh * 4);
            for (let i = 0; i < data.length && i < src.length; i++) {
              data[i] = src[i];
            }
            return { data, width: sw, height: sh };
          },
          putImageData: (imgData: any) => {
            (canvas as any)._mockData = new Uint8ClampedArray(imgData.data);
          },
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          closePath: () => {},
          stroke: () => {},
          fill: () => {},
          save: () => {},
          restore: () => {},
        } as any;
      }
      return null;
    };
  });
  describe("approxPolyDP", () => {
    it("simplifies a segmented polygon with intermediate collinear-ish points into 4 corners", () => {
      // مستطيل به نقاط زائدة على الحواف
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 1 },    // نقطة زائدة قريبة من الحافة العلوية
        { x: 100, y: 0 },
        { x: 101, y: 50 },  // نقطة زائدة قريبة من الحافة اليمنى
        { x: 100, y: 100 },
        { x: 50, y: 99 },   // نقطة زائدة قريبة من الحافة السفلية
        { x: 0, y: 100 },
        { x: 0, y: 0 },     // مغلق
      ];

      const approx = approxPolyDP(points, 5);
      // بعد التقريب واستبعاد النقطة المغلقة المكررة
      const unique = approx.slice(0, -1);
      expect(unique.length).toBe(4);
      expect(unique[0]).toEqual({ x: 0, y: 0 });
      expect(unique[1]).toEqual({ x: 100, y: 0 });
      expect(unique[2]).toEqual({ x: 100, y: 100 });
      expect(unique[3]).toEqual({ x: 0, y: 100 });
    });

    it("handles degenerate 2-point arrays gracefully", () => {
      const line: Point[] = [
        { x: 10, y: 10 },
        { x: 90, y: 90 },
      ];
      const res = approxPolyDP(line, 2);
      expect(res.length).toBe(2);
    });
  });

  describe("extractFourCornersFromHull", () => {
    it("extracts four true corners from an 8-point convex hull polygon", () => {
      const hull: Point[] = [
        { x: 10, y: 10 },
        { x: 50, y: 12 },
        { x: 100, y: 10 },
        { x: 102, y: 60 },
        { x: 100, y: 120 },
        { x: 55, y: 118 },
        { x: 10, y: 120 },
        { x: 8, y: 65 },
      ];

      const corners = extractFourCornersFromHull(hull);
      expect(corners).not.toBeNull();
      expect(corners?.length).toBe(4);

      if (corners) {
        // [0] TL, [1] TR, [2] BR, [3] BL
        expect(corners[0].x).toBeLessThan(corners[1].x);
        expect(corners[0].y).toBeLessThan(corners[3].y);
        expect(corners[1].y).toBeLessThan(corners[2].y);
        expect(corners[3].x).toBeLessThan(corners[2].x);
      }
    });

    it("returns sorted points directly if hull already has exactly 4 points", () => {
      const quad: Point[] = [
        { x: 200, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 150 },
        { x: 200, y: 150 },
      ];
      const sorted = extractFourCornersFromHull(quad);
      expect(sorted).not.toBeNull();
      expect(sorted?.length).toBe(4);
      expect(sorted?.[0]).toEqual({ x: 50, y: 50 }); // TL
    });
  });

  describe("sortCornerPoints", () => {
    it("sorts shuffled points into clockwise TL, TR, BR, BL order", () => {
      const shuffled: Point[] = [
        { x: 300, y: 400 }, // BR
        { x: 100, y: 100 }, // TL
        { x: 300, y: 100 }, // TR
        { x: 100, y: 400 }, // BL
      ];

      const sorted = sortCornerPoints(shuffled);
      expect(sorted[0]).toEqual({ x: 100, y: 100 }); // Top-Left
      expect(sorted[1]).toEqual({ x: 300, y: 100 }); // Top-Right
      expect(sorted[2]).toEqual({ x: 300, y: 400 }); // Bottom-Right
      expect(sorted[3]).toEqual({ x: 100, y: 400 }); // Bottom-Left
    });
  });

  describe("inferSmartDocumentAspect", () => {
    it("identifies standard ID Card (ID-1 / 1.586)", () => {
      const idCardQuad: Point[] = [
        { x: 0, y: 0 },
        { x: 158, y: 0 },
        { x: 158, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(idCardQuad)).toBe("id_card");
    });

    it("identifies A4 Portrait (0.707)", () => {
      const a4Portrait: Point[] = [
        { x: 0, y: 0 },
        { x: 70, y: 0 },
        { x: 70, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(a4Portrait)).toBe("a4_p");
    });

    it("identifies A4 Landscape (1.414)", () => {
      const a4Landscape: Point[] = [
        { x: 0, y: 0 },
        { x: 141, y: 0 },
        { x: 141, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(a4Landscape)).toBe("a4_l");
    });

    it("identifies Square documents", () => {
      const squareQuad: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(squareQuad)).toBe("square");
    });

    it("identifies custom/free ratios", () => {
      const freeQuad: Point[] = [
        { x: 0, y: 0 },
        { x: 300, y: 0 },
        { x: 300, y: 100 },
        { x: 0, y: 100 },
      ];
      expect(inferSmartDocumentAspect(freeQuad)).toBe("free");
    });
  });

  describe("splitQuadIntoIdCards", () => {
    const parentQuad: Point[] = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 260 },
      { x: 0, y: 260 },
    ];

    it("splits vertically into 2 ID card documents with a small safety margin", () => {
      const cards = splitQuadIntoIdCards(parentQuad, "vertical");
      expect(cards.length).toBe(2);
      expect(cards[0].id).toContain("doc-");
      expect(cards[1].id).toContain("doc-");
      expect(cards[0].aspectType).toBe("id_card");
      expect(cards[1].aspectType).toBe("id_card");

      // Card 1 top half
      expect(cards[0].corners[0]).toEqual({ x: 0, y: 0 });
      expect(cards[0].corners[1]).toEqual({ x: 200, y: 0 });

      // Card 2 bottom half
      expect(cards[1].corners[2]).toEqual({ x: 200, y: 260 });
      expect(cards[1].corners[3]).toEqual({ x: 0, y: 260 });
    });

    it("splits horizontally into 2 ID card documents", () => {
      const cards = splitQuadIntoIdCards(parentQuad, "horizontal");
      expect(cards.length).toBe(2);
      expect(cards[0].aspectType).toBe("id_card");
      expect(cards[1].aspectType).toBe("id_card");
    });
  });

  describe("addManualDocumentQuad", () => {
    it("adds a clean new document quad in an organized grid", () => {
      const existing: any[] = [];
      const doc1 = addManualDocumentQuad(existing, 1000, 800);
      expect(doc1.corners.length).toBe(4);
      expect(doc1.aspectType).toBe("free");
      expect(doc1.label).toContain("1");

      const doc2 = addManualDocumentQuad([doc1], 1000, 800);
      expect(doc2.label).toContain("2");
      // doc2 should be in column 2
      expect(doc2.corners[0].x).toBeGreaterThan(doc1.corners[0].x);
    });
  });

  describe("computePerspectiveTransform", () => {
    it("computes an accurate homography transform for a standard rectangle", () => {
      const src: Point[] = [
        { x: 10, y: 10 },
        { x: 110, y: 10 },
        { x: 110, y: 110 },
        { x: 10, y: 110 },
      ];
      const dst: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];

      const h = computePerspectiveTransform(src, dst);
      expect(h.length).toBe(9);
      // No NaNs or Infinities
      for (const val of h) {
        expect(Number.isFinite(val)).toBe(true);
      }
    });
  });

  describe("Vision & Filters", () => {
    it("accurately converts RGBA to Grayscale using 10-bit fixed point weights", () => {
      const rgba = new Uint8Array([
        255, 255, 255, 255, // Pure white
        0, 0, 0, 255,       // Pure black
        255, 0, 0, 255,     // Pure red (0.299 * 255 ~ 76)
        0, 255, 0, 255,     // Pure green (0.587 * 255 ~ 150)
      ]);
      const gray = rgbaToGrayscale(rgba, 2, 2);
      expect(gray[0]).toBe(255); // White stays 255 (306+601+117 = 1024 -> 255*1024 >> 10 = 255)
      expect(gray[1]).toBe(0);
      expect(gray[2]).toBe(76);
      expect(gray[3]).toBe(149);
    });

    it("smooths image using fastBoxBlur", () => {
      const gray = new Uint8Array([
        100, 100, 100,
        100, 200, 100,
        100, 100, 100,
      ]);
      const blurred = fastBoxBlur(gray, 3, 3, 1);
      expect(blurred.length).toBe(9);
      expect(blurred[4]).toBeLessThan(200); // Center peak smoothed out
    });

    it("computes Otsu threshold cleanly", () => {
      const gray = new Uint8Array([
        10, 10, 10, 10, 10,
        240, 240, 240, 240, 240,
      ]);
      const thresh = computeOtsuThreshold(gray, 10);
      expect(thresh).toBeGreaterThanOrEqual(10);
      expect(thresh).toBeLessThan(240);
    });
  });

  describe("Safety, Overlaps & Memory Verification", () => {
    it("computes quad overlap stats safely without negative union area", async () => {
      const { computeQuadOverlapStats } = await import("../core/quad-geometry");
      const q1: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      const q2: Point[] = [
        { x: 50, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 150 },
        { x: 50, y: 150 },
      ];

      const stats = computeQuadOverlapStats(q1, q2);
      expect(stats.iou).toBeGreaterThan(0);
      expect(stats.iou).toBeLessThanOrEqual(1);
      expect(stats.overlapRatio1).toBeGreaterThan(0);
      expect(stats.overlapRatio2).toBeGreaterThan(0);
    });

    it("prevents call stack overflow on deeply complex polygons via approxPolyDP depth guard", () => {
      const complexPoly: Point[] = [];
      for (let i = 0; i < 200; i++) {
        complexPoly.push({ x: i * 2, y: (i % 2 === 0 ? 10 : 20) + i * 0.1 });
      }
      const approx = approxPolyDP(complexPoly, 0.5);
      expect(approx.length).toBeGreaterThan(0);
    });

    it("handles degenerate collinear points in findRotatedQuadCorners gracefully", async () => {
      const { findRotatedQuadCorners } = await import("../core/quad-geometry");
      const collinear: Point[] = [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
        { x: 100, y: 100 },
      ];
      const res = findRotatedQuadCorners(collinear);
      expect(res).not.toBeNull();
      expect(res?.length).toBe(4);
    });

    it("safely handles addManualDocumentQuad wrapping when count > 6", () => {
      const existing: any[] = [];
      for (let i = 0; i < 10; i++) {
        const doc = addManualDocumentQuad(existing, 1000, 800);
        existing.push(doc);
        expect(doc.corners[0].x).toBeGreaterThanOrEqual(0);
        expect(doc.corners[1].x).toBeLessThanOrEqual(1000);
        expect(doc.corners[0].y).toBeGreaterThanOrEqual(0);
        expect(doc.corners[2].y).toBeLessThanOrEqual(800);
      }
      expect(existing.length).toBe(10);
    });

    it("rotates canvas with destroySrcCanvas = false preserving source canvas dimensions", async () => {
      const { rotateCanvas } = await import("../core/perspective-warper");
      const c = document.createElement("canvas");
      c.width = 100;
      c.height = 200;
      const ctx = c.getContext("2d");
      if (ctx) {
        const imgData = ctx.createImageData(100, 200);
        ctx.putImageData(imgData, 0, 0);
      }
      const rot = rotateCanvas(c, 90, false);
      expect(rot.width).toBe(200);
      expect(rot.height).toBe(100);
      expect(c.width).toBe(100); // Preserved
    });

    it("applies border cleanup safely with bounds clamping", async () => {
      const { applyBorderCleanup } = await import("../core/filters");
      const c = document.createElement("canvas");
      c.width = 50;
      c.height = 50;
      const ctx = c.getContext("2d");
      if (ctx) {
        const imgData = ctx.createImageData(50, 50);
        // Fill black
        for (let i = 0; i < 50 * 50 * 4; i += 4) {
          imgData.data[i] = 0;
          imgData.data[i + 1] = 0;
          imgData.data[i + 2] = 0;
          imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        const cleaned = applyBorderCleanup(c, 5);
        const data = cleaned.getContext("2d")!.getImageData(0, 0, 50, 50).data;
        // Border pixel at (0, 0) should be white (255)
        expect(data[0]).toBe(255);
        expect(data[1]).toBe(255);
        expect(data[2]).toBe(255);
        // Center pixel at (25, 25) should still be black (0)
        const centerIdx = (25 * 50 + 25) * 4;
        expect(data[centerIdx]).toBe(0);
      }
    });
  });

  describe("20x Precision Computer Vision & RANSAC Geometry", () => {
    it("computes multi-channel gradient capturing color edges invisible to pure grayscale", async () => {
      const { computeMultiChannelGradient } = await import("../core/fast-vision");
      const w = 10;
      const h = 10;
      const rgba = new Uint8Array(w * h * 4);

      // Left half: Red (255, 0, 0) -> Gray value ~ 76
      // Right half: Green (0, 130, 0) -> Gray value ~ 76 (almost identical grayscale luminance!)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          if (x < 5) {
            rgba[idx] = 255;
            rgba[idx + 1] = 0;
            rgba[idx + 2] = 0;
            rgba[idx + 3] = 255;
          } else {
            rgba[idx] = 0;
            rgba[idx + 1] = 130;
            rgba[idx + 2] = 0;
            rgba[idx + 3] = 255;
          }
        }
      }

      const grad = computeMultiChannelGradient(rgba, w, h);
      expect(grad.maxMag).toBeGreaterThan(50); // Strong edge detected at border
    });

    it("applies morphological gradient amplifying step edges while rejecting slow gradients", async () => {
      const { applyMorphologicalGradient } = await import("../core/fast-vision");
      const w = 10;
      const h = 10;
      const gray = new Uint8Array(w * h);

      // Add a step edge at x = 5
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          gray[y * w + x] = x < 5 ? 50 : 200;
        }
      }

      const morph = applyMorphologicalGradient(gray, w, h, 1);
      // Center boundary at x = 4, 5 should have high response (150)
      expect(morph[4 * w + 5]).toBe(150);
      // Flat region at x = 1 should have 0 response
      expect(morph[4 * w + 1]).toBe(0);
    });

    it("applies Canny NMS and hysteresis producing clean 1-pixel edge contours", async () => {
      const { applyCannyNmsHysteresis } = await import("../core/fast-vision");
      const w = 12;
      const h = 12;
      const mag = new Float32Array(w * h);
      const gx = new Float32Array(w * h);
      const gy = new Float32Array(w * h);

      // Create a vertical edge ridge with thickness 3 at x = 5, 6, 7 (peak at x = 6)
      for (let y = 1; y < h - 1; y++) {
        mag[y * w + 5] = 30;
        mag[y * w + 6] = 80; // Peak
        mag[y * w + 7] = 30;
        gx[y * w + 6] = 80;
      }

      const edges = applyCannyNmsHysteresis(mag, gx, gy, w, h, 20, 60);
      // Peak at x = 6 should be marked as 255
      expect(edges[5 * w + 6]).toBe(255);
      // Shoulders at x = 5 and x = 7 should be suppressed to 0 by NMS
      expect(edges[5 * w + 5]).toBe(0);
      expect(edges[5 * w + 7]).toBe(0);
    });

    it("reconstructs sharp 4-line intersection quad via fitRobustQuadLinesRANSAC from noisy contour points", async () => {
      const { fitRobustQuadLinesRANSAC } = await import("../core/quad-geometry");

      // Generate noisy edge points for a rectangle [20, 20] to [100, 100] with clipped corners
      const contourPts: Point[] = [];
      // Top edge
      for (let x = 30; x <= 90; x += 2) contourPts.push({ x, y: 20 + (Math.random() - 0.5) });
      // Right edge
      for (let y = 30; y <= 90; y += 2) contourPts.push({ x: 100 + (Math.random() - 0.5), y });
      // Bottom edge
      for (let x = 30; x <= 90; x += 2) contourPts.push({ x, y: 100 + (Math.random() - 0.5) });
      // Left edge
      for (let y = 30; y <= 90; y += 2) contourPts.push({ x: 20 + (Math.random() - 0.5), y });

      const seedQuad: Point[] = [
        { x: 25, y: 25 },
        { x: 95, y: 25 },
        { x: 95, y: 95 },
        { x: 25, y: 95 },
      ];

      const reconstructed = fitRobustQuadLinesRANSAC(contourPts, seedQuad);
      expect(reconstructed).not.toBeNull();
      if (reconstructed) {
        expect(reconstructed.length).toBe(4);
        // Should reconstruct sharp corners near (20, 20), (100, 20), (100, 100), (20, 100)
        expect(reconstructed[0].x).toBeCloseTo(20, 0);
        expect(reconstructed[0].y).toBeCloseTo(20, 0);
        expect(reconstructed[1].x).toBeCloseTo(100, 0);
        expect(reconstructed[1].y).toBeCloseTo(20, 0);
        expect(reconstructed[2].x).toBeCloseTo(100, 0);
        expect(reconstructed[2].y).toBeCloseTo(100, 0);
        expect(reconstructed[3].x).toBeCloseTo(20, 0);
        expect(reconstructed[3].y).toBeCloseTo(100, 0);
      }
    });

    it("evaluates vanishing point physics correctly for perspective document quads", async () => {
      const { evaluateVanishingPointPhysics } = await import("../core/quad-geometry");

      // Perspective trapezoid (valid camera projection)
      const trapezoid: Point[] = [
        { x: 30, y: 20 },
        { x: 90, y: 20 },
        { x: 110, y: 100 },
        { x: 10, y: 100 },
      ];

      const score = evaluateVanishingPointPhysics(trapezoid);
      expect(score).toBeGreaterThan(0.5);
    });
  });
});
