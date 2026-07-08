import { useState } from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ImageIcon, Type, Palette, Sparkles, RefreshCw, 
  AlignLeft, AlignCenter, AlignRight, Sun, Contrast, Droplet, 
  EyeOff, Eye, RotateCw, FlipHorizontal, Square, Maximize2, 
  Scissors, PaintBucket, Paintbrush, Sliders, Move, X, Lock
} from "lucide-react";
import { IMAGE_FILTERS } from "@/lib/templates";
import { CropDialog } from "../crop-dialog";
import { SliderControl, PopoverColorPicker } from "./shared-controls";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";


const GradientPicker = ({
  fillType,
  color,
  colorStops,
  onChangeType,
  onChangeSolidColor,
  onChangeColorStops,
}: {
  fillType: "solid" | "linear" | "radial";
  color: string;
  colorStops: Array<number | string>;
  onChangeType: (type: "solid" | "linear" | "radial") => void;
  onChangeSolidColor: (color: string) => void;
  onChangeColorStops: (stops: Array<number | string>) => void;
}) => {
  const stop1 = (colorStops[1] as string) || "#3b82f6";
  const stop2 = (colorStops[3] as string) || "#8b5cf6";

  const handleStop1Change = (newColor: string) => {
    onChangeColorStops([0, newColor, 1, stop2]);
  };

  const handleStop2Change = (newColor: string) => {
    onChangeColorStops([0, stop1, 1, newColor]);
  };

  const presets = [
    { name: "شروق 🌅", stops: [0, "#f59e0b", 1, "#ef4444"] },
    { name: "سماء 🌌", stops: [0, "#3b82f6", 1, "#8b5cf6"] },
    { name: "زمرد 🌲", stops: [0, "#10b981", 1, "#059669"] },
    { name: "بركان 🌋", stops: [0, "#f43f5e", 1, "#fb7185"] },
    { name: "غروب 🌇", stops: [0, "#ea580c", 1, "#e11d48"] },
    { name: "محيط 🌊", stops: [0, "#06b6d4", 1, "#3b82f6"] }
  ];

  return (
    <div className="space-y-2 border border-border/40 p-2.5 rounded-xl bg-muted/20">
      <div className="flex bg-muted/40 p-0.5 rounded-lg border border-border/10">
        {(["solid", "linear", "radial"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChangeType(t)}
            className={cn(
              "flex-1 py-1 rounded-md transition-all cursor-pointer flex items-center justify-center text-[10.5px] font-bold",
              fillType === t 
                ? "bg-background text-primary shadow-xs border border-border/10" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "solid" ? "مصمت" : t === "linear" ? "خطي ⇄" : "دائري ⊙"}
          </button>
        ))}
      </div>

      {fillType === "solid" ? (
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-[10px] text-muted-foreground font-semibold">اللون:</span>
          <PopoverColorPicker color={color} onChange={onChangeSolidColor} className="w-28 h-7" />
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[9px] text-muted-foreground font-semibold">اللون الأول:</span>
              <PopoverColorPicker color={stop1} onChange={handleStop1Change} className="w-full h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-muted-foreground font-semibold">اللون الثاني:</span>
              <PopoverColorPicker color={stop2} onChange={handleStop2Change} className="w-full h-7" />
            </div>
          </div>

          <div className="space-y-1 pt-1.5 border-t border-border/10">
            <span className="text-[9px] text-muted-foreground font-semibold block mb-1">تدرجات جاهزة:</span>
            <div className="grid grid-cols-3 gap-1">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onChangeColorStops(p.stops)}
                  className="py-1 px-1.5 text-[9.5px] rounded-md border border-border/40 hover:border-primary/30 bg-card transition-all cursor-pointer text-center font-bold flex items-center justify-center gap-1"
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" 
                    style={{ background: `linear-gradient(135deg, ${p.stops[1]}, ${p.stops[3]})` }}
                  />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

let globalBgWorker: Worker | null = null;
let isWorkerBusy = false;
let isModelCached = false;

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

  const handleCancelBgRemoval = () => {
    if (globalBgWorker) {
      globalBgWorker.terminate();
      globalBgWorker = null;
    }
    setIsRemovingBg(false);
    isWorkerBusy = false;
    setBgProgress(0);
    setBgProgressText("");
    toast.info("تم إلغاء عملية عزل الخلفية.");
  };

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
      const { type, key, current, total, error, elementId } = event.data;

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

      {element.locked && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl flex items-center justify-between text-[11px] font-semibold mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>هذا العنصر مقفل. إلغاء القفل للتعديل.</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              onUpdate(element.id, { locked: false });
              useEditorStore.getState().pushHistory();
            }}
            className="h-6 px-2 text-[10px] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 rounded-md transition-colors cursor-pointer text-amber-700 dark:text-amber-300 font-bold"
          >
            إلغاء القفل
          </Button>
        </div>
      )}

      <div className={cn(element.locked && "pointer-events-none opacity-50 select-none")}>
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
                    variant={isRemovingBg ? "destructive" : "default"}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border-0 shadow-md transition-all duration-200 cursor-pointer active:scale-[0.97] group text-white",
                      isRemovingBg 
                        ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800" 
                        : "bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500 shadow-indigo-500/10 hover:shadow-indigo-500/20"
                    )}
                    onClick={isRemovingBg ? handleCancelBgRemoval : handleRemoveBg}
                    title={isRemovingBg ? "إلغاء عملية عزل الخلفية" : "إزالة الخلفية بالذكاء الاصطناعي"}
                  >
                    {isRemovingBg ? (
                      <>
                        <X className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold">إلغاء العملية</span>
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
                      
                      const img = new Image();
                      img.onload = () => {
                        const croppedAspect = img.width / img.height;
                        const state = useEditorStore.getState();
                        const canvasRatio = state.canvasWidth / state.canvasHeight;
                        const newHeight = element.width * canvasRatio / croppedAspect;
                        
                        onUpdate(element.id, { 
                          imageSrc: localPath,
                          height: newHeight
                        });
                        
                        state.setLastEditedImageAspect(croppedAspect);
                      };
                      img.src = cropped;
                    } catch (err) {
                      console.error("Failed to save cropped image:", err);
                      toast.error("فشل حفظ الصورة المقصوصة محلياً");
                    }
                  }}
                />
              )}

              <Tabs defaultValue="filters" className="w-full">
                <TabsList className="grid grid-cols-2 bg-muted/40 p-0.5 rounded-lg border border-border/10 w-full mb-3">
                  <TabsTrigger 
                    value="filters" 
                    className="py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs flex items-center justify-center gap-1"
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>المرشحات الجاهزة</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="adjust" 
                    className="py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs flex items-center justify-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>تعديل الألوان</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="filters" className="mt-0 animate-in fade-in duration-200">
                  <div className="bg-muted/30 dark:bg-muted/10 p-2.5 rounded-xl border border-border/30 space-y-2">
                    <div className="grid grid-cols-4 gap-1.5" dir="rtl">
                      {IMAGE_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => onUpdate(element.id, { filter: f.id })}
                          className={cn(
                            "flex flex-col items-center gap-1 p-1 rounded-lg border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer",
                            element.filter === f.id
                              ? "border-primary bg-primary/10 text-primary shadow-xs shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold"
                              : "border-border/60 bg-card hover:bg-accent text-muted-foreground"
                          )}
                        >
                          <div className="w-full aspect-square rounded-md overflow-hidden shrink-0 border border-black/10 dark:border-white/10 bg-slate-100 relative">
                            {element.imageSrc ? (
                              <img
                                src={element.imageSrc}
                                alt=""
                                className="w-full h-full object-cover"
                                style={{ filter: f.css }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500" style={{ filter: f.css }} />
                            )}
                          </div>
                          <span className="text-[9px] tracking-tight leading-tight truncate max-w-full text-center mt-0.5">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="adjust" className="mt-0 animate-in fade-in duration-200">
                  <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
                    <SliderControl
                      label="السطوع"
                      value={element.brightness ?? 100}
                      min={50}
                      max={150}
                      step={1}
                      unit="%"
                      onChange={(v) => onUpdate(element.id, { brightness: v })}
                    />
                    <SliderControl
                      label="التباين"
                      value={element.contrast ?? 100}
                      min={50}
                      max={150}
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
                      label="التغبيش"
                      value={element.blur ?? 0}
                      min={0}
                      max={30}
                      step={1}
                      unit="px"
                      onChange={(v) => onUpdate(element.id, { blur: v })}
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 text-xs font-semibold gap-1.5 flex items-center justify-center cursor-pointer"
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
                      <RefreshCw className="w-3 h-3" />
                      <span>إعادة تعيين الألوان</span>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
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
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Type className="w-3 h-3 text-primary/70" />
                      <span>لون وتعبئة النص</span>
                    </span>
                    <GradientPicker
                      fillType={element.fillType || "solid"}
                      color={element.color || "#000000"}
                      colorStops={element.fillLinearGradientColorStops || element.fillRadialGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"]}
                      onChangeType={(type) => {
                        onUpdate(element.id, { fillType: type });
                        useEditorStore.getState().pushHistory();
                      }}
                      onChangeSolidColor={(col) => {
                        onUpdate(element.id, { color: col });
                        useEditorStore.getState().pushHistory();
                      }}
                      onChangeColorStops={(stops) => {
                        onUpdate(element.id, {
                          fillLinearGradientColorStops: stops,
                          fillRadialGradientColorStops: stops,
                        });
                        useEditorStore.getState().pushHistory();
                      }}
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
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <PaintBucket className="w-3 h-3 text-primary/70" />
                      <span>تعبئة الشكل</span>
                    </span>
                    <GradientPicker
                      fillType={element.fillType || "solid"}
                      color={element.fill || "#6366f1"}
                      colorStops={element.fillLinearGradientColorStops || element.fillRadialGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"]}
                      onChangeType={(type) => {
                        onUpdate(element.id, { fillType: type });
                        useEditorStore.getState().pushHistory();
                      }}
                      onChangeSolidColor={(col) => {
                        onUpdate(element.id, { fill: col });
                        useEditorStore.getState().pushHistory();
                      }}
                      onChangeColorStops={(stops) => {
                        onUpdate(element.id, {
                          fillLinearGradientColorStops: stops,
                          fillRadialGradientColorStops: stops,
                        });
                        useEditorStore.getState().pushHistory();
                      }}
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
                  onUpdate(element.id, { flipX: !element.flipX });
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
    </div>
  );
}
