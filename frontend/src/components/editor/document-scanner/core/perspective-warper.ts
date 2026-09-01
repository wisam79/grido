import { Point, ScannerFilterMode } from "./types";
import { sortCornerPoints } from "./quad-geometry";
import { computeSobelGradients } from "./fast-vision";
import { applyFilterMode } from "./filters";

/**
 * حساب مصفوفة التحويل المنظوري 3x3 (Perspective Transformation Homography Matrix)
 */
export function computePerspectiveTransform(src: Point[], dst: Point[]): number[] {
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    a.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    a.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // حل نظام المعادلات الخطية بواسطة Gaussian Elimination
  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) {
        maxRow = k;
      }
    }

    const tmpRow = a[i];
    a[i] = a[maxRow];
    a[maxRow] = tmpRow;

    const tmpB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tmpB;

    if (Math.abs(a[i][i]) < 1e-12) {
      let foundPivot = false;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(a[r][i]) >= 1e-12) {
          const tR = a[i]; a[i] = a[r]; a[r] = tR;
          const tB = b[i]; b[i] = b[r]; b[r] = tB;
          foundPivot = true;
          break;
        }
      }
      if (!foundPivot) continue;
    }

    for (let k = i + 1; k < n; k++) {
      const factor = a[k][i] / a[i][i];
      for (let j = i; j < n; j++) {
        a[k][j] -= factor * a[i][j];
      }
      b[k] -= factor * b[i];
    }
  }

  const h = new Array(9).fill(0);
  h[8] = 1;

  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += a[i][j] * h[j];
    }
    const denom = a[i][i];
    h[i] = Math.abs(denom) > 1e-12 ? (b[i] - sum) / denom : 0;
  }

  return h;
}

/**
 * تطبيق استعدال المنظور بدقة عالية مع الترشيح ثنائي الخطوط (Bilinear Interpolation)
 */
