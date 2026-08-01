export interface Point {
  x: number;
  y: number;
}

import { loadOpenCV } from "./opencv-loader";

export function sortCornerPoints(points: Point[]): Point[] {
  if (points.length !== 4) return points;

  const cx = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
  const cy = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;

  const sorted = [...points].sort((a, b) => {
    return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
  });

  let tlIndex = 0;
  let minSum = Infinity;
  for (let i = 0; i < 4; i++) {
    const sum = sorted[i].x + sorted[i].y;
    if (sum < minSum) {
      minSum = sum;
      tlIndex = i;
    }
  }

  return [
    sorted[tlIndex],
    sorted[(tlIndex + 1) % 4],
    sorted[(tlIndex + 2) % 4],
    sorted[(tlIndex + 3) % 4]
  ];
}

/**
 * خوارزمية رياضية متقدمة ودقيقة لكشف أركان المستندات والبطاقات الشخصية
 * (Multi-thresholding + Convex Hull + approxPolyDP + Max Area Quad Search)
 */
export function autoDetectDocumentCorners(
  smallImgData: ImageData,
  sw: number,
  sh: number,
  originalWidth: number,
  originalHeight: number
): Point[] {
  const paddingX = Math.floor(originalWidth * 0.05);
  const paddingY = Math.floor(originalHeight * 0.05);
  const defaultCorners: Point[] = [
    { x: paddingX, y: paddingY },
    { x: originalWidth - paddingX, y: paddingY },
    { x: originalWidth - paddingX, y: originalHeight - paddingY },
    { x: paddingX, y: originalHeight - paddingY },
  ];

  if (sw < 30 || sh < 30) return defaultCorners;

  const smallGray = new Uint8Array(sw * sh);
  const srcData = smallImgData.data;

  for (let i = 0; i < sw * sh; i++) {
    const idx = i * 4;
    smallGray[i] = (srcData[idx] * 299 + srcData[idx + 1] * 587 + srcData[idx + 2] * 114) / 1000;
  }

  // 3x3 Gaussian Blur & Sobel Edge Magnitude
  const blurred = new Uint8Array(sw * sh);
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const acc =
        smallGray[(y - 1) * sw + (x - 1)] + 2 * smallGray[(y - 1) * sw + x] + smallGray[(y - 1) * sw + (x + 1)] +
        2 * smallGray[y * sw + (x - 1)] + 4 * smallGray[y * sw + x] + 2 * smallGray[y * sw + (x + 1)] +
        smallGray[(y + 1) * sw + (x - 1)] + 2 * smallGray[(y + 1) * sw + x] + smallGray[(y + 1) * sw + (x + 1)];
      blurred[y * sw + x] = (acc / 16) | 0;
    }
  }

  const mag = new Float32Array(sw * sh);
  let maxMag = 0;

  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const gx =
        -blurred[(y - 1) * sw + (x - 1)] + blurred[(y - 1) * sw + (x + 1)] -
        2 * blurred[y * sw + (x - 1)] + 2 * blurred[y * sw + (x + 1)] -
        blurred[(y + 1) * sw + (x - 1)] + blurred[(y + 1) * sw + (x + 1)];

      const gy =
        -blurred[(y - 1) * sw + (x - 1)] - 2 * blurred[(y - 1) * sw + x] - blurred[(y - 1) * sw + (x + 1)] +
        blurred[(y + 1) * sw + (x - 1)] + 2 * blurred[(y + 1) * sw + x] + blurred[(y + 1) * sw + (x + 1)];

      const m = Math.sqrt(gx * gx + gy * gy);
      mag[y * sw + x] = m;
      if (m > maxMag) maxMag = m;
    }
  }

  if (maxMag < 10) return defaultCorners;

  const thresholds = [
    Math.max(30, maxMag * 0.25),
    Math.max(15, maxMag * 0.10)
  ];

  let bestCorners: Point[] | null = null;
  let maxScore = -Infinity;

  for (const threshold of thresholds) {
    const edges = new Uint8Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) {
      edges[i] = mag[i] >= threshold ? 255 : 0;
    }

    const dilated = new Uint8Array(sw * sh);
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        let active = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (edges[(y + dy) * sw + (x + dx)] === 255) {
              active = true;
              break;
            }
          }
          if (active) break;
        }
        dilated[y * sw + x] = active ? 255 : 0;
      }
    }

    const visited = new Uint8Array(sw * sh);
    for (let y = 2; y < sh - 2; y++) {
      for (let x = 2; x < sw - 2; x++) {
        const idx = y * sw + x;
        if (dilated[idx] === 255 && !visited[idx]) {
          const contour: Point[] = [];
          const queue: number[] = [idx];
          visited[idx] = 1;

          while (queue.length > 0) {
            const curr = queue.pop()!;
            const cy = (curr / sw) | 0;
            const cx = curr % sw;
            contour.push({ x: cx, y: cy });

            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const ny = cy + dy;
                const nx = cx + dx;
                if (ny >= 0 && ny < sh && nx >= 0 && nx < sw) {
                  const nIdx = ny * sw + nx;
                  if (dilated[nIdx] === 255 && !visited[nIdx]) {
                    visited[nIdx] = 1;
                    queue.push(nIdx);
                  }
                }
              }
            }
          }

          if (contour.length >= 40) {
            const hull = convexHull(contour);
            if (hull.length < 4) continue;

            const hullArea = calculatePolygonArea(hull);
            let perim = 0;
            for (let i = 0; i < hull.length; i++) {
              const p1 = hull[i];
              const p2 = hull[(i + 1) % hull.length];
              perim += Math.hypot(p1.x - p2.x, p1.y - p2.y);
            }

            let epsilon = Math.max(1.5, 0.015 * perim);
            const closedHull = [...hull, hull[0]];
            let poly: Point[] = [];

            for (let iter = 0; iter < 5; iter++) {
              poly = approxPolyDP(closedHull, epsilon);
              poly.pop();
              if (poly.length <= 15) break;
              epsilon *= 1.5;
            }

            if (poly.length >= 4) {
              const quad = findMaxAreaQuad(poly);
              if (quad) {
                const score = evaluateQuadScore(quad, hullArea, sw, sh);
                if (score > maxScore) {
                  maxScore = score;
                  bestCorners = quad;
                }
              }
            }
          }
        }
      }
    }
  }

  if (bestCorners && maxScore > 0.02) {
    const scaleX = originalWidth / sw;
    const scaleY = originalHeight / sh;
    const finalCorners = bestCorners.map((p) => ({
      x: Math.min(originalWidth, Math.max(0, Math.round(p.x * scaleX))),
      y: Math.min(originalHeight, Math.max(0, Math.round(p.y * scaleY))),
    }));
    return sortCornerPoints(finalCorners);
  }

  return defaultCorners;
}

