import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor-store";
import { DEFAULT_PRINT_SETTINGS } from "@/lib/store/slices/print-slice";
import { useStageRef } from "@/lib/stage-context";
import { usePrintLayout } from "@/hooks/use-print-layout";
import { cn } from "@/lib/utils";
import { Printer, ZoomIn, ZoomOut, Loader2, Plus, Minus, LayoutGrid, Rows, Columns, Scissors } from "lucide-react";
import { SheetPreview } from "./print/print-preview";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ExportPrintSheet, PrintNative } from "../../../wailsjs/go/handlers/PrintHandler";
import { SaveImageFromBase64 } from "../../../wailsjs/go/main/App";
import { domain } from "../../../wailsjs/go/models";
import { captureStageDataUrl } from "@/lib/konva-export-utils";

import { useShallow } from "zustand/react/shallow";

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
  })));
  const [zoom, setZoom] = useState(1);
  const [colorSpace, setColorSpace] = useState<"sRGB" | "CMYK">("sRGB");
  const [previewImageSrc, setPreviewImageSrc] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  // آخر هامش غير صفري — لاستعادته عند إطفاء «بدون هوامش» بدل الـ 5mm الثابتة
  const [lastNonZeroMargin, setLastNonZeroMargin] = useState<number>(() =>
    printSettings.marginMM > 0 ? printSettings.marginMM : DEFAULT_PRINT_SETTINGS.marginMM
  );
  const handlePrintRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (open) {
      // إلغاء تحديد أي عنصر نشط لتجنب ظهور مقابض التحكم (Transformer) في المعاينة أو الطباعة
      useEditorStore.getState().selectElement(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
      // صفّر المعاينة فور القفل — queueMicrotask كان يسمح للالتقاط المتأخر بالكتابة بعده
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewImageSrc("");
    }
  }, [open, stageRef, elements, slots, backgroundColor, mode, canvasWidth, printSettings]);

  const {
    imageWidthMM,
    imageHeightMM,
    gapMM,
    actualCopies,
    cols,
    rows,
    availableWidthMM,
    availableHeightMM,
    effectiveMarginMM,
    dpi,
    paperWidth,
    paperHeight,
  } = usePrintLayout({
    template,
    printSettings,
    canvasWidth,
    canvasHeight,
    mode,
  });

  const buildCollageItems = () => {
    const items: domain.PrintItem[] = [];
    const cutLines: domain.CutLine[] = [];
    const hasPhysical = collageTemplate?.physicalLayout;
    const marginPx = hasPhysical ? 0 : collageMargin;
    const gapPx = hasPhysical ? 0 : collageGap;
    const scalePxToMM = imageWidthMM / canvasWidth;
    const availWMM = imageWidthMM - 2 * (marginPx * scalePxToMM);
    const availHMM = imageHeightMM - 2 * (marginPx * scalePxToMM);
    const gridWidth = cols * imageWidthMM + Math.max(0, cols - 1) * gapMM;
    const actualRows = Math.ceil(actualCopies / cols);
    const gridHeight = actualRows * imageHeightMM + Math.max(0, actualRows - 1) * gapMM;
    const offsetX = effectiveMarginMM + Math.max(0, availableWidthMM - gridWidth) / 2;
    const offsetY = effectiveMarginMM + Math.max(0, availableHeightMM - gridHeight) / 2;

    for (let i = 0; i < actualCopies; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const blockXMM = offsetX + col * (imageWidthMM + gapMM);
      const blockYMM = offsetY + row * (imageHeightMM + gapMM);

      if (printSettings.showCutLines && actualCopies > 1) {
        if (i < cols) {
          const cx = blockXMM - gapMM / 2;
          if (cx > effectiveMarginMM && cx < paperWidth - effectiveMarginMM) {
            cutLines.push({ x1: cx, y1: effectiveMarginMM, x2: cx, y2: paperHeight - effectiveMarginMM });
          }
        }
        if (col === 0 && row > 0) {
          const cy = blockYMM - gapMM / 2;
          if (cy > effectiveMarginMM && cy < paperHeight - effectiveMarginMM) {
            cutLines.push({ x1: effectiveMarginMM, y1: cy, x2: paperWidth - effectiveMarginMM, y2: cy });
          }
        }
      }

      for (const slot of slots) {
        if (!slot.imageSrc) continue;
        const slotW_MM = slot.w * availWMM - (gapPx * scalePxToMM);
        const slotH_MM = slot.h * availHMM - (gapPx * scalePxToMM);
        const slotX_MM = blockXMM + (marginPx * scalePxToMM) + slot.x * availWMM + (gapPx * scalePxToMM) / 2;
        const slotY_MM = blockYMM + (marginPx * scalePxToMM) + slot.y * availHMM + (gapPx * scalePxToMM) / 2;
        const slotAspect = (slot.w * canvasWidth) / (slot.h * canvasHeight);

        items.push(domain.PrintItem.createFrom({
          imageSrc: slot.imageSrc,
          x: slotX_MM, y: slotY_MM, w: slotW_MM, h: slotH_MM,
          filter: slot.filter || "none",
          brightness: slot.brightness ?? 100,
          contrast: slot.contrast ?? 100,
          saturation: slot.saturation ?? 100,
          slotAspect, zoom: slot.zoom || 1,
          dragX: slot.dragX || 0, dragY: slot.dragY || 0,
          cornerRadiusMM: collageRadius * scalePxToMM,
          borderWidthMM: collageStrokeWidth * scalePxToMM,
          borderColor: collageStrokeColor,
          flipX: slot.flipX, flipY: slot.flipY, rotation: slot.rotation,
        }));
      }
    }
    return { items, cutLines };
  };

  const buildSingleItems = async () => {
    const items: domain.PrintItem[] = [];
    const cutLines: domain.CutLine[] = [];
    const stage = stageRef.current;
    if (!stage) {
      toast.error("تعذر الوصول إلى محتوى الكانفاس");
      return null;
    }

    const exportDpi = printSettings.dpi || 300;
    const dpiRatio = exportDpi / 300;
    // النسبة ثابتة تحت أي تكبير: stage.width() = displayW = scaleX × canvasWidth،
    // فيخرج الناتج دائماً = canvasWidth × dpiRatio بكسل (ناتج بمقياس فعلي واحد).
    const targetPixelRatio = (canvasWidth / stage.width()) * dpiRatio;

    let canvasDataUrl: string | null = null;
    try {
      const TIMEOUT_MS = 30000;
      canvasDataUrl = await Promise.race([
        captureStageDataUrl(stage, targetPixelRatio, "image/jpeg", 0.95),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Canvas capture timed out")), TIMEOUT_MS)),
      ]);
    } catch {
      canvasDataUrl = null;
    }

    if (!canvasDataUrl) {
      toast.error("تعذر التقاط الكانفاس");
      return null;
    }

    const localPath = await SaveImageFromBase64(canvasDataUrl);
    if (!localPath || !localPath.startsWith("/local-image/")) {
      toast.error("تعذر حفظ الصورة مؤقتاً");
      return null;
    }

    const gridWidth = cols * imageWidthMM + Math.max(0, cols - 1) * gapMM;
    const actualRows = Math.ceil(actualCopies / cols);
    const gridHeight = actualRows * imageHeightMM + Math.max(0, actualRows - 1) * gapMM;
    const offsetX = effectiveMarginMM + Math.max(0, availableWidthMM - gridWidth) / 2;
    const offsetY = effectiveMarginMM + Math.max(0, availableHeightMM - gridHeight) / 2;

    for (let i = 0; i < actualCopies; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      items.push(domain.PrintItem.createFrom({
        imageSrc: localPath,
        x: offsetX + col * (imageWidthMM + gapMM),
        y: offsetY + row * (imageHeightMM + gapMM),
        w: imageWidthMM, h: imageHeightMM,
        filter: "none", brightness: 100, contrast: 100, saturation: 100,
      }));
    }

    if (printSettings.showCutLines && actualCopies > 1) {
      // خطوط القص على نفس الأصل المتمركز للعناصر (offsetX/offsetY) لا على الهامش
      for (let c = 1; c < cols; c++) {
        const x = offsetX + c * (imageWidthMM + gapMM) - gapMM / 2;
        if (x > effectiveMarginMM && x < paperWidth - effectiveMarginMM) {
          cutLines.push({ x1: x, y1: effectiveMarginMM, x2: x, y2: paperHeight - effectiveMarginMM });
        }
      }
      for (let r = 1; r < actualRows; r++) {
        const y = offsetY + r * (imageHeightMM + gapMM) - gapMM / 2;
        if (y > effectiveMarginMM && y < paperHeight - effectiveMarginMM) {
          cutLines.push({ x1: effectiveMarginMM, y1: y, x2: paperWidth - effectiveMarginMM, y2: y });
        }
      }
    }
    return { items, cutLines };
  };

  const handlePrintResult = (result: any) => {
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

        // إزالة الـ iframe عند انتهاء الطباعة فعلاً (afterprint) بدل مهلة ثانية واحدة —
        // إزالته مبكراً تجعل نافذة الطباعة تفتح صفحة فارغة في بعض المتصفحات.
        const removeIframe = () => {
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
            // مهلة أمان فقط (بعض السياقات لا تطلق afterprint)
            setTimeout(removeIframe, 60000);
          }
        };

        const img = doc.querySelector("img");
        if (img) {
          if (img.complete) {
            triggerPrint();
          } else {
            img.onload = triggerPrint;
            img.onerror = triggerPrint;
            setTimeout(triggerPrint, 500);
          }
        } else {
          triggerPrint();
        }
      }
    } else if (result.filePath && typeof PrintNative === "function") {
      PrintNative(result.filePath).catch(console.error);
    }

    toast.success("تم فتح نافذة الطباعة بنجاح");
    onOpenChange(false);
  };

  const handlePrint = async () => {
    setIsExporting(true);
    try {
      const buildResult = mode === "collage" ? buildCollageItems() : await buildSingleItems();
      if (!buildResult) {
        setIsExporting(false);
        return;
      }

      const result = await ExportPrintSheet(domain.PrintRequest.createFrom({
        paperWidthMM: paperWidth,
        paperHeightMM: paperHeight,
        dpi: printSettings.dpi,
        backgroundColor: backgroundColor || "#FFFFFF",
        showCutLines: printSettings.showCutLines && actualCopies > 1,
        colorSpace: colorSpace,
        exportFormat: colorSpace === "CMYK" ? "tiff" : "png",
        orientation: printSettings.orientation || "portrait",
        cutLines: buildResult.cutLines,
        items: buildResult.items,
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
  // Add a 0.5mm tolerance for floating point conversions (px to mm) to avoid false positive overflow warnings
  const isOverflowing = spaceUsedPercent > 101 || imageWidthMM > availableWidthMM + 0.5 || imageHeightMM > availableHeightMM + 0.5;

  const scaleFactor = Math.min(1.4, 420 / Math.max(paperHeight, 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[800px] h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-border/60 bg-background rounded-2xl shadow-2xl" dir="rtl">
        <DialogHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                  إعدادات الطباعة
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground/80 mt-0.5">
                  اضبط خيارات الورق وتوزيع الصور بدقة للتصدير النهائي
                </DialogDescription>
              </div>
            </div>
            
            {/* Color Space & Borderless Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => setColorSpace("sRGB")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                    colorSpace === "sRGB" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  sRGB (شاشات)
                </button>
                <button
                  type="button"
                  onClick={() => setColorSpace("CMYK")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                    colorSpace === "CMYK" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  CMYK (مطابع)
                </button>
              </div>

              <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
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
                <Label htmlFor="borderless-mode" className="text-xs cursor-pointer select-none">
                  طباعة بدون هوامش (ملء الورقة)
                </Label>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4 flex flex-col h-full">

            {/* 🧩 شريط توزيع النسخ: عدد النسخ، نمط التكرار، المسافة، خطوط القص */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pb-3 select-none">
              {/* عدد النسخ في الورقة */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg border border-border/40 px-2.5 py-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">نسخ/ورقة</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 rounded-md cursor-pointer"
                    disabled={(printSettings.repeatMode ?? "all") !== "all" || (printSettings.copiesPerSheet ?? 1) <= 1}
                    onClick={() => setPrintSettings({ copiesPerSheet: Math.max(1, (printSettings.copiesPerSheet ?? 1) - 1) })}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs font-mono font-bold w-7 text-center">
                    {(printSettings.repeatMode ?? "all") === "all" ? (printSettings.copiesPerSheet ?? 1) : "—"}
                  </span>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 rounded-md cursor-pointer"
                    disabled={(printSettings.repeatMode ?? "all") !== "all" || (printSettings.copiesPerSheet ?? 1) >= 48}
                    onClick={() => setPrintSettings({ copiesPerSheet: Math.min(48, (printSettings.copiesPerSheet ?? 1) + 1) })}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* نمط التكرار */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg border border-border/40 px-2.5 py-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">التكرار</span>
                <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-md">
                  {([
                    { id: "all", icon: LayoutGrid, label: "تعبئة تلقائية" },
                    { id: "row", icon: Rows, label: "صف واحد" },
                    { id: "column", icon: Columns, label: "عمود واحد" },
                  ] as const).map(({ id, icon: Icon, label }) => (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setPrintSettings({ repeatMode: id })}
                          className={cn(
                            "h-6 w-6 rounded-sm flex items-center justify-center transition-all cursor-pointer",
                            (printSettings.repeatMode ?? "all") === id
                              ? "bg-background text-primary shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          aria-label={label}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[11px]">{label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* المسافة بين النسخ */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg border border-border/40 px-2.5 py-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">المسافة (مم)</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 rounded-md cursor-pointer"
                    disabled={(printSettings.gapMM ?? 2) <= 0}
                    onClick={() => setPrintSettings({ gapMM: Math.max(0, (printSettings.gapMM ?? 2) - 1) })}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs font-mono font-bold w-7 text-center">{printSettings.gapMM ?? 2}</span>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 rounded-md cursor-pointer"
                    disabled={(printSettings.gapMM ?? 2) >= 20}
                    onClick={() => setPrintSettings({ gapMM: Math.min(20, (printSettings.gapMM ?? 2) + 1) })}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* خطوط القص */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg border border-border/40 px-2.5 py-1.5">
                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                  <Scissors className="w-3 h-3" />
                  خطوط القص
                </span>
                <Switch
                  id="print-cut-lines"
                  checked={printSettings.showCutLines}
                  onCheckedChange={(checked) => setPrintSettings({ showCutLines: checked })}
                />
              </div>
            </div>

            <div className="border border-border/50 rounded-xl overflow-hidden bg-muted/10 dark:bg-slate-950/30 flex flex-col h-full min-h-[400px] shadow-inner">
              <div className="flex items-center justify-between p-3 border-b border-border/40 bg-card select-none">
                <span className="text-xs font-bold flex items-center gap-2 text-foreground/90">
                  <span className={cn("w-2 h-2 rounded-full", isOverflowing ? "bg-red-500 animate-ping" : "bg-emerald-500")} />
                  معاينة الورقة المطبوعة
                  {isOverflowing && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[8.5px] font-bold">
                      تجاوز المساحة المتاحة
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1.5 bg-muted/50 p-0.5 rounded-lg border border-border/30">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="h-7 w-7 p-0 cursor-pointer hover:bg-background">
                        <ZoomOut className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">تصغير المعاينة</TooltipContent>
                  </Tooltip>
                  <span className="text-[10px] w-12 text-center font-mono font-bold select-none text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="h-7 w-7 p-0 cursor-pointer hover:bg-background">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">تكبير المعاينة</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div 
                className="flex-1 overflow-auto p-6 flex items-center justify-center select-none workspace-grid border-t border-border/40"
              >
                <div
                  className="bg-white rounded-xs relative border border-slate-200/50 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]"
                  style={{
                    width: paperWidth * scaleFactor * zoom,
                    height: paperHeight * scaleFactor * zoom,
                  }}
                >
                  {/* إطار الهامش التوضيحي (Margin Guides) */}
                  <div
                    className={cn(
                      "absolute border border-dashed pointer-events-none transition-colors",
                      isOverflowing ? "border-red-400/60" : "border-slate-300"
                    )}
                    style={{
                      left: effectiveMarginMM * scaleFactor * zoom,
                      top: effectiveMarginMM * scaleFactor * zoom,
                      right: effectiveMarginMM * scaleFactor * zoom,
                      bottom: effectiveMarginMM * scaleFactor * zoom,
                    }}
                  />

                  {/* منطقة الطباعة */}
                  <div
                    className="absolute"
                    style={{
                      left: effectiveMarginMM * scaleFactor * zoom,
                      top: effectiveMarginMM * scaleFactor * zoom,
                      right: effectiveMarginMM * scaleFactor * zoom,
                      bottom: effectiveMarginMM * scaleFactor * zoom,
                    }}
                  >
                    <SheetPreview
                      cols={cols}
                      rows={rows}
                      count={actualCopies}
                      imageWidthMM={imageWidthMM}
                      imageHeightMM={imageHeightMM}
                      gapMM={gapMM}
                      zoom={zoom}
                      showCutLines={printSettings.showCutLines}
                      mode={mode}
                      backgroundColor={backgroundColor}
                      previewImageSrc={previewImageSrc}
                      marginMM={effectiveMarginMM}
                      paperWidthMM={paperWidth}
                      paperHeightMM={paperHeight}
                      slots={slots}
                      collageGap={collageGap}
                      collageMargin={collageMargin}
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

        <DialogFooter className="border-t border-border/40 pt-4 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting} className="cursor-pointer">
            إلغاء
          </Button>
          <Button 
            onClick={handlePrint} 
            className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all duration-300 shadow-md shadow-indigo-500/10 active:scale-98 cursor-pointer" 
            disabled={isExporting || !previewImageSrc}
          >
            {isExporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري التصدير...</>
            ) : (
              <><Printer className="w-4 h-4" /> تصدير وعرض</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
