import { useState, useEffect, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAPER_SIZES } from "@/lib/templates/constants";
import { captureStageDataUrl } from "@/lib/konva-export-utils";
import { assertExportablePixels, CanvasTooLargeError } from "@/lib/export/export-limits";
import { calculatePrintCutLines } from "@/lib/cut-lines-utils";
import { computeBlockPosition, computeSheetGrid, computeSlotAspect, computeSlotRectMM } from "@/lib/print-layout-math";
import { buildSingleComposition } from "@/lib/single-print-composition";
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
    printSettings.marginMM > 0 ? printSettings.marginMM : DEFAULT_PRINT_SETTINGS.marginMM
  );
  const handlePrintRef = useRef<() => void>(() => {});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsExporting(false);
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

  const buildItems = async () => {
    const items: domain.PrintItem[] = [];
    const hasPhysical = Boolean(collageTemplate?.physicalLayout);
    const marginPx = hasPhysical ? 0 : collageMargin;
    const gapPx = hasPhysical ? 0 : collageGap;
    const scalePxToMM = imageWidthMM / canvasWidth;
    const marginMM = marginPx * scalePxToMM;
    const gapMMSlot = gapPx * scalePxToMM;
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

    const shouldShowCut = printSettings.showCutLines || collageShowCutLines;
    const rawCutLines = shouldShowCut
      ? calculatePrintCutLines({
          mode,
          cols,
          rows,
          actualCopies,
          imageWidthMM,
          imageHeightMM,
          gapMM,
          effectiveMarginMM,
          availableWidthMM,
          availableHeightMM,
          paperWidth,
          paperHeight,
          showEndCutLine: printSettings.showEndCutLine !== false,
          slots,
          collageMargin,
          collageGap,
          canvasWidth,
          canvasHeight,
          hasPhysical,
        })
      : [];

    const cutLines: domain.CutLine[] = rawCutLines.map((l) => ({
      x1: l.x1,
      y1: l.y1,
      x2: l.x2,
      y2: l.y2,
    }));

    const firstFilledSlot = slots.find((s) => s.imageSrc);

    for (let i = 0; i < actualCopies; i++) {
      const block = computeBlockPosition(i, grid);

      for (const slot of slots) {
        const activeSrc = slot.imageSrc || firstFilledSlot?.imageSrc;
        if (!activeSrc) continue;
        const rect = computeSlotRectMM(
          block,
          { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
          { widthMM: imageWidthMM, heightMM: imageHeightMM },
          { marginXMM: marginMM, marginYMM: marginMM },
          { gapXMM: gapMMSlot, gapYMM: gapMMSlot }
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
            cornerRadiusMM: collageRadius * scalePxToMM,
            borderWidthMM: collageStrokeWidth * scalePxToMM,
            borderColor: collageStrokeColor,
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

    // حارس الذاكرة: اللوحة المطبوعة بكسل = مقاس الطباعة × DPI — تجاوز 50MP
    // كان يُعلّق الطباعة بصمت في مسار الالتقاط أو يرهق Go في مسار التركيب
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

    // مسار العناصر المباشر (بدون لقطة كانفس): يرسل الصور الأصلية + هندستها،
    // فيرسم Go الكانفاس مرة واحدة بدقة الطباعة بدل الترميز المزدوج.
    // أي عنصر خارج دلالات الرسم المدعومة (نص/شكل/دوران/ظلال/شفافية...) يقع في مسار الالتقاط.
    const composition = buildSingleComposition({
      elements,
      canvasWidth,
      canvasHeight,
      canvasWidthMM: imageWidthMM,
      canvasHeightMM: imageHeightMM,
      backgroundColor,
    });

    let localPath: string | null = null;
    if (!composition.eligible) {
      const dpiRatio = exportDpi / 300;
      const targetPixelRatio = (canvasWidth / stage.width()) * dpiRatio;

      let canvasDataUrl: string | null = null;
      try {
        const TIMEOUT_MS = 30000;
        canvasDataUrl = await Promise.race([
          // جودة 0.9 بدلاً من 0.95: أسرع في الترميز وحجم أصغر يمر عبر IPC —
          // الفرق البصري غير ملحوظ عند دقة الطباعة 300 DPI
          captureStageDataUrl(stage, targetPixelRatio, "image/jpeg", 0.9),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Canvas capture timed out")), TIMEOUT_MS)),
        ]);
      } catch {
        canvasDataUrl = null;
      }

      if (!canvasDataUrl) {
        toast.error("تعذر التقاط الكانفاس");
        return null;
      }

      localPath = await SaveImageFromBase64(canvasDataUrl);
      if (!localPath || !localPath.startsWith("/local-image/")) {
        toast.error("تعذر حفظ الصورة مؤقتاً");
        return null;
      }
    }

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

    for (let i = 0; i < actualCopies; i++) {
      const block = computeBlockPosition(i, grid);
      items.push(
        domain.PrintItem.createFrom({
          // في مسار التركيب تُرسل الخلايا بلا صورة — Go يرسم الكانفاس المركّب فيها
          imageSrc: localPath || "",
          x: block.xMM,
          y: block.yMM,
          w: imageWidthMM,
          h: imageHeightMM,
          filter: "none",
          brightness: 100,
          contrast: 100,
          saturation: 100,
        })
      );
    }

    const shouldShowCut = mode === "collage" ? (printSettings.showCutLines || collageShowCutLines) : printSettings.showCutLines;
    const rawCutLines = shouldShowCut
      ? calculatePrintCutLines({
          mode,
          cols,
          rows,
          actualCopies,
          imageWidthMM,
          imageHeightMM,
          gapMM,
          effectiveMarginMM,
          availableWidthMM,
          availableHeightMM,
          paperWidth,
          paperHeight,
          showEndCutLine: printSettings.showEndCutLine !== false,
        })
      : [];

    const cutLines: domain.CutLine[] = rawCutLines.map((l) => ({
      x1: l.x1,
      y1: l.y1,
      x2: l.x2,
      y2: l.y2,
    }));

    return { items, cutLines, composition: composition.eligible ? composition.composition : undefined };
  };

  const handlePrintResult = (result: any) => {
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
            setTimeout(removeIframe, 2000);
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

      console.log("[PrintDialog] handlePrint → cutLines:", buildResult.cutLines.length, "showCutLines:", printSettings.showCutLines, "collageShowCutLines:", collageShowCutLines, "mode:", mode);
      console.log("[PrintDialog] handlePrint → cutLines data:", JSON.stringify(buildResult.cutLines));

      const result = await ExportPrintSheet(domain.PrintRequest.createFrom({
        paperWidthMM: paperWidth,
        paperHeightMM: paperHeight,
        marginMM: effectiveMarginMM,
        gapMM: gapMM,
        dpi: printSettings.dpi || 300,
        backgroundColor: backgroundColor || "#FFFFFF",
        showCutLines: printSettings.showCutLines || collageShowCutLines,
        colorSpace: colorSpace,
        // JPEG للطباعة الملونة (sRGB): ترميز أسرع 3-5× من PNG في الخدمة وملف أصغر
        // يخفف حمولة نافذة الطباعة — الجودة 95 عند 300 DPI كافية تماماً للصور
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[880px] h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-border/60 bg-background rounded-2xl shadow-2xl p-0 gap-0" dir="rtl">
        {/* رأس النافذة المباشر والنظيف */}
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <DialogTitle className="text-base font-bold tracking-tight text-foreground">
              إعدادات الطباعة
            </DialogTitle>

            {/* الإعدادات الأساسية في الرأس */}
            <div className="flex items-center gap-2.5 flex-wrap">
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
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                    colorSpace === "sRGB" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  sRGB (شاشات)
                </button>
                <button
                  type="button"
                  onClick={() => setColorSpace("CMYK")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                    colorSpace === "CMYK" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  CMYK (مطابع)
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
                  id="print-cut-lines-header"
                  checked={mode === "collage" ? collageShowCutLines : printSettings.showCutLines}
                  onCheckedChange={(checked) => {
                    setPrintSettings({ showCutLines: checked });
                    useEditorStore.getState().setCollageShowCutLines(checked);
                  }}
                />
                <Label htmlFor="print-cut-lines-header" className="text-xs font-semibold cursor-pointer select-none flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-primary/80" />
                  خطوط القص
                </Label>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* جسم النافذة الرئيسي */}
        <div className="flex-1 overflow-hidden p-3.5 flex flex-col gap-3 min-h-0">
          {/* شريط الأدوات يتم إظهاره فقط في وضع الطباعة الفردية Single Mode (لأن الكولاج يحدد الخلايا تلقائياً) */}
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
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs font-mono font-bold w-6 text-center text-foreground">
                    {(printSettings.repeatMode ?? "all") === "all" ? (printSettings.copiesPerSheet ?? 1) : "—"}
                  </span>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                    disabled={(printSettings.repeatMode ?? "all") !== "all" || (printSettings.copiesPerSheet ?? 1) >= 48}
                    onClick={() => setPrintSettings({ copiesPerSheet: Math.min(48, (printSettings.copiesPerSheet ?? 1) + 1) })}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* نمط التكرار والتعبئة */}
              <div className="flex items-center justify-between bg-card rounded-lg border border-border/50 px-2.5 py-1.5 shadow-2xs">
                <span className="text-xs font-semibold text-muted-foreground">التكرار</span>
                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border/30">
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
                            "h-6 w-6 rounded-xs flex items-center justify-center transition-all cursor-pointer",
                            (printSettings.repeatMode ?? "all") === id
                              ? "bg-background text-primary shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          aria-label={label}
                        >
                          <Icon className="w-3.5 h-3.5" />
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
                    <Minus className="w-3 h-3" />
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
                    <Plus className="w-3 h-3" />
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
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <span className="text-[10px] w-10 text-center font-mono font-semibold text-slate-300">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="h-5 w-5 p-0 text-slate-300 hover:text-white hover:bg-slate-700/50 cursor-pointer">
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* لوحة الورقة البيضاء الممركزة داخل مساحة العمل */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center select-none workspace-grid relative">
              <div
                className="bg-white rounded-xs relative border border-slate-300/60 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-200"
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
                    cols={cols}
                    rows={rows}
                    count={actualCopies}
                    imageWidthMM={imageWidthMM}
                    imageHeightMM={imageHeightMM}
                    gapMM={gapMM}
                    zoom={zoom}
                    showCutLines={mode === "collage" ? collageShowCutLines : printSettings.showCutLines}
                    showEndCutLine={mode === "collage" ? collageShowEndCutLine !== false : printSettings.showEndCutLine !== false}
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

        {/* ذيل النافذة البسيط والمباشر */}
        <DialogFooter className="px-5 py-3 border-t border-border/40 bg-card flex items-center justify-end gap-2.5 shrink-0">
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
            className="h-8 px-5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all duration-200 cursor-pointer rounded-lg" 
            disabled={isExporting || !previewImageSrc}
          >
            {isExporting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري التصدير...</>
            ) : (
              <><Printer className="w-3.5 h-3.5" /> تصدير وعرض</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
