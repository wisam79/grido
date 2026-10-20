import { Point, ScannerFilterMode } from './types';
import { sortCornerPoints } from './quad-geometry';
import { computePerspectiveTransform } from './perspective-warper';
import { applyFilterMode } from './filters';
import {
  ScannerCanvas,
  createScannerCanvas,
  getScanner2DContext,
  releaseScannerCanvas,
} from './scanner-canvas';

/**
 * 🧩 نواة الاستعدال القابلة للتشغيل داخل Web Worker.
 *
 * الهدف: تنفيذ استعدال المنظور خارج الخيط الرئيسي (تجنّب تجميد الواجهة على
 * صور 50MP) مع خفض الذروة:
 *  1) قصّ المصدر على منطقة المستند فقط بدل قراءة الصورة كاملة.
 *  2) إنتاج المخرج على شرائح أفقية بدل مخزن ImageData كامل للمخرج.
 *
 * الدالة لا تلمس DOM — تعمل بـ OffscreenCanvas داخل العامل وبـ HTMLCanvasElement
 * في الخيط الرئيسي.
 */

/** عدد الصفوف في كل شريط إخراج (يحدد ذروة ذاكرة الشريط). */
const WARP_STRIP_ROWS = 256;

/** هامش بكسل حول أركان المستند يمنع أخذ عيّنات خارج المصدر. */
const CROP_PADDING = 2;

export interface SourceCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WarpPipelineOptions {
  corners: Point[];
  targetW: number;
  targetH: number;
  filterMode: ScannerFilterMode;
  rotation: number;
}

/**
 * يحسب مستطيل القصّ الذي يحتوي أركان المستند (مع هامش أمان) داخل حدود الصورة.
 * القصّ يحوّل قراءة getImageData من كامل الصورة (قد تكون 50MP) إلى منطقة
 * المستند فقط.
 */