export function warpPerspective(
  src: CanvasImageSource | CanvasRenderingContext2D,
  arg2: Point[] | number,
  arg3?: number,
  arg4?: number | Point[],
  arg5?: any,
  arg6?: number,
  arg7?: string
): HTMLCanvasElement {
  let srcCanvas: HTMLCanvasElement;
  let corners: Point[];
  let outWidth: number;
  let outHeight: number;
  let filterMode: string = "original";
  let isTempSrcCanvas = false;

  if (Array.isArray(arg2)) {
    // Standard signature: (srcImg, corners, outWidth, outHeight, filterMode)
    corners = arg2;
    outWidth = typeof arg3 === "number" && arg3 > 0 ? arg3 : 300;
    outHeight = typeof arg4 === "number" && arg4 > 0 ? arg4 : 400;
    if (typeof arg5 === "string") filterMode = arg5;

    if ((src as any).canvas) {
      srcCanvas = (src as any).canvas;
    } else if (src instanceof HTMLCanvasElement) {
      srcCanvas = src;
    } else {
      const img = src as HTMLImageElement;
      const w = img.naturalWidth || img.width || outWidth;
      const h = img.naturalHeight || img.height || outHeight;
      srcCanvas = document.createElement("canvas");
      srcCanvas.width = w;
      srcCanvas.height = h;
      isTempSrcCanvas = true;
      const c = srcCanvas.getContext("2d");
      if (c) c.drawImage(img, 0, 0, w, h);
    }
  } else {
    // Legacy signature: (ctx, srcW, srcH, corners, outW, outH, filterMode)
    const srcW = Number(arg2) || 100;
    const srcH = Number(arg3) || 100;
    corners = Array.isArray(arg4) ? arg4 : [
      { x: 0, y: 0 },
      { x: srcW, y: 0 },
      { x: srcW, y: srcH },
      { x: 0, y: srcH },
    ];
    outWidth = typeof arg5 === "number" && arg5 > 0 ? arg5 : srcW;
    outHeight = typeof arg6 === "number" && arg6 > 0 ? arg6 : srcH;
    if (typeof arg7 === "string") filterMode = arg7;

    if ((src as any).canvas) {
      srcCanvas = (src as any).canvas;
    } else if (src instanceof HTMLCanvasElement) {
      srcCanvas = src;
    } else {
      const img = src as HTMLImageElement;
      srcCanvas = document.createElement("canvas");
      srcCanvas.width = srcW;
      srcCanvas.height = srcH;
      isTempSrcCanvas = true;
      const c = srcCanvas.getContext("2d");
      if (c && img) {
        try {
          c.drawImage(img, 0, 0, srcW, srcH);
        } catch {
          // ignore
        }
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, outWidth);
  canvas.height = Math.max(1, outHeight);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    if (isTempSrcCanvas) {
      srcCanvas.width = 0;
      srcCanvas.height = 0;
    }
    return canvas;
  }

  // التحقق من صلاحية الأركان الأربعة وعدم تطابقها في نقطة واحدة (Degenerate Points)
  const isDegenerate =
    !corners ||
    corners.length !== 4 ||
    (corners[0].x === corners[1].x &&
      corners[1].x === corners[2].x &&
      corners[2].x === corners[3].x &&
      corners[0].y === corners[1].y &&
      corners[1].y === corners[2].y &&
      corners[2].y === corners[3].y);

  if (isDegenerate) {
    ctx.drawImage(srcCanvas, 0, 0, outWidth, outHeight);
    if (isTempSrcCanvas) {
      srcCanvas.width = 0;
      srcCanvas.height = 0;
    }
    return canvas;
  }

  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  const srcData = srcCtx ? srcCtx.getImageData(0, 0, srcW, srcH).data : null;

  if (!srcData) {
    ctx.drawImage(srcCanvas, 0, 0, outWidth, outHeight);
    if (isTempSrcCanvas) {
      srcCanvas.width = 0;
      srcCanvas.height = 0;
    }
    return canvas;
  }

  const sorted = sortCornerPoints(corners);
  const safeW = Math.max(2, outWidth);
  const safeH = Math.max(2, outHeight);
  const dstCorners: Point[] = [
    { x: 0, y: 0 },
    { x: safeW - 1, y: 0 },
    { x: safeW - 1, y: safeH - 1 },
    { x: 0, y: safeH - 1 },
  ];

  // حساب مصفوفة التحويل العكسية Inverse Homography (Destination -> Source)
  const hInv = computePerspectiveTransform(dstCorners, sorted);

  const outImgData = ctx.createImageData(outWidth, outHeight);
  const outData = outImgData.data;

  const h0 = hInv[0], h1 = hInv[1], h2 = hInv[2];
  const h3 = hInv[3], h4 = hInv[4], h5 = hInv[5];
  const h6 = hInv[6], h7 = hInv[7], h8 = hInv[8];

  let outIdx = 0;
  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      const denom = h6 * x + h7 * y + h8;
      if (Math.abs(denom) < 1e-9) {
        outIdx += 4;
        continue;
      }

      const srcX = (h0 * x + h1 * y + h2) / denom;
      const srcY = (h3 * x + h4 * y + h5) / denom;

      if (srcX >= 0 && srcX <= srcW - 1 && srcY >= 0 && srcY <= srcH - 1) {
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(srcW - 1, x0 + 1);
        const y1 = Math.min(srcH - 1, y0 + 1);

        const dx = srcX - x0;
        const dy = srcY - y0;

        const w00 = (1 - dx) * (1 - dy);
        const w10 = dx * (1 - dy);
        const w01 = (1 - dx) * dy;
        const w11 = dx * dy;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        outData[outIdx] = Math.round(w00 * srcData[idx00] + w10 * srcData[idx10] + w01 * srcData[idx01] + w11 * srcData[idx11]);
        outData[outIdx + 1] = Math.round(w00 * srcData[idx00 + 1] + w10 * srcData[idx10 + 1] + w01 * srcData[idx01 + 1] + w11 * srcData[idx11 + 1]);
        outData[outIdx + 2] = Math.round(w00 * srcData[idx00 + 2] + w10 * srcData[idx10 + 2] + w01 * srcData[idx01 + 2] + w11 * srcData[idx11 + 2]);
        outData[outIdx + 3] = Math.round(w00 * srcData[idx00 + 3] + w10 * srcData[idx10 + 3] + w01 * srcData[idx01 + 3] + w11 * srcData[idx11 + 3]);
      }

      outIdx += 4;
    }
  }

  ctx.putImageData(outImgData, 0, 0);

  if (isTempSrcCanvas) {
    srcCanvas.width = 0;
    srcCanvas.height = 0;
  }

  return applyFilterMode(canvas, filterMode as ScannerFilterMode);
}

/**
 * صقل دقيق لمواقع الدبابيس الأربعة عبر فحص تدرجات الحواف الموضعية (Sub-pixel Edge Snapping)
 */
