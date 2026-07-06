import { useState, useMemo } from "react";
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
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { PAPER_SIZES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { Printer, ZoomIn, ZoomOut, RectangleVertical, RectangleHorizontal, Scissors, Move, Copy, Columns } from "lucide-react";
import { SheetPreview } from "./print/print-preview";
import { toast } from "sonner";

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
  })));
  const [zoom, setZoom] = useState(1);

  // حساب أبعاد الصورة على الورق بالمليمتر
  const dpi = template ? template.dpi : printSettings.dpi;
  const imageWidthMM = template ? template.widthMM : Math.round((canvasWidth / dpi) * 25.4);
  const imageHeightMM = template ? template.heightMM : Math.round((canvasHeight / dpi) * 25.4);

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

  // عدد الصور المناسب تلقائياً
  const autoCount = useMemo(() => {
    const cols = Math.floor(availableWidthMM / (imageWidthMM + gapMM));
    const rows = Math.floor(availableHeightMM / (imageHeightMM + gapMM));
    return Math.max(1, cols * rows);
  }, [availableWidthMM, availableHeightMM, imageWidthMM, imageHeightMM, gapMM]);

  const actualCopies = Math.min(printSettings.copiesPerSheet, autoCount);

  const cols = Math.floor(availableWidthMM / (imageWidthMM + gapMM));
  const rows = Math.ceil(actualCopies / Math.max(1, cols));

  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = async () => {
    setIsExporting(true);
    try {
      const cutLines = [];
      if (printSettings.showCutLines) {
        for (let i = 0; i <= cols; i++) {
          const x = printSettings.marginMM + i * (imageWidthMM + gapMM) - gapMM / 2;
          cutLines.push({ x1: x, y1: printSettings.marginMM, x2: x, y2: printSettings.marginMM + availableHeightMM });
        }
        for (let i = 0; i <= rows; i++) {
          const y = printSettings.marginMM + i * (imageHeightMM + gapMM) - gapMM / 2;
          cutLines.push({ x1: printSettings.marginMM, y1: y, x2: printSettings.marginMM + availableWidthMM, y2: y });
        }
      }

      const items = [];
      if (mode === "collage") {
        for (const slot of slots) {
          if (slot.imageSrc) {
            items.push({
              imageSrc: slot.imageSrc,
              x: printSettings.marginMM + slot.x * availableWidthMM + gapMM / 2,
              y: printSettings.marginMM + slot.y * availableHeightMM + gapMM / 2,
              w: slot.w * availableWidthMM - gapMM,
              h: slot.h * availableHeightMM - gapMM,
              filter: slot.filter || "",
              brightness: slot.brightness || 100,
              contrast: slot.contrast || 100,
              saturation: slot.saturation || 100,
            });
          }
        }
      } else {
        const firstImage = elements.find((e: CanvasElement) => e.type === "image");
        if (firstImage && firstImage.imageSrc) {
          for (let i = 0; i < actualCopies; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            items.push({
              imageSrc: firstImage.imageSrc,
              x: printSettings.marginMM + col * (imageWidthMM + gapMM),
              y: printSettings.marginMM + row * (imageHeightMM + gapMM),
              w: imageWidthMM,
              h: imageHeightMM,
              filter: firstImage.filter || "",
              brightness: firstImage.brightness || 100,
              contrast: firstImage.contrast || 100,
              saturation: firstImage.saturation || 100,
            });
          }
        }
      }

      const req = {
        paperWidthMM: printSettings.orientation === "portrait" ? printSettings.paperWidthMM : printSettings.paperHeightMM,
        paperHeightMM: printSettings.orientation === "portrait" ? printSettings.paperHeightMM : printSettings.paperWidthMM,
        dpi: dpi,
        backgroundColor: backgroundColor || "#ffffff",
        showCutLines: printSettings.showCutLines,
        cutLines: cutLines,
        items: items,
      };

      // Call the Go backend endpoint
      const res = await (window as any).go.handlers.PrintHandler.ExportPrintSheet(req);
      if (res.success) {
        onOpenChange(false);
        toast.success("تم تصدير ملف الطباعة بنجاح");
      } else {
        toast.error("فشل في التصدير: " + res.error);
      }
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الاتصال بالخادم: " + String(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5" /> إعدادات الطباعة
          </DialogTitle>
          <DialogDescription>
            اضبط خيارات الورق وعدد النسخ ثم اطبع الصور بأبعاد دقيقة
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 flex-1 overflow-hidden">
          {/* الإعدادات */}
          <div className="overflow-y-auto pr-1 space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block">حجم الورق</Label>
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
                <SelectTrigger className="h-9 text-xs">
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
            <div>
              <Label className="text-xs mb-1.5 block">الاتجاه</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => setPrintSettings({ orientation: o })}
                    className={cn(
                      "py-2 h-9 rounded-md border transition-all flex items-center justify-center gap-1.5 text-xs font-semibold",
                      printSettings.orientation === o
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-card hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                    title={o === "portrait" ? "عمودي" : "أفقي"}
                  >
                    {o === "portrait" ? (
                      <>
                        <RectangleVertical className="w-4 h-4" />
                        <span>عمودي</span>
                      </>
                    ) : (
                      <>
                        <RectangleHorizontal className="w-4 h-4" />
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
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Move className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span className="font-medium">الهامش</span>
                </div>
                <span className="font-mono font-semibold text-foreground/80">{printSettings.marginMM} مم</span>
              </div>
              <Slider
                value={[printSettings.marginMM]}
                min={0}
                max={20}
                step={0.5}
                onValueChange={(v) => setPrintSettings({ marginMM: v[0] })}
              />
            </div>

            {/* المسافة بين الصور */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10.5px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Columns className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span className="font-medium">المسافة بين الصور</span>
                </div>
                <span className="font-mono font-semibold text-foreground/80">
                  {printSettings.gapMM !== undefined ? printSettings.gapMM : 2} مم
                </span>
              </div>
              <Slider
                value={[printSettings.gapMM !== undefined ? printSettings.gapMM : 2]}
                min={0}
                max={20}
                step={0.5}
                onValueChange={(v) => setPrintSettings({ gapMM: v[0] })}
              />
            </div>

            {/* الدقة */}
            <div>
              <Label className="text-xs mb-1.5 block">الدقة (DPI)</Label>
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
                      {d} DPI {d === 300 && "(موصى به)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* عدد النسخ */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10.5px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span className="font-medium">النسخ بالورقة</span>
                </div>
                <span className="font-mono font-semibold text-foreground/80">{actualCopies}</span>
              </div>
              <Slider
                value={[printSettings.copiesPerSheet]}
                min={1}
                max={autoCount}
                step={1}
                onValueChange={(v) => setPrintSettings({ copiesPerSheet: v[0] })}
              />
              <p className="text-[9px] text-muted-foreground/60">
                الحد الأقصى المتاح للتعبئة: {autoCount} نسخة
              </p>
            </div>

            {/* خطوط القص */}
            <div className="flex items-center justify-between bg-muted/20 dark:bg-muted/10 p-2.5 rounded-lg border border-border/30">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Scissors className="w-3.5 h-3.5 text-muted-foreground/75" />
                <span className="text-xs font-semibold">خطوط القص والمحاذاة</span>
              </div>
              <Switch
                checked={printSettings.showCutLines}
                onCheckedChange={(c) => setPrintSettings({ showCutLines: c })}
              />
            </div>

            {mode === "collage" && (
              <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                ملاحظة: سيتم طباعة الكولاج كصورة واحدة على الورقة.
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-2.5 text-[11px] space-y-1">
              <div className="font-semibold text-xs mb-1">ملخص الإعدادات</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">حجم الصورة:</span>
                <span>{imageWidthMM}×{imageHeightMM} مم</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد الأعمدة:</span>
                <span>{cols}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد الصفوف:</span>
                <span>{rows}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المساحة المستخدمة:</span>
                <span>
                  {Math.round((actualCopies * imageWidthMM * imageHeightMM) / (availableWidthMM * availableHeightMM) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* المعاينة */}
          <div className="border rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between p-2 border-b bg-card">
              <span className="text-xs font-semibold">معاينة الورقة</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-[11px] w-12 text-center font-mono">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
              <div
                className="bg-white shadow-xl relative"
                style={{
                  width: (printSettings.orientation === "portrait"
                    ? printSettings.paperWidthMM
                    : printSettings.paperHeightMM) * 2 * zoom,
                  height: (printSettings.orientation === "portrait"
                    ? printSettings.paperHeightMM
                    : printSettings.paperWidthMM) * 2 * zoom,
                }}
              >
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
                    elements={elements}
                    slots={slots}
                    mode={mode}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    backgroundColor={backgroundColor}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            إلغاء
          </Button>
          <Button onClick={handlePrint} className="gap-2" disabled={isExporting}>
            <Printer className="w-4 h-4" /> 
            {isExporting ? "جاري التصدير والمعالجة..." : "حفظ وطباعة عالية الدقة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