function convexHull(points: Point[]): Point[] {
  if (points.length <= 3) return points;
  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];
  for (let i = 0; i < sorted.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function pointLineDistance(p: Point, a: Point, b: Point): number {
  const num = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x);
  const den = Math.hypot(b.y - a.y, b.x - a.x);
  return den === 0 ? Math.hypot(p.x - a.x, p.y - a.y) : num / den;
}

function approxPolyDP(pts: Point[], epsilon: number): Point[] {
  if (pts.length <= 2) return pts;
  let dmax = 0;
  let index = 0;
  const end = pts.length - 1;
  for (let i = 1; i < end; i++) {
    const d = pointLineDistance(pts[i], pts[0], pts[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  if (dmax > epsilon) {
    const rec1 = approxPolyDP(pts.slice(0, index + 1), epsilon);
    const rec2 = approxPolyDP(pts.slice(index), epsilon);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [pts[0], pts[end]];
  }
}

function findMaxAreaQuad(pts: Point[]): Point[] | null {
  if (pts.length < 4) return null;
  if (pts.length === 4) return pts;
  let maxArea = 0;
  let bestQuad: Point[] | null = null;
  const n = pts.length;
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const quad = [pts[i], pts[j], pts[k], pts[l]];
          const area = calculatePolygonArea(quad);
          if (area > maxArea) {
            maxArea = area;
            bestQuad = quad;
          }
        }
      }
    }
  }
  return bestQuad;
}

