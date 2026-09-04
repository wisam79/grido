import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogCloseButton,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor-store";
import { DEFAULT_PRINT_SETTINGS } from "@/lib/store/slices/print-slice";
import { useStageRef } from "@/lib/canvas/stage-context";
import { usePrintLayout } from "@/hooks/use-print-layout";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/huge-icon";
import {
  Printer,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
} from "@phosphor-icons/react";
import { SheetPreview } from "../print/print-preview";
import { useShallow } from "zustand/react/shallow";
import { PrintSettingsToolbar } from "../print/print-settings-toolbar";
import { usePrintExport } from "../print/use-print-export";

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
  // آخر هامش غير صفري — لاستعادته عند إطفاء «بدون هوامش» بدل الـ 5mm الثابتة
  const [lastNonZeroMargin, setLastNonZeroMargin] = useState<number>(() =>
    printSettings.marginMM > 0 ? printSettings.marginMM : (DEFAULT_PRINT_SETTINGS.marginMM || 5)
  );

  const layout = usePrintLayout({
    template,
    printSettings,
    canvasWidth,
    canvasHeight,
    mode,
    collageTemplate,
  });
  const {
    imageWidthMM,
    imageHeightMM,
    gapMM,
    actualCopies,
    availableWidthMM,
    availableHeightMM,
    effectiveMarginMM,
    grid,
    paperWidth,
    paperHeight,
  } = layout;

  // 🧭 محرك بناء عناصر الورقة والتصدير (كان مضمّناً هنا)
  const exporter = usePrintExport({
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
    printDpi: printSettings.dpi,
    printShowCutLines: printSettings.showCutLines,
    printShowEndCutLine: printSettings.showEndCutLine,
    printCutLineStyle: printSettings.cutLineStyle || "dashed",
    printOrientation: printSettings.orientation,
  });
  const { isExporting } = exporter;

  useEffect(() => {
    exporter.setIsExporting(false);
    if (open) {
      // إلغاء تحديد أي عنصر نشط لتجنب ظهور مقابض التحكم (Transformer) في المعاينة أو الطباعة.
      useEditorStore.getState().selectElement(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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
        exporter.handlePrintRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isExporting, previewImageSrc, onOpenChange, exporter]);

  // مزامنة مؤشر الطباعة Enter مع أحدث حالة (المزامنة الداخلية داخل الـ hook)
  exporter.setPrintInvocation({
    colorSpace,
    previewImageSrc,
    effectiveMarginMM,
    onDone: () => onOpenChange(false),
  });

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
      <DialogContent showCloseButton={false} className="w-[95vw] sm:max-w-[880px] h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-border bg-card rounded-2xl shadow-xl p-0 gap-0 fluent-specular" dir="rtl">
        {/* رأس النافذة */}
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground truncate">
                <Printer className="text-primary w-6 h-6 shrink-0" weight="duotone" />
                <span>إعدادات الطباعة</span>
              </DialogTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                اختر مقاس الورقة ونمط الألوان، ثم اضبط الهوامش وخطوط القص
              </p>
            </div>
            <DialogCloseButton />
          </div>
        </DialogHeader>

        {/* جسم النافذة الرئيسي */}
        <div className="flex-1 overflow-hidden p-3.5 flex flex-col gap-3 min-h-0">
          {/* 🧭 صف الإعدادات وشريط الوضع المفرد (كان مضمّناً هنا) */}
          <PrintSettingsToolbar
            mode={mode}
            printSettings={printSettings}
            setPrintSettings={setPrintSettings}
            colorSpace={colorSpace}
            onColorSpaceChange={setColorSpace}
            collageShowCutLines={collageShowCutLines}
            onCutLinesChange={(checked) => {
              setPrintSettings({ showCutLines: checked });
              useEditorStore.getState().setCollageShowCutLines(checked);
            }}
            actualCopies={actualCopies}
            grid={grid}
            lastNonZeroMargin={lastNonZeroMargin}
            onMarginlessToggle={(checked) => {
              if (checked && printSettings.marginMM > 0) {
                setLastNonZeroMargin(printSettings.marginMM);
              }
              setPrintSettings({ marginMM: checked ? 0 : lastNonZeroMargin });
            }}
          />

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
                    <MagnifyingGlassMinus className="w-3 h-3 shrink-0" />
                  </Button>
                  <span className="text-[10px] w-10 text-center font-mono font-semibold text-slate-300">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="h-5 w-5 p-0 text-slate-300 hover:text-white hover:bg-slate-700/50 cursor-pointer">
                    <MagnifyingGlassPlus className="w-3 h-3 shrink-0" />
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
            onClick={() => exporter.handlePrint(colorSpace, previewImageSrc, effectiveMarginMM, () => onOpenChange(false))}
            className="h-8 px-5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all duration-150 cursor-pointer rounded-md shadow-xs"
            disabled={isExporting || !previewImageSrc}
          >
            {isExporting ? (
              <><Spinner className="w-3.5 h-3.5" size={14} /> <span>جاري التصدير ...</span></>
            ) : (
              <><Printer className="w-3.5 h-3.5 shrink-0" weight="bold" /> <span>تصدير وعرض</span></>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
