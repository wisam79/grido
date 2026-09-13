/**
 * Multi-Sticker Sheet Generator for Batch Printing.
 * Renders repeated stickers in an N x M grid onto an offscreen canvas.
 */

export interface SheetOptions {
  rows: number;
  cols: number;
  gapPx?: number;
  paddingPx?: number;
  sheetWidth?: number;
  sheetHeight?: number;
  drawCutMarks?: boolean;
}

export async function generateStickerSheet(
  singleStickerPngUrl: string,
  options: SheetOptions = { rows: 3, cols: 3 }
): Promise<string> {
  const {
    rows = 3,
    cols = 3,
    gapPx = 24,
    paddingPx = 36,
    sheetWidth = 2400,
    sheetHeight = 2400,
    drawCutMarks = true,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = sheetWidth;
        canvas.height = sheetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Cannot get 2D canvas context"));
          return;
        }

        // Available area for grid
        const availableW = sheetWidth - paddingPx * 2 - (cols - 1) * gapPx;
        const availableH = sheetHeight - paddingPx * 2 - (rows - 1) * gapPx;

        const cellW = availableW / cols;
        const cellH = availableH / rows;

        // Maintain aspect ratio of sticker within cell
        const imgAspect = img.width / img.height;
        let drawW = cellW;
        let drawH = cellW / imgAspect;

        if (drawH > cellH) {
          drawH = cellH;
          drawW = cellH * imgAspect;
        }

        ctx.fillStyle = "transparent";
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

        // Optional subtle corner cut marks (batched in single stroke outside loop - Rule 30)
        if (drawCutMarks) {
          ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
          ctx.lineWidth = 1.5;
          const markLen = 8;
          ctx.beginPath();

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cellX = paddingPx + c * (cellW + gapPx);
              const cellY = paddingPx + r * (cellH + gapPx);
              const x = cellX + (cellW - drawW) / 2;
              const y = cellY + (cellH - drawH) / 2;

              // Top-left
              ctx.moveTo(x - 2, y);
              ctx.lineTo(x - 2 - markLen, y);
              ctx.moveTo(x, y - 2);
              ctx.lineTo(x, y - 2 - markLen);

              // Top-right
              ctx.moveTo(x + drawW + 2, y);
              ctx.lineTo(x + drawW + 2 + markLen, y);
              ctx.moveTo(x + drawW, y - 2);
              ctx.lineTo(x + drawW, y - 2 - markLen);

              // Bottom-left
              ctx.moveTo(x - 2, y + drawH);
              ctx.lineTo(x - 2 - markLen, y + drawH);
              ctx.moveTo(x, y + drawH + 2);
              ctx.lineTo(x, y + drawH + 2 + markLen);

              // Bottom-right
              ctx.moveTo(x + drawW + 2, y + drawH);
              ctx.lineTo(x + drawW + 2 + markLen, y + drawH);
              ctx.moveTo(x + drawW, y + drawH + 2);
              ctx.lineTo(x + drawW, y + drawH + 2 + markLen);
            }
          }

          ctx.stroke();
        }

        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error("Failed to load sticker image for sheet: " + String(e)));
    img.src = singleStickerPngUrl;
  });
}