function calculatePolygonArea(pts: Point[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

function evaluateQuadScore(quad: Point[], hullArea: number, width: number, height: number): number {
  const quadArea = calculatePolygonArea(quad);
  const totalArea = width * height;
  const areaRatio = quadArea / totalArea;

  if (areaRatio < 0.05 || areaRatio > 0.99) return -Infinity;

  const convexityRatio = quadArea / hullArea;
  if (convexityRatio < 0.75) return -Infinity; 

  let borderPenalty = 1.0;
  let edgePoints = 0;
  for (const p of quad) {
    if (p.x <= width * 0.02 || p.x >= width * 0.98 || p.y <= height * 0.02 || p.y >= height * 0.98) {
      edgePoints++;
    }
  }

  if (edgePoints === 4) {
    borderPenalty = 0.1;
  } else if (edgePoints > 0) {
    borderPenalty = Math.pow(0.8, edgePoints);
  }

  return areaRatio * convexityRatio * borderPenalty;
}

function getHomographyMatrix(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  const h = solveLinearSystem(A, b);
  return [...h, 1];
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    A[i].push(b[i]);
  }

  for (let i = 0; i < n; i++) {
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    if (maxEl < 1e-10) {
      return [1, 0, 0, 0, 1, 0, 0, 0];
    }

    for (let k = i; k < n + 1; k++) {
      const tmp = A[maxRow][k];
      A[maxRow][k] = A[i][k];
      A[i][k] = tmp;
    }

    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[i][i]) < 1e-10) continue;
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n + 1; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(A[i][i]) < 1e-10) {
      x[i] = 0;
      continue;
    }
    x[i] = A[i][n] / A[i][i];
    for (let k = i - 1; k >= 0; k--) {
      A[k][n] -= A[k][i] * x[i];
    }
  }

  return x;
}

export function warpPerspective(
  srcCtx: CanvasRenderingContext2D,
  srcWidth: number,
  srcHeight: number,
  corners: Point[],
  targetWidth?: number,
  targetHeight?: number,
  filterType: "original" | "magic" | "bw" = "original"
): HTMLCanvasElement {
  const sorted = sortCornerPoints(corners);

  const topW = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
  const botW = Math.hypot(sorted[2].x - sorted[3].x, sorted[2].y - sorted[3].y);
  const leftH = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
  const rightH = Math.hypot(sorted[2].x - sorted[1].x, sorted[2].y - sorted[1].y);

  const outW = Math.max(1, Math.round(targetWidth || Math.max(topW, botW)));
  const outH = Math.max(1, Math.round(targetHeight || Math.max(leftH, rightH)));

  const dstCorners: Point[] = [
    { x: 0, y: 0 },
    { x: outW, y: 0 },
    { x: outW, y: outH },
    { x: 0, y: outH },
  ];

  const H_inv = getHomographyMatrix(dstCorners, sorted);

  const srcImgData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
  const srcData = srcImgData.data;

  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = outW;
  dstCanvas.height = outH;

  const dstCtx = dstCanvas.getContext("2d");
  if (!dstCtx) return dstCanvas;
  const dstImgData = dstCtx.createImageData(outW, outH);
  const dstData = dstImgData.data;

  const h00 = H_inv[0], h01 = H_inv[1], h02 = H_inv[2];
  const h10 = H_inv[3], h11 = H_inv[4], h12 = H_inv[5];
  const h20 = H_inv[6], h21 = H_inv[7], h22 = H_inv[8];

  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      const denom = h20 * dx + h21 * dy + h22;
      const dstIdx = (dy * outW + dx) * 4;

      if (Math.abs(denom) < 1e-10) {
        dstData[dstIdx + 3] = 0;
        continue;
      }

      const sx = (h00 * dx + h01 * dy + h02) / denom;
      const sy = (h10 * dx + h11 * dy + h12) / denom;

      if (sx >= 0 && sx < srcWidth - 1 && sy >= 0 && sy < srcHeight - 1) {
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const wx1 = sx - x0;
        const wx0 = 1 - wx1;
        const wy1 = sy - y0;
        const wy0 = 1 - wy1;

        const idx00 = (y0 * srcWidth + x0) * 4;
        const idx10 = (y0 * srcWidth + x1) * 4;
        const idx01 = (y1 * srcWidth + x0) * 4;
        const idx11 = (y1 * srcWidth + x1) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            wy0 * (wx0 * srcData[idx00 + c] + wx1 * srcData[idx10 + c]) +
            wy1 * (wx0 * srcData[idx01 + c] + wx1 * srcData[idx11 + c]);
          dstData[dstIdx + c] = (val + 0.5) | 0;
        }
        dstData[dstIdx + 3] = 255;
      } else {
        dstData[dstIdx + 3] = 0;
      }
    }
  }

  if (filterType === "magic") {
    applyMagicScanFilter(dstImgData);
  } else if (filterType === "bw") {
    applyHighContrastBWFilter(dstImgData);
  }

  dstCtx.putImageData(dstImgData, 0, 0);
  return dstCanvas;
}

