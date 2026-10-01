/**
 * Multi-Sticker Sheet Generator for Batch Printing.
 * Renders repeated stickers in an N x M grid onto an offscreen canvas.
 *
 * يقبل الأبعاد بالمليمتر (Hidef للمطبعة) أو بالبكسل مباشرة للتوافق:
 * عند تمرير spacingMm/sheetWidthMm تُحسب البكسلات عبر 300DPI الحقيقية.
 */
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

export async function generateStickerSheet(
  singleStickerPngUrl: string,
  options: SheetOptions = { rows: 3, cols: 3 },
): Promise<string> {
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
  const rows = options.rows;
  const cols = options.cols;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = sheetWidth;
        canvas.height = sheetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get 2D canvas context'));
          return;
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

        ctx.fillStyle = 'transparent';
        ctx.clearRect(0, 0, sheetWidth, sheetHeight);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cellX = paddingPx + c * (cellW + gapPx);
            const cellY = paddingPx + r * (cellH + gapPx);

            const x = cellX + (cellW - drawW) / 2;
            const y = cellY + (cellH - drawH) / 2;

            // Draw sticker image
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

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error('Failed to load sticker image for sheet: ' + String(e)));
    img.src = singleStickerPngUrl;
  });
}
