import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useEditorStore } from "@/lib/editor-store";
import { PAPER_SIZES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Printer, ZoomIn, ZoomOut, RectangleVertical, RectangleHorizontal, Scissors, Move, Copy, Columns, AlertTriangle, Info, FileSpreadsheet, Layout, Settings, FileText, CheckCircle2, Maximize2 } from "lucide-react";
import { SheetPreview } from "./print/print-preview";
import { toast } from "sonner";
import { SaveImageFromBase64 } from "../../../wailsjs/go/main/App";

import { useShallow } from "zustand/react/shallow";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintDialog({ open, onOpenChange }: PrintDialogProps) {
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
    stageRef,
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
    stageRef: state.stageRef,
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
    if (open && stageRef) {
      const timer = setTimeout(() => {
        try {
          const targetWidth = 400;
          const pRatio = Math.min(1, targetWidth / stageRef.width());
          
          // إخفاء مقابض التحكم (Transformer) مؤقتاً قبل التقاط المعاينة والطباعة
          const transformers = stageRef.find('Transformer');
          transformers.forEach((tr: any) => tr.hide());
          stageRef.batchDraw();

          const previewUrl = stageRef.toDataURL({
            pixelRatio: pRatio,
            mimeType: "image/jpeg",
            quality: 0.8,
          });

          const printUrl = stageRef.toDataURL({
            pixelRatio: 3,
            mimeType: "image/png"
          });

          // استعادة مقابض التحكم بعد الالتقاط
          transformers.forEach((tr: any) => tr.show());
          stageRef.batchDraw();

          setPreviewImageSrc(previewUrl);
          useEditorStore.getState().setPrintImageSrc(printUrl);
        } catch (err) {
          console.error("Failed to generate print preview image:", err);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else if (!open) {
      setPreviewImageSrc("");
      useEditorStore.getState().setPrintImageSrc(null);
    }
  }, [open, stageRef, elements, slots, backgroundColor, mode]);

  // حساب أبعاد الصورة على الورق بالمليمتر
  const dpi = template ? template.dpi : printSettings.dpi;
  const originalImageWidthMM = template ? template.widthMM : Math.round((canvasWidth / dpi) * 25.4);
  const originalImageHeightMM = template ? template.heightMM : Math.round((canvasHeight / dpi) * 25.4);

  // المساحة المتاحة للطباعة
  const availableWidthMM =
    printSettings.orientation === "portrait"
      ? printSettings.paperWidthMM - 2 * printSettings.marginMM
      : printSettings.paperHeightMM - 2 * printSettings.marginMM;
  const availableHeightMM =
    printSettings.orientation === "portrait"
      ? printSettings.paperHeightMM - 2 * printSettings.marginMM
      : printSettings.paperWidthMM - 2 * printSettings.marginMM;

  const gapMM = printSettings.gapMM !== undefined ? printSettings.gapMM : 2;

  // حساب الأبعاد بعد تطبيق الملاءمة إذا كانت مفعلة وكان عدد النسخ 1 في الوضع الحر
  const fitToPage = printSettings.fitToPage !== false;
  const shouldFit = fitToPage && mode === "single" && printSettings.copiesPerSheet === 1;

  let imageWidthMM = originalImageWidthMM;
  let imageHeightMM = originalImageHeightMM;

  if (shouldFit) {
    const scaleX = availableWidthMM / originalImageWidthMM;
    const scaleY = availableHeightMM / originalImageHeightMM;
    const scale = Math.min(scaleX, scaleY);
    imageWidthMM = Math.round(originalImageWidthMM * scale);
    imageHeightMM = Math.round(originalImageHeightMM * scale);
  }

  // عدد الصور المناسب تلقائياً
  const autoCount = useMemo(() => {
    const tempCols = Math.floor(availableWidthMM / (imageWidthMM + gapMM));
    const tempRows = Math.floor(availableHeightMM / (imageHeightMM + gapMM));
    return Math.max(1, tempCols * tempRows);
  }, [availableWidthMM, availableHeightMM, imageWidthMM, imageHeightMM, gapMM]);

  const actualCopies = Math.min(printSettings.copiesPerSheet, autoCount);

  // حماية من القسمة على صفر
  const cols = Math.max(1, Math.floor(availableWidthMM / (imageWidthMM + gapMM)));
  const rows = Math.ceil(actualCopies / Math.max(1, cols));

  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = () => {
    setIsExporting(true);
    try {
      // استدعاء نافذة طباعة النظام مباشرة
      window.print();
      onOpenChange(false);
      toast.success("تم فتح نافذة الطباعة الخاصة بالنظام");
    } catch (err: any) {
      toast.error("حدث خطأ أثناء محاولة تشغيل الطباعة: " + String(err));
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
      <DialogContent className="w-[95vw] sm:max-w-[1400px] h-[90vh] sm:max-h-[1000px] overflow-hidden flex flex-col border border-border/60 bg-background rounded-2xl shadow-2xl" dir="rtl">
        <DialogHeader className="border-b border-border/40 pb-4">
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
        </DialogHeader>

        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 flex-1 overflow-hidden py-4">
            {/* القائمة اليمنى - الإعدادات */}
            <div className="overflow-y-auto pr-2 space-y-4 h-full scrollbar-thin">
              {/* قسم: إعدادات الورقة */}
                <div className="border border-border/40 bg-muted/20 dark:bg-muted/10 rounded-xl p-3.5 space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-1.5 border-b border-border/30 pb-2 mb-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-bold text-foreground/90">إعدادات الورقة</span>
                  </div>

                  {/* حجم الورق */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      حجم الورق
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">اختر مقاس الورقة للطباعة (مثل A4)</TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select
                      value={printSettings.paperId}
                      onValueChange={(v) => {
                        const paper = PAPER_SIZES.find((p) => p.id === v);
                        if (paper) {
                          setPrintSettings({
                            paperId: v,
                            paperWidthMM: paper.widthMM,
                            paperHeightMM: paper.heightMM,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAPER_SIZES.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* الاتجاه */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      الاتجاه
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">تغيير اتجاه الورقة (طولي أو عرضي)</TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["portrait", "landscape"] as const).map((o) => (
                        <button
                          key={o}
                          onClick={() => setPrintSettings({ orientation: o })}
                          className={cn(
                            "py-2 h-9 rounded-md border transition-all flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer",
                            printSettings.orientation === o
                              ? "border-primary bg-primary/10 text-primary shadow-xs"
                              : "border-border/60 bg-card hover:bg-accent text-muted-foreground hover:text-foreground"
                          )}
                          title={o === "portrait" ? "عمودي" : "أفقي"}
                        >
                          {o === "portrait" ? (
                            <>
                              <RectangleVertical className="w-3.5 h-3.5" />
                              <span>عمودي</span>
                            </>
                          ) : (
                            <>
                              <RectangleHorizontal className="w-3.5 h-3.5" />
                              <span>أفقي</span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* الهامش */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        الهامش
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top">المسافة الفارغة حول حواف الورقة بالمليمتر</TooltipContent>
                        </Tooltip>
                      </Label>
                      <span className="font-mono font-bold text-foreground/80">{printSettings.marginMM} مم</span>
                    </div>
                    <Slider
                      value={[printSettings.marginMM]}
                      min={0}
                      max={20}
                      step={0.5}
                      onValueChange={(v) => setPrintSettings({ marginMM: v[0] })}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* ملاءمة حجم الورقة */}
                  {mode === "single" && (
                    <div className="flex items-center justify-between bg-muted/30 dark:bg-muted/15 p-2.5 rounded-xl border border-border/30 animate-in fade-in duration-200">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-muted-foreground/85" />
                        ملاءمة حجم الورقة
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top">تغيير حجم الصورة تلقائياً لتناسب المساحة المتاحة داخل الهوامش</TooltipContent>
                        </Tooltip>
                      </span>
                      <Switch
                        checked={printSettings.fitToPage !== false}
                        onCheckedChange={(c) => {
                          setPrintSettings({
                            fitToPage: c,
                            copiesPerSheet: c ? 1 : printSettings.copiesPerSheet
                          });
                        }}
                        className="scale-90"
                      />
                    </div>
                  )}
                </div>

                {/* قسم: خيارات التوزيع والطباعة */}
                <div className="border border-border/40 bg-muted/20 dark:bg-muted/10 rounded-xl p-3.5 space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-1.5 border-b border-border/30 pb-2 mb-1">
                    <Layout className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-bold text-foreground/90">التوزيع والنسخ</span>
                  </div>

                  {/* النسخ بالورقة */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        النسخ بالورقة
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top">عدد مرات تكرار الصورة في الورقة الواحدة</TooltipContent>
                        </Tooltip>
                      </Label>
                      <span className="font-mono font-bold text-foreground/80">{actualCopies}</span>
                    </div>
                    <Slider
                      value={[printSettings.copiesPerSheet]}
                      min={1}
                      max={autoCount}
                      step={1}
                      onValueChange={(v) => {
                        setPrintSettings({
                          copiesPerSheet: v[0],
                          fitToPage: v[0] === 1 ? printSettings.fitToPage : false
                        });
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-[9px] text-muted-foreground/50 text-right">
                      الحد الأقصى المتاح للتعبئة: {autoCount} نسخة
                    </p>
                  </div>

                  {/* المسافة بين الصور */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        المسافة بين الصور
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top">المسافة الفاصلة بين الصور لمنع تداخلها وتسهيل القص</TooltipContent>
                        </Tooltip>
                      </Label>
                      <span className="font-mono font-bold text-foreground/80">
                        {printSettings.gapMM !== undefined ? printSettings.gapMM : 2} مم
                      </span>
                    </div>
                    <Slider
                      value={[printSettings.gapMM !== undefined ? printSettings.gapMM : 2]}
                      min={0}
                      max={20}
                      step={0.5}
                      onValueChange={(v) => setPrintSettings({ gapMM: v[0] })}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* الدقة */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      الدقة (DPI)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">دقة وتفاصيل الصورة المطبوعة (300 DPI هو الخيار الموصى به)</TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select
                      value={String(printSettings.dpi)}
                      onValueChange={(v) => setPrintSettings({ dpi: Number(v) })}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[150, 200, 300, 600].map((d) => (
                          <SelectItem key={d} value={String(d)} className="text-xs">
                            {d} DPI {d === 300 && "✨"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* خطوط القص */}
                  <div className="flex items-center justify-between bg-muted/30 dark:bg-muted/15 p-2.5 rounded-xl border border-border/30">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-muted-foreground/85" />
                      خطوط القص والمحاذاة
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">إظهار خطوط متقطعة حمراء حول الصور لتوجيه عملية القص</TooltipContent>
                      </Tooltip>
                    </span>
                    <Switch
                      checked={printSettings.showCutLines}
                      onCheckedChange={(c) => setPrintSettings({ showCutLines: c })}
                      className="scale-90"
                    />
                </div>
              </div>

              {/* ملخص الإعدادات وتنبيه التجاوز */}
              <div className="space-y-2.5">
                  {mode === "collage" && (
                    <div className="rounded-xl border border-amber-200/40 bg-amber-500/10 dark:bg-amber-950/20 p-2.5 text-[10px] text-amber-600 dark:text-amber-300 flex items-start gap-2 leading-relaxed">
                      <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>ملاحظة: سيتم تصدير وطباعة الكولاج بالكامل كصورة واحدة تغطي المساحة المحددة.</span>
                    </div>
                  )}

                  <div className="rounded-xl border border-border/40 bg-gradient-to-br from-muted/50 to-muted/20 p-3 text-[11px] space-y-1.5 shadow-xs">
                    <div className="font-bold text-xs text-foreground/90 mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>ملخص الإعدادات</span>
                    </div>
                    <div className="flex justify-between border-b border-border/20 pb-1">
                      <span className="text-muted-foreground">حجم الصورة:</span>
                      <span className="font-semibold font-mono" dir="ltr">{imageWidthMM} × {imageHeightMM} mm</span>
                    </div>
                    <div className="flex justify-between border-b border-border/20 pb-1">
                      <span className="text-muted-foreground">التوزيع الشبكي:</span>
                      <span className="font-semibold font-mono" dir="ltr">{cols} × {rows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المساحة المستخدمة:</span>
                      <span className={cn("font-bold", isOverflowing ? "text-red-500 animate-pulse" : "text-emerald-500")}>
                        {spaceUsedPercent}%
                      </span>
                    </div>
                  </div>

                  {isOverflowing && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[10.5px] text-red-500 flex items-start gap-2 leading-relaxed font-semibold animate-in fade-in duration-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5 animate-bounce" />
                      <span>تنبيه: حجم الصور أو التوزيع يتجاوز المساحة المتاحة للطباعة! قد يتم قص الأجزاء الخارجة عن الهوامش.</span>
                    </div>
                  )}
                </div>
              </div>

            {/* القسم الأيسر - المعاينة الحية */}
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
                      left: printSettings.marginMM * 2 * zoom,
                      top: printSettings.marginMM * 2 * zoom,
                      right: printSettings.marginMM * 2 * zoom,
                      bottom: printSettings.marginMM * 2 * zoom,
                    }}
                  />

                  {/* منطقة الطباعة */}
                  <div
                    className="absolute"
                    style={{
                      left: printSettings.marginMM * 2 * zoom,
                      top: printSettings.marginMM * 2 * zoom,
                      right: printSettings.marginMM * 2 * zoom,
                      bottom: printSettings.marginMM * 2 * zoom,
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
                      marginMM={printSettings.marginMM}
                      paperWidthMM={printSettings.orientation === "portrait" ? printSettings.paperWidthMM : printSettings.paperHeightMM}
                      paperHeightMM={printSettings.orientation === "portrait" ? printSettings.paperHeightMM : printSettings.paperWidthMM}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>

        <DialogFooter className="border-t border-border/40 pt-4 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting} className="cursor-pointer">
            إلغاء
          </Button>
          <Button 
            onClick={handlePrint} 
            className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all duration-300 shadow-md shadow-indigo-500/10 active:scale-98 cursor-pointer" 
            disabled={isExporting}
          >
            <Printer className="w-4 h-4" /> 
            {isExporting ? "جاري فتح نافذة الطباعة..." : "بدء الطباعة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
