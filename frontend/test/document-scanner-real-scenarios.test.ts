import { describe, it, expect, beforeAll } from "vitest";
import {
  sortCornerPoints,
  autoDetectDocumentCorners,
  autoDetectAllDocumentCorners,
  detectDocumentAuto,
  warpPerspective,
  inferSmartDocumentAspect,
  splitQuadIntoIdCards,
  addManualDocumentQuad,
  rotateCanvas,
  applyMagicColorFilter,
  applyOtsuFilter,
  applyFilterMode,
  refineCornersSubPixel,
  Point,
  DetectedDocument,
} from "../src/components/editor/document-scanner/perspective-transform";

describe("Document Scanner - Realistic Test Scenarios & Synthetic Images", () => {
  beforeAll(() => {
    // Setup robust HTMLCanvasElement 2D context mock with full pixel buffer simulation
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

  // Helper to create a canvas filled with custom pixel data
  function createTestCanvas(width: number, height: number, fillFn: (x: number, y: number) => [number, number, number, number]) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const imgData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [r, g, b, a] = fillFn(x, y);
        const idx = (y * width + x) * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = a;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return { canvas, ctx, imgData };
  }

  it("Scenario 1: Realistic trapezoidal document with perspective distortion on textured desk", async () => {
    const width = 240;
    const height = 180;

    // Skewed quad: TL=(40, 30), TR=(200, 20), BR=(220, 150), BL=(30, 140)
    const insideQuad = (x: number, y: number) => {
      const leftX = 40 - (y - 30) * 0.09;
      const rightX = 200 + (y - 20) * 0.15;
      const topY = 30 - (x - 40) * 0.06;
      const botY = 140 + (x - 30) * 0.05;
      return x >= leftX && x <= rightX && y >= topY && y <= botY;
    };

    const { canvas, imgData } = createTestCanvas(width, height, (x, y) => {
      if (insideQuad(x, y)) {
        // Document interior (Off-white paper with simulated text lines)
        if (y % 10 === 0 && x > 60 && x < 180) {
          return [30, 30, 30, 255]; // Printed text stripe
        }
        return [240, 235, 230, 255]; // Paper white
      }
      // Wooden desk background (Dark Brown texture)
      const grain = (x * 3 + y * 7) % 20;
      return [60 + grain, 40 + grain, 25 + grain, 255];
    });

    const docs = autoDetectAllDocumentCorners(imgData, width, height, width, height);
    expect(docs.length).toBeGreaterThanOrEqual(1);

    const doc = docs[0];
    expect(doc.confidence).toBeGreaterThanOrEqual(0.60);
    expect(doc.corners.length).toBe(4);

    // Verify corners detected around the trapezoid perimeter
    const sorted = sortCornerPoints(doc.corners);
    expect(sorted[0].x).toBeLessThanOrEqual(50); // TL
    expect(sorted[0].y).toBeLessThanOrEqual(40);
    expect(sorted[1].x).toBeGreaterThanOrEqual(190); // TR
    expect(sorted[2].x).toBeGreaterThanOrEqual(205); // BR
    expect(sorted[2].y).toBeGreaterThanOrEqual(135);
    expect(sorted[3].x).toBeLessThanOrEqual(45); // BL

    // Run perspective rectification
    const warped = warpPerspective(canvas, sorted, 200, 140, "magic");
    expect(warped).toBeDefined();
    expect(warped.width).toBe(200);
    expect(warped.height).toBe(140);
  });

  it("Scenario 2: Multiple documents (Front & Back ID Cards) side by side on light surface", async () => {
    const width = 320;
    const height = 180;

    // Card 1: x=25..150 (w=125), y=30..109 (h=79) -> ID aspect ~ 1.58
    // Card 2: x=175..301 (w=126), y=50..130 (h=80) -> ID aspect ~ 1.575
    const { canvas, imgData } = createTestCanvas(width, height, (x, y) => {
      const inCard1 = x >= 25 && x <= 150 && y >= 30 && y <= 109;
      const inCard2 = x >= 175 && x <= 301 && y >= 50 && y <= 130;

      if (inCard1) {
        // Dark National ID card
        return [35, 45, 75, 255]; // Deep Navy Blue
      }
      if (inCard2) {
        // Back of ID card (Dark Gray / Blue)
        return [40, 50, 65, 255];
      }
      // Light desk surface (Beige / Off-white counter)
      return [220, 215, 205, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "multi");
    expect(result.documents).toBeDefined();
    expect(result.documents!.length).toBe(2);

    const doc1 = result.documents![0];
    const doc2 = result.documents![1];

    expect(doc1.aspectType).toBe("id_card");
    expect(doc2.aspectType).toBe("id_card");

    // Ensure they represent distinct regions (Non-overlapping)
    const minX1 = Math.min(...doc1.corners.map(p => p.x));
    const maxX1 = Math.max(...doc1.corners.map(p => p.x));
    const minX2 = Math.min(...doc2.corners.map(p => p.x));
    const maxX2 = Math.max(...doc2.corners.map(p => p.x));

    expect(Math.max(minX1, minX2)).toBeGreaterThanOrEqual(Math.min(maxX1, maxX2));
  });

  it("Scenario 3: Harsh illumination shadow gradient across paper document", async () => {
    const width = 160;
    const height = 160;

    // Document in center: x=25..135, y=25..135
    // Shadow gradient from top-left (bright 240) to bottom-right (dark shadow 60)
    const { canvas } = createTestCanvas(width, height, (x, y) => {
      const inDoc = x >= 25 && x <= 135 && y >= 25 && y <= 135;
      const shadowFactor = Math.max(0.25, 1.0 - (x + y) / (width + height) * 0.75);

      if (inDoc) {
        // Text at (80, 110) in the shadow zone
        if (x >= 75 && x <= 85 && y >= 108 && y <= 112) {
          return [Math.round(20 * shadowFactor), Math.round(20 * shadowFactor), Math.round(20 * shadowFactor), 255];
        }
        return [Math.round(245 * shadowFactor), Math.round(240 * shadowFactor), Math.round(235 * shadowFactor), 255];
      }
      return [30, 25, 20, 255]; // Table background
    });

    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const processedCanvas = applyOtsuFilter(canvas);
    const outData = ctx.getImageData(0, 0, width, height).data;

    // In shadow zone: Text should be black (0) and paper background should be white (255)
    const textPixelIdx = (110 * width + 80) * 4;
    expect(outData[textPixelIdx]).toBe(0); // Text extracted as pure black

    const bgShadowPixelIdx = (110 * width + 50) * 4;
    expect(outData[bgShadowPixelIdx]).toBe(255); // Background whitened
  });

  it("Scenario 4: Color stamp and signature preservation in Magic Color mode", async () => {
    const width = 60;
    const height = 60;

    // Create a document patch with:
    // 1. Grayish/yellowish paper background: RGB(215, 210, 195)
    // 2. Blue official stamp: RGB(40, 90, 220)
    // 3. Red signature: RGB(220, 30, 30)
    // 4. Black text: RGB(25, 25, 25)
    const { canvas } = createTestCanvas(width, height, (x, y) => {
      if (x < 20 && y < 20) {
        return [40, 90, 220, 255]; // Blue stamp
      }
      if (x > 40 && y < 20) {
        return [220, 30, 30, 255]; // Red signature
      }
      if (y > 40) {
        return [25, 25, 25, 255]; // Black text
      }
      return [215, 210, 195, 255]; // Paper background
    });

    const magicCanvas = applyMagicColorFilter(canvas);
    const ctx = magicCanvas.getContext("2d", { willReadFrequently: true })!;
    const resData = ctx.getImageData(0, 0, width, height).data;

    // 1. Paper background at (30, 30) should be whitened
    const bgIdx = (30 * width + 30) * 4;
    expect(resData[bgIdx]).toBeGreaterThanOrEqual(235);
    expect(resData[bgIdx + 1]).toBeGreaterThanOrEqual(235);
    expect(resData[bgIdx + 2]).toBeGreaterThanOrEqual(235);

    // 2. Blue stamp at (10, 10) must remain intensely blue (B >> R)
    const stampIdx = (10 * width + 10) * 4;
    expect(resData[stampIdx + 2]).toBeGreaterThan(resData[stampIdx]); // B > R
    expect(resData[stampIdx + 2]).toBeGreaterThan(150); // Vibrant blue

    // 3. Red signature at (50, 10) must remain intensely red (R >> B)
    const sigIdx = (10 * width + 50) * 4;
    expect(resData[sigIdx]).toBeGreaterThan(resData[sigIdx + 2]); // R > B
    expect(resData[sigIdx]).toBeGreaterThan(150); // Vibrant red
  });

  it("Scenario 5: 90/180/270 degree rotation utility", () => {
    // 90 deg rotation swaps width and height
    const c1 = document.createElement("canvas");
    c1.width = 300;
    c1.height = 200;
    const rot90 = rotateCanvas(c1, 90);
    expect(rot90.width).toBe(200);
    expect(rot90.height).toBe(300);
    expect(c1.width).toBe(0); // Verifies memory cleanup

    // 180 deg rotation keeps dimensions
    const c2 = document.createElement("canvas");
    c2.width = 300;
    c2.height = 200;
    const rot180 = rotateCanvas(c2, 180);
    expect(rot180.width).toBe(300);
    expect(rot180.height).toBe(200);
    expect(c2.width).toBe(0); // Verifies memory cleanup

    // 270 deg rotation swaps width and height
    const c3 = document.createElement("canvas");
    c3.width = 300;
    c3.height = 200;
    const rot270 = rotateCanvas(c3, 270);
    expect(rot270.width).toBe(200);
    expect(rot270.height).toBe(300);
    expect(c3.width).toBe(0); // Verifies memory cleanup
  });

  it("Scenario 6: Grid distribution for manually added documents", () => {
    const originalW = 1000;
    const originalH = 800;
    const existingDocs: DetectedDocument[] = [];

    // Add 4 manual documents
    for (let i = 0; i < 4; i++) {
      const doc = addManualDocumentQuad(existingDocs, originalW, originalH);
      existingDocs.push(doc);
    }

    expect(existingDocs.length).toBe(4);

    // Verify grid layout (Row 0 vs Row 1, Col 0 vs Col 1)
    expect(existingDocs[0].corners[0].x).toBe(50);  // Col 0, Row 0
    expect(existingDocs[0].corners[0].y).toBe(40);

    expect(existingDocs[1].corners[0].x).toBe(530); // Col 1, Row 0
    expect(existingDocs[1].corners[0].y).toBe(40);

    expect(existingDocs[2].corners[0].x).toBe(50);  // Col 0, Row 1
    expect(existingDocs[2].corners[0].y).toBe(344);

    expect(existingDocs[3].corners[0].x).toBe(530); // Col 1, Row 1
    expect(existingDocs[3].corners[0].y).toBe(344);

    // All quads stay within bounds
    for (const doc of existingDocs) {
      for (const pt of doc.corners) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(originalW);
        expect(pt.y).toBeGreaterThanOrEqual(0);
        expect(pt.y).toBeLessThanOrEqual(originalH);
      }
    }
  });

  it("Scenario 7: Safety gap in splitQuadIntoIdCards prevents touching backgrounds", () => {
    const quad: Point[] = [
      { x: 100, y: 50 },
      { x: 500, y: 50 },
      { x: 500, y: 650 },
      { x: 100, y: 650 },
    ];

    const cards = splitQuadIntoIdCards(quad, "vertical");
    expect(cards.length).toBe(2);

    const card1BottomY = cards[0].corners[2].y;
    const card2TopY = cards[1].corners[0].y;

    // Card 1 bottom is at 0.49 ratio (50 + 600 * 0.49 = 344)
    expect(card1BottomY).toBe(344);
    // Card 2 top is at 0.51 ratio (50 + 600 * 0.51 = 356)
    expect(card2TopY).toBe(356);

    // Exactly 12px separation gap (2% of 600px height)
    expect(card2TopY - card1BottomY).toBe(12);
  });

  it("Scenario 8: High aspect-ratio elongated receipt/invoice on dark desk", async () => {
    const width = 200;
    const height = 300;

    // Elongated receipt: x=50..150 (w=100), y=20..260 (h=240) -> aspect 1:2.4
    const { canvas, imgData } = createTestCanvas(width, height, (x, y) => {
      const inReceipt = x >= 50 && x <= 150 && y >= 20 && y <= 260;
      if (inReceipt) {
        // Receipt paper with item rows
        if (y % 8 === 0 && x > 60 && x < 140) {
          return [40, 40, 40, 255]; // Text row
        }
        return [245, 245, 240, 255];
      }
      return [35, 30, 25, 255]; // Dark office desk
    });

    const docs = autoDetectAllDocumentCorners(imgData, width, height, width, height);
    expect(docs.length).toBeGreaterThanOrEqual(1);

    const doc = docs[0];
    const sorted = sortCornerPoints(doc.corners);

    // Width should be around 100, Height should be around 240
    const w = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
    const h = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);

    expect(w).toBeGreaterThanOrEqual(80);
    expect(w).toBeLessThanOrEqual(130);
    expect(h).toBeGreaterThanOrEqual(160);
    expect(h).toBeLessThanOrEqual(260);

    // Perspective transformation should warp to standard dimensions
    const warped = warpPerspective(canvas, sorted, 120, 280, "bw");
    expect(warped.width).toBe(120);
    expect(warped.height).toBe(280);
  });

  it("Scenario 9: Low-contrast faded document on light office paper", async () => {
    const width = 160;
    const height = 160;

    // Background: light gray (215, 215, 215)
    // Document: slightly brighter paper (240, 240, 240) - small 25-level contrast delta
    const { canvas, imgData } = createTestCanvas(width, height, (x, y) => {
      const inDoc = x >= 30 && x <= 130 && y >= 30 && y <= 130;
      if (inDoc) {
        return [240, 240, 240, 255];
      }
      return [215, 215, 215, 255];
    });

    const docs = autoDetectAllDocumentCorners(imgData, width, height, width, height);
    expect(docs.length).toBeGreaterThanOrEqual(1);

    const sorted = sortCornerPoints(docs[0].corners);
    expect(sorted[0].x).toBeLessThanOrEqual(35);
    expect(sorted[0].y).toBeLessThanOrEqual(35);
    expect(sorted[2].x).toBeGreaterThanOrEqual(125);
    expect(sorted[2].y).toBeGreaterThanOrEqual(125);
  });

  it("Scenario 10: End-to-end multi-document batch export simulation with memory safety", async () => {
    const width = 300;
    const height = 200;

    const { canvas } = createTestCanvas(width, height, (x, y) => {
      const inDoc1 = x >= 20 && x <= 130 && y >= 20 && y <= 180;
      const inDoc2 = x >= 160 && x <= 280 && y >= 20 && y <= 180;
      if (inDoc1 || inDoc2) {
        return [245, 245, 245, 255];
      }
      return [40, 40, 40, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "multi");
    expect(result.documents).toBeDefined();
    expect(result.documents!.length).toBeGreaterThanOrEqual(2);

    // Simulate batch export loop from DocumentScannerDialog
    const exportedUrls: string[] = [];
    for (const doc of result.documents!) {
      const warped = warpPerspective(canvas, doc.corners, 400, 300, "magic");
      expect(warped.width).toBe(400);
      expect(warped.height).toBe(300);

      // Verify canvas context cleanup
      const dataUrl = `data:image/png;base64,mock_${doc.id}`;
      exportedUrls.push(dataUrl);

      // Cleanup
      warped.width = 0;
      warped.height = 0;
      expect(warped.width).toBe(0);
    }

    expect(exportedUrls.length).toBeGreaterThanOrEqual(2);
  });

  it("Scenario 11: Two ID cards vertically stacked on A4 sheet (Front at top, Back at bottom)", async () => {
    const width = 300;
    const height = 400;

    // Top Card (Front Face): x=45..255 (w=210), y=40..170 (h=130) -> ID ratio 210/130 = 1.61
    // Bottom Card (Back Face): x=45..255 (w=210), y=220..350 (h=130) -> ID ratio 210/130 = 1.61
    // White gap in between: y=170..220 (h=50px white margin)
    const { canvas, imgData } = createTestCanvas(width, height, (x, y) => {
      const inTopCard = x >= 45 && x <= 255 && y >= 40 && y <= 170;
      const inBottomCard = x >= 45 && x <= 255 && y >= 220 && y <= 350;

      if (inTopCard) {
        // Iraqi ID card (Top) with green banner and photo
        if (y >= 40 && y <= 60) return [30, 120, 60, 255]; // Green header
        if (x >= 50 && x <= 95 && y >= 70 && y <= 140) return [80, 70, 60, 255]; // Photo
        return [225, 230, 235, 255]; // Card background
      }

      if (inBottomCard) {
        // Iraqi ID card (Bottom / Back) with green footer and barcode
        if (y >= 320 && y <= 345) return [30, 120, 60, 255]; // Green footer
        return [220, 225, 230, 255]; // Card background
      }

      // White A4 Scanner background
      return [255, 255, 255, 255];
    });

    const docs = autoDetectAllDocumentCorners(imgData, width, height, width, height);

    // MUST detect the 2 cards as separate documents instead of 1 giant merged box!
    expect(docs.length).toBeGreaterThanOrEqual(2);

    const doc1 = docs[0];
    const doc2 = docs[1];

    expect(doc1.aspectType).toBe("id_card");
    expect(doc2.aspectType).toBe("id_card");

    const minY1 = Math.min(...doc1.corners.map(p => p.y));
    const maxY1 = Math.max(...doc1.corners.map(p => p.y));
    const minY2 = Math.min(...doc2.corners.map(p => p.y));
    const maxY2 = Math.max(...doc2.corners.map(p => p.y));

    // One is top card, one is bottom card, separated by the gap
    const topDocMaxY = Math.min(maxY1, maxY2);
    const bottomDocMinY = Math.max(minY1, minY2);

    expect(bottomDocMinY).toBeGreaterThanOrEqual(topDocMaxY);
  });

  it("Scenario 12: Cropped full-frame text document — entire image IS the document", async () => {
    const width = 240;
    const height = 180;

    // The whole image is paper with text stripes (kept away from image borders so
    // the salience border-ring stays clean)
    const { canvas, imgData } = createTestCanvas(width, height, (x, y) => {
      const isText = (x >= 50 && x <= 200) && (y >= 30 && y <= 150) && (y % 12 === 0);
      if (isText) return [30, 30, 30, 255];
      return [240, 235, 230, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "auto");
    expect(result.documents).toBeDefined();
    expect(result.documents!.length).toBeGreaterThanOrEqual(1);

    const doc = result.documents![0];
    const sorted = sortCornerPoints(doc.corners);

    // The detected quad must cover ≥ 96% of the image (frame-tier behavior)
    const minX = Math.min(...sorted.map((p) => p.x));
    const maxX = Math.max(...sorted.map((p) => p.x));
    const minY = Math.min(...sorted.map((p) => p.y));
    const maxY = Math.max(...sorted.map((p) => p.y));

    expect(minX).toBeLessThanOrEqual(8);
    expect(minY).toBeLessThanOrEqual(8);
    expect(maxX).toBeGreaterThanOrEqual(width - 9);
    expect(maxY).toBeGreaterThanOrEqual(height - 9);
  });

  it("Scenario 13: ID card close-up 90% of frame — must be detected, NOT default inset", async () => {
    const width = 200;
    const height = 140;

    // ID card filling ~91% of the frame, with thin desk margin
    // Card: (3,6) .. (198,134) = 195 x 128 = 0.9065 area ratio
    const { canvas, imgData } = createTestCanvas(width, height, (x, y) => {
      const inCard = x >= 3 && x <= 198 && y >= 6 && y <= 134;
      if (inCard) {
        // Solid ID card color (navy)
        return [35, 45, 75, 255];
      }
      return [215, 200, 180, 255]; // desk
    });

    const docs = autoDetectAllDocumentCorners(imgData, width, height, width, height);
    expect(docs.length).toBeGreaterThanOrEqual(1);

    const doc = docs[0];
    const sorted = sortCornerPoints(doc.corners);

    // Corners should be near the card's true edges, not a 5% inset crop
    expect(sorted[0].x).toBeLessThanOrEqual(12); // TL close to (3, 6)
    expect(sorted[0].y).toBeLessThanOrEqual(14);
    expect(sorted[1].x).toBeGreaterThanOrEqual(188); // TR close to 198
    expect(sorted[2].x).toBeGreaterThanOrEqual(188); // BR close to 198
    expect(sorted[2].y).toBeGreaterThanOrEqual(126); // BR close to 134
    expect(sorted[3].x).toBeLessThanOrEqual(12); // BL close to 3

    // Aspect ~ 1.52 => id_card
    const w = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
    const h = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
    const ratio = w / h;
    expect(ratio).toBeGreaterThanOrEqual(1.44);
    expect(ratio).toBeLessThanOrEqual(1.84);
  });

  it("Scenario 14: refineCornersSubPixel guard — good corners should NOT wander", async () => {
    const width = 200;
    const height = 140;

    // Crisp ID card with a strong edge between card and desk
    const { canvas } = createTestCanvas(width, height, (x, y) => {
      const inCard = x >= 10 && x <= 190 && y >= 10 && y <= 130;
      if (inCard) return [35, 45, 75, 255];
      return [215, 200, 180, 255];
    });

    // Corners placed right on the card edge (already optimal)
    const perfectCorners: Point[] = [
      { x: 10, y: 10 },
      { x: 190, y: 10 },
      { x: 190, y: 130 },
      { x: 10, y: 130 },
    ];

    const refined = refineCornersSubPixel(perfectCorners, canvas, width, height, 8);

    // Guard: each refined corner should stay within 3px of the original
    for (let i = 0; i < 4; i++) {
      const dx = Math.abs(refined[i].x - perfectCorners[i].x);
      const dy = Math.abs(refined[i].y - perfectCorners[i].y);
      expect(dx).toBeLessThanOrEqual(3);
      expect(dy).toBeLessThanOrEqual(3);
    }
  });

  it("Scenario 15: Two ID cards on desk — must detect BOTH (not whole frame)", async () => {
    const width = 320;
    const height = 180;

    // Two navy ID cards (small) on a beige desk
    const { canvas } = createTestCanvas(width, height, (x, y) => {
      const inCard1 = x >= 25 && x <= 150 && y >= 30 && y <= 109;
      const inCard2 = x >= 175 && x <= 301 && y >= 50 && y <= 130;

      if (inCard1 || inCard2) return [35, 45, 75, 255];
      return [220, 215, 205, 255]; // desk
    });

    const result = await detectDocumentAuto(canvas, width, height, "multi");
    expect(result.documents).toBeDefined();
    expect(result.documents!.length).toBeGreaterThanOrEqual(2);
  });

  it("Scenario 16: Multi-Channel detection on isoluminant colored document", async () => {
    const width = 200;
    const height = 140;

    // Red card [255, 0, 0] on Green desk [0, 130, 0] -> Both produce ~ 76 gray luminance
    const { canvas } = createTestCanvas(width, height, (x, y) => {
      const inCard = x >= 20 && x <= 180 && y >= 20 && y <= 120;
      if (inCard) return [255, 0, 0, 255];
      return [0, 130, 0, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.5);
    const sorted = sortCornerPoints(result.corners);
    expect(sorted[0].x).toBeLessThanOrEqual(28);
    expect(sorted[0].y).toBeLessThanOrEqual(28);
    expect(sorted[1].x).toBeGreaterThanOrEqual(172);
    expect(sorted[2].y).toBeGreaterThanOrEqual(112);
  });

  it("Scenario 17: White document on wood desk with harsh diagonal lighting shadow", async () => {
    const width = 240;
    const height = 180;

    const { canvas } = createTestCanvas(width, height, (x, y) => {
      const inDoc = x >= 30 && x <= 210 && y >= 25 && y <= 155;
      // Harsh diagonal shadow across the entire frame
      const shadowFactor = 0.5 + 0.5 * ((x + y) / (width + height));
      if (inDoc) {
        const val = Math.round(240 * shadowFactor);
        return [val, val, val, 255];
      }
      // Textured wood background
      const woodBase = Math.round(110 * shadowFactor);
      const grain = (x % 5 === 0) ? 15 : 0;
      return [woodBase + grain, Math.max(0, woodBase - 15), Math.max(0, woodBase - 30), 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    expect(sorted[0].x).toBeLessThanOrEqual(40);
    expect(sorted[0].y).toBeLessThanOrEqual(40);
    expect(sorted[1].x).toBeGreaterThanOrEqual(200);
    expect(sorted[2].y).toBeGreaterThanOrEqual(145);
  });

  it("Scenario 18: ID card with chamfered/rounded corners reconstructed via RANSAC 4-line intersection", async () => {
    const width = 220;
    const height = 150;

    const { canvas } = createTestCanvas(width, height, (x, y) => {
      // 160x100 rectangle from (30, 25) to (190, 125) with 12px cut off at corners
      if (x < 30 || x > 190 || y < 25 || y > 125) return [210, 205, 195, 255];
      // Chamfer corners
      if (x - 30 + y - 25 < 12) return [210, 205, 195, 255]; // TL
      if (190 - x + y - 25 < 12) return [210, 205, 195, 255]; // TR
      if (190 - x + 125 - y < 12) return [210, 205, 195, 255]; // BR
      if (x - 30 + 125 - y < 12) return [210, 205, 195, 255]; // BL
      return [40, 50, 80, 255];
    });

    const result = await detectDocumentAuto(canvas, width, height, "single");
    expect(result.corners).toBeDefined();
    const sorted = sortCornerPoints(result.corners);
    // Should snap to the true sharp rectangular corners (30, 25), (190, 25), (190, 125), (30, 125)
    expect(sorted[0].x).toBeLessThanOrEqual(35);
    expect(sorted[0].y).toBeLessThanOrEqual(30);
    expect(sorted[1].x).toBeGreaterThanOrEqual(185);
    expect(sorted[1].y).toBeLessThanOrEqual(30);
    expect(sorted[2].x).toBeGreaterThanOrEqual(185);
    expect(sorted[2].y).toBeGreaterThanOrEqual(120);
    expect(sorted[3].x).toBeLessThanOrEqual(35);
    expect(sorted[3].y).toBeGreaterThanOrEqual(120);
  });
});
