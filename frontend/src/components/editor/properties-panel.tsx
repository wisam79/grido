"use client";

import { useState } from "react";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { IMAGE_FILTERS, BACKGROUND_COLORS } from "@/lib/templates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RotateCw, FlipHorizontal, Settings2, ImageIcon, Type, Palette, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { removeBackground } from "@imgly/background-removal";
import * as ort from "onnxruntime-web";

export function PropertiesPanel() {
  const {
    mode,
    elements,
    slots,
    selectedId,
    updateElement,
    updateSlot,
    backgroundColor,
    setBackgroundColor,
    canvasWidth,
    canvasHeight,
    template,
  } = useEditorStore();

  const selectedElement = elements.find((e) => e.id === selectedId);
  const selectedSlot = slots.find((s) => s.id === selectedId);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> خصائص التعديل
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedElement || selectedSlot
            ? "عدّل خصائص العنصر المحدد"
            : "اختر عنصراً لتعديله"}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* خصائص العنصر المحدد */}
          {selectedElement && (
            <ElementProperties element={selectedElement} onUpdate={updateElement} />
          )}

          {/* خصائص الخلية المحددة (كولاج) */}
          {selectedSlot && !selectedElement && (
            <SlotProperties slot={selectedSlot} onUpdate={updateSlot} />
          )}

          {/* إعدادات عامة */}
          {!selectedElement && !selectedSlot && (
            <>
              <GeneralSettings
                backgroundColor={backgroundColor}
                setBackgroundColor={setBackgroundColor}
                template={template}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
              />
            </>
          )}

          {/* معلومات القالب */}
          {template && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5">
              <div className="font-semibold text-sm mb-2">معلومات القالب</div>
              <Row label="الاسم" value={template.name} />
              <Row label="الأبعاد" value={`${template.widthMM}×${template.heightMM} ملم`} />
              <Row label="بالبكسل" value={`${template.width}×${template.height}`} />
              <Row label="الدقة" value={`${template.dpi} DPI`} />
              {template.headHeightMin && (
                <Row
                  label="ارتفاع الرأس"
                  value={`${template.headHeightMin}-${template.headHeightMax}%`}
                />
              )}
              {template.backgroundHint && (
                <Row label="الخلفية" value={template.backgroundHint} />
              )}
              {template.notes && (
                <div className="pt-1 text-[10px] text-muted-foreground italic">
                  {template.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-left">{value}</span>
    </div>
  );
}

function GeneralSettings({
  backgroundColor,
  setBackgroundColor,
  template,
  canvasWidth,
  canvasHeight,
}: {
  backgroundColor: string;
  setBackgroundColor: (c: string) => void;
  template: any;
  canvasWidth: number;
  canvasHeight: number;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold mb-2 block">لون الخلفية</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {BACKGROUND_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setBackgroundColor(c.value)}
              className={cn(
                "aspect-square rounded-md border-2 transition-all",
                backgroundColor === c.value
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <Input
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-xs font-semibold mb-2 block">أبعاد الكانفس</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">العرض (px)</Label>
            <Input value={canvasWidth} readOnly className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">الارتفاع (px)</Label>
            <Input value={canvasHeight} readOnly className="h-8 text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ElementProperties({
  element,
  onUpdate,
}: {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}) {
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgProgressText, setBgProgressText] = useState("");

  const handleRemoveBg = async () => {
    if (!element.imageSrc) return;
    setIsRemovingBg(true);
    setBgProgress(0);
    setBgProgressText("جاري التهيئة...");
    try {
      const imageBlob = await removeBackground(element.imageSrc, {
        proxyToWorker: true,
        progress: (key, current, total) => {
          const percent = Math.round((current / total) * 100);
          setBgProgress(percent);
          if (key.includes("fetch")) {
            setBgProgressText(`تحميل النماذج (${percent}%)`);
          } else if (key.includes("compute")) {
            setBgProgressText(`المعالجة (${percent}%)`);
          } else {
            setBgProgressText(`الرجاء الانتظار (${percent}%)`);
          }
        },
      });

      setBgProgressText("تجهيز الصورة...");
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate(element.id, { imageSrc: reader.result as string });
      };
      reader.readAsDataURL(imageBlob);
    } catch (err: any) {
      console.error("Background removal failed", err);
      alert("فشلت إزالة الخلفية: " + (err.message || String(err)));
    } finally {
      setIsRemovingBg(false);
      setBgProgressText("");
      setBgProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
        {element.type === "image" && (<><ImageIcon className="w-3.5 h-3.5" /> خصائص الصورة</>)}
        {element.type === "text" && (<><Type className="w-3.5 h-3.5" /> خصائص النص</>)}
        {element.type === "shape" && (<><Palette className="w-3.5 h-3.5" /> خصائص الشكل</>)}
      </div>

      {/* خصائص الصورة */}
      {element.type === "image" && (
        <>
          <div className="space-y-2 pb-2 border-b">
            <Label className="text-xs font-semibold block">ممحاة الخلفية الذكية</Label>
            <Button
              variant="secondary"
              size="sm"
              className="w-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 gap-1.5"
              onClick={handleRemoveBg}
              disabled={isRemovingBg}
            >
              {isRemovingBg ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[11px] font-medium">{bgProgressText}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>إزالة الخلفية بالذكاء الاصطناعي</span>
                </>
              )}
            </Button>
          </div>

          <div>
            <Label className="text-xs mb-2 block">المرشحات الجاهزة</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {IMAGE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onUpdate(element.id, { filter: f.id })}
                  className={cn(
                    "px-2 py-1.5 text-[11px] rounded-md border transition-all",
                    element.filter === f.id
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <SliderControl
            label="السطوع"
            value={element.brightness ?? 100}
            min={0}
            max={200}
            step={1}
            unit="%"
            onChange={(v) => onUpdate(element.id, { brightness: v })}
          />
          <SliderControl
            label="التباين"
            value={element.contrast ?? 100}
            min={0}
            max={200}
            step={1}
            unit="%"
            onChange={(v) => onUpdate(element.id, { contrast: v })}
          />
          <SliderControl
            label="التشبع"
            value={element.saturation ?? 100}
            min={0}
            max={200}
            step={1}
            unit="%"
            onChange={(v) => onUpdate(element.id, { saturation: v })}
          />
          <SliderControl
            label="ضبابية"
            value={element.blur ?? 0}
            min={0}
            max={20}
            step={0.5}
            unit="px"
            onChange={(v) => onUpdate(element.id, { blur: v })}
          />

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              onUpdate(element.id, {
                filter: "none",
                brightness: 100,
                contrast: 100,
                saturation: 100,
                blur: 0,
              })
            }
          >
            إعادة تعيين التعديلات
          </Button>
        </>
      )}

      {/* خصائص النص */}
      {element.type === "text" && (
        <>
          <div>
            <Label className="text-xs mb-1.5 block">المحتوى</Label>
            <Textarea
              value={element.text || ""}
              onChange={(e) => onUpdate(element.id, { text: e.target.value })}
              className="text-sm min-h-[60px]"
              placeholder="اكتب النص هنا..."
            />
          </div>
          <SliderControl
            label="حجم الخط"
            value={element.fontSize ?? 32}
            min={8}
            max={120}
            step={1}
            unit="px"
            onChange={(v) => onUpdate(element.id, { fontSize: v })}
          />
          <div>
            <Label className="text-xs mb-1.5 block">الوزن</Label>
            <div className="grid grid-cols-3 gap-1">
              {[400, 600, 800].map((w) => (
                <button
                  key={w}
                  onClick={() => onUpdate(element.id, { fontWeight: w })}
                  className={cn(
                    "py-1.5 text-xs rounded-md border transition-all",
                    element.fontWeight === w
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border hover:border-primary/50"
                  )}
                  style={{ fontWeight: w }}
                >
                  {w === 400 ? "عادي" : w === 600 ? "متوسط" : "عريض"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">المحاذاة</Label>
            <div className="grid grid-cols-3 gap-1">
              {(["right", "center", "left"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => onUpdate(element.id, { textAlign: a })}
                  className={cn(
                    "py-1.5 text-xs rounded-md border transition-all",
                    element.textAlign === a
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {a === "right" ? "يمين" : a === "center" ? "وسط" : "يسار"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">اللون</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={element.color || "#000000"}
                onChange={(e) => onUpdate(element.id, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={element.color || "#000000"}
                onChange={(e) => onUpdate(element.id, { color: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </>
      )}

      {/* خصائص الشكل */}
      {element.type === "shape" && (
        <>
          <div>
            <Label className="text-xs mb-1.5 block">لون التعبئة</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={element.fill || "#6366f1"}
                onChange={(e) => onUpdate(element.id, { fill: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={element.fill || "#6366f1"}
                onChange={(e) => onUpdate(element.id, { fill: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          {element.shape === "rect" && (
            <SliderControl
              label="استدارة الزوايا"
              value={element.radius ?? 0}
              min={0}
              max={50}
              step={1}
              unit=""
              onChange={(v) => onUpdate(element.id, { radius: v })}
            />
          )}
          <SliderControl
            label="سماكة الحد"
            value={element.strokeWidth ?? 0}
            min={0}
            max={20}
            step={0.5}
            unit="px"
            onChange={(v) => onUpdate(element.id, { strokeWidth: v })}
          />
          {element.strokeWidth !== undefined && element.strokeWidth > 0 && (
            <div>
              <Label className="text-xs mb-1.5 block">لون الحد</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={element.stroke || "#000000"}
                  onChange={(e) => onUpdate(element.id, { stroke: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <Input
                  value={element.stroke || "#000000"}
                  onChange={(e) => onUpdate(element.id, { stroke: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </>
      )}

      <Separator />

      {/* خصائص مشتركة: التدوير والشفافية والموضع */}
      <SliderControl
        label="التدوير"
        value={element.rotation}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(v) => onUpdate(element.id, { rotation: v })}
      />
      <SliderControl
        label="الشفافية"
        value={Math.round(element.opacity * 100)}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">X</Label>
          <Input
            type="number"
            value={Math.round(element.x * 100)}
            onChange={(e) => onUpdate(element.id, { x: Number(e.target.value) / 100 })}
            className="h-8 text-xs"
            min={-50}
            max={100}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Y</Label>
          <Input
            type="number"
            value={Math.round(element.y * 100)}
            onChange={(e) => onUpdate(element.id, { y: Number(e.target.value) / 100 })}
            className="h-8 text-xs"
            min={-50}
            max={100}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">العرض %</Label>
          <Input
            type="number"
            value={Math.round(element.width * 100)}
            onChange={(e) => onUpdate(element.id, { width: Number(e.target.value) / 100 })}
            className="h-8 text-xs"
            min={5}
            max={200}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">الارتفاع %</Label>
          <Input
            type="number"
            value={Math.round(element.height * 100)}
            onChange={(e) => onUpdate(element.id, { height: Number(e.target.value) / 100 })}
            className="h-8 text-xs"
            min={5}
            max={200}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdate(element.id, { rotation: (element.rotation + 90) % 360 })}
          className="gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" /> تدوير 90°
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdate(element.id, { width: -element.width })}
          className="gap-1.5"
        >
          <FlipHorizontal className="w-3.5 h-3.5" /> قلب أفقي
        </Button>
      </div>
    </div>
  );
}

import { OpenFile } from "../../../wailsjs/go/main/App";
import { ImagePlus, Copy } from "lucide-react";

function SlotProperties({
  slot,
  onUpdate,
}: {
  slot: any;
  onUpdate: (id: string, patch: any) => void;
}) {
  const { fillAllSlots, setSlotImage, lastEditedImage } = useEditorStore();

  const handleOpenFile = async () => {
    try {
      const b64 = await OpenFile();
      if (b64) {
        setSlotImage(slot.id, b64);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFillAll = () => {
    if (slot.imageSrc) {
      fillAllSlots(slot.imageSrc);
    }
  };

  const handleUseLastImage = () => {
    if (lastEditedImage) {
      setSlotImage(slot.id, lastEditedImage);
    }
  };

  if (!slot.imageSrc) {
    return (
      <div className="space-y-4 p-2">
        <div className="text-xs text-muted-foreground text-center py-4">
          لا توجد صورة في هذه الخلية.
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={handleOpenFile}
        >
          <ImagePlus className="w-4 h-4" />
          رفع صورة للخلية
        </Button>
        {lastEditedImage && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-1.5"
            onClick={handleUseLastImage}
          >
            <Copy className="w-4 h-4" />
            تعبئة بآخر صورة معدلة
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-primary flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>خصائص صورة الخلية</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-[11px]"
          onClick={handleOpenFile}
        >
          تغيير الصورة
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100"
          onClick={handleFillAll}
        >
          تكرار في كل الخلايا
        </Button>
      </div>

      <Separator />

      <div>
        <Label className="text-xs mb-2 block">المرشحات الجاهزة</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {IMAGE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onUpdate(slot.id, { filter: f.id })}
              className={cn(
                "px-2 py-1.5 text-[11px] rounded-md border transition-all",
                slot.filter === f.id
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border hover:border-primary/50"
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <SliderControl
        label="السطوع"
        value={slot.brightness ?? 100}
        min={0}
        max={200}
        step={1}
        unit="%"
        onChange={(v) => onUpdate(slot.id, { brightness: v })}
      />
      <SliderControl
        label="التباين"
        value={slot.contrast ?? 100}
        min={0}
        max={200}
        step={1}
        unit="%"
        onChange={(v) => onUpdate(slot.id, { contrast: v })}
      />
      <SliderControl
        label="التشبع"
        value={slot.saturation ?? 100}
        min={0}
        max={200}
        step={1}
        unit="%"
        onChange={(v) => onUpdate(slot.id, { saturation: v })}
      />

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() =>
          onUpdate(slot.id, {
            filter: "none",
            brightness: 100,
            contrast: 100,
            saturation: 100,
          })
        }
      >
        إعادة تعيين التعديلات
      </Button>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <Label className="text-xs">{label}</Label>
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="mt-1"
      />
    </div>
  );
}
