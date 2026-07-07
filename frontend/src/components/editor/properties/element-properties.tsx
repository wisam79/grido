import { useState } from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ImageIcon, Type, Palette, Sparkles, Loader2, RefreshCw, 
  AlignLeft, AlignCenter, AlignRight, Sun, Contrast, Droplet, 
  EyeOff, Eye, RotateCw, FlipHorizontal, Square, Maximize2, 
  Scissors, PaintBucket, Paintbrush, Sliders, Move
} from "lucide-react";
import { IMAGE_FILTERS } from "@/lib/templates";
import { CropDialog } from "../crop-dialog";
import { SliderControl, PopoverColorPicker } from "./shared-controls";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";

let globalBgWorker: Worker | null = null;
let isWorkerBusy = false;
let isModelCached = false;

// تحميل النموذج مسبقاً في الخلفية بعد 8 ثوانٍ من فتح التطبيق
setTimeout(() => {
  try {
    if (!globalBgWorker) {
      globalBgWorker = new Worker(
        new URL("../bg-worker.ts", import.meta.url),
        { type: "module" }
      );
      globalBgWorker.onmessage = (e) => {
        if (e.data?.type === "warmup_done") {
          isModelCached = true;
        }
      };
    }
    globalBgWorker.postMessage({ type: "warmup" });
  } catch {
    // الإخفاق الصامت — سيُعاد المحاولة عند الاستخدام الفعلي
  }
}, 8000);

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

    // تنبيه المستخدم عند الاستخدام الأول بأن النموذج يحتاج إنترنت
    if (!isModelCached) {
      toast.info(
        "سيتم تحميل نموذج الذكاء الاصطناعي من الإنترنت (مرة واحدة فقط ~45 MB) ثم يعمل بدون إنترنت.",
        { duration: 6000, id: "bg-model-notice" }
      );
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
      const { type, key, current, total, blob, error, elementId } = event.data;

      // تجاهل الرسائل الواردة لعناصر أخرى منعاً لتداخل العمليات في الخلفية
      if (elementId && elementId !== element.id) {
        return;
      }

      if (type === "progress") {
        const percent = Math.round((current / total) * 100);
        setBgProgress(percent);
        if (key.includes("fetch") || key.includes("load")) {
          setBgProgressText(`تحميل النموذج... (${percent}%)`);
        } else if (key.includes("decode")) {
          setBgProgressText(`فك تشفير الصورة... (${percent}%)`);
        } else if (key.includes("preprocess")) {
          setBgProgressText(`المعالجة المسبقة... (${percent}%)`);
        } else if (key.includes("inference")) {
          setBgProgressText(`تحليل الذكاء الاصطناعي... (${percent}%)`);
        } else if (key.includes("mask")) {
          setBgProgressText(`تطبيق القناع... (${percent}%)`);
        } else {
          setBgProgressText(`الرجاء الانتظار... (${percent}%)`);
        }
      } else if (type === "warmup_done") {
        isModelCached = true;
      } else if (type === "success") {
        isModelCached = true;
        setBgProgressText("تجهيز الصورة...");
        (async () => {
          try {
            const dataUrl = `data:${event.data.mimeType};base64,${event.data.base64}`;
            // حفظ الصورة في مجلد الميديا محلياً لتفادي تضخم حجم ملف الحفظ والذاكرة
            const localPath = await SaveImageFromBase64(dataUrl);
            onUpdate(element.id, { imageSrc: localPath });
          } catch (err) {
            console.error("Failed to save background-removed image:", err);
            toast.error("فشل حفظ الصورة المعالجة محلياً");
          } finally {
            setIsRemovingBg(false);
            isWorkerBusy = false;
            setBgProgressText("");
            setBgProgress(0);
          }
        })();
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

    worker.postMessage({ type: "remove_bg", imageSrc: element.imageSrc, elementId: element.id });
  };

  const hasAdjustTab = element.type === "image";

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-primary flex items-center gap-1.5 border-b border-border/10 pb-2">
        {element.type === "image" && (<><ImageIcon className="w-3.5 h-3.5" /> خصائص الصورة</>)}
        {element.type === "text" && (<><Type className="w-3.5 h-3.5" /> خصائص النص</>)}
        {element.type === "shape" && (<><Palette className="w-3.5 h-3.5" /> خصائص الشكل</>)}
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className={cn(
          "grid w-full h-9 p-[3px] bg-muted rounded-lg border",
          hasAdjustTab ? "grid-cols-4" : "grid-cols-3"
        )}>
          <TabsTrigger value="style" title="التنسيق والمظهر" className="rounded-md py-1 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
            <Paintbrush className="w-3.5 h-3.5" />
          </TabsTrigger>
          {hasAdjustTab && (
            <TabsTrigger value="adjust" title="تعديل الألوان والفلاتر" className="rounded-md py-1 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
              <Sliders className="w-3.5 h-3.5" />
            </TabsTrigger>
          )}
          <TabsTrigger value="effects" title="التأثيرات (ظلال، زوايا، دمج)" className="rounded-md py-1 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
            <Sparkles className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="arrange" title="الموضع والترتيب" className="rounded-md py-1 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
            <Move className="w-3.5 h-3.5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="mt-3.5 space-y-3.5">
          {element.type === "image" && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2.5">
                <Label className="text-[11px] font-bold text-foreground/80 block">تحرير الصورة</Label>
                <div className="grid grid-cols-2 gap-2">
                  {/* زر القص والتدوير */}
                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border-border/60 hover:border-primary/45 hover:bg-accent/40 text-muted-foreground hover:text-foreground cursor-pointer shadow-xs active:scale-[0.97] transition-all duration-200 group"
                    onClick={() => setCropOpen(true)}
                    title="قص وتدوير الصورة"
                  >
                    <Scissors className="w-4 h-4 text-primary group-hover:scale-110 group-hover:-rotate-3 transition-transform" />
                    <span className="text-[10px] font-bold">قص وتدوير</span>
                  </Button>
                  
                  {/* زر عزل الخلفية بالذكاء الاصطناعي */}
                  <Button
                    variant="default"
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border-0 shadow-md transition-all duration-200 cursor-pointer active:scale-[0.97] group text-white",
                      isRemovingBg 
                        ? "bg-muted cursor-not-allowed" 
                        : "bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-indigo-500/10 hover:shadow-indigo-500/20"
                    )}
                    onClick={handleRemoveBg}
                    disabled={isRemovingBg}
                    title="إزالة الخلفية بالذكاء الاصطناعي"
                  >
                    {isRemovingBg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span className="text-[9px] font-bold animate-pulse text-white/90">جاري المعالجة...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white group-hover:scale-115 group-hover:rotate-6 transition-all duration-300" />
                        <span className="text-[10px] font-bold">عزل الخلفية</span>
                      </>
                    )}
                  </Button>
                </div>

                {isRemovingBg && (
                  <div className="mt-2 p-2.5 rounded-lg bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] border border-indigo-500/10 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex justify-between items-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                      <span className="animate-pulse">{bgProgressText}</span>
                      <span className="font-mono">{bgProgress}%</span>
                    </div>
                    <div className="w-full bg-muted dark:bg-muted/30 h-1.5 rounded-full overflow-hidden border border-border/15">
                      <div 
                        className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${bgProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {element.imageSrc && (
                <CropDialog
                  open={cropOpen}
                  onOpenChange={setCropOpen}
                  imageSrc={element.imageSrc}
                  onCropSave={async (cropped) => {
                    try {
                      // حفظ الصورة المقصوصة محلياً بدلاً من تخزين Base64 في الذاكرة
                      const localPath = await SaveImageFromBase64(cropped);
                      onUpdate(element.id, { imageSrc: localPath });
                    } catch (err) {
                      console.error("Failed to save cropped image:", err);
                      toast.error("فشل حفظ الصورة المقصوصة محلياً");
                    }
                  }}
                />
              )}

              <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2.5">
                <Label className="text-[11px] font-bold text-foreground/80 block">المرشحات الجاهزة</Label>
                <div className="grid grid-cols-2 gap-1.5" dir="rtl">
                  {IMAGE_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onUpdate(element.id, { filter: f.id })}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 text-[10.5px] rounded-lg border transition-all text-right font-medium cursor-pointer active:scale-95",
                        element.filter === f.id
                          ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold"
                          : "border-border/60 bg-card hover:bg-accent hover:text-foreground text-muted-foreground"
                      )}
                    >
                      {/* دائرة ملونة ممثلة للتأثير */}
                      <div className={cn(
                        "w-3.5 h-3.5 rounded-full shadow-2xs shrink-0 border border-black/10 dark:border-white/10",
                        f.id === "original" ? "bg-radial from-neutral-200 to-neutral-400 dark:from-neutral-700 dark:to-neutral-900" :
                        f.id === "grayscale" ? "bg-gradient-to-br from-neutral-300 via-neutral-500 to-neutral-800" :
                        f.id === "vibrant" ? "bg-gradient-to-br from-amber-400 via-red-500 to-pink-600" :
                        f.id === "sepia" ? "bg-gradient-to-br from-amber-800 via-yellow-700 to-amber-950" :
                        f.id === "warm" ? "bg-gradient-to-br from-amber-300 via-orange-400 to-red-500" :
                        f.id === "cold" ? "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600" :
                        f.id === "professional" ? "bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700" :
                        f.id === "soft" ? "bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-200" : "bg-neutral-400"
                      )} />
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {element.type === "text" && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2">
                <Label className="text-[11px] font-bold text-foreground/80 block">محتوى النص</Label>
                <Textarea
                  value={element.text || ""}
                  onChange={(e) => onUpdate(element.id, { text: e.target.value })}
                  onBlur={() => useEditorStore.getState().pushHistory()}
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
                    onChange={(e) => {
                      onUpdate(element.id, { fontFamily: e.target.value });
                      useEditorStore.getState().pushHistory();
                    }}
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
                          onClick={() => {
                            onUpdate(element.id, { fontWeight: w });
                            useEditorStore.getState().pushHistory();
                          }}
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
                          onClick={() => {
                            onUpdate(element.id, { textAlign: a });
                            useEditorStore.getState().pushHistory();
                          }}
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
                <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-2">اللون والخلفية</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-primary/70" />
                      <span>لون النص</span>
                    </span>
                    <PopoverColorPicker
                      color={element.color || "#000000"}
                      onChange={(val) => onUpdate(element.id, { color: val })}
                      className="w-32 h-8"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <PaintBucket className="w-3.5 h-3.5 text-primary/70" />
                      <span>خلفية النص</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onUpdate(element.id, { 
                          textBgColor: element.textBgColor === "transparent" ? "#ffffff" : "transparent" 
                        })}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-lg border transition-all shrink-0 cursor-pointer",
                          element.textBgColor === "transparent" ? "border-border/60 bg-background text-muted-foreground hover:bg-muted" : "border-primary/50 bg-primary/10 text-primary"
                        )}
                        title={element.textBgColor === "transparent" ? "تفعيل لون الخلفية" : "إلغاء الخلفية"}
                      >
                        <PaintBucket className="w-3.5 h-3.5" />
                      </button>
                      <PopoverColorPicker
                        color={element.textBgColor && element.textBgColor !== "transparent" ? element.textBgColor : "#ffffff"}
                        onChange={(val) => onUpdate(element.id, { textBgColor: val })}
                        disabled={element.textBgColor === "transparent"}
                        className="w-32 h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {element.type === "shape" && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
                <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-2">المظهر واللون</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <PaintBucket className="w-3.5 h-3.5 text-primary/70" />
                      <span>لون التعبئة</span>
                    </span>
                    <PopoverColorPicker
                      color={element.fill || "#6366f1"}
                      onChange={(val) => onUpdate(element.id, { fill: val })}
                      className="w-32 h-8"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-[3px] border-2 border-primary/70" />
                      <span>لون الحدود</span>
                    </span>
                    <PopoverColorPicker
                      color={element.stroke || "#000000"}
                      onChange={(val) => onUpdate(element.id, { stroke: val })}
                      className="w-32 h-8"
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
        </TabsContent>

        {hasAdjustTab && (
          <TabsContent value="adjust" className="mt-3.5 space-y-3.5">
            {element.type === "image" && (
              <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3 animate-in fade-in duration-200">
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
            )}
          </TabsContent>
        )}

        <TabsContent value="arrange" className="mt-3.5 space-y-3.5">
          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3.5 animate-in fade-in duration-200">
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
            
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  onUpdate(element.id, { rotation: (element.rotation + 90) % 360 });
                  useEditorStore.getState().pushHistory();
                }}
                title="تدوير 90 درجة"
                className="h-8 w-8 border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center"
              >
                <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  onUpdate(element.id, { width: -element.width });
                  useEditorStore.getState().pushHistory();
                }}
                title="قلب أفقي"
                className="h-8 w-8 border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10.5px] pt-1">
              <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs" title="الإحداثي الأفقي X">
                <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">X:</span>
                <input
                  type="number"
                  value={Math.round(element.x * 100)}
                  onChange={(e) => onUpdate(element.id, { x: Number(e.target.value) / 100 })}
                  onBlur={() => useEditorStore.getState().pushHistory()}
                  className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs" title="الإحداثي العمودي Y">
                <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">Y:</span>
                <input
                  type="number"
                  value={Math.round(element.y * 100)}
                  onChange={(e) => onUpdate(element.id, { y: Number(e.target.value) / 100 })}
                  onBlur={() => useEditorStore.getState().pushHistory()}
                  className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs" title="نسبة العرض W">
                <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">W:</span>
                <input
                  type="number"
                  value={Math.round(element.width * 100)}
                  onChange={(e) => onUpdate(element.id, { width: Math.max(0.05, Number(e.target.value) / 100) })}
                  onBlur={() => useEditorStore.getState().pushHistory()}
                  className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs" title="نسبة الارتفاع H">
                <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">H:</span>
                <input
                  type="number"
                  value={Math.round(element.height * 100)}
                  onChange={(e) => onUpdate(element.id, { height: Math.max(0.05, Number(e.target.value) / 100) })}
                  onBlur={() => useEditorStore.getState().pushHistory()}
                  className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="effects" className="mt-3.5 space-y-3.5">
          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3.5 animate-in fade-in duration-200">
            <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">الظلال (Drop Shadow)</Label>
            
            <div className="flex items-center justify-between gap-4" title="لون الظل">
              <span className="text-[11px] font-bold text-muted-foreground">لون الظل الأساسي:</span>
              <PopoverColorPicker
                color={element.shadowColor || "#000000"}
                onChange={(val) => onUpdate(element.id, { shadowColor: val })}
                className="w-32 h-8"
              />
            </div>

            <SliderControl
              label="شفافية الظل"
              icon={<Eye className="w-3.5 h-3.5 text-muted-foreground/75" />}
              value={Math.round((element.shadowOpacity ?? 0) * 100)}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onUpdate(element.id, { shadowOpacity: v / 100 })}
            />
            
            <SliderControl
              label="تمويه الظل (Blur)"
              icon={<Droplet className="w-3.5 h-3.5 text-muted-foreground/75" />}
              value={element.shadowBlur || 0}
              min={0}
              max={50}
              step={1}
              unit="px"
              onChange={(v) => onUpdate(element.id, { shadowBlur: v })}
            />

            <SliderControl
              label="إزاحة الظل (X)"
              icon={<Move className="w-3.5 h-3.5 text-muted-foreground/75" />}
              value={element.shadowOffsetX || 0}
              min={-50}
              max={50}
              step={1}
              unit="px"
              onChange={(v) => onUpdate(element.id, { shadowOffsetX: v })}
            />

            <SliderControl
              label="إزاحة الظل (Y)"
              icon={<Move className="w-3.5 h-3.5 text-muted-foreground/75" />}
              value={element.shadowOffsetY || 0}
              min={-50}
              max={50}
              step={1}
              unit="px"
              onChange={(v) => onUpdate(element.id, { shadowOffsetY: v })}
            />
          </div>

          {(element.type === "image" || element.type === "shape") && (
            <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3.5 animate-in fade-in duration-200">
              <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">تدوير الزوايا</Label>
              <SliderControl
                label="قطر الزاوية (Radius)"
                icon={<Square className="w-3.5 h-3.5 text-muted-foreground/75" />}
                value={element.cornerRadius || 0}
                min={0}
                max={200}
                step={1}
                unit="px"
                onChange={(v) => onUpdate(element.id, { cornerRadius: v })}
              />
            </div>
          )}

          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3.5 animate-in fade-in duration-200">
            <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">طريقة الدمج (Blend Mode)</Label>
            <div className="relative">
              <select
                value={element.globalCompositeOperation || "source-over"}
                onChange={(e) => {
                  onUpdate(element.id, { globalCompositeOperation: e.target.value });
                  useEditorStore.getState().pushHistory();
                }}
                className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                dir="ltr"
              >
                <option value="source-over">عادي (Normal)</option>
                <option value="multiply">مضاعفة (Multiply)</option>
                <option value="screen">تفتيح (Screen)</option>
                <option value="overlay">تراكب (Overlay)</option>
                <option value="darken">تغميق (Darken)</option>
                <option value="lighten">تفتيح (Lighten)</option>
                <option value="color-dodge">حرق اللون (Color Dodge)</option>
                <option value="color-burn">حرق اللون (Color Burn)</option>
                <option value="hard-light">ضوء قاسي (Hard Light)</option>
                <option value="soft-light">ضوء ناعم (Soft Light)</option>
                <option value="difference">الفرق (Difference)</option>
                <option value="exclusion">استبعاد (Exclusion)</option>
                <option value="hue">صبغة (Hue)</option>
                <option value="saturation">تشبع (Saturation)</option>
                <option value="color">لون (Color)</option>
                <option value="luminosity">إضاءة (Luminosity)</option>
              </select>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
