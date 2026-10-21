/**
 * Multi-Sticker Sheet Generator for Batch Printing.
 * Renders repeated stickers in an N x M grid onto an offscreen canvas.
 *
 * يقبل الأبعاد بالمليمتر (Hidef للمطبعة) أو بالبكسل مباشرة للتوافق:
 * عند تمرير spacingMm/sheetWidthMm تُحسب البكسلات عبر 300DPI الحقيقية.
 *
 * المسار الوحيد: `generateStickerSheetBlob` (بلا Base64) — الاستدعاء
 * يرفع Blob ثنائياً على سطح المكتب ويحوّل إلى Data URL على الويب فقط.
 */
import { canvasToBlob } from '@/lib/canvas/canvas-blob';

import { assertRasterBudget } from './export-limits';
import { mmToPx, STICKER_DPI } from './sticker-text';

export interface SheetOptions {
  rows: number;
  cols: number;
  gapPx?: number;
  paddingPx?: number;
  sheetWidth?: number;
  sheetHeight?: number;
  drawCutMarks?: boolean;
  /** بدائل مليمترية — لها الأولوية عند توفرها */
  spacingMm?: number;
  sheetWidthMm?: number;
  sheetHeightMm?: number;
  dpi?: number;
}

export interface SheetAutoFitInput {
  stickerWidthMm: number;
  stickerHeightMm: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  spacingMm: number;
  /** هامش حافة الورقة بالمم (افتراضي 8مم للأمان من هوامش الطابعة) */
  marginMm?: number;
}

export interface SheetAutoFitResult {
  rows: number;
  cols: number;
  count: number;
}

/**
 * ملاءمة تلقائية: أكبر شبكة (صفوف×أعمدة) تتسع فيها الملصقات بمقاسها
 * المليمتري الحقيقي على ورقة الطباعة مع الفواصل والهوامش — بلا تخمين يدوي.
 * تُرجع 1×1 على الأقل دائماً (الملصق الأكبر من الورقة يُصغَّر لاحقاً عند الرسم).
 */
export function autoFitSheetGrid(input: SheetAutoFitInput): SheetAutoFitResult {
  const margin = Math.max(0, input.marginMm ?? 8);
  const usableW = Math.max(1, input.sheetWidthMm - margin * 2);
  const usableH = Math.max(1, input.sheetHeightMm - margin * 2);
  const sw = Math.max(1, input.stickerWidthMm);
  const sh = Math.max(1, input.stickerHeightMm);
  const gap = Math.max(0, input.spacingMm);
  const cols = Math.max(1, Math.floor((usableW + gap) / (sw + gap)));
  const rows = Math.max(1, Math.floor((usableH + gap) / (sh + gap)));
  return { rows: Math.min(rows, 12), cols: Math.min(cols, 12), count: rows * cols };
}

/**
 * يرسم شبكة الملصقات ويعيد Blob. يستخدم Master واحداً ويعيد استخدامه لكل
 * خلية، ثم يحرر رابط المصدر المؤقت في `finally`.
 */
export async function generateStickerSheetBlob(
  singleStickerPng: string | Blob,
  options: SheetOptions = { rows: 3, cols: 3 },
): Promise<Blob> {
  const dpi = options.dpi && options.dpi > 0 ? options.dpi : STICKER_DPI;
  const drawCutMarks = options.drawCutMarks ?? true;
  const gapPx =
    options.spacingMm !== undefined
      ? mmToPx(Math.max(0, options.spacingMm), dpi)
      : (options.gapPx ?? 24);
  const paddingPx = options.paddingPx ?? Math.max(12, Math.round(gapPx * 1.5));
  const sheetWidth =
    options.sheetWidthMm !== undefined
      ? mmToPx(options.sheetWidthMm, dpi)
      : (options.sheetWidth ?? 2400);
  const sheetHeight =
    options.sheetHeightMm !== undefined
      ? mmToPx(options.sheetHeightMm, dpi)
      : (options.sheetHeight ?? 2400);

  // حماية الذاكرة قبل أي تخصيص Canvas
  assertRasterBudget(sheetWidth, sheetHeight);

  const rows = Math.max(1, Math.floor(options.rows));
  const cols = Math.max(1, Math.floor(options.cols));

  let objectUrl: string | null = null;
  const source =
    typeof singleStickerPng === 'string'
      ? singleStickerPng
      : (() => {
          objectUrl = URL.createObjectURL(singleStickerPng);
          return objectUrl;
        })();

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load sticker image for sheet'));
      image.src = source;
    });

    const canvas = document.createElement('canvas');
    canvas.width = sheetWidth;
    canvas.height = sheetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D canvas context');

    ctx.imageSmoothingEnabled = true;
    try {
      ctx.imageSmoothingQuality = 'high';
    } catch {
      // متصفحات قديمة — تُتجاهل بصمت
    }

    // Available area for grid
    const availableW = sheetWidth - paddingPx * 2 - (cols - 1) * gapPx;
    const availableH = sheetHeight - paddingPx * 2 - (rows - 1) * gapPx;

    const cellW = availableW / cols;
    const cellH = availableH / rows;
    const imgAspect = img.width / img.height || 1;

    // Maintain aspect ratio of sticker within cell
    let drawW = cellW;
    let drawH = cellW / imgAspect;
    if (drawH > cellH) {
      drawH = cellH;
      drawW = cellH * imgAspect;
    }

    ctx.clearRect(0, 0, sheetWidth, sheetHeight);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellX = paddingPx + c * (cellW + gapPx);
        const cellY = paddingPx + r * (cellH + gapPx);

        const x = cellX + (cellW - drawW) / 2;
        const y = cellY + (cellH - drawH) / 2;

        ctx.drawImage(img, x, y, drawW, drawH);
      }
    }

    // علامات قص حقيقية للمطبعة: أسود رفيع بإزاحة 2مم وطول 5مم (دفعة stroke واحدة)
    if (drawCutMarks) {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = Math.max(1.5, dpi / 200);
      const markLen = mmToPx(5, dpi);
      const markOff = mmToPx(2, dpi);
      ctx.beginPath();

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cellX = paddingPx + c * (cellW + gapPx);
          const cellY = paddingPx + r * (cellH + gapPx);
          const x = cellX + (cellW - drawW) / 2;
          const y = cellY + (cellH - drawH) / 2;

          // Top-left
          ctx.moveTo(x - markOff, y);
          ctx.lineTo(x - markOff - markLen, y);
          ctx.moveTo(x, y - markOff);
          ctx.lineTo(x, y - markOff - markLen);

          // Top-right
          ctx.moveTo(x + drawW + markOff, y);
          ctx.lineTo(x + drawW + markOff + markLen, y);
          ctx.moveTo(x + drawW, y - markOff);
          ctx.lineTo(x + drawW, y - markOff - markLen);

          // Bottom-left
          ctx.moveTo(x - markOff, y + drawH);
          ctx.lineTo(x - markOff - markLen, y + drawH);
          ctx.moveTo(x, y + drawH + markOff);
          ctx.lineTo(x, y + drawH + markOff + markLen);

          // Bottom-right
          ctx.moveTo(x + drawW + markOff, y + drawH);
          ctx.lineTo(x + drawW + markOff + markLen, y + drawH);
          ctx.moveTo(x + drawW, y + drawH + markOff);
          ctx.lineTo(x + drawW, y + drawH + markOff + markLen);
        }
      }

      ctx.stroke();
    }

    return await canvasToBlob(canvas, 'image/png');
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