function applyMagicScanFilter(imgData: ImageData) {
  const data = imgData.data;
  const width = imgData.width;
  const height = imgData.height;

  // 1. Adaptive Illumination Flattening (إزالة الظلال والإضاءة غير المتجانسة)
  const blockW = Math.max(16, Math.floor(width / 16));
  const blockH = Math.max(16, Math.floor(height / 16));
  const gridW = Math.ceil(width / blockW);
  const gridH = Math.ceil(height / blockH);

  const bgGrid = new Float32Array(gridW * gridH);

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const startX = gx * blockW;
      const startY = gy * blockH;
      const endX = Math.min(width, startX + blockW);
      const endY = Math.min(height, startY + blockH);

      const pixels: number[] = [];
      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const idx = (y * width + x) * 4;
          const lum = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          pixels.push(lum);
        }
      }

      pixels.sort((a, b) => a - b);
      // Use 90th percentile as estimate of background paper lightness
      const bgLum = pixels.length > 0 ? pixels[Math.floor(pixels.length * 0.90)] : 220;
      bgGrid[gy * gridW + gx] = Math.max(120, bgLum);
    }
  }

  // Precompute LUT for stage 2 contrast
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.min(255, Math.max(0, (i - 128) * 1.35 + 128 + 15));
  }

  // Apply shadow normalization and contrast boost
  for (let y = 0; y < height; y++) {
    const gy = Math.min(gridH - 1, Math.floor(y / blockH));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(gridW - 1, Math.floor(x / blockW));
      const bgVal = bgGrid[gy * gridW + gx];
      const idx = (y * width + x) * 4;

      const normFactor = 245 / bgVal;
      let r = Math.min(255, data[idx] * normFactor);
      let g = Math.min(255, data[idx + 1] * normFactor);
      let b = Math.min(255, data[idx + 2] * normFactor);

      r = lut[r | 0];
      g = lut[g | 0];
      b = lut[b | 0];

      const avg = (r + g + b) / 3;
      if (avg > 170) {
        r = Math.min(255, (r * 1.12 + 18) | 0);
        g = Math.min(255, (g * 1.12 + 18) | 0);
        b = Math.min(255, (b * 1.12 + 18) | 0);
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  }
}

function applyHighContrastBWFilter(imgData: ImageData) {
  const data = imgData.data;
  // Precompute LUT
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = i > 135 ? 255 : Math.max(0, (i - 25) * 1.2);
  }

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    const bw = lut[gray | 0];

    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
  }
}

/**
 * التخمين الذكي لنوع المستند والأبعاد المسبقة بناءً على زوايا المضلع المكتشفة
 */
export function inferSmartDocumentAspect(corners: Point[]): "free" | "a4_p" | "a4_l" | "id_card" | "square" {
  if (corners.length !== 4) return "free";
  const sorted = sortCornerPoints(corners);

  const topW = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
  const botW = Math.hypot(sorted[2].x - sorted[3].x, sorted[2].y - sorted[3].y);
  const leftH = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
  const rightH = Math.hypot(sorted[2].x - sorted[1].x, sorted[2].y - sorted[1].y);

  const avgW = (topW + botW) / 2;
  const avgH = (leftH + rightH) / 2;

  if (avgH === 0) return "free";
  const ratio = avgW / avgH;

  // ID Card ratio ~ 1.58 (85.6mm / 54mm)
  if (ratio >= 1.48 && ratio <= 1.72) return "id_card";
  // A4 Portrait ratio ~ 0.707 (210mm / 297mm)
  if (ratio >= 0.64 && ratio <= 0.78) return "a4_p";
  // A4 Landscape ratio ~ 1.414 (297mm / 210mm)
  if (ratio >= 1.30 && ratio <= 1.46) return "a4_l";
  // Square ratio ~ 1.0
  if (ratio >= 0.92 && ratio <= 1.08) return "square";

  return "free";
}

/* ============================================================
 *  OpenCV WASM detection (primary) with JS fallback
 * ============================================================ */

export interface DetectionResult {
  corners: Point[] | null;
  confidence: number;
  method: "opencv" | "js" | "default" | "loading";
}

