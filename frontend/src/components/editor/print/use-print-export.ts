import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor-store";
import { useStageRef } from "@/lib/canvas/stage-context";
import { previewWhite } from "@/lib/canvas/canvas-colors";
import { ExportPrintSheet, PrintNative } from "../../../../wailsjs/go/handlers/PrintHandler";
import { domain } from "../../../../wailsjs/go/models";
import { captureStageDataUrl } from "@/lib/canvas/konva-export-utils";
import { assertExportablePixels, CanvasTooLargeError } from "@/lib/export/export-limits";
import { calculatePrintCutLines } from "@/lib/print/cut-lines-utils";
import { computeBlockPosition, computeSlotAspect, computeSlotRectMM } from "@/lib/print/print-layout-math";
import { buildSingleComposition } from "@/lib/print/single-print-composition";
import type { usePrintLayout } from "@/hooks/use-print-layout";
import type { PrintSettings } from "@/lib/store/types";

/** المدخلات المشتركة لمولّد العناصر والتصدير — من usePrintLayout والدالة الأصل */
export interface PrintExportContext {
  layout: ReturnType<typeof usePrintLayout>;
  mode: "single" | "collage";
  elements: ReturnType<typeof useEditorStore.getState>["elements"];
  slots: ReturnType<typeof useEditorStore.getState>["slots"];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  collageTemplate: ReturnType<typeof useEditorStore.getState>["collageTemplate"];
  collageMargin: number;
  collageGap: number;
  collageRadius: number;
  collageStrokeWidth: number;
  collageStrokeColor: string;
  collageShowCutLines: boolean;
  collageShowEndCutLine: boolean;
  printDpi: number;
  printShowCutLines: boolean;
  printShowEndCutLine: boolean | undefined;
  printCutLineStyle: PrintSettings["cutLineStyle"];
  printOrientation: PrintSettings["orientation"];
}

interface BuiltItems {
  items: domain.PrintItem[];
  cutLines: domain.CutLine[];
  composition: undefined;
}

/**
 * 🧭 محرك تصدير الطباعة: بناء عناصر الورقة (كولاج أو مفرد) بكل خصائص
 * الخانات والقص والحدود، ثم توليد الورقة عبر Go وعرض حوار الطباعة عبر
 * iframe مخفي مع img.decode() وafterprint — كانت هذه الكتل مضمّنة في Dialog.
 */
