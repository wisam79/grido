import { useMemo } from "react";
import { PhotoTemplate } from "@/lib/templates";
import { PrintSettings, EditorMode } from "@/lib/editor-store";
import { DEFAULT_PRINT_SETTINGS } from "@/lib/store/slices/print-slice";

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

    const paperWidth =
      printSettings.orientation === "portrait"
        ? printSettings.paperWidthMM
        : printSettings.paperHeightMM;
    const paperHeight =
      printSettings.orientation === "portrait"
        ? printSettings.paperHeightMM
        : printSettings.paperWidthMM;

    // If the image is A4 (or whatever the full paper size is), ignore the print margins 
    // because the user is designing a full page layout.
    const isFullPage = originalImageWidthMM >= paperWidth - 1 && originalImageHeightMM >= paperHeight - 1;
    // التصفيح الحدودي التلقائي يحدث فقط عندما doc≈paper والهامش لم يُضبط يدوياً
    // (لا يزال على الافتراضي أو «بدون هوامش» صريح). هامش مخصص اختيار يُحترم.
    const marginUntouched =
      printSettings.marginMM === 0 || printSettings.marginMM === DEFAULT_PRINT_SETTINGS.marginMM;
    const effectiveMarginMM = isFullPage && marginUntouched ? 0 : printSettings.marginMM;

    const availableWidthMM = paperWidth - 2 * effectiveMarginMM;
    const availableHeightMM = paperHeight - 2 * effectiveMarginMM;

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
    // عدد الخلايا: (المتاح + فجوة) مقسوماً على الخلية لأن آخر خلية لا تحتاج فجوة خلفها
    const tempCols = cellW > 0 ? Math.min(48, Math.max(1, Math.floor((availableWidthMM + gapMM) / cellW))) : 1;
    const tempRows = cellH > 0 ? Math.min(48, Math.max(1, Math.floor((availableHeightMM + gapMM) / cellH))) : 1;
    const autoCount = Math.max(1, tempCols * tempRows);

    let actualCopies = 1;
    let cols = 1;
    let rows = 1;

    if (repeatMode === "row") {
      cols = Math.min(48, Math.max(1, Math.floor((availableWidthMM + gapMM) / (imageWidthMM + gapMM))));
      rows = 1;
      actualCopies = cols;
    } else if (repeatMode === "column") {
      cols = 1;
      rows = Math.min(48, Math.max(1, Math.floor((availableHeightMM + gapMM) / (imageHeightMM + gapMM))));
      actualCopies = rows;
    } else {
      cols = Math.max(1, Math.floor((availableWidthMM + gapMM) / (imageWidthMM + gapMM)));
      actualCopies = Math.min(printSettings.copiesPerSheet ?? 1, autoCount);
      rows = Math.ceil(actualCopies / Math.max(1, cols));
    }

    return {
      dpi,
      originalImageWidthMM,
      originalImageHeightMM,
      availableWidthMM,
      availableHeightMM,
      effectiveMarginMM,
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
