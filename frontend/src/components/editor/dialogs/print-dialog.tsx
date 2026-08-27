import { useState, useEffect, useRef } from "react";
import { previewWhite } from "@/lib/canvas/canvas-colors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor-store";
import { DEFAULT_PRINT_SETTINGS } from "@/lib/store/slices/print-slice";
import { useStageRef } from "@/lib/canvas/stage-context";
import { usePrintLayout } from "@/hooks/use-print-layout";
import { cn } from "@/lib/utils";
import { Spinner, HugeIcon } from "@/components/ui/huge-icon";
import {
  PrinterIcon,
  ZoomInIcon,
  ZoomOutIcon,
  Add01Icon,
  MinusSignIcon,
  Grid02Icon,
  Scissor01Icon,
  Target01Icon,
  Maximize01Icon,
  TableColumnsSplitIcon,
  TableRowsSplitIcon,
} from "@hugeicons/core-free-icons";
import { SheetPreview } from "../print/print-preview";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ExportPrintSheet, PrintNative } from "../../../../wailsjs/go/handlers/PrintHandler";
import { domain } from "../../../../wailsjs/go/models";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAPER_SIZES } from "@/lib/templates/constants";
import { captureStageDataUrl } from "@/lib/canvas/konva-export-utils";
import { assertExportablePixels, CanvasTooLargeError } from "@/lib/export/export-limits";
import { calculatePrintCutLines } from "@/lib/print/cut-lines-utils";
import { computeBlockPosition, computeSlotAspect, computeSlotRectMM } from "@/lib/print/print-layout-math";
import { buildSingleComposition } from "@/lib/print/single-print-composition";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintDialog({ open, onOpenChange }: PrintDialogProps) {
  const stageRef = useStageRef();
  const {
    template,
    canvasWidth,
    canvasHeight,
    printSettings,
    setPrintSettings,
    elements,
    slots,
    mode,
    backgroundColor,
    collageTemplate,
    collageMargin,
    collageGap,
    collageRadius,
    collageStrokeWidth,
    collageStrokeColor,
    collageShowCutLines,
    collageShowEndCutLine,
  } = useEditorStore(useShallow((state) => ({
    template: state.template,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    printSettings: state.printSettings,
    setPrintSettings: state.setPrintSettings,
    elements: state.elements,
    slots: state.slots,
    mode: state.mode,
    backgroundColor: state.backgroundColor,
    collageTemplate: state.collageTemplate,
    collageMargin: state.collageMargin,
    collageGap: state.collageGap,
    collageRadius: state.collageRadius,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
    collageShowCutLines: state.collageShowCutLines,
    collageShowEndCutLine: state.collageShowEndCutLine,
  })));
  const [zoom, setZoom] = useState(1);
  const [colorSpace, setColorSpace] = useState<"sRGB" | "CMYK">("sRGB");
  const [previewImageSrc, setPreviewImageSrc] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  // آخر هامش غير صفري — لاستعادته عند إطفاء «بدون هوامش» بدل الـ 5mm الثابتة
  const [lastNonZeroMargin, setLastNonZeroMargin] = useState<number>(() =>
    printSettings.marginMM > 0 ? printSettings.marginMM : (DEFAULT_PRINT_SETTINGS.marginMM || 5)
  );
  const handlePrintRef = useRef<() => void>(() => { });

  useEffect(() => {
    if (open) {
      // إلغاء تحديد أي عنصر نشط لتجنب ظهور مقابض التحكم (Transformer) في المعاينة أو الطباعة.
      useEditorStore.getState().selectElement(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isExporting) return; // منع الهروب أثناء توليد الورقة
        onOpenChange(false);
      } else if (e.key === "Enter" && !isExporting && previewImageSrc) {
        // لا نطلق الطباعة إذا كان التركيز داخل عنصر إدخال — Enter له معناه الخاص هناك
        const t = e.target as HTMLElement | null;
        if (t?.closest?.('input, select, textarea, button, [role="combobox"]')) return;
        e.preventDefault();
        handlePrintRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isExporting, previewImageSrc, onOpenChange]);

  useEffect(() => {
    if (open && mode === "collage") {
      queueMicrotask(() => {
        setPreviewImageSrc("collage-active");
      });
      return;
    }
    if (open && stageRef.current && mode === "single") {
      // علم الإلغاء: الحوار قد يُقفل خلال مهلة الـ 50ms — ننهي المهمة بصمت حينها
      let cancelled = false;
      const timer = setTimeout(() => {
        if (cancelled) return;
        const stage = stageRef.current;
        if (!stage) return;
        const transformers = stage.find('Transformer');
        const gridLayers = stage.find('.grid-layer');
        const columnsLayers = stage.find('.columns-layer');
        try {
          const targetWidth = 400;
          const pRatio = Math.min(1, targetWidth / stage.width());

          transformers.forEach((tr: any) => tr.hide());
          gridLayers.forEach((gl: any) => gl.hide());
          columnsLayers.forEach((cl: any) => cl.hide());
          stage.batchDraw();

          const previewUrl = stage.toDataURL({
            pixelRatio: pRatio,
            mimeType: "image/jpeg",
            quality: 0.8,
          });

          if (cancelled) return;
          setPreviewImageSrc(previewUrl);
        } catch (err) {
          console.error("Failed to generate print preview image:", err);
        } finally {
          transformers.forEach((tr: any) => tr.show());
          gridLayers.forEach((gl: any) => gl.show());
          columnsLayers.forEach((cl: any) => cl.show());
          stage.batchDraw();
        }
      }, 50);
      return () => { cancelled = true; clearTimeout(timer); };
    } else if (!open) {
      // صفّر المعاينة فور القفل
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewImageSrc("");
    }
  }, [open, stageRef, elements, slots, backgroundColor, mode, canvasWidth, printSettings]);

  const {
    imageWidthMM,
    imageHeightMM,
    gapMM,
    actualCopies,
    availableWidthMM,
    availableHeightMM,
    effectiveMarginMM,
    dpi,
    grid,
    paperWidth,
    paperHeight,
  } = usePrintLayout({
    template,
    printSettings,
    canvasWidth,
    canvasHeight,
    mode,
    collageTemplate,
  });

  const buildItems = async () => {
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

    const shouldShowCut = collageShowCutLines;
    const rawCutLines = shouldShowCut
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
  };

  const buildSingleItems = async () => {
    const items: domain.PrintItem[] = [];
    const stage = stageRef.current;
    if (!stage) {
      toast.error("تعذر الوصول إلى محتوى الكانفاس");
      return null;
    }

    const exportDpi = printSettings.dpi || 300;
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

    const rawCutLines = printSettings.showCutLines
      ? calculatePrintCutLines({
        mode,
        actualCopies,
        imageWidthMM,
        imageHeightMM,
        gapMM,
        paperWidth,
        paperHeight,
        showEndCutLine: printSettings.showEndCutLine !== false,
        cutLineStyle: printSettings.cutLineStyle || "dashed",
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
  };

  const handlePrintResult = (result: domain.PrintResult) => {
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

    onOpenChange(false);
    toast.success("تم إرسال الورقة إلى الطباعة بنجاح");
  };

  const handlePrint = async () => {
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
        dpi: printSettings.dpi || 300,
        backgroundColor: backgroundColor || previewWhite(),
        showCutLines: mode === "collage" ? collageShowCutLines : printSettings.showCutLines,
        cutLineStyle: printSettings.cutLineStyle || "dashed",
        colorSpace: colorSpace,
        exportFormat: colorSpace === "CMYK" ? "tiff" : "jpeg",
        orientation: printSettings.orientation || "portrait",
        cutLines: buildResult.cutLines,
        items: buildResult.items,
        composition: buildResult.composition,
      }));

      handlePrintResult(result);
    } catch (err) {
      toast.error("حدث خطأ أثناء توليد ورقة الطباعة: " + String(err));
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    handlePrintRef.current = handlePrint;
  });

  const spaceUsedPercent = Math.round(
    ((actualCopies * imageWidthMM * imageHeightMM) /
      (availableWidthMM * availableHeightMM)) * 100
  );
  const isOverflowing = spaceUsedPercent > 101 || imageWidthMM > availableWidthMM + 0.5 || imageHeightMM > availableHeightMM + 0.5;

  const scaleFactor = Math.min(1.4, 420 / Math.max(paperHeight, 1));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isExporting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-[880px] h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-border bg-card rounded-2xl shadow-xl p-0 gap-0 fluent-specular" dir="rtl">
        {/* رأس النافذة */}
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
            <HugeIcon icon={PrinterIcon} size={24} className="text-primary" />
            <span>إعدادات الطباعة</span>
          </DialogTitle>
          <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
            اختر مقاس الورقة ونمط الألوان، ثم اضبط الهوامش وخطوط القص
          </p>
        </DialogHeader>

        {/* جسم النافذة الرئيسي */}
        <div className="flex-1 overflow-hidden p-3.5 flex flex-col gap-3 min-h-0">
          {/* صف الإعدادات الأساسية */}
          <div className="flex items-center gap-2.5 flex-wrap select-none shrink-0">
            {/* قائمة اختيارات قياس الورقة */}
            <Select
              value={printSettings.paperId || "a4"}
              onValueChange={(val) => {
                const selected = PAPER_SIZES.find((p) => p.id === val);
                if (selected) {
                  setPrintSettings({
                    paperId: selected.id,
                    paperWidthMM: selected.widthMM,
                    paperHeightMM: selected.heightMM,
                  });
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs font-semibold w-[150px] bg-background border-border/50 shadow-2xs focus:ring-primary/20">
                <SelectValue placeholder="مقاس الورقة" />
              </SelectTrigger>
              <SelectContent className="z-[150]" dir="rtl">
                {PAPER_SIZES.map((size) => (
                  <SelectItem key={size.id} value={size.id} className="text-xs font-semibold cursor-pointer">
                    {size.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* وضع الألوان */}
            <div className="flex items-center gap-0.5 bg-muted/60 p-1 rounded-lg border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => setColorSpace("sRGB")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                  colorSpace === "sRGB" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                sRGB
              </button>
              <button
                type="button"
                onClick={() => setColorSpace("CMYK")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                  colorSpace === "CMYK" ? "bg-primary text-primary-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                CMYK
              </button>
            </div>

            {/* محاذاة الشبكة (أعلى اليسار للقص / توسيط) */}
            <div className="flex items-center gap-0.5 bg-muted/60 p-1 rounded-lg border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => setPrintSettings({ gridAlign: "top-left" })}
                title="محاذاة زاوية الورقة (أعلى اليسار / للقص السريع)"
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                  (printSettings.gridAlign || "top-left") === "top-left"
                    ? "bg-background text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HugeIcon icon={Maximize01Icon} size={14} className="text-primary" />
                <span>أعلى اليسار</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintSettings({ gridAlign: "center" })}
                title="توسيط الشبكة في منتصف الورقة"
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                  printSettings.gridAlign === "center"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HugeIcon icon={Target01Icon} size={14} />
                <span>توسيط</span>
              </button>
            </div>

            {/* طباعة بدون هوامش */}
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
              <Switch
                id="borderless-mode"
                checked={printSettings.marginMM === 0}
                onCheckedChange={(checked) => {
                  if (checked && printSettings.marginMM > 0) {
                    setLastNonZeroMargin(printSettings.marginMM);
                  }
                  setPrintSettings({ marginMM: checked ? 0 : lastNonZeroMargin });
                }}
              />
              <Label htmlFor="borderless-mode" className="text-xs font-semibold cursor-pointer select-none">
                بدون هوامش
              </Label>
            </div>

            {/* خطوط القص */}
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
              <Switch
                id="print-cut-lines"
                checked={mode === "collage" ? collageShowCutLines : printSettings.showCutLines}
                onCheckedChange={(checked) => {
                  setPrintSettings({ showCutLines: checked });
                  useEditorStore.getState().setCollageShowCutLines(checked);
                }}
              />
              <Label htmlFor="print-cut-lines" className="text-xs font-semibold cursor-pointer select-none flex items-center gap-1">
                <HugeIcon icon={Scissor01Icon} size={14} className="text-primary/80" />
                <span>خطوط القص</span>
              </Label>
              {(mode === "collage" ? collageShowCutLines : printSettings.showCutLines) && (
                <select
                  aria-label="نمط خطوط القص"
                  value={printSettings.cutLineStyle || "dashed"}
                  onChange={(e) => setPrintSettings({ cutLineStyle: e.target.value as any })}
                  className="bg-background text-[11px] font-semibold border border-border/50 rounded-md px-1.5 py-0.5 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="dashed">متقطع</option>
                  <option value="dotted">منقط</option>
                  <option value="solid">متصل</option>
                </select>
              )}
            </div>
          </div>

          {/* شريط الأدوات يتم إظهاره فقط في وضع الطباعة الفردية Single Mode */}
          {mode !== "collage" && (
            <div className="grid grid-cols-3 gap-2 select-none shrink-0">
              {/* عدد النسخ في الورقة */}
              <div className="flex items-center justify-between bg-card rounded-lg border border-border/50 px-2.5 py-1.5 shadow-2xs">
                <span className="text-xs font-semibold text-muted-foreground">نسخ/ورقة</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                    disabled={(printSettings.repeatMode ?? "all") !== "all" || (printSettings.copiesPerSheet ?? 1) <= 1}
                    onClick={() => setPrintSettings({ copiesPerSheet: Math.max(1, (printSettings.copiesPerSheet ?? 1) - 1) })}
                  >
                    <HugeIcon icon={MinusSignIcon} size={12} />
                  </Button>
                  <span className="text-xs font-mono font-bold w-6 text-center text-foreground">
                    {actualCopies}
                  </span>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                    disabled={(printSettings.repeatMode ?? "all") !== "all" || (printSettings.copiesPerSheet ?? 1) >= (grid.safeCols * 10)}
                    onClick={() => setPrintSettings({ copiesPerSheet: (printSettings.copiesPerSheet ?? 1) + 1 })}
                  >
                    <HugeIcon icon={Add01Icon} size={12} />
                  </Button>
                </div>
              </div>

              {/* نمط التكرار */}
              <div className="flex items-center justify-between bg-card rounded-lg border border-border/50 px-2.5 py-1.5 shadow-2xs">
                <span className="text-xs font-semibold text-muted-foreground">التكرار</span>
                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border/30">
                  {([
                    { id: "all", icon: Grid02Icon, label: "تعبئة تلقائية" },
                    { id: "row", icon: TableRowsSplitIcon, label: "صف واحد" },
                    { id: "column", icon: TableColumnsSplitIcon, label: "عمود واحد" },
                  ] as const).map(({ id, icon: Icon, label }) => (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setPrintSettings({ repeatMode: id })}
                          className={cn(
                            "h-6 w-6 rounded-xs flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                            (printSettings.repeatMode ?? "all") === id
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          aria-label={label}
                        >
                          <HugeIcon icon={Icon} size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[11px] font-semibold">{label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* المسافة الفاصلة بين النسخ */}
              <div className="flex items-center justify-between bg-card rounded-lg border border-border/50 px-2.5 py-1.5 shadow-2xs">
                <span className="text-xs font-semibold text-muted-foreground">المسافة (مم)</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                    disabled={(printSettings.gapMM ?? 2) <= 0}
                    onClick={() => setPrintSettings({ gapMM: Math.max(0, (printSettings.gapMM ?? 2) - 1) })}
                  >
                    <HugeIcon icon={MinusSignIcon} size={12} />
                  </Button>
                  <span className="text-xs font-mono font-bold w-6 text-center text-foreground">
                    {printSettings.gapMM ?? 2}
                  </span>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                    disabled={(printSettings.gapMM ?? 2) >= 20}
                    onClick={() => setPrintSettings({ gapMM: Math.min(20, (printSettings.gapMM ?? 2) + 1) })}
                  >
                    <HugeIcon icon={Add01Icon} size={12} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* مساحة المعاينة التفاعلية المباشرة */}
          <div className="border border-border/50 rounded-xl overflow-hidden bg-slate-900/95 flex flex-col flex-1 shadow-inner relative">
            {/* شريط عنوان وتكبير المعاينة */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-md select-none z-10">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", isOverflowing ? "bg-red-500 animate-ping" : "bg-emerald-400")} />
                معاينة الورقة المطبوعة
              </span>

              {/* أدوات التحكم بالـ Zoom */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(1)}
                  className="h-6 px-2 text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer font-medium"
                >
                  إعادة ضبط
                </Button>
                <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-md border border-slate-700/80">
                  <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="h-5 w-5 p-0 text-slate-300 hover:text-white hover:bg-slate-700/50 cursor-pointer">
                    <HugeIcon icon={ZoomOutIcon} size={12} />
                  </Button>
                  <span className="text-[10px] w-10 text-center font-mono font-semibold text-slate-300">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="h-5 w-5 p-0 text-slate-300 hover:text-white hover:bg-slate-700/50 cursor-pointer">
                    <HugeIcon icon={ZoomInIcon} size={12} />
                  </Button>
                </div>
              </div>
            </div>

            {/* لوحة الورقة البيضاء الممركزة داخل مساحة العمل */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center select-none workspace-grid relative">
              <div
                className="bg-white rounded-xs relative border border-slate-300/60 shadow-md shadow-black/20 transition-all duration-200"
                style={{
                  width: paperWidth * scaleFactor * zoom,
                  height: paperHeight * scaleFactor * zoom,
                }}
              >
                {/* حدود الهامش الداخلي */}
                <div
                  className={cn("absolute border border-dashed pointer-events-none transition-colors", isOverflowing ? "border-red-400/80" : "border-slate-300/60")}
                  style={{
                    left: effectiveMarginMM * scaleFactor * zoom,
                    top: effectiveMarginMM * scaleFactor * zoom,
                    right: effectiveMarginMM * scaleFactor * zoom,
                    bottom: effectiveMarginMM * scaleFactor * zoom,
                  }}
                />
                <div className="absolute inset-0 overflow-hidden rounded-xs">
                  <SheetPreview
                    grid={grid}
                    count={actualCopies}
                    imageWidthMM={imageWidthMM}
                    imageHeightMM={imageHeightMM}
                    gapMM={gapMM}
                    zoom={zoom}
                    showCutLines={mode === "collage" ? collageShowCutLines : printSettings.showCutLines}
                    showEndCutLine={mode === "collage" ? collageShowEndCutLine !== false : printSettings.showEndCutLine !== false}
                    cutLineStyle={printSettings.cutLineStyle || "dashed"}
                    mode={mode}
                    backgroundColor={backgroundColor}
                    previewImageSrc={previewImageSrc}
                    paperWidthMM={paperWidth}
                    paperHeightMM={paperHeight}
                    slots={slots}
                    collageGap={collageGap}
                    collageMargin={collageMargin}
                    collageRadius={collageRadius}
                    collageStrokeWidth={collageStrokeWidth}
                    collageStrokeColor={collageStrokeColor}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    hasPhysical={!!collageTemplate?.physicalLayout}
                    scaleFactor={scaleFactor}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ذيل النافذة البسيط والمباشر */}
        <DialogFooter className="px-5 py-3 border-t border-border/40 bg-card flex items-center justify-end gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            className="h-8 px-4 text-xs font-semibold cursor-pointer"
          >
            إلغاء
          </Button>
          <Button
            onClick={handlePrint}
            className="h-8 px-5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all duration-150 cursor-pointer rounded-md shadow-xs"
            disabled={isExporting || !previewImageSrc}
          >
            {isExporting ? (
              <><Spinner className="w-3.5 h-3.5" size={14} /> <span>جاري التصدير ...</span></>
            ) : (
              <><HugeIcon icon={PrinterIcon} size={14} /> <span>تصدير وعرض</span></>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
