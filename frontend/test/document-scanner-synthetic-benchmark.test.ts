import { describe, it, expect, beforeAll } from "vitest";
import {
  sortCornerPoints,
  detectDocumentAuto,
  Point,
} from "../src/components/editor/document-scanner/perspective-transform";
import { computePolygonArea } from "../src/components/editor/document-scanner/core/contour-tracer";
import { computeQuadOverlapStats } from "../src/components/editor/document-scanner/core/quad-geometry";

describe("Document Scanner - Synthetic Image Benchmark & Edge-Case Robustness", () => {
  beforeAll(() => {
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
          drawImage: (src: any, sx?: any, sy?: any, sw?: any, sh?: any, dx?: any, dy?: any, dw?: any, dh?: any) => {
            if (src && (src._mockData || src instanceof HTMLCanvasElement)) {
              const srcData = src._mockData || (src as any)._mockData;
              const destData = (canvas as any)._mockData;
              const targetW = canvas.width || 100;
              const targetH = canvas.height || 100;
              const srcW = src.width || 100;

              const readSx = typeof sw !== "undefined" ? (sx || 0) : 0;
              const readSy = typeof sw !== "undefined" ? (sy || 0) : 0;
              const readSw = typeof sw !== "undefined" ? (sw || srcW) : srcW;
              const readSh = typeof sw !== "undefined" ? (sh || 100) : 100;

              if (srcData && destData) {
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
          putImageData: (imgData: ImageData, dx: number = 0, dy: number = 0) => {
            const d = (canvas as any)._mockData;
            if (d && imgData && imgData.data) {
              const targetW = canvas.width || 100;
              const targetH = canvas.height || 100;
              const srcW = imgData.width;
              const srcH = imgData.height;
              for (let y = 0; y < srcH && y + dy < targetH; y++) {
                for (let x = 0; x < srcW && x + dx < targetW; x++) {
                  const sIdx = (y * srcW + x) * 4;
                  const dIdx = ((y + dy) * targetW + (x + dx)) * 4;
                  if (sIdx < imgData.data.length && dIdx < d.length) {
                    d[dIdx] = imgData.data[sIdx];
                    d[dIdx + 1] = imgData.data[sIdx + 1];
                    d[dIdx + 2] = imgData.data[sIdx + 2];
                    d[dIdx + 3] = imgData.data[sIdx + 3];
                  }
                }
              }
            }
          },
          clearRect: () => {
            const d = (canvas as any)._mockData;
            if (d) d.fill(0);
          },
          fillRect: () => {},
          save: () => {},
          restore: () => {},
          translate: () => {},
          rotate: () => {},
        } as unknown as CanvasRenderingContext2D;
      }
      return null;
    } as any;
  });

  function createSyntheticImage(
    width: number,
    height: number,
    pixelShader: (x: number, y: number) => [number, number, number, number]
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const imgData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [r, g, b, a] = pixelShader(x, y);
        const idx = (y * width + x) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = a;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return { canvas, imgData };
  }

  // 1. تباين منخفض جداً: ورقة بيضاء على طاولة رخام رمادية فاتحة
  it("Benchmark Case 1: Ultra-Low Contrast Paper on Light Marble Surface (Delta < 18)", async () => {
    const width = 260;
    const height = 180;
    const groundTruth: Point[] = [
      { x: 35, y: 25 },
      { x: 225, y: 25 },
      { x: 225, y: 155 },
      { x: 35, y: 155 },
    ];

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      const inPaper = x >= 35 && x <= 225 && y >= 25 && y <= 155;
      if (inPaper) {
        return [238, 238, 238, 255];
      }
      // Light marble background ~ 222 (Difference is only 16 levels!)
      const vein = Math.sin((x + y) * 0.1) * 4;
      const bgVal = Math.round(222 + vein);
      return [bgVal, bgVal, bgVal - 2, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    const stats = computeQuadOverlapStats(sorted, groundTruth);
    expect(stats.iou).toBeGreaterThanOrEqual(0.78);
  });

  // 2. انحراف منظوري حاد (زاوية تصوير 45 درجة)
  it("Benchmark Case 2: Extreme Perspective Skew (45-degree angled camera)", async () => {
    const width = 280;
    const height = 180;
    const groundTruth: Point[] = [
      { x: 85, y: 25 },
      { x: 195, y: 25 },
      { x: 250, y: 155 },
      { x: 30, y: 155 },
    ];

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      const t = Math.max(0, Math.min(1, (y - 25) / 130));
      const leftX = 85 + (30 - 85) * t;
      const rightX = 195 + (250 - 195) * t;

      if (y >= 25 && y <= 155 && x >= leftX && x <= rightX) {
        return [245, 240, 235, 255];
      }
      return [50, 45, 40, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    const stats = computeQuadOverlapStats(sorted, groundTruth);
    expect(stats.iou).toBeGreaterThanOrEqual(0.75);
  });

  // 3. إضاءة غير متساوية وهج فلاش في المركز مع ظلال داكنة في الأركان
  it("Benchmark Case 3: Radial Flash Glare + Dark Vignette Shadow", async () => {
    const width = 240;
    const height = 180;
    const groundTruth: Point[] = [
      { x: 30, y: 25 },
      { x: 210, y: 25 },
      { x: 210, y: 155 },
      { x: 30, y: 155 },
    ];

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      const flash = Math.exp(-(dist * dist) / 7000);

      const inDoc = x >= 30 && x <= 210 && y >= 25 && y <= 155;
      if (inDoc) {
        const base = 160 + Math.round(90 * flash);
        return [base, base, base, 255];
      }
      const bgBase = Math.max(20, Math.round(80 * flash + 30));
      return [bgBase, Math.max(0, bgBase - 10), bgBase, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    const stats = computeQuadOverlapStats(sorted, groundTruth);
    expect(stats.iou).toBeGreaterThanOrEqual(0.80);
  });

  // 4. خلفية خشبية معقدة العروق مع حلقة أثر فنجان قهوة بالقرب من الحافة
  it("Benchmark Case 4: Complex Wood Grain & Coffee Cup Artifacts", async () => {
    const width = 250;
    const height = 180;
    const groundTruth: Point[] = [
      { x: 40, y: 25 },
      { x: 210, y: 25 },
      { x: 210, y: 155 },
      { x: 40, y: 155 },
    ];

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      const inDoc = x >= 40 && x <= 210 && y >= 25 && y <= 155;
      if (inDoc) {
        return [240, 240, 240, 255];
      }

      const ringDist = Math.hypot(x - 30, y - 40);
      if (Math.abs(ringDist - 18) <= 2) {
        return [70, 45, 30, 255];
      }

      const grain = ((x * 4 + y * 2) % 15 === 0) ? 40 : 0;
      return [110 + grain, 75 + grain, 45 + grain, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    const stats = computeQuadOverlapStats(sorted, groundTruth);
    expect(stats.iou).toBeGreaterThanOrEqual(0.85);
  });

  // 5. تعدد المستندات: 3 بطاقات وإيصالات متجاورة في المشهد
  it("Benchmark Case 5: Multi-Document Detection (3 scattered items)", async () => {
    const width = 340;
    const height = 200;

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      if (x >= 20 && x <= 110 && y >= 20 && y <= 80) return [30, 45, 75, 255];
      if (x >= 130 && x <= 220 && y >= 20 && y <= 80) return [245, 245, 245, 255];
      if (x >= 60 && x <= 260 && y >= 110 && y <= 185) return [235, 235, 230, 255];

      return [120, 115, 105, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "multi");
    expect(result.documents).toBeDefined();
    expect(result.documents!.length).toBeGreaterThanOrEqual(2);
  });

  // 6. صفحة كتاب منحنية الأطراف (Curved / Wrinkled Page)
  it("Benchmark Case 6: Curved Paper Boundary with Parabolic Edge", async () => {
    const width = 240;
    const height = 180;

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      const topY = 25 + 6 * Math.sin(((x - 30) / 180) * Math.PI);
      const botY = 155 - 4 * Math.sin(((x - 30) / 180) * Math.PI);

      if (x >= 30 && x <= 210 && y >= topY && y <= botY) {
        return [245, 240, 235, 255];
      }
      return [65, 55, 45, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    expect(sorted[0].x).toBeLessThanOrEqual(38);
    expect(sorted[1].x).toBeGreaterThanOrEqual(202);
    expect(sorted[2].y).toBeGreaterThanOrEqual(148);
  });

  // 7. زاوية محجوبة بأصابع اليد (Occlusion on Top-Left Corner)
  it("Benchmark Case 7: Corner Occlusion (Hand holding paper corner)", async () => {
    const width = 240;
    const height = 180;

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      const fingerDist = Math.hypot(x - 30, y - 25);
      if (fingerDist <= 16) {
        return [190, 140, 110, 255];
      }

      if (x >= 30 && x <= 210 && y >= 25 && y <= 155) {
        return [240, 240, 240, 255];
      }

      return [50, 45, 40, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    expect(sorted[0].x).toBeLessThanOrEqual(42);
    expect(sorted[0].y).toBeLessThanOrEqual(42);
    expect(sorted[1].x).toBeGreaterThanOrEqual(200);
    expect(sorted[2].y).toBeGreaterThanOrEqual(150);
  });

  // 8. بطاقة جواز سفر داكنة على سطح جرانيت داكن
  it("Benchmark Case 8: Dark Passport on Dark Slate/Granite", async () => {
    const width = 220;
    const height = 160;

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      if (x >= 30 && x <= 190 && y >= 20 && y <= 140) {
        return [20, 25, 48, 255];
      }
      return [45, 48, 52, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    expect(sorted[0].x).toBeLessThanOrEqual(38);
    expect(sorted[1].x).toBeGreaterThanOrEqual(182);
  });

  // 9. مستند مائل بزاوية 30 درجة
  it("Benchmark Case 9: Document Rotated at 30 Degrees", async () => {
    const width = 260;
    const height = 260;
    const cx = 130, cy = 130;
    const rad = (30 * Math.PI) / 180;
    const cosA = Math.cos(-rad);
    const sinA = Math.sin(-rad);

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      const rx = (x - cx) * cosA - (y - cy) * sinA;
      const ry = (x - cx) * sinA + (y - cy) * cosA;

      if (Math.abs(rx) <= 70 && Math.abs(ry) <= 45) {
        return [245, 240, 235, 255];
      }
      return [60, 50, 40, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.5);
    const area = computePolygonArea(result.corners);
    expect(area).toBeGreaterThanOrEqual(10500);
    expect(area).toBeLessThanOrEqual(14500);
  });

  // 10. مستند مائل بزاوية 45 درجة (Diamond Config)
  it("Benchmark Case 10: Document Rotated at 45 Degrees (Diamond Alignment)", async () => {
    const width = 260;
    const height = 260;
    const cx = 130, cy = 130;
    const rad = (45 * Math.PI) / 180;
    const cosA = Math.cos(-rad);
    const sinA = Math.sin(-rad);

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      const rx = (x - cx) * cosA - (y - cy) * sinA;
      const ry = (x - cx) * sinA + (y - cy) * cosA;

      if (Math.abs(rx) <= 60 && Math.abs(ry) <= 40) {
        return [245, 240, 235, 255];
      }
      return [60, 50, 40, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    expect(sorted.length).toBe(4);
    expect(computePolygonArea(sorted)).toBeGreaterThan(4000);
  });

  // 11. إيصال تسوق ممتد وطويل (High Aspect Ratio 1:3.2)
  it("Benchmark Case 11: High Aspect Ratio Receipt (1:3.2) with Thermal Print", async () => {
    const width = 240;
    const height = 260;
    const groundTruth: Point[] = [
      { x: 90, y: 15 },
      { x: 150, y: 15 },
      { x: 150, y: 245 },
      { x: 90, y: 245 },
    ];

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      if (x >= 90 && x <= 150 && y >= 15 && y <= 245) {
        return [245, 245, 240, 255];
      }
      return [70, 60, 50, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    expect(sorted[0].x).toBeLessThanOrEqual(95);
    expect(sorted[0].y).toBeLessThanOrEqual(20);
    expect(sorted[1].x).toBeGreaterThanOrEqual(145);
    expect(sorted[2].y).toBeGreaterThanOrEqual(240);
  });

  // 12. دفتر جواز سفر مفتوح بصفحتين مع خط المنتصف
  it("Benchmark Case 12: Open Dual-Page Passport Booklet", async () => {
    const width = 280;
    const height = 180;
    const groundTruth: Point[] = [
      { x: 30, y: 25 },
      { x: 250, y: 25 },
      { x: 250, y: 155 },
      { x: 30, y: 155 },
    ];

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      if (x >= 30 && x <= 250 && y >= 25 && y <= 155) {
        if (Math.abs(x - 140) <= 3) return [160, 155, 150, 255];
        return [245, 240, 235, 255];
      }
      return [55, 45, 35, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    const stats = computeQuadOverlapStats(sorted, groundTruth);
    expect(stats.iou).toBeGreaterThanOrEqual(0.88);
  });

  // 13. مكتب فوضوي مع أدوات مكتبية تلامس أطراف الورقة
  it("Benchmark Case 13: Cluttered Desk with Pens Touching Paper Edge", async () => {
    const width = 240;
    const height = 180;
    const groundTruth: Point[] = [
      { x: 40, y: 25 },
      { x: 200, y: 25 },
      { x: 200, y: 155 },
      { x: 40, y: 155 },
    ];

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      if (Math.abs(y - 70) <= 2 && x >= 180 && x <= 225) {
        return [15, 15, 15, 255];
      }

      if (x >= 40 && x <= 200 && y >= 25 && y <= 155) {
        return [240, 240, 240, 255];
      }

      return [90, 80, 70, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    const stats = computeQuadOverlapStats(sorted, groundTruth);
    expect(stats.iou).toBeGreaterThanOrEqual(0.85);
  });

  // 14. قياس دقة الأركان البكسلية
  it("Benchmark Case 14: Sub-Pixel Precision Benchmark (Corner Deviation Error <= 7.0px)", async () => {
    const width = 240;
    const height = 180;
    const exactCorners: Point[] = [
      { x: 40, y: 30 },
      { x: 200, y: 30 },
      { x: 200, y: 150 },
      { x: 40, y: 150 },
    ];

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      if (x >= 40 && x <= 200 && y >= 30 && y <= 150) {
        return [245, 245, 245, 255];
      }
      return [40, 40, 40, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const detected = sortCornerPoints(result.corners);

    let totalDeviation = 0;
    for (let i = 0; i < 4; i++) {
      const err = Math.hypot(detected[i].x - exactCorners[i].x, detected[i].y - exactCorners[i].y);
      totalDeviation += err;
    }
    const meanError = totalDeviation / 4;
    expect(meanError).toBeLessThanOrEqual(7.0);
  });

  // 15. سرعة الاستجابة والإنتاجية
  it("Benchmark Case 15: Detection Throughput & Latency (< 250ms per frame in Node/JSDOM)", async () => {
    const width = 320;
    const height = 240;

    const { canvas } = createSyntheticImage(width, height, (x, y) => {
      if (x >= 50 && x <= 270 && y >= 40 && y <= 200) {
        return [240, 235, 230, 255];
      }
      return [60, 50, 40, 255];
    });

    const startTime = performance.now();
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      await detectDocumentAuto(canvas, width, height, "single");
    }
    const elapsed = (performance.now() - startTime) / iterations;

    expect(elapsed).toBeLessThan(250);
  });
});