export function usePrintExport(ctx: PrintExportContext) {
  const stageRef = useStageRef();
  const [isExporting, setIsExporting] = useState(false);

  // مؤشر الطباعة Enter — آخر معاملات نداء الطباعة من المكوّن
  const printInvocationRef = useRef<{
    colorSpace: "sRGB" | "CMYK";
    previewImageSrc: string;
    effectiveMarginMM: number;
    onDone: () => void;
  } | null>(null);

  const setPrintInvocation = useCallback((inv: {
    colorSpace: "sRGB" | "CMYK";
    previewImageSrc: string;
    effectiveMarginMM: number;
    onDone: () => void;
  }) => {
    printInvocationRef.current = inv;
  }, []);

  const handlePrintRef = useRef<() => void>(() => { });

  const {
    layout,
    mode,
    elements,
    slots,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    collageTemplate,
    collageMargin,
    collageGap,
    collageRadius,
    collageStrokeWidth,
    collageStrokeColor,
    collageShowCutLines,
    collageShowEndCutLine,
    printDpi,
    printShowCutLines,
    printShowEndCutLine,
    printCutLineStyle,
    printOrientation,
  } = ctx;

  const {
    imageWidthMM,
    imageHeightMM,
    gapMM,
    actualCopies,
    paperWidth,
    paperHeight,
    grid,
  } = layout;

  const buildItems = useCallback(async (): Promise<BuiltItems> => {
    const items: domain.PrintItem[] = [];
    const hasPhysical = Boolean(collageTemplate?.physicalLayout);
    const marginPx = hasPhysical ? 0 : collageMargin;
    const gapPx = hasPhysical ? 0 : collageGap;
    const scaleXPxToMM = imageWidthMM / canvasWidth;
    const scaleYPxToMM = imageHeightMM / canvasHeight;
    const marginXMM = marginPx * scaleXPxToMM;
    const marginYMM = marginPx * scaleYPxToMM;
    const gapXMM = gapPx * scaleXPxToMM;
    const gapYMM = gapPx * scaleYPxToMM;

    const rawCutLines = collageShowCutLines
      ? calculatePrintCutLines({
        mode,
        actualCopies,
        imageWidthMM,
        imageHeightMM,
        gapMM,
        paperWidth,
        paperHeight,
        showEndCutLine: collageShowEndCutLine !== false,
        slots,
        collageMargin,
        collageGap,
        canvasWidth,
        canvasHeight,
        hasPhysical,
        grid,
      })
      : [];

    const cutLines: domain.CutLine[] = rawCutLines.map((l) => ({
      x1: l.x1,
      y1: l.y1,
      x2: l.x2,
      y2: l.y2,
    }));

    for (let i = 0; i < actualCopies; i++) {
      const block = computeBlockPosition(i, grid);

      for (const slot of slots) {
        const activeSrc = slot.imageSrc;
        if (!activeSrc) continue;
        const rect = computeSlotRectMM(
          block,
          { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
          { widthMM: imageWidthMM, heightMM: imageHeightMM },
          { marginXMM, marginYMM },
          { gapXMM, gapYMM }
        );
        const slotAspect = computeSlotAspect({ w: slot.w, h: slot.h }, canvasWidth, canvasHeight);

        items.push(
          domain.PrintItem.createFrom({
            imageSrc: activeSrc,
            x: rect.xMM,
            y: rect.yMM,
            w: rect.wMM,
            h: rect.hMM,
            filter: slot.filter || "none",
            brightness: slot.brightness ?? 100,
            contrast: slot.contrast ?? 100,
            saturation: slot.saturation ?? 100,
            slotAspect,
            zoom: slot.zoom || 1,
            dragX: slot.dragX || 0,
            dragY: slot.dragY || 0,
            cornerRadiusMM: collageRadius * scaleXPxToMM,
            borderWidthMM: collageStrokeWidth * scaleXPxToMM,
            borderColor: collageStrokeColor,
            bgColor: slot.bgColor || "",
            flipX: slot.flipX,
            flipY: slot.flipY,
            rotation: slot.rotation,
          })
        );
      }
    }
    return { items, cutLines, composition: undefined };
  }, [
    collageTemplate, collageMargin, collageGap, collageRadius, collageStrokeWidth,
    collageStrokeColor, collageShowCutLines, collageShowEndCutLine, imageWidthMM,
    imageHeightMM, gapMM, actualCopies, paperWidth, paperHeight, grid, mode, slots,
    canvasWidth, canvasHeight,
  ]);

  const buildSingleItems = useCallback(async (): Promise<BuiltItems | null> => {
    const items: domain.PrintItem[] = [];
    const stage = stageRef.current;
    if (!stage) {
      toast.error("تعذر الوصول إلى محتوى الكانفاس");
      return null;
    }

    const exportDpi = printDpi || 300;
    const printPixelW = Math.round((imageWidthMM / 25.4) * exportDpi);
    const printPixelH = Math.round((imageHeightMM / 25.4) * exportDpi);
    try {
      assertExportablePixels(printPixelW, printPixelH);
    } catch (e) {
      if (e instanceof CanvasTooLargeError) {
        toast.error(
          `أبعاد الطباعة كبيرة جداً (${printPixelW}×${printPixelH} بكسل ≈ ${(printPixelW * printPixelH / 1e6).toFixed(1)} ميجابكسل) — الحد الأقصى 50 ميجابكسل. قلّل DPI أو مقاس الورقة.`
        );
        return null;
      }
      throw e;
    }

    const singleCompRes = buildSingleComposition({
      elements,
      canvasWidth,
      canvasHeight,
      canvasWidthMM: imageWidthMM,
      canvasHeightMM: imageHeightMM,
      backgroundColor: backgroundColor || previewWhite(),
    });

    const isSimpleRaster = singleCompRes.eligible && !!singleCompRes.composition;
    const comp = singleCompRes.composition;
    let singleDataUrl = "";
    if (!isSimpleRaster) {
      try {
        const targetPixelRatio = stage.width() > 0 ? printPixelW / stage.width() : 1;
        const captured = await captureStageDataUrl(
          stage,
          targetPixelRatio,
          "image/png"
        );
        singleDataUrl = captured || "";
      } catch (err) {
        console.error("Single composition capture failed:", err);
        toast.error("فشل تجهيز الصورة للطباعة: " + String(err));
        return null;
      }
    }

    const rawCutLines = printShowCutLines
      ? calculatePrintCutLines({
        mode,
        actualCopies,
        imageWidthMM,
        imageHeightMM,
        gapMM,
        paperWidth,
        paperHeight,
        showEndCutLine: printShowEndCutLine !== false,
        cutLineStyle: printCutLineStyle ?? "dashed",
        grid,
      })
      : [];

    const cutLines: domain.CutLine[] = rawCutLines.map((l) => ({
      x1: l.x1,
      y1: l.y1,
      x2: l.x2,
      y2: l.y2,
    }));

    for (let i = 0; i < actualCopies; i++) {
      const block = computeBlockPosition(i, grid);

      if (isSimpleRaster && comp) {
        const itemWidthMM = imageWidthMM;
        const itemHeightMM = imageHeightMM;
        const scaleX = itemWidthMM / comp.canvasWidthPx;
        const scaleY = itemHeightMM / comp.canvasHeightPx;

        for (const compItem of comp.items) {
          items.push(
            domain.PrintItem.createFrom({
              imageSrc: compItem.imageSrc,
              x: block.xMM + compItem.x * scaleX,
              y: block.yMM + compItem.y * scaleY,
              w: compItem.w * scaleX,
              h: compItem.h * scaleY,
              filter: compItem.filter,
              brightness: compItem.brightness,
              contrast: compItem.contrast,
              saturation: compItem.saturation,
              slotAspect: compItem.w / Math.max(1, compItem.h),
              zoom: 1,
              dragX: 0,
              dragY: 0,
              cornerRadiusMM: (compItem.cornerRadius / comp.canvasWidthPx) * itemWidthMM,
              borderWidthMM: 0,
              borderColor: "#000000",
              bgColor: compItem.bgColor || "",
              flipX: compItem.flipX,
              flipY: compItem.flipY,
              rotation: compItem.rotation,
            })
          );
        }
      } else {
        items.push(
          domain.PrintItem.createFrom({
            imageSrc: singleDataUrl,
            x: block.xMM,
            y: block.yMM,
            w: imageWidthMM,
            h: imageHeightMM,
            filter: "none",
            brightness: 100,
            contrast: 100,
            saturation: 100,
            slotAspect: imageWidthMM / imageHeightMM,
            zoom: 1,
            dragX: 0,
            dragY: 0,
            cornerRadiusMM: 0,
            borderWidthMM: 0,
            borderColor: "#000000",
            bgColor: "",
            flipX: false,
            flipY: false,
            rotation: 0,
          })
        );
      }
    }
    return { items, cutLines, composition: undefined };
  }, [
    stageRef, printDpi, imageWidthMM, imageHeightMM, gapMM, actualCopies,
    paperWidth, paperHeight, printShowCutLines, printShowEndCutLine,
    printCutLineStyle, grid, mode, elements, canvasWidth, canvasHeight,
    backgroundColor,
  ]);

  /** عرض حوار الطباعة عبر iframe مخفي — ينتظر فك ترميز الصورة قبل الطباعة */
  const showPrintResult = useCallback((result: domain.PrintResult) => {
    setIsExporting(false);
    if (!result.success) {
      toast.error("فشل التصدير: " + (result.error || "خطأ غير معروف"));
      return;
    }

    if (result.htmlDoc) {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(result.htmlDoc);
        doc.close();
        if (doc.title) {
          doc.title = "";
        }

        let removeTimer: ReturnType<typeof setTimeout> | undefined;
        const removeIframe = () => {
          if (removeTimer) {
            clearTimeout(removeTimer);
            removeTimer = undefined;
          }
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        };

        let hasPrinted = false;
        const triggerPrint = () => {
          if (hasPrinted) return;
          hasPrinted = true;
          try {
            iframe.contentWindow?.addEventListener("afterprint", removeIframe, { once: true });
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error("Browser print error:", e);
            if (result.filePath && typeof PrintNative === "function") {
              PrintNative(result.filePath).catch(console.error);
            }
          } finally {
            removeTimer = setTimeout(removeIframe, 60000);
          }
        };

        const img = doc.querySelector("img");
        if (img) {
          let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
          const runPrint = () => {
            if (fallbackTimer) {
              clearTimeout(fallbackTimer);
              fallbackTimer = undefined;
            }
            if (img.decode) {
              img.decode().then(triggerPrint).catch(triggerPrint);
            } else {
              triggerPrint();
            }
          };
          if (img.complete && img.naturalWidth > 0) {
            runPrint();
          } else {
            img.onload = runPrint;
            img.onerror = () => {
              if (fallbackTimer) {
                clearTimeout(fallbackTimer);
                fallbackTimer = undefined;
              }
              triggerPrint();
            };
            fallbackTimer = setTimeout(runPrint, 10000);
          }
        } else {
          triggerPrint();
        }
      } else {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        if (result.filePath && typeof PrintNative === "function") {
          PrintNative(result.filePath).catch(console.error);
        }
      }
    } else if (result.filePath && typeof PrintNative === "function") {
      PrintNative(result.filePath).catch(console.error);
    }

    toast.success("تم إرسال الورقة إلى الطباعة بنجاح");
  }, []);

  const handlePrint = useCallback(async (
    colorSpace: "sRGB" | "CMYK",
    previewImageSrc: string,
    effectiveMarginMM: number,
    onDone: () => void
  ) => {
    if (isExporting || !previewImageSrc) return;
    setIsExporting(true);
    try {
      const buildResult = mode === "collage" ? await buildItems() : await buildSingleItems();
      if (!buildResult) {
        setIsExporting(false);
        return;
      }

      const overflowItem = buildResult.items.find(
        (it) => it.w <= 0 || it.h <= 0 || it.w > paperWidth + 0.1 || it.h > paperHeight + 0.1
      );
      if (overflowItem) {
        const msg =
          mode === "collage"
            ? `لا يمكن التصدير: بعض خلايا الكولاج تتجاوز حدود الورقة (${paperWidth}×${paperHeight} مم). اختر ورقة أكبر أو صغّر الخلايا في المحرر الحر.`
            : `لا يمكن التصدير: الصورة أكبر من مساحة الطباعة (${paperWidth}×${paperHeight} مم). اختر ورقة أكبر أو عدّل الإعدادات.`;
        toast.error(msg);
        setIsExporting(false);
        return;
      }

      const result = await ExportPrintSheet(domain.PrintRequest.createFrom({
        paperWidthMM: paperWidth,
        paperHeightMM: paperHeight,
        marginMM: effectiveMarginMM,
        gapMM: gapMM,
        dpi: printDpi || 300,
        backgroundColor: backgroundColor || previewWhite(),
        showCutLines: mode === "collage" ? collageShowCutLines : printShowCutLines,
        cutLineStyle: printCutLineStyle ?? "dashed",
        colorSpace: colorSpace,
        exportFormat: colorSpace === "CMYK" ? "tiff" : "jpeg",
        orientation: printOrientation || "portrait",
        cutLines: buildResult.cutLines,
        items: buildResult.items,
        composition: buildResult.composition,
      }));

      showPrintResult(result);
      onDone();
    } catch (err) {
      toast.error("حدث خطأ أثناء توليد ورقة الطباعة: " + String(err));
    } finally {
      setIsExporting(false);
    }
  }, [
    isExporting, mode, buildItems, buildSingleItems, paperWidth, paperHeight,
    gapMM, printDpi, backgroundColor, collageShowCutLines, printShowCutLines,
    printCutLineStyle, printOrientation, showPrintResult,
  ]);

  // مزامنة مؤشر Enter مع أحدث المعاملات — داخل الـ hook نفسه
  useEffect(() => {
    handlePrintRef.current = () => {
      const inv = printInvocationRef.current;
      if (inv) {
        void handlePrint(inv.colorSpace, inv.previewImageSrc, inv.effectiveMarginMM, inv.onDone);
      }
    };
  });

  return {
    isExporting,
    setIsExporting,
    handlePrintRef,
    handlePrint,
    setPrintInvocation,
  };
}
