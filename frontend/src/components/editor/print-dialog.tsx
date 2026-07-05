"use client";

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
import { Input } from "@/components/ui/input";
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
import { PAPER_SIZES, IMAGE_FILTERS } from "@/lib/templates";
import { Printer, ZoomIn, ZoomOut, FileText, File } from "lucide-react";

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
  } = useEditorStore();
  const [zoom, setZoom] = useState(1);

  // حساب أبعاد الصورة على الورق بالمليمتر
  const imageWidthMM = template ? template.widthMM : 50;
  const imageHeightMM = template ? template.heightMM : 70;

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

  // أبعاد الصورة على الورق في البكسل للعرض
  const pxPerMM = printSettings.dpi / 25.4;
  const sheetW =
    (printSettings.orientation === "portrait"
      ? printSettings.paperWidthMM
      : printSettings.paperHeightMM) * pxPerMM;
  const sheetH =
    (printSettings.orientation === "portrait"
      ? printSettings.paperHeightMM
      : printSettings.paperWidthMM) * pxPerMM;

  const cols = Math.floor(availableWidthMM / (imageWidthMM + gapMM));
  const rows = Math.ceil(actualCopies / Math.max(1, cols));

  const handlePrint = () => {
    onOpenChange(false);
    setTimeout(() => window.print(), 100);
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

            <div>
              <Label className="text-xs mb-1.5 block">الاتجاه</Label>
              <div className="grid grid-cols-2 gap-1">
                {(["portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => setPrintSettings({ orientation: o })}
                    className={`py-2 text-xs rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                      printSettings.orientation === o
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {o === "portrait" ? (
                      <>
                        <FileText className="w-3.5 h-3.5" /> عمودي
                      </>
                    ) : (
                      <>
                        <File className="w-3.5 h-3.5" /> أفقي
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">الهامش (مم)</Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {printSettings.marginMM} مم
                </span>
              </div>
              <Slider
                value={[printSettings.marginMM]}
                min={0}
                max={20}
                step={0.5}
                onValueChange={(v) => setPrintSettings({ marginMM: v[0] })}
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">المسافة بين الصور (مم)</Label>
                <span className="text-[11px] text-muted-foreground font-mono">
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

            <div>
              <Label className="text-xs mb-1.5 block">الدقة (DPI)</Label>
              <Select
                value={String(printSettings.dpi)}
                onValueChange={(v) => setPrintSettings({ dpi: Number(v) })}
              >
                <SelectTrigger className="h-9 text-xs">
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

            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">عدد النسخ بالورقة</Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {actualCopies}
                </span>
              </div>
              <Slider
                value={[printSettings.copiesPerSheet]}
                min={1}
                max={autoCount}
                step={1}
                onValueChange={(v) => setPrintSettings({ copiesPerSheet: v[0] })}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                الحد الأقصى المتاح: {autoCount} نسخة
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">خطوط القص</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> طباعة الآن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// معاينة الورقة - تعرض مصغّراً للصور المرتبة
function SheetPreview({
  cols,
  rows,
  count,
  imageWidthMM,
  imageHeightMM,
  gapMM,
  zoom,
  showCutLines,
  elements,
  slots,
  mode,
  canvasWidth,
  canvasHeight,
  backgroundColor,
}: any) {
  if (mode === "collage") {
    const gap = gapMM;
    return (
      <div className="relative w-full h-full">
        {slots.map((slot: any) => (
          <div
            key={slot.id}
            className="absolute overflow-hidden"
            style={{
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: `${slot.w * 100}%`,
              height: `${slot.h * 100}%`,
              padding: `${(gap / 2) * 2 * zoom}px`,
              boxSizing: "border-box",
              border: showCutLines ? "0.5px dashed #f87171" : "none",
            }}
          >
            {slot.imageSrc ? (
              <img
                src={slot.imageSrc}
                alt=""
                className="w-full h-full object-cover"
                style={{
                  filter: buildFilter(slot),
                }}
              />
            ) : (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] text-muted-foreground">
                خلية فارغة
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  const items = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * (imageWidthMM + gapMM) * 2 * zoom;
    const y = row * (imageHeightMM + gapMM) * 2 * zoom;
    const w = imageWidthMM * 2 * zoom;
    const h = imageHeightMM * 2 * zoom;

    items.push(
      <div
        key={i}
        className="absolute overflow-hidden"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          backgroundColor,
          boxShadow: showCutLines ? "0 0 0 0.5px #94a3b8" : "none",
        }}
      >
        <CanvasThumbnail
          elements={elements}
          slots={slots}
          mode={mode}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          backgroundColor={backgroundColor}
        />
      </div>
    );
  }

  // خطوط القص
  const cutLines = [];
  if (showCutLines) {
    for (let i = 0; i <= cols; i++) {
      const x = i * (imageWidthMM + gapMM) * 2 * zoom - gapMM * zoom;
      cutLines.push(
        <div
          key={`v-${i}`}
          className="absolute border-l border-dashed border-red-400"
          style={{ left: x, top: 0, bottom: 0 }}
        />
      );
    }
    for (let i = 0; i <= rows; i++) {
      const y = i * (imageHeightMM + gapMM) * 2 * zoom - gapMM * zoom;
      cutLines.push(
        <div
          key={`h-${i}`}
          className="absolute border-t border-dashed border-red-400"
          style={{ top: y, left: 0, right: 0 }}
        />
      );
    }
  }

  return (
    <div className="relative w-full h-full">
      {items}
      {cutLines}
    </div>
  );
}

// مصغّر للكانفس (يعرض العنصر الأول أو الخلية الأولى)
function CanvasThumbnail({
  elements,
  slots,
  mode,
  canvasWidth,
  canvasHeight,
  backgroundColor,
}: any) {
  // محاولة عرض مصغّر بسيط للصورة الأولى
  const firstImage =
    mode === "single"
      ? elements.find((e: any) => e.type === "image")
      : slots.find((s: any) => s.imageSrc);

  if (firstImage) {
    const src = firstImage.imageSrc;
    return (
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        style={{
          filter: buildFilter(firstImage),
        }}
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
      معاينة
    </div>
  );
}

function buildFilter(el: any): string {
  const parts: string[] = [];
  const filterDef = IMAGE_FILTERS.find((f) => f.id === el?.filter);
  if (filterDef && filterDef.css) parts.push(filterDef.css);
  if (el?.brightness && el.brightness !== 100) parts.push(`brightness(${el.brightness}%)`);
  if (el?.contrast && el.contrast !== 100) parts.push(`contrast(${el.contrast}%)`);
  if (el?.saturation && el.saturation !== 100) parts.push(`saturate(${el.saturation}%)`);
  return parts.join(" ");
}
