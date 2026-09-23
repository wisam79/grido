import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor-store";
import { useStageRef } from "@/lib/canvas/stage-context";
import { previewWhite } from "@/lib/canvas/canvas-colors";
import { ExportPrintSheet, PrintNative } from "../../../../wailsjs/go/handlers/PrintHandler";
import { SetTaskbarProgress } from "../../../../wailsjs/go/main/App";
import { domain } from "../../../../wailsjs/go/models";
import { captureStageBlob } from "@/lib/canvas/konva-export-utils";
import { assertExportablePixels, CanvasTooLargeError } from "@/lib/export/export-limits";
import { calculatePrintCutLines } from "@/lib/print/cut-lines-utils";
import { computeBlockPosition, computeSlotAspect, computeSlotRectMM } from "@/lib/print/print-layout-math";
import { buildSingleComposition } from "@/lib/print/single-print-composition";
import type { usePrintLayout } from "@/hooks/use-print-layout";
import type { PrintSettings } from "@/lib/store/types";
import { wailsIsDesktop } from "@/lib/wails-env";

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
 * 🚀 W-B: رفع صورة الطباعة كتيار ثنائي إلى /api/upload-print-image وإرجاع
 * مسار /local-image/ — يقطع مرور DataURL عملاقة (25-60MB نص) عبر جسر
 * Wails IPC. الفشل يرمي ليقع التعامل معه في المستدعي.
 */
async function uploadPrintImage(blob: Blob): Promise<string> {
  if (typeof window === "undefined" || !window.location?.origin) {
    throw new Error("upload unavailable: no window origin");
  }
  const resp = await fetch(`${window.location.origin}/api/upload-print-image`, {
    method: "POST",
    headers: { "Content-Type": blob.type || "image/png" },
    body: blob,
  });
  if (!resp.ok) {
    throw new Error(`upload failed: HTTP ${resp.status}`);
  }
  const resJson = (await resp.json().catch(() => null)) as { status?: string; imageSrc?: string } | null;
  if (resJson?.status !== "success" || !resJson.imageSrc) {
    throw new Error("upload failed: invalid server response");
  }
  return resJson.imageSrc;
}

/**
 * 🧭 محرك تصدير الطباعة: بناء عناصر الورقة (كولاج أو مفرد) بكل خصائص
 * الخانات والقص والحدود، ثم توليد الورقة عبر Go وعرض حوار الطباعة عبر
 * iframe مخفي مع img.decode() وafterprint — كانت هذه الكتل مضمّنة في Dialog.
 */