export function computeSourceCrop(
  corners: Point[],
  srcWidth: number,
  srcHeight: number,
): SourceCrop {
  if (!corners || corners.length === 0 || srcWidth <= 0 || srcHeight <= 0) {
    return { x: 0, y: 0, width: Math.max(1, srcWidth), height: Math.max(1, srcHeight) };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const corner of corners) {
    if (!corner || !Number.isFinite(corner.x) || !Number.isFinite(corner.y)) continue;
    minX = Math.min(minX, corner.x);
    minY = Math.min(minY, corner.y);
    maxX = Math.max(maxX, corner.x);
    maxY = Math.max(maxY, corner.y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { x: 0, y: 0, width: Math.max(1, srcWidth), height: Math.max(1, srcHeight) };
  }

  const x = Math.max(0, Math.floor(minX) - CROP_PADDING);
  const y = Math.max(0, Math.floor(minY) - CROP_PADDING);
  const maxCropX = Math.min(srcWidth - 1, Math.ceil(maxX) + CROP_PADDING);
  const maxCropY = Math.min(srcHeight - 1, Math.ceil(maxY) + CROP_PADDING);

  return {
    x,
    y,
    width: Math.max(1, maxCropX - x + 1),
    height: Math.max(1, maxCropY - y + 1),
  };
}

/** يحوّل زوايا المستند إلى إحداثيات المصدر المقصوص. */
export function toLocalCorners(corners: Point[], crop: SourceCrop): Point[] {
  return corners.map((corner) => ({
    x: Math.max(0, Math.min(crop.width - 1, corner.x - crop.x)),
    y: Math.max(0, Math.min(crop.height - 1, corner.y - crop.y)),
  }));
}

/** يدوّر الكانفاس بزاوية 90/180/270 (نفس دلالات rotateCanvas في المسار القديم). */
export function rotateScannerCanvas(srcCanvas: ScannerCanvas, angle: number): ScannerCanvas {
  const normAngle = ((angle % 360) + 360) % 360;
  if (normAngle === 0 || (normAngle !== 90 && normAngle !== 180 && normAngle !== 270)) {
    return srcCanvas;
  }

  const swapped = normAngle === 90 || normAngle === 270;
  const dst = createScannerCanvas(
    swapped ? srcCanvas.height : srcCanvas.width,
    swapped ? srcCanvas.width : srcCanvas.height,
  );
  const ctx = getScanner2DContext(dst);
  if (!ctx) return srcCanvas;

  const rad = (normAngle * Math.PI) / 180;
  ctx.translate(dst.width / 2, dst.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(srcCanvas as CanvasImageSource, -srcCanvas.width / 2, -srcCanvas.height / 2);

  releaseScannerCanvas(srcCanvas);
  return dst;
}

/**
 * ينفّذ الاستعدال الكامل: قصّ المصدر → استعدال منظوري → فلاتر → تدوير.
 * تُرجع الكانفاس النهائي (غير مُرمَّز بعد).
 */
export function warpSourceImage(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: WarpPipelineOptions,
): ScannerCanvas {
  const outW = Math.max(2, Math.round(options.targetW));
  const outH = Math.max(2, Math.round(options.targetH));

  const sorted = sortCornerPoints(options.corners);
  const crop = computeSourceCrop(sorted, sourceWidth, sourceHeight);
  const localCorners = toLocalCorners(sorted, crop);

  // 1) قصّ منطقة المستند من المصدر
  const srcCanvas = createScannerCanvas(crop.width, crop.height);
  const srcCtx = getScanner2DContext(srcCanvas, true);
  if (!srcCtx) {
    releaseScannerCanvas(srcCanvas);
    return createScannerCanvas(outW, outH);
  }
  srcCtx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  const srcData = srcCtx.getImageData(0, 0, crop.width, crop.height).data;
  releaseScannerCanvas(srcCanvas);

  // 2) كانفاس المخرج
  const outCanvas = createScannerCanvas(outW, outH);
  const outCtx = getScanner2DContext(outCanvas, true);
  if (!outCtx) return outCanvas;

  const dstCorners: Point[] = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ];
  const hInv = computePerspectiveTransform(dstCorners, localCorners);
  const h0 = hInv[0];
  const h1 = hInv[1];
  const h2 = hInv[2];
  const h3 = hInv[3];
  const h4 = hInv[4];
  const h5 = hInv[5];
  const h6 = hInv[6];
  const h7 = hInv[7];
  const h8 = hInv[8];

  const srcW = crop.width;
  const srcH = crop.height;

  // 3) الاستعدال على شرائح — لا نخزّن ImageData كامل للمخرج
  for (let stripY = 0; stripY < outH; stripY += WARP_STRIP_ROWS) {
    const rows = Math.min(WARP_STRIP_ROWS, outH - stripY);
    const strip = outCtx.createImageData(outW, rows);
    const outData = strip.data;
    let outIdx = 0;

    for (let y = stripY; y < stripY + rows; y++) {
      for (let x = 0; x < outW; x++) {
        const denom = h6 * x + h7 * y + h8;
        if (Math.abs(denom) >= 1e-9) {
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

            outData[outIdx] = Math.round(
              w00 * srcData[idx00] +
                w10 * srcData[idx10] +
                w01 * srcData[idx01] +
                w11 * srcData[idx11],
            );
            outData[outIdx + 1] = Math.round(
              w00 * srcData[idx00 + 1] +
                w10 * srcData[idx10 + 1] +
                w01 * srcData[idx01 + 1] +
                w11 * srcData[idx11 + 1],
            );
            outData[outIdx + 2] = Math.round(
              w00 * srcData[idx00 + 2] +
                w10 * srcData[idx10 + 2] +
                w01 * srcData[idx01 + 2] +
                w11 * srcData[idx11 + 2],
            );
            outData[outIdx + 3] = Math.round(
              w00 * srcData[idx00 + 3] +
                w10 * srcData[idx10 + 3] +
                w01 * srcData[idx01 + 3] +
                w11 * srcData[idx11 + 3],
            );
          }
        }
        outIdx += 4;
      }
    }

    outCtx.putImageData(strip, 0, stripY);
  }

  // 4) الفلاتر (تعمل على الكانفاس بالكامل — داخل العامل لا على الخيط الرئيسي)
  const filtered = applyFilterMode(outCanvas, options.filterMode);

  // 5) التدوير
  return rotateScannerCanvas(filtered, options.rotation);
}
