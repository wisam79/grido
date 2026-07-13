import { useState, useEffect } from "react";
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
import { useStageRef } from "@/lib/stage-context";
import { usePrintLayout } from "@/hooks/use-print-layout";
import { cn } from "@/lib/utils";
import { Printer, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { SheetPreview } from "./print/print-preview";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExportPrintSheet } from "../../../wailsjs/go/handlers/PrintHandler";
import { SaveImageFromBase64 } from "../../../wailsjs/go/main/App";
import { domain } from "../../../wailsjs/go/models";

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
  const [previewImageSrc, setPreviewImageSrc] = useState<string>("");

  useEffect(() => {
    if (open) {
      // إلغاء تحديد أي عنصر نشط لتجنب ظهور مقابض التحكم (Transformer) في المعاينة أو الطباعة
      useEditorStore.getState().selectElement(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && stageRef.current) {
      const timer = setTimeout(() => {
        const stage = stageRef.current!;
        const transformers = stage.find('Transformer');
        const gridLayers = stage.find('.grid-layer');
        const columnsLayers = stage.find('.columns-layer');
        try {
          const targetWidth = 400;
          const pRatio = Math.min(1, targetWidth / stage.width());

          // إخفاء الشبكة والأعمدة ومقابض التحكم مؤقتاً قبل التقاط المعاينة والطباعة لكي لا تظهر في المخرج المطبوع
          transformers.forEach((tr: any) => tr.hide());
          gridLayers.forEach((gl: any) => gl.hide());
          columnsLayers.forEach((cl: any) => cl.hide());
          stage.batchDraw();

          const previewUrl = stage.toDataURL({
            pixelRatio: pRatio,
            mimeType: "image/jpeg",
            quality: 0.8,
          });

          const exportDpi = printSettings.dpi || 300;
          const dpiRatio = exportDpi / 300;
          const printUrl = stage.toDataURL({
            pixelRatio: (canvasWidth / stage.width()) * dpiRatio,
            mimeType: "image/png"
          });

          setPreviewImageSrc(previewUrl);
          useEditorStore.getState().setPrintImageSrc(printUrl);
        } catch (err) {
          console.error("Failed to generate print preview image:", err);
        } finally {
          // استعادة الشبكة والأعمدة ومقابض التحكم في جميع الأحوال لضمان عدم اختفائها من المحرر
          transformers.forEach((tr: any) => tr.show());
          gridLayers.forEach((gl: any) => gl.show());
          columnsLayers.forEach((cl: any) => cl.show());
          stage.batchDraw();
        }
      }, 300);
      return () => clearTimeout(timer);
    } else if (!open) {
      setTimeout(() => {
        setPreviewImageSrc("");
      }, 0);
      // مسح صورة الطباعة بعد تأخير بسيط لضمان أن نافذة الطباعة التقطت محتوى الصفحة بالكامل
      const timer = setTimeout(() => {
        useEditorStore.getState().setPrintImageSrc(null);
      }, 1000);
      return () => clearTimeout(timer);
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
  } = usePrintLayout({
    template,
    printSettings,
    canvasWidth,
    canvasHeight,
    mode,
  });

  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = async () => {
    setIsExporting(true);

    try {
      const paperW = printSettings.orientation === "portrait" ? printSettings.paperWidthMM : printSettings.paperHeightMM;
      const paperH = printSettings.orientation === "portrait" ? printSettings.paperHeightMM : printSettings.paperWidthMM;
      const mMM = effectiveMarginMM;

      const items: any[] = [];
      const cutLines: any[] = [];


      if (mode === "collage") {
        // --- 100% Lossless Backend Rendering for Collage ---
        const hasPhysical = collageTemplate?.physicalLayout;
        const marginPx = hasPhysical ? 0 : collageMargin;
        const gapPx = hasPhysical ? 0 : collageGap;
        const radiusPx = collageRadius;
        const borderWPx = collageStrokeWidth;
        const borderColor = collageStrokeColor;

        const scalePxToMM = imageWidthMM / canvasWidth;
        const marginMM_cell = marginPx * scalePxToMM;
        const gapMM_cell = gapPx * scalePxToMM;
        const radiusMM = radiusPx * scalePxToMM;
        const borderWMM = borderWPx * scalePxToMM;

        const availWMM = imageWidthMM - 2 * marginMM_cell;
        const availHMM = imageHeightMM - 2 * marginMM_cell;

        const gridWidth = cols * imageWidthMM + Math.max(0, cols - 1) * gapMM;
        const actualRows = Math.ceil(actualCopies / cols);
        const gridHeight = actualRows * imageHeightMM + Math.max(0, actualRows - 1) * gapMM;
        const offsetX = mMM + Math.max(0, availableWidthMM - gridWidth) / 2;
        const offsetY = mMM + Math.max(0, availableHeightMM - gridHeight) / 2;

        // Loop over the requested copies on the paper
        for (let i = 0; i < actualCopies; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const blockXMM = offsetX + col * (imageWidthMM + gapMM);
          const blockYMM = offsetY + row * (imageHeightMM + gapMM);

          // Build cut lines for the main blocks if requested
          if (printSettings.showCutLines && actualCopies > 1) {
            if (i < cols) {
              const cx = blockXMM - gapMM / 2;
              if (cx > mMM && cx < paperW - mMM) {
                 cutLines.push({ x1: cx, y1: mMM, x2: cx, y2: paperH - mMM });
              }
            }
            if (col === 0 && row > 0) {
              const cy = blockYMM - gapMM / 2;
              if (cy > mMM && cy < paperH - mMM) {
                 cutLines.push({ x1: mMM, y1: cy, x2: paperW - mMM, y2: cy });
              }
            }
          }

          // Generate backend print items for each slot inside this block
          for (const slot of slots) {
            if (!slot.imageSrc) continue;

            const imgSize = await new Promise<{ w: number, h: number }>((resolve) => {
              const img = new Image();
              img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
              img.onerror = () => resolve({ w: 100, h: 100 });
              img.src = slot.imageSrc!;
            });

            const slotW_MM = slot.w * availWMM - gapMM_cell;
            const slotH_MM = slot.h * availHMM - gapMM_cell;
            const slotX_MM = blockXMM + marginMM_cell + slot.x * availWMM + gapMM_cell / 2;
            const slotY_MM = blockYMM + marginMM_cell + slot.y * availHMM + gapMM_cell / 2;

            const imgAspect = imgSize.w / imgSize.h;
            const slotAspect = (slot.w * canvasWidth) / (slot.h * canvasHeight);
            
            let sw = imgSize.w;
            let sh = imgSize.h;

            if (imgAspect > slotAspect) {
              sw = imgSize.h * slotAspect;
            } else {
              sh = imgSize.w / slotAspect;
            }

            const zoomVal = slot.zoom || 1;
            const dragXVal = slot.dragX || 0;
            const dragYVal = slot.dragY || 0;

            sw = sw / zoomVal;
            sh = sh / zoomVal;

            const defaultSx = imgAspect > slotAspect ? (imgSize.w - sw) / 2 : 0;
            const defaultSy = imgAspect > slotAspect ? 0 : (imgSize.h - sh) / 2;

            const maxDragX = (imgSize.w - sw) / 2;
            const maxDragY = (imgSize.h - sh) / 2;

            const dragXClamped = Math.max(-maxDragX, Math.min(maxDragX, dragXVal));
            const dragYClamped = Math.max(-maxDragY, Math.min(maxDragY, dragYVal));

            const sx = defaultSx + dragXClamped;
            const sy = defaultSy + dragYClamped;

            items.push({
              imageSrc: slot.imageSrc,
              x: slotX_MM,
              y: slotY_MM,
              w: slotW_MM,
              h: slotH_MM,
              filter: slot.filter || "none",
              brightness: slot.brightness ?? 100,
              contrast: slot.contrast ?? 100,
              saturation: slot.saturation ?? 100,
              cropX: sx,
              cropY: sy,
              cropW: sw,
              cropH: sh,
              cornerRadiusMM: radiusMM,
              borderWidthMM: borderWMM,
              borderColor: borderColor,
            });
          }
        }
      } else {
        // --- Single Mode: Capture Canvas ---
        const stage = stageRef.current;
        if (!stage) {
          toast.error("تعذر الوصول إلى محتوى الكانفاس");
          setIsExporting(false);
          return;
        }

        const transformers = stage.find('Transformer');
        const gridLayers = stage.find('.grid-layer');
        const columnsLayers = stage.find('.columns-layer');
        let canvasDataUrl: string | null = null;

        try {
          transformers.forEach((tr: any) => tr.hide());
          gridLayers.forEach((gl: any) => gl.hide());
          columnsLayers.forEach((cl: any) => cl.hide());
          stage.batchDraw();

          const exportDpi = printSettings.dpi || 300;
          const dpiRatio = exportDpi / 300;
          canvasDataUrl = stage.toDataURL({
            pixelRatio: (canvasWidth / stage.width()) * dpiRatio,
            mimeType: "image/png",
          });
        } finally {
          transformers.forEach((tr: any) => tr.show());
          gridLayers.forEach((gl: any) => gl.show());
          columnsLayers.forEach((cl: any) => cl.show());
          stage.batchDraw();
        }

        if (!canvasDataUrl) {
          toast.error("تعذر التقاط الكانفاس");
          setIsExporting(false);
          return;
        }

        const localPath = await SaveImageFromBase64(canvasDataUrl);
        if (!localPath || !localPath.startsWith("/local-image/")) {
          toast.error("تعذر حفظ الصورة مؤقتاً");
          setIsExporting(false);
          return;
        }

        const gridWidth = cols * imageWidthMM + Math.max(0, cols - 1) * gapMM;
        const actualRows = Math.ceil(actualCopies / cols);
        const gridHeight = actualRows * imageHeightMM + Math.max(0, actualRows - 1) * gapMM;
        const offsetX = mMM + Math.max(0, availableWidthMM - gridWidth) / 2;
        const offsetY = mMM + Math.max(0, availableHeightMM - gridHeight) / 2;

        for (let i = 0; i < actualCopies; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const xMM = offsetX + col * (imageWidthMM + gapMM);
          const yMM = offsetY + row * (imageHeightMM + gapMM);
          items.push({
            imageSrc: localPath,
            x: xMM,
            y: yMM,
            w: imageWidthMM,
            h: imageHeightMM,
            filter: "none",
            brightness: 100,
            contrast: 100,
            saturation: 100,
          });
        }

        if (printSettings.showCutLines && actualCopies > 1) {
          for (let c = 1; c < cols; c++) {
            const x = mMM + c * (imageWidthMM + gapMM) - gapMM / 2;
            cutLines.push({ x1: x, y1: mMM, x2: x, y2: paperH - mMM });
          }
          const actualRows = Math.ceil(actualCopies / cols);
          for (let r = 1; r < actualRows; r++) {
            const y = mMM + r * (imageHeightMM + gapMM) - gapMM / 2;
            cutLines.push({ x1: mMM, y1: y, x2: paperW - mMM, y2: y });
          }
        }
      }

      const result = await ExportPrintSheet(domain.PrintRequest.createFrom({
        paperWidthMM: paperW,
        paperHeightMM: paperH,
        dpi: printSettings.dpi,
        backgroundColor: backgroundColor || "#FFFFFF",
        showCutLines: printSettings.showCutLines && actualCopies > 1,
        cutLines,
        items,
      }));

      if (result.success) {
        if (result.htmlDoc) {
          const iframe = document.createElement("iframe");
          iframe.style.position = "absolute";
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

            setTimeout(() => {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
              setTimeout(() => {
                document.body.removeChild(iframe);
              }, 1000);
            }, 500);
          }
        }
        toast.success("تم توليد ورقة الطباعة بنجاح");
        onOpenChange(false);
      } else {
        toast.error("فشل التصدير: " + (result.error || "خطأ غير معروف"));
      }
    } catch (err: any) {
      toast.error("حدث خطأ أثناء توليد ورقة الطباعة: " + String(err));
    } finally {
      setIsExporting(false);
    }
  };

  const spaceUsedPercent = Math.round(
    ((actualCopies * imageWidthMM * imageHeightMM) /
      (availableWidthMM * availableHeightMM)) * 100
  );
  const isOverflowing = spaceUsedPercent > 100 || imageWidthMM > availableWidthMM || imageHeightMM > availableHeightMM;

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
            
            {/* Borderless Toggle */}
            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
              <Switch 
                id="borderless-mode" 
                checked={printSettings.marginMM === 0}
                onCheckedChange={(checked) => setPrintSettings({ marginMM: checked ? 0 : 5 })}
              />
              <Label htmlFor="borderless-mode" className="text-xs cursor-pointer select-none">
                طباعة بدون هوامش (ملء الورقة)
              </Label>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4 flex flex-col h-full">

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
                  <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="h-7 w-7 p-0 cursor-pointer hover:bg-background">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-[10px] w-12 text-center font-mono font-bold select-none text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="h-7 w-7 p-0 cursor-pointer hover:bg-background">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div 
                className="flex-1 overflow-auto p-6 flex items-center justify-center select-none workspace-grid border-t border-border/40"
              >
                <div
                  className="bg-white rounded-xs relative border border-slate-200/50 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]"
                  style={{
                    width: (printSettings.orientation === "portrait"
                      ? printSettings.paperWidthMM
                      : printSettings.paperHeightMM) * 2 * zoom,
                    height: (printSettings.orientation === "portrait"
                      ? printSettings.paperHeightMM
                      : printSettings.paperWidthMM) * 2 * zoom,
                  }}
                >
                  {/* إطار الهامش التوضيحي (Margin Guides) */}
                  <div
                    className={cn(
                      "absolute border border-dashed pointer-events-none transition-colors",
                      isOverflowing ? "border-red-400/60" : "border-slate-300"
                    )}
                    style={{
                      left: effectiveMarginMM * 2 * zoom,
                      top: effectiveMarginMM * 2 * zoom,
                      right: effectiveMarginMM * 2 * zoom,
                      bottom: effectiveMarginMM * 2 * zoom,
                    }}
                  />

                  {/* منطقة الطباعة */}
                  <div
                    className="absolute"
                    style={{
                      left: effectiveMarginMM * 2 * zoom,
                      top: effectiveMarginMM * 2 * zoom,
                      right: effectiveMarginMM * 2 * zoom,
                      bottom: effectiveMarginMM * 2 * zoom,
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
                      paperWidthMM={printSettings.orientation === "portrait" ? printSettings.paperWidthMM : printSettings.paperHeightMM}
                      paperHeightMM={printSettings.orientation === "portrait" ? printSettings.paperHeightMM : printSettings.paperWidthMM}
                      slots={slots}
                      collageGap={collageGap}
                      collageMargin={collageMargin}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      hasPhysical={!!collageTemplate?.physicalLayout}
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