export function usePrintExport(ctx: PrintExportContext) {
  const stageRef = useStageRef();
  const [isExporting, setIsExporting] = useState(false);
  const isExportingRef = useRef(false);

  // Sync ref when state is updated externally (e.g., when dialog closes)
  useEffect(() => {
    if (!isExporting) {
      isExportingRef.current = false;
    }
  }, [isExporting]);

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
      backgroundGradientColor2: useEditorStore.getState().backgroundGradientColor2,
    });

    const isSimpleRaster = singleCompRes.eligible && !!singleCompRes.composition;
    const comp = singleCompRes.composition;
    let singleImageSrc = "";
    if (!isSimpleRaster) {
      try {
        const targetPixelRatio = stage.width() > 0 ? printPixelW / stage.width() : 1;
        const capturedBlob = await captureStageBlob(
          stage,
          targetPixelRatio,
          "image/png"
        );
        if (!capturedBlob) {
          throw new Error("stage capture returned no blob");
        }
        // 🚀 W-B: رفع ثنائي مباشر بدل DataURL عبر IPC — يوفر 33% من الحجم
        // وحلقة فك ترميز كاملة في Go، ويُرجع مسار /local-image/ المُخدَم محلياً
        singleImageSrc = await uploadPrintImage(capturedBlob);
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
            imageSrc: singleImageSrc,
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

  /**
   * مسار الطباعة الاحتياطي في المتصفح — يُستخدم فقط عند تشغيل التطبيق في بيئة الويب العادية
   */
  const fallbackBrowserPrint = useCallback((result: domain.PrintResult) => {
    if (result.htmlDoc) {
      const win = window as Window & {
        __gridoPrintCleanup?: (() => void) | null;
      };
      // حماية من استدعاءين متتاليين: نظّف أي طباعة سابقة أولاً
      win.__gridoPrintCleanup?.();

      // فك وثيقة الطباعة لاستخراج مسار الصورة فقط — لا نحقن <style> الوثيقة
      // كما هو لأن قواعدها العامة (html/body/*) ستدمّر تنسيق التطبيق الحي،
      // بل نبني قاعدة @page بأبعاد الورقة المعروفة محلياً + الصورة بمقاس inline
      const parsed = new DOMParser().parseFromString(result.htmlDoc, "text/html");
      const imageSrc = parsed.querySelector("img")?.getAttribute("src") ?? "";
      if (!imageSrc) {
        if (result.filePath && typeof PrintNative === "function") {
          PrintNative(result.filePath)
            .then(() => toast.success("تم إرسال الورقة إلى الطباعة الأصلية بنجاح"))
            .catch(console.error);
        }
        return;
      }

      // قاعدة @page في المستند الأعلى هي ما يفرض مقاس الورقة وهوامش الصفر
      // (مؤكد تجريبياً: iframe المخفي يُسقطها فتُطبع على Letter بهوامش المتصفح)
      const styleEl = document.createElement("style");
      styleEl.id = "grido-print-sheet-style";
      styleEl.textContent =
        `@page { margin: 0 !important; size: ${paperWidth}mm ${paperHeight}mm; }\n` +
        `@page :left { margin: 0 !important; }\n` +
        `@page :right { margin: 0 !important; }\n` +
        `@page :first { margin: 0 !important; }\n` +
        `@media print {\n` +
        `  * { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }\n` +
        `  html, body {\n` +
        `    margin: 0 !important;\n` +
        `    padding: 0 !important;\n` +
        `    width: ${paperWidth}mm !important;\n` +
        `    height: ${paperHeight}mm !important;\n` +
        `    overflow: hidden !important;\n` +
        `    background: white !important;\n` +
        `    -webkit-print-color-adjust: exact !important;\n` +
        `    print-color-adjust: exact !important;\n` +
        `  }\n` +
        `  body > *:not(#print-container) { display: none !important; }\n` +
        `  #print-container {\n` +
        `    display: block !important;\n` +
        `    position: absolute !important;\n` +
        `    top: 0 !important;\n` +
        `    left: 0 !important;\n` +
        `    width: ${paperWidth}mm !important;\n` +
        `    height: ${paperHeight}mm !important;\n` +
        `    margin: 0 !important;\n` +
        `    padding: 0 !important;\n` +
        `    overflow: hidden !important;\n` +
        `    background: white !important;\n` +
        `  }\n` +
        `  #print-container img {\n` +
        `    position: absolute !important;\n` +
        `    top: 0 !important;\n` +
        `    left: 0 !important;\n` +
        `    width: ${paperWidth}mm !important;\n` +
        `    height: ${paperHeight}mm !important;\n` +
        `    max-width: none !important;\n` +
        `    max-height: none !important;\n` +
        `    object-fit: fill !important;\n` +
        `    display: block !important;\n` +
        `    margin: 0 !important;\n` +
        `    padding: 0 !important;\n` +
        `    page-break-inside: avoid !important;\n` +
        `    break-inside: avoid !important;\n` +
        `  }\n` +
        `}`;

      const container = document.createElement("div");
      container.id = "print-container";
      container.setAttribute("aria-hidden", "true");

      const img = document.createElement("img");
      img.alt = "";
      img.src = imageSrc;
      // الصورة مولّدة أصلاً بأبعاد الورقة الفيزيائية (بكسل ÷ DPI) — مقاس mm
      // هنا يحفظ النسبة 1:1، ولو اختار المستخدم حوارياً هوامش/ورقاً أكبر
      // فتظهر كهبعخة بيضاء حول الورقة دون تمدد أو اقتصاص
      img.style.width = `${paperWidth}mm`;
      img.style.height = `${paperHeight}mm`;
      img.style.maxWidth = "none";
      img.style.display = "block";
      container.appendChild(img);

      let done = false;
      let safetyTimer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        if (done) return;
        done = true;
        win.__gridoPrintCleanup = null;
        window.removeEventListener("afterprint", cleanup);
        if (safetyTimer) {
          clearTimeout(safetyTimer);
          safetyTimer = undefined;
        }
        styleEl.remove();
        container.remove();
        window.focus();
      };
      win.__gridoPrintCleanup = cleanup;

      try {
        document.head.appendChild(styleEl);
        document.body.appendChild(container);
        // afterprint يُطلق عند إغلاق حوار الطباعة (طباعة أو إلغاء)؛
        // والمؤقت ضمانة استعادة إن لم يُطلق الحدث في WebView2
        window.addEventListener("afterprint", cleanup, { once: true });
        safetyTimer = setTimeout(cleanup, 120_000);
      } catch (e) {
        console.error("Print container injection failed:", e);
        cleanup();
        if (result.filePath && typeof PrintNative === "function") {
          PrintNative(result.filePath)
            .then(() => toast.success("تم إرسال الورقة إلى الطباعة الأصلية بنجاح"))
            .catch(console.error);
        }
        return;
      }

      const triggerPrint = () => {
        try {
          window.print();
          toast.success("تم إرسال الورقة إلى الطباعة بنجاح");
        } catch (e) {
          console.error("Browser print error:", e);
          cleanup();
          if (result.filePath && typeof PrintNative === "function") {
            PrintNative(result.filePath)
              .then(() => toast.success("تم إرسال الورقة إلى الطباعة الأصلية بنجاح"))
              .catch(console.error);
          }
        }
      };

      // 🖼️ الصورة تُخدم من سيرفر Wails المحلي — ننتظر اكتمال فك ترميزها
      // (img.decode + onload/onerror + مهلة 10ث) قبل فتح حوار الطباعة.
      // الصورة داخل #print-container (display:none على الشاشة) والتحميل
      // وفك الترميز يعملان لأي صورة داخل الـ DOM مهما كانت حالتها العرضية.
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
          cleanup();
          toast.error("تعذر تحميل صورة الطباعة في المتصفح، جاري التحويل للطباعة الأصلية ...");
          if (result.filePath && typeof PrintNative === "function") {
            PrintNative(result.filePath)
              .then(() => toast.success("تم إرسال الورقة إلى الطباعة الأصلية بنجاح"))
              .catch(console.error);
          }
        };
        fallbackTimer = setTimeout(runPrint, 10000);
      }
    } else if (result.filePath && typeof PrintNative === "function") {
      PrintNative(result.filePath)
        .then(() => toast.success("تم إرسال الورقة إلى الطباعة الأصلية بنجاح"))
        .catch(console.error);
    }
  }, [paperWidth, paperHeight]);

  /**
   * 🧭 إطلاق حوار الطباعة:
   * - في بيئة سطح المكتب (Wails Desktop): إطلاق معالج طباعة الصور الأصلي لنظام Windows 11 مباشرة
   *   عبر PrintNative (خالٍ من أي روابط localhost، تواريخ، أو هوامش متصفح إضافية).
   * - في المتصفح العادي (Web Dev Mode): استخدام مسار الطباعة الاحتياطي fallbackBrowserPrint.
   */
  const showPrintResult = useCallback((result: domain.PrintResult) => {
    setIsExporting(false);
    if (!result.success) {
      toast.error("فشل التصدير: " + (result.error || "خطأ غير معروف"));
      return;
    }

    if (wailsIsDesktop() && result.filePath && typeof PrintNative === "function") {
      PrintNative(result.filePath)
        .then((res) => {
          if (res && !res.success) {
            toast.error("فشل فتح نافذة طباعة الصور: " + (res.error || "خطأ غير معروف"));
          } else {
            toast.success("تم إرسال الورقة إلى الطباعة الأصلية بنجاح");
          }
        })
        .catch((err) => {
          console.error("PrintNative failed, falling back to browser print:", err);
          fallbackBrowserPrint(result);
        });
      return;
    }

    fallbackBrowserPrint(result);
  }, [fallbackBrowserPrint]);

  const handlePrint = useCallback(async (
    colorSpace: "sRGB" | "CMYK",
    previewImageSrc: string,
    effectiveMarginMM: number,
    onDone: () => void
  ) => {
    if (isExportingRef.current || isExporting) return;
    isExportingRef.current = true;
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

      SetTaskbarProgress(50, "indeterminate").catch(() => {});
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

      if (!result.success) {
        SetTaskbarProgress(100, "error").catch(() => {});
        setTimeout(() => SetTaskbarProgress(0, "none").catch(() => {}), 2000);
        toast.error("فشل التصدير: " + (result.error || "خطأ غير معروف"));
        return;
      }

      SetTaskbarProgress(0, "none").catch(() => {});

      // 1. إغلاق نافذة إعدادات الطباعة أولاً لضمان عدم بقائها عالقة خلف حوار الطباعة
      isExportingRef.current = false;
      setIsExporting(false);
      onDone();

      // ضمان استعادة تفاعل الصفحة فوراً بإزالة أي قيد inline بدل فرض "auto"
      if (typeof document !== "undefined" && document.body) {
        document.body.style.pointerEvents = "";
      }

      // 2. إطلاق حوار الطباعة بعد اكتمال أنيميشن إغلاق Radix (200ms) حتى لا يتجمد
      // الـ overlay شبه المُغلق عند حجب خيط الـ UI بواسطة window.print()
      setTimeout(() => {
        showPrintResult(result);
      }, 450);
    } catch (err) {
      SetTaskbarProgress(100, "error").catch(() => {});
      setTimeout(() => SetTaskbarProgress(0, "none").catch(() => {}), 2000);
      toast.error("حدث خطأ أثناء توليد ورقة الطباعة: " + String(err));
    } finally {
      SetTaskbarProgress(0, "none").catch(() => {});
      isExportingRef.current = false;
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
