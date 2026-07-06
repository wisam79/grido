import { useState } from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ImageIcon, Type, Palette, Sparkles, Loader2, RefreshCw, 
  AlignLeft, AlignCenter, AlignRight, Sun, Contrast, Droplet, 
  EyeOff, Eye, RotateCw, FlipHorizontal, Square, Maximize2, 
  Scissors, PaintBucket 
} from "lucide-react";
import { IMAGE_FILTERS } from "@/lib/templates";
import { CropDialog } from "../crop-dialog";
import { SliderControl } from "./shared-controls";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

let globalBgWorker: Worker | null = null;
let isWorkerBusy = false;

export function ElementProperties({
  element,
  onUpdate,
}: {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}) {
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgProgressText, setBgProgressText] = useState("");
  const [cropOpen, setCropOpen] = useState(false);

  const handleRemoveBg = () => {
    if (!element.imageSrc) return;
    if (isWorkerBusy) {
      toast.warning("هناك عملية إزالة خلفية قيد التنفيذ حالياً. يرجى الانتظار.");
      return;
    }

    setIsRemovingBg(true);
    isWorkerBusy = true;
    setBgProgress(0);
    setBgProgressText("جاري التهيئة...");

    if (!globalBgWorker) {
      globalBgWorker = new Worker(
        new URL("../bg-worker.ts", import.meta.url),
        { type: "module" }
      );
    }
    const worker = globalBgWorker;

    worker.onmessage = (event) => {
      const { type, key, current, total, blob, error } = event.data;

      if (type === "progress") {
        const percent = Math.round((current / total) * 100);
        setBgProgress(percent);
        if (key.includes("fetch")) {
          setBgProgressText(`تحميل النماذج (${percent}%)`);
        } else if (key.includes("compute")) {
          setBgProgressText(`المعالجة (${percent}%)`);
        } else {
          setBgProgressText(`الرجاء الانتظار (${percent}%)`);
        }
      } else if (type === "success") {
        setBgProgressText("تجهيز الصورة...");
        const reader = new FileReader();
        reader.onloadend = () => {
          onUpdate(element.id, { imageSrc: reader.result as string });
          setIsRemovingBg(false);
          isWorkerBusy = false;
          setBgProgressText("");
          setBgProgress(0);
        };
        reader.readAsDataURL(blob);
      } else if (type === "error") {
        console.error("Background removal failed", error);
        toast.error(String(error));
        setIsRemovingBg(false);
        isWorkerBusy = false;
        setBgProgressText("");
        setBgProgress(0);
      }
    };

    worker.onerror = (err) => {
      console.error("Worker error:", err);
      toast.error("حدث خطأ غير متوقع في خيط المعالجة المنفصل");
      setIsRemovingBg(false);
      isWorkerBusy = false;
      setBgProgressText("");
      setBgProgress(0);
    };

    worker.postMessage({ 
      imageSrc: element.imageSrc,
      baseUrl: window.location.origin
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
        {element.type === "image" && (<><ImageIcon className="w-3.5 h-3.5" /> خصائص الصورة</>)}
        {element.type === "text" && (<><Type className="w-3.5 h-3.5" /> خصائص النص</>)}
        {element.type === "shape" && (<><Palette className="w-3.5 h-3.5" /> خصائص الشكل</>)}
      </div>

      {element.type === "image" && (
        <div className="space-y-3.5">
          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2">
            <Label className="text-[11px] font-bold text-foreground/80 block">تحرير الصورة</Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg gap-1 border-border/60 hover:border-primary/45 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
                onClick={() => setCropOpen(true)}
              >
                <Scissors className="w-4 h-4 text-primary" />
                <span>قص وتدوير</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 text-white font-bold border-0 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-[1.01] transition-all duration-200 gap-1.5 h-9 rounded-lg"
                onClick={handleRemoveBg}
                disabled={isRemovingBg}
              >
                {isRemovingBg ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span className="text-[11px] font-medium text-white">{bgProgressText}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="text-[11px] lg:text-xs">إزالة الخلفية</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {element.imageSrc && (
            <CropDialog
              open={cropOpen}
              onOpenChange={setCropOpen}
              imageSrc={element.imageSrc}
              onCropSave={(cropped) => onUpdate(element.id, { imageSrc: cropped })}
            />
          )}

          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2.5">
            <Label className="text-[11px] font-bold text-foreground/80 block">المرشحات الجاهزة</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {IMAGE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onUpdate(element.id, { filter: f.id })}
                  className={cn(
                    "px-2.5 py-1.5 text-[10.5px] rounded-lg border transition-all text-center font-medium",
                    element.filter === f.id
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold"
                      : "border-border/60 bg-card hover:bg-accent/80 hover:text-foreground text-muted-foreground"
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
            <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">تعديل الألوان</Label>
            <SliderControl
              label="السطوع"
              icon={<Sun className="w-3.5 h-3.5 text-muted-foreground/75" />}
              value={element.brightness ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={(v) => onUpdate(element.id, { brightness: v })}
            />
            <SliderControl
              label="التباين"
              icon={<Contrast className="w-3.5 h-3.5 text-muted-foreground/75" />}
              value={element.contrast ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={(v) => onUpdate(element.id, { contrast: v })}
            />
            <SliderControl
              label="التشبع"
              icon={<Droplet className="w-3.5 h-3.5 text-muted-foreground/75" />}
              value={element.saturation ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={(v) => onUpdate(element.id, { saturation: v })}
            />
            <SliderControl
              label="ضبابية"
              icon={<EyeOff className="w-3.5 h-3.5 text-muted-foreground/75" />}
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
              className="w-full h-8 text-[11px] font-semibold border-border/60 hover:border-primary/30 hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all mt-1 gap-1.5"
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
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              <span>إعادة تعيين الألوان</span>
            </Button>
          </div>
        </div>
      )}

      {element.type === "text" && (
        <div className="space-y-3.5">
          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2">
            <Label className="text-[11px] font-bold text-foreground/80 block">محتوى النص</Label>
            <Textarea
              value={element.text || ""}
              onChange={(e) => onUpdate(element.id, { text: e.target.value })}
              className="text-xs min-h-[60px] resize-none bg-background animate-none"
              placeholder="اكتب النص هنا..."
            />
          </div>

          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
            <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">تنسيق الخط</Label>
            
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">نوع الخط</Label>
              <select
                value={element.fontFamily || "var(--font-cairo)"}
                onChange={(e) => onUpdate(element.id, { fontFamily: e.target.value })}
                className="w-full bg-background border border-border/60 rounded-md p-1.5 text-xs text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
              >
                <option value="var(--font-cairo)">افتراضي (Cairo)</option>
                <option value="'Cairo', sans-serif">كايرو (Cairo)</option>
                <option value="'Tajawal', sans-serif">تاجوال (Tajawal)</option>
                <option value="'IBM Plex Sans Arabic', sans-serif">ديواني (IBM Plex Arabic)</option>
                <option value="'Lemonada', cursive">ليمونادة (Lemonada)</option>
                <option value="'Amiri', serif">أميري (Amiri)</option>
                <option value="'Almarai', sans-serif">المراعي (Almarai)</option>
              </select>
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

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">سمك الخط</Label>
                <div className="grid grid-cols-4 gap-1">
                  {[300, 400, 600, 800].map((w) => (
                    <button
                      key={w}
                      onClick={() => onUpdate(element.id, { fontWeight: w })}
                      className={cn(
                        "h-8 text-xs rounded-md border transition-all text-center font-bold",
                        element.fontWeight === w
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-card hover:bg-accent/80 hover:text-foreground text-muted-foreground"
                      )}
                      style={{ fontWeight: w }}
                      title={w === 300 ? "خفيف" : w === 400 ? "عادي" : w === 600 ? "متوسط" : "عريض"}
                    >
                      {w === 300 ? "L" : w === 400 ? "R" : w === 600 ? "M" : "B"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">المحاذاة</Label>
                <div className="grid grid-cols-3 gap-1">
                  {(["right", "center", "left"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => onUpdate(element.id, { textAlign: a })}
                      className={cn(
                        "h-8 rounded-md border transition-all text-center flex items-center justify-center",
                        element.textAlign === a
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-card hover:bg-accent/80 hover:text-foreground text-muted-foreground"
                      )}
                      title={a === "right" ? "يمين" : a === "center" ? "وسط" : "يسار"}
                    >
                      {a === "right" && <AlignRight className="w-4 h-4" />}
                      {a === "center" && <AlignCenter className="w-4 h-4" />}
                      {a === "left" && <AlignLeft className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
            <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">اللون والخلفية</Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-9 shadow-xs" title="لون النص">
                <Type className="w-4 h-4 text-muted-foreground/60 select-none shrink-0" />
                <input
                  type="color"
                  value={element.color || "#000000"}
                  onChange={(e) => onUpdate(element.id, { color: e.target.value })}
                  className="w-4 h-4 rounded-md cursor-pointer border border-border/40 p-0 shrink-0"
                />
                <input
                  type="text"
                  value={element.color || "#000000"}
                  onChange={(e) => onUpdate(element.id, { color: e.target.value })}
                  className="w-full bg-transparent border-0 p-0 text-[10px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-9 shadow-xs" title="لون خلفية النص">
                <button
                  onClick={() => onUpdate(element.id, { 
                    textBgColor: element.textBgColor === "transparent" ? "#ffffff" : "transparent" 
                  })}
                  className="focus:outline-hidden shrink-0"
                  title={element.textBgColor === "transparent" ? "تفعيل لون الخلفية" : "إلغاء الخلفية"}
                >
                  <PaintBucket className={cn("w-4 h-4 transition-all", element.textBgColor !== "transparent" ? "text-primary" : "text-muted-foreground/60")} />
                </button>
                <input
                  type="color"
                  value={element.textBgColor && element.textBgColor !== "transparent" ? element.textBgColor : "#ffffff"}
                  onChange={(e) => onUpdate(element.id, { textBgColor: e.target.value })}
                  className="w-4 h-4 rounded-md cursor-pointer border border-border/40 p-0 shrink-0"
                  disabled={element.textBgColor === "transparent"}
                />
                <input
                  type="text"
                  value={element.textBgColor || "transparent"}
                  onChange={(e) => onUpdate(element.id, { textBgColor: e.target.value })}
                  className="w-full bg-transparent border-0 p-0 text-[10px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                  disabled={element.textBgColor === "transparent"}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {element.type === "shape" && (
        <div className="space-y-3.5">
          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
            <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">المظهر واللون</Label>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-9 shadow-xs" title="لون التعبئة">
                <PaintBucket className="w-4 h-4 text-muted-foreground/60 select-none shrink-0" />
                <input
                  type="color"
                  value={element.fill || "#6366f1"}
                  onChange={(e) => onUpdate(element.id, { fill: e.target.value })}
                  className="w-4 h-4 rounded-md cursor-pointer border border-border/40 p-0 shrink-0"
                />
                <input
                  type="text"
                  value={element.fill || "#6366f1"}
                  onChange={(e) => onUpdate(element.id, { fill: e.target.value })}
                  className="w-full bg-transparent border-0 p-0 text-[10px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-9 shadow-xs" title="لون الحد">
                <div className="w-4 h-4 rounded-sm border border-muted-foreground/60 select-none shrink-0" style={{ borderWidth: "2.5px" }} />
                <input
                  type="color"
                  value={element.stroke || "#000000"}
                  onChange={(e) => onUpdate(element.id, { stroke: e.target.value })}
                  className="w-4 h-4 rounded-md cursor-pointer border border-border/40 p-0 shrink-0"
                />
                <input
                  type="text"
                  value={element.stroke || "#000000"}
                  onChange={(e) => onUpdate(element.id, { stroke: e.target.value })}
                  className="w-full bg-transparent border-0 p-0 text-[10px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                />
              </div>
            </div>

            {element.shape === "rect" && (
              <SliderControl
                label="استدارة الزوايا"
                icon={<Square className="w-3.5 h-3.5 text-muted-foreground/75" />}
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
              icon={<Maximize2 className="w-3.5 h-3.5 text-muted-foreground/75" />}
              value={element.strokeWidth ?? 0}
              min={0}
              max={20}
              step={0.5}
              unit="px"
              onChange={(v) => onUpdate(element.id, { strokeWidth: v })}
            />
          </div>
        </div>
      )}

      <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3.5">
        <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">التحويل والموضع</Label>
        <SliderControl
          label="التدوير"
          icon={<RotateCw className="w-3.5 h-3.5 text-muted-foreground/75" />}
          value={element.rotation}
          min={-180}
          max={180}
          step={1}
          unit="°"
          onChange={(v) => onUpdate(element.id, { rotation: v })}
        />
        <SliderControl
          label="الشفافية"
          icon={<Eye className="w-3.5 h-3.5 text-muted-foreground/75" />}
          value={Math.round(element.opacity * 100)}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
        />
        
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate(element.id, { rotation: (element.rotation + 90) % 360 })}
            className="h-8 text-[11px] font-semibold border-border/60 hover:border-primary/45 gap-1.5 transition-all"
          >
            <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
            <span>تدوير 90°</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate(element.id, { width: -element.width })}
            className="h-8 text-[11px] font-semibold border-border/60 hover:border-primary/45 gap-1.5 transition-all"
          >
            <FlipHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <span>قلب أفقي</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10.5px] pt-1">
          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs">
            <span className="text-muted-foreground/60 font-mono font-bold select-none">X:</span>
            <input
              type="number"
              value={Math.round(element.x * 100)}
              onChange={(e) => onUpdate(element.id, { x: Number(e.target.value) / 100 })}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs">
            <span className="text-muted-foreground/60 font-mono font-bold select-none">Y:</span>
            <input
              type="number"
              value={Math.round(element.y * 100)}
              onChange={(e) => onUpdate(element.id, { y: Number(e.target.value) / 100 })}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs">
            <span className="text-muted-foreground/60 font-bold select-none text-[9px] truncate">العرض٪:</span>
            <input
              type="number"
              value={Math.round(element.width * 100)}
              onChange={(e) => onUpdate(element.id, { width: Number(e.target.value) / 100 })}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs">
            <span className="text-muted-foreground/60 font-bold select-none text-[9px] truncate">الارتفاع٪:</span>
            <input
              type="number"
              value={Math.round(element.height * 100)}
              onChange={(e) => onUpdate(element.id, { height: Number(e.target.value) / 100 })}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