export function refineCornersSubPixel(
  corners: Point[],
  srcImg: CanvasImageSource,
  originalWidth: number,
  originalHeight: number,
  searchRadius: number = 6
): Point[] {
  if (!corners || corners.length !== 4 || originalWidth <= 0 || originalHeight <= 0) {
    return corners;
  }

  const patchRadius = searchRadius + 2;
  const patchDim = Math.min(Math.min(originalWidth, originalHeight), patchRadius * 2 + 1);
  if (patchDim < 3) return corners;

  const patchCanvas = document.createElement("canvas");
  patchCanvas.width = patchDim;
  patchCanvas.height = patchDim;
  const ctx = patchCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return corners;

  const refined = corners.map((corner) => {
    const cx = Math.round(corner.x);
    const cy = Math.round(corner.y);

    const sx = Math.max(0, Math.min(originalWidth - patchDim, cx - Math.floor(patchDim / 2)));
    const sy = Math.max(0, Math.min(originalHeight - patchDim, cy - Math.floor(patchDim / 2)));

    ctx.clearRect(0, 0, patchDim, patchDim);
    try {
      ctx.drawImage(srcImg, sx, sy, patchDim, patchDim, 0, 0, patchDim, patchDim);
    } catch {
      return corner;
    }

    const imgData = ctx.getImageData(0, 0, patchDim, patchDim);
    const data = imgData.data;
    const patchPixels = patchDim * patchDim;
    const patchGray = new Uint8Array(patchPixels);

    for (let i = 0; i < patchPixels; i++) {
      const idx = i * 4;
      patchGray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }

    const { mag } = computeSobelGradients(patchGray, patchDim, patchDim);

    // حساب مشتقات Ix و Iy لموتر الهيكل (Structure Tensor)
    const ix = new Float32Array(patchPixels);
    const iy = new Float32Array(patchPixels);

    for (let y = 1; y < patchDim - 1; y++) {
      const prev = (y - 1) * patchDim;
      const curr = y * patchDim;
      const next = (y + 1) * patchDim;
      for (let x = 1; x < patchDim - 1; x++) {
        const p00 = patchGray[prev + x - 1], p02 = patchGray[prev + x + 1];
        const p10 = patchGray[curr + x - 1], p12 = patchGray[curr + x + 1];
        const p20 = patchGray[next + x - 1], p22 = patchGray[next + x + 1];
        const p01 = patchGray[prev + x], p21 = patchGray[next + x];

        ix[curr + x] = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
        iy[curr + x] = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;
      }
    }

    let maxCornerScore = -1;
    let bestX = cx;
    let bestY = cy;

    const centerPatchX = cx - sx;
    const centerPatchY = cy - sy;

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      const py = centerPatchY + dy;
      if (py < 2 || py >= patchDim - 2) continue;

      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const px = centerPatchX + dx;
        if (px < 2 || px >= patchDim - 2) continue;

        const dist = Math.hypot(dx, dy);
        if (dist > searchRadius) continue;

        // حساب موتر الهيكل في نافذة 3x3 حول النقطة
        let sxx = 0, syy = 0, sxy = 0;
        for (let wy = -1; wy <= 1; wy++) {
          const rowOff = (py + wy) * patchDim;
          for (let wx = -1; wx <= 1; wx++) {
            const gx = ix[rowOff + (px + wx)];
            const gy = iy[rowOff + (px + wx)];
            sxx += gx * gx;
            syy += gy * gy;
            sxy += gx * gy;
          }
        }

        // حساب أصغر قيمة ذاتية (Shi-Tomasi Minimum Eigenvalue)
        const trace = sxx + syy;
        const diff = sxx - syy;
        const root = Math.sqrt(diff * diff + 4 * sxy * sxy);
        const minEigen = (trace - root) * 0.5;

        // إذا كانت القيمة الصغرى قريبة من الصفر، فهذه حافة مستقيمة 1D وليست ركناً حقيقياً 2D
        if (minEigen < 8) continue;

        // استجابة هاريس للمركبات البكسلية
        const det = sxx * syy - sxy * sxy;
        const harris = det - 0.04 * (trace * trace);

        const cornerMetric = minEigen * 0.75 + Math.max(0, harris > 0 ? Math.sqrt(harris) : 0) * 0.25;
        const combinedScore = cornerMetric * (1 - 0.45 * (dist / searchRadius));

        if (combinedScore > maxCornerScore) {
          maxCornerScore = combinedScore;
          bestX = sx + px;
          bestY = sy + py;
        }
      }
    }

    if (maxCornerScore < 15) {
      return corner;
    }

    const finalDist = Math.hypot(bestX - cx, bestY - cy);
    if (finalDist > Math.min(searchRadius, 4.5)) {
      return corner;
    }

    return {
      x: Math.max(0, Math.min(originalWidth - 1, bestX)),
      y: Math.max(0, Math.min(originalHeight - 1, bestY)),
    };
  });

  patchCanvas.width = 0;
  patchCanvas.height = 0;

  return sortCornerPoints(refined);
}

/**
 * تدوير الكانفاس بزاوية 90، 180، أو 270 درجة مع تنظيف الذاكرة التام
 */
export function rotateCanvas(
  srcCanvas: HTMLCanvasElement,
  angle: number,
  destroySrcCanvas: boolean = true
): HTMLCanvasElement {
  const normAngle = ((angle % 360) + 360) % 360;
  if (normAngle === 0 || (normAngle !== 90 && normAngle !== 180 && normAngle !== 270)) {
    return srcCanvas;
  }

  const dst = document.createElement("canvas");
  const rad = (normAngle * Math.PI) / 180;

  if (normAngle === 90 || normAngle === 270) {
    dst.width = srcCanvas.height;
    dst.height = srcCanvas.width;
  } else {
    dst.width = srcCanvas.width;
    dst.height = srcCanvas.height;
  }

  const ctx = dst.getContext("2d");
  if (!ctx) return srcCanvas;

  ctx.translate(dst.width / 2, dst.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(srcCanvas, -srcCanvas.width / 2, -srcCanvas.height / 2);

  // تنظيف الكانفاس المصدر إذا طُلب صراحةً لمنع تسريب الذاكرة وتفادي تدمير كائنات المتصل الخارجية
  if (destroySrcCanvas) {
    srcCanvas.width = 0;
    srcCanvas.height = 0;
  }

  return dst;
}