export async function detectDocumentAuto(
  src: HTMLCanvasElement | HTMLImageElement,
  originalWidth: number,
  originalHeight: number
): Promise<DetectionResult> {
  const cv = await loadOpenCV();
  if (!cv) {
    // Fallback to JS detector (sync)
    const canvas = document.createElement("canvas");
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { corners: null, confidence: 0, method: "default" };
    ctx.drawImage(src, 0, 0, originalWidth, originalHeight);
    const maxDim = 400;
    const scale = Math.min(1, maxDim / originalWidth, maxDim / originalHeight);
    const sw = Math.max(1, Math.round(originalWidth * scale));
    const sh = Math.max(1, Math.round(originalHeight * scale));
    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = sw;
    smallCanvas.height = sh;
    const sctx = smallCanvas.getContext("2d");
    if (!sctx) return { corners: null, confidence: 0, method: "default" };
    sctx.drawImage(src, 0, 0, sw, sh);
    const small = sctx.getImageData(0, 0, sw, sh);
    const corners = autoDetectDocumentCorners(small, sw, sh, originalWidth, originalHeight);
    canvas.width = 0;
    canvas.height = 0;
    smallCanvas.width = 0;
    smallCanvas.height = 0;
    return { corners, confidence: 0.5, method: "js" };
  }
  // OpenCV path
  const canvas = document.createElement("canvas");
  canvas.width = originalWidth;
  canvas.height = originalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { corners: null, confidence: 0, method: "default" };
  ctx.drawImage(src, 0, 0, originalWidth, originalHeight);
  const srcMat = cv.imread(canvas);
  canvas.width = 0;
  canvas.height = 0;
  // Multi-scale sampling scales (relative to original)
  const scales = [1, 0.6, 0.35];
  let bestCorners: Point[] | null = null;
  let bestScore = -Infinity;
  for (const s of scales) {
    const w = Math.max(30, Math.floor(originalWidth * s));
    const h = Math.max(30, Math.floor(originalHeight * s));
    let currentMat = srcMat;
    let localMat: any = null;
    if (s !== 1) {
      localMat = new cv.Mat();
      cv.resize(currentMat, localMat, new cv.Size(w, h), 0, 0, cv.INTER_AREA);
      currentMat = localMat;
    }
    // Process: gray → median blur → Canny → morph close → contours
    const gray = new cv.Mat();
    cv.cvtColor(currentMat, gray, cv.COLOR_RGBA2GRAY);
    const blurred = new cv.Mat();
    cv.medianBlur(gray, blurred, 5);
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 40, 120);
    const kernel = cv.Mat.ones(9, 9, cv.CV_8U);
    const closed = new cv.Mat();
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
    // Invert edges → document most bright / background
    const inv = new cv.Mat();
    cv.bitwise_not(closed, inv);
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(inv, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const imgArea = w * h;
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const peri = cv.arcLength(c, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(c, approx, 0.02 * peri, true);
      if (approx.rows === 4) {
        const area = cv.contourArea(approx);
        if (area < imgArea * 0.05 || area > imgArea * 0.97) {
          approx.delete();
          c.delete();
          continue;
        }
        // angle check: interior angles near 90°
        const pts: Point[] = [];
        for (let r = 0; r < 4; r++) {
          const px = (approx as any).intPtr ? (approx as any).intPtr(r, 0)[0] : (approx as any).data32S[r * 2];
          const py = (approx as any).intPtr ? (approx as any).intPtr(r, 0)[1] : (approx as any).data32S[r * 2 + 1];
          pts.push({ x: px, y: py });
        }
        const sorted = sortCornerPoints(pts);
        // interior angle at sorted[k] uses neighbors sorted[k-1] and sorted[k+1]
        const sortedAngles: number[] = [];
        for (let k = 0; k < 4; k++) {
          const prev = sorted[(k + 3) % 4];
          const curr = sorted[k];
          const next = sorted[(k + 1) % 4];
          const v1x = prev.x - curr.x, v1y = prev.y - curr.y;
          const v2x = next.x - curr.x, v2y = next.y - curr.y;
          const dot = v1x * v2x + v1y * v2y;
          const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y);
          const angle =
            m1 && m2
              ? Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * (180 / Math.PI)
              : 0;
          sortedAngles.push(angle);
        }
        // penalty for deviation from 90°
        const avgDev = sortedAngles.reduce((acc, ang) => acc + Math.abs(90 - ang), 0) / 4;
        const skewness = avgDev / 90;
        if (skewness > 0.6) {
          approx.delete();
          c.delete();
          continue;
        }
        // score: area ratio discounted by skewness
        const score = (area / imgArea) * (1 - skewness);
        if (score > bestScore) {
          bestScore = score;
          // re-scale to original resolution
          bestCorners = sorted.map((p) => ({ x: p.x / s, y: p.y / s }));
        }
      }
      approx.delete();
      c.delete();
    }
    // cleanup per scale
    gray.delete(); blurred.delete(); edges.delete();
    kernel.delete(); closed.delete(); inv.delete();
    contours.delete(); hierarchy.delete();
    if (localMat) localMat.delete();
    if (bestScore > 0.5) break;
  }
  srcMat.delete();
  const confidence = Math.max(0, Math.min(1, bestScore));
  return {
    corners: bestCorners,
    confidence,
    method: bestCorners ? "opencv" : "default",
  };
}
