import { useMemo } from "react";
import { PhotoTemplate } from "@/lib/templates";
import { PrintSettings, EditorMode } from "@/lib/editor-store";
import { DEFAULT_PRINT_SETTINGS } from "@/lib/store/slices/print-slice";
import { computeSheetGrid } from "@/lib/print/print-layout-math";

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
    // عند تجاوز التصميم (صورة فردية أو كانفاس الكولاج) مساحة الطباعة للورقة
    // المختارة — نطابق للأسفل إجبارياً حفاظاً على النسبة. بدونها تُقصّ الخلايا
    // في المعاينة ويرفض الخادم الطلب بـ invalid item geometry.
    const overflowsAvailable =
      originalImageWidthMM > availableWidthMM + 0.5 || originalImageHeightMM > availableHeightMM + 0.5;

    let imageWidthMM = originalImageWidthMM;
    let imageHeightMM = originalImageHeightMM;

    if (shouldFit) {
      const scaleX = availableWidthMM / originalImageWidthMM;
      const scaleY = availableHeightMM / originalImageHeightMM;
      const scale = Math.min(scaleX, scaleY);
      imageWidthMM = originalImageWidthMM * scale;
      imageHeightMM = originalImageHeightMM * scale;
    } else if (overflowsAvailable) {
      // تنزيل فقط (لا تكبير): إذا كان التصميم أصغر من الورقة يبقى بحجمه
      const scaleX = availableWidthMM / originalImageWidthMM;
      const scaleY = availableHeightMM / originalImageHeightMM;
      const scale = Math.min(scaleX, scaleY, 1);
      imageWidthMM = originalImageWidthMM * scale;
      imageHeightMM = originalImageHeightMM * scale;
    }

    const cellW = imageWidthMM + gapMM;
    const cellH = imageHeightMM + gapMM;
    // عدد الخلايا الممكنة على الورقة: (المتاح + فجوة) مقسوماً على الخلية لأن
    // آخر خلية لا تحتاج فجوة خلفها — صيغة واحدة يستهلكها كل الفروع أدناه
    const fitCols = cellW > 0 ? Math.min(48, Math.max(1, Math.floor((availableWidthMM + gapMM) / cellW))) : 1;
    const fitRows = cellH > 0 ? Math.min(48, Math.max(1, Math.floor((availableHeightMM + gapMM) / cellH))) : 1;
    const autoCount = Math.max(1, fitCols * fitRows);

    let cols = 1;
    let actualCopies = 1;

    if (repeatMode === "row") {
      cols = fitCols;
      actualCopies = fitCols;
    } else if (repeatMode === "column") {
      cols = 1;
      actualCopies = fitRows;
    } else {
      cols = fitCols;
      actualCopies = Math.min(printSettings.copiesPerSheet ?? 1, autoCount);
    }

    // المصدر الوحيد للشبكة: كل المستهلكين (print-dialog / print-preview / cut-lines-utils)
    // يعتمدون على هذا الكائن ولا يعيدون حساب صيغ الشبكة بأنفسهم.
    const grid = computeSheetGrid({
      cols,
      actualCopies,
      imageWidthMM,
      imageHeightMM,
      gapMM,
      effectiveMarginMM,
      availableWidthMM,
      availableHeightMM,
    });
    const rows = grid.actualRows;

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
      grid,
      paperWidth,
      paperHeight,
    };
  }, [template, printSettings, canvasWidth, canvasHeight, mode]);
}
