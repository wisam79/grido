import { useMemo } from 'react';

import { computeSheetGrid } from '@/lib/print/print-layout-math';

import type { PrintSettings, EditorMode } from '@/lib/editor-store';
import type { GridAlignment } from '@/lib/print/print-layout-math';
import type { PhotoTemplate, CollageTemplate } from '@/lib/templates';

interface UsePrintLayoutProps {
  template: PhotoTemplate | null;
  printSettings: PrintSettings;
  canvasWidth: number;
  canvasHeight: number;
  mode: EditorMode;
  collageTemplate?: CollageTemplate | null;
}

export function usePrintLayout({
  template,
  printSettings,
  canvasWidth,
  canvasHeight,
  mode,
  collageTemplate,
}: UsePrintLayoutProps) {
  return useMemo(() => {
    const dpi = template ? template.dpi : printSettings.dpi;
    const originalImageWidthMM = template ? template.widthMM : (canvasWidth / dpi) * 25.4;
    const originalImageHeightMM = template ? template.heightMM : (canvasHeight / dpi) * 25.4;

    const isCanvasPaper = printSettings.paperId === 'canvas';
    const baseW = isCanvasPaper ? originalImageWidthMM : printSettings.paperWidthMM;
    const baseH = isCanvasPaper ? originalImageHeightMM : printSettings.paperHeightMM;
    const isLandscape = printSettings.orientation === 'landscape';
    const paperWidth = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
    const paperHeight = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);

    // If the image is A4 (or whatever the full paper size is), ignore the print margins
    // because the user is designing a full page layout.
    const isFullPage =
      isCanvasPaper ||
      (originalImageWidthMM >= paperWidth - 1 && originalImageHeightMM >= paperHeight - 1);
    // التصفيح الحدودي التلقائي يحدث فقط عندما doc≈paper والهامش ما زال على الصفر
    // (الافتراضي 0 = «بدون هوامش» — والشرطان القديمان كانا متطابقين حرفياً لأن
    // الافتراضي نفسه صفر). أي هامش غير صفري اختاره المستخدم يُحترم حتى على التصميم الممتلئ.
    const marginUntouched = printSettings.marginMM === 0;
    // 🛡️ حارس فيضان (نفس صنف H4): هامش أكبر من نصف ضلع الورقة (أو مقاسات ورق
    // تالفة) كان يجعل المساحة المتاحة صفراً أو سالبة — فينقلب كل مقياس إلى
    // NaN/Infinity وتخرج نسبة امتلاء الورقة (availableW*availableH كمقامم) NaN.
    // نحدّ الهامش بنصف الضلع الأقصر ونمنح الورقة حداً أدنى 1mm من المساحة.
    const rawMarginMM = isCanvasPaper
      ? 0
      : isFullPage && marginUntouched
        ? 0
        : printSettings.marginMM;
    const maxMarginMM = Math.max(0, Math.min(paperWidth, paperHeight) / 2 - 0.5);
    const effectiveMarginMM = Math.min(Math.max(0, rawMarginMM || 0), maxMarginMM);

    // لا يقلّ المتاح عن 1mm أبداً — الحاجز الثاني الذي يمنع NaN في كل المقامات
    const availableWidthMM = Math.max(1, paperWidth - 2 * effectiveMarginMM);
    const availableHeightMM = Math.max(1, paperHeight - 2 * effectiveMarginMM);

    const gapMM = printSettings.gapMM ?? 2;

    const repeatMode = printSettings.repeatMode || 'all';

    const fitToPage = printSettings.fitToPage === true;
    const shouldFit =
      fitToPage && mode === 'single' && printSettings.copiesPerSheet === 1 && repeatMode === 'all';
    // عند تجاوز التصميم (صورة فردية أو كانفاس الكولاج) مساحة الطباعة للورقة
    // المختارة — نطابق للأسفل إجبارياً حفاظاً على النسبة. بدونها تُقصّ الخلايا
    // في المعاينة ويرفض الخادم الطلب بـ invalid item geometry.
    const overflowsAvailable =
      originalImageWidthMM > availableWidthMM + 0.5 ||
      originalImageHeightMM > availableHeightMM + 0.5;

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
    const fitCols =
      cellW > 0 ? Math.min(48, Math.max(1, Math.floor((availableWidthMM + gapMM) / cellW))) : 1;
    const fitRows =
      cellH > 0 ? Math.min(48, Math.max(1, Math.floor((availableHeightMM + gapMM) / cellH))) : 1;
    const autoCount = Math.max(1, fitCols * fitRows);

    let cols = 1;
    let actualCopies = 1;

    if (repeatMode === 'row') {
      cols = fitCols;
      actualCopies = fitCols;
    } else if (repeatMode === 'column') {
      cols = 1;
      actualCopies = fitRows;
    } else {
      actualCopies = Math.min(printSettings.copiesPerSheet ?? 1, autoCount);
      cols = actualCopies <= fitCols ? Math.max(1, actualCopies) : fitCols;
    }

    const collageAlign = collageTemplate?.physicalLayout?.align;
    const align = (collageAlign || printSettings.gridAlign || 'top-left') as GridAlignment;

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
      align,
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
  }, [template, printSettings, canvasWidth, canvasHeight, mode, collageTemplate]);
}
