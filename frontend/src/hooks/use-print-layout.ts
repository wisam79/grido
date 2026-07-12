import { useMemo } from "react";
import { PhotoTemplate } from "@/lib/templates";
import { PrintSettings, EditorMode } from "@/lib/editor-store";

interface UsePrintLayoutProps {
  template: PhotoTemplate | null;
  printSettings: PrintSettings;
  canvasWidth: number;
  canvasHeight: number;
  mode: EditorMode;
}

export function usePrintLayout({
  template,
  printSettings,
  canvasWidth,
  canvasHeight,
  mode,
}: UsePrintLayoutProps) {
  return useMemo(() => {
    const dpi = template ? template.dpi : printSettings.dpi;
    const originalImageWidthMM = template ? template.widthMM : (canvasWidth / dpi) * 25.4;
    const originalImageHeightMM = template ? template.heightMM : (canvasHeight / dpi) * 25.4;

    const availableWidthMM =
      printSettings.orientation === "portrait"
        ? printSettings.paperWidthMM - 2 * printSettings.marginMM
        : printSettings.paperHeightMM - 2 * printSettings.marginMM;
    const availableHeightMM =
      printSettings.orientation === "portrait"
        ? printSettings.paperHeightMM - 2 * printSettings.marginMM
        : printSettings.paperWidthMM - 2 * printSettings.marginMM;

    const gapMM = printSettings.gapMM ?? 2;

    const repeatMode = printSettings.repeatMode || "all";

    const fitToPage = printSettings.fitToPage !== false;
    const shouldFit = fitToPage && mode === "single" && printSettings.copiesPerSheet === 1 && repeatMode === "all";

    let imageWidthMM = originalImageWidthMM;
    let imageHeightMM = originalImageHeightMM;

    if (shouldFit) {
      const scaleX = availableWidthMM / originalImageWidthMM;
      const scaleY = availableHeightMM / originalImageHeightMM;
      const scale = Math.min(scaleX, scaleY);
      imageWidthMM = originalImageWidthMM * scale;
      imageHeightMM = originalImageHeightMM * scale;
    }

    const cellW = imageWidthMM + gapMM;
    const cellH = imageHeightMM + gapMM;
    const tempCols = cellW > 0 ? Math.floor(availableWidthMM / cellW) : 1;
    const tempRows = cellH > 0 ? Math.floor(availableHeightMM / cellH) : 1;
    const autoCount = Math.max(1, tempCols * tempRows);

    let actualCopies = 1;
    let cols = 1;
    let rows = 1;

    if (repeatMode === "row") {
      cols = Math.max(1, Math.floor(availableWidthMM / (imageWidthMM + gapMM)));
      rows = 1;
      actualCopies = cols;
    } else if (repeatMode === "column") {
      cols = 1;
      rows = Math.max(1, Math.floor(availableHeightMM / (imageHeightMM + gapMM)));
      actualCopies = rows;
    } else {
      cols = Math.max(1, Math.floor(availableWidthMM / (imageWidthMM + gapMM)));
      actualCopies = Math.min(printSettings.copiesPerSheet ?? 1, autoCount);
      rows = Math.ceil(actualCopies / Math.max(1, cols));
    }

    const paperWidth =
      printSettings.orientation === "portrait"
        ? printSettings.paperWidthMM
        : printSettings.paperHeightMM;
    const paperHeight =
      printSettings.orientation === "portrait"
        ? printSettings.paperHeightMM
        : printSettings.paperWidthMM;

    return {
      dpi,
      originalImageWidthMM,
      originalImageHeightMM,
      availableWidthMM,
      availableHeightMM,
      gapMM,
      imageWidthMM,
      imageHeightMM,
      autoCount,
      actualCopies,
      cols,
      rows,
      paperWidth,
      paperHeight,
    };
  }, [template, printSettings, canvasWidth, canvasHeight, mode]);
}
