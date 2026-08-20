import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { ImageElement, useEditorStore } from "@/lib/editor-store";
import { useRenderQuality } from "@/lib/canvas/render-quality";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, RefreshCw, Sun, Contrast, Droplet, 
  EyeOff, Scissors, Paintbrush, X, ImagePlus, Wand2, ScanLine, ScanFace, Palette, Check, Loader2
} from "lucide-react";
import { SliderControl } from "../shared-controls";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SaveImageFromBase64 } from "../../../../../wailsjs/go/main/App";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { useFaceFrame } from "@/hooks/use-face-frame";

// أدوات الصور الثقيلة لا تُحمّل إلا عند فتحها، بدلاً من تأخير المحرر عند البدء.
const CropDialog = lazy(() => import("../../dialogs/crop-dialog").then((module) => ({ default: module.CropDialog })));
const DocumentScannerDialog = lazy(() => import("../../document-scanner").then((module) => ({ default: module.DocumentScannerDialog })));
const RefineBgDialog = lazy(() => import("../../dialogs/refine-bg-dialog").then((module) => ({ default: module.RefineBgDialog })));
interface ImagePropertiesProps {
  element: ImageElement;
  onUpdate: (id: string, patch: Partial<ImageElement>) => void;
}

export function ImageAdjustProperties({ 
  element, 
  onUpdate, 
  showReset = true 
}: ImagePropertiesProps & { showReset?: boolean }) {
  return (
    <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3">
      {!showReset && (
        <Label className="text-xs font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">
          تعديل الألوان
        </Label>
      )}

      {/* قوالب تدرج لوني سريعة للاستوديوهات */}
      <div className="space-y-1.5 pb-2 border-b border-border/20">
        <span className="text-[10px] font-bold text-muted-foreground block">قوالب ألوان الاستوديو</span>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "استوديو دافئ", b: 104, c: 106, s: 108 },
            { label: "جواز سفر حيوي", b: 108, c: 115, s: 118 },
            { label: "إشراق ناعم", b: 110, c: 95, s: 102 },
            { label: "أبيض وأسود", b: 105, c: 120, s: 0 },
          ].map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              className="h-7 text-[10px] font-semibold rounded-md border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              onClick={() => {
                onUpdate(element.id, {
                  brightness: preset.b,
                  contrast: preset.c,
                  saturation: preset.s,
                });
                useEditorStore.getState().pushHistory();
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <SliderControl
        label="السطوع"
        icon={<Sun className="w-3.5 h-3.5 text-muted-foreground/75" />}
        value={element.brightness ?? 100}
        min={0}
        max={200}
        step={1}
        unit="%"
        onChange={(v) => onUpdate(element.id, { brightness: v })}
        onCommit={() => { useRenderQuality.getState().setIsDraggingFilter(false); useEditorStore.getState().pushHistory(); }}
        onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true)}
        onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
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
        onCommit={() => { useRenderQuality.getState().setIsDraggingFilter(false); useEditorStore.getState().pushHistory(); }}
        onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true)}
        onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
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
        onCommit={() => { useRenderQuality.getState().setIsDraggingFilter(false); useEditorStore.getState().pushHistory(); }}
        onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true)}
        onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
      />
      <SliderControl
        label="الضبابية"
        icon={<EyeOff className="w-3.5 h-3.5 text-muted-foreground/75" />}
        value={element.blur ?? 0}
        min={0}
        max={20}
        step={1}
        unit="px"
        onChange={(v) => onUpdate(element.id, { blur: v })}
        onCommit={() => { useRenderQuality.getState().setIsDraggingFilter(false); useEditorStore.getState().pushHistory(); }}
        onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true)}
        onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
      />

      {showReset && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 rounded-md border border-border/40 hover:bg-muted"
          onClick={() => {
            onUpdate(element.id, {
              filter: "none",
              brightness: 100,
              contrast: 100,
              saturation: 100,
              blur: 0,
            });
            useEditorStore.getState().pushHistory();
          }}
        >
          <RefreshCw className="w-3 h-3" />
          <span>إعادة تعيين الألوان</span>
        </Button>
      )}
    </div>
  );
}

export function ImageStyleProperties({ element, onUpdate }: ImagePropertiesProps) {
   const [cropOpen, setCropOpen] = useState(false);
   const [scannerOpen, setScannerOpen] = useState(false);
   const isLicenseActive = useEditorStore((state) => state.isLicenseActive());
   const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
   const [refineOpen, setRefineOpen] = useState(false);

  const handleScannerSave = async (processedBase64: string) => {
    try {
      const localPath = await SaveImageFromBase64(processedBase64);

      const img = new Image();
       img.onload = () => {
         const width = img.width;
         const height = img.height;
         img.onload = null;
         img.onerror = null;
         img.src = "";
         if (!isMountedRef.current) return;

        const docAspect = width / height;
        const state = useEditorStore.getState();
        const canvasRatio = state.canvasWidth / state.canvasHeight;
        const newHeight = (element.width * canvasRatio) / docAspect;

        onUpdate(element.id, {
          imageSrc: localPath,
          height: newHeight,
        });

        state.setLastEditedImageAspect(docAspect);
        useEditorStore.getState().pushHistory();
        toast.success("تم استعدال وعزل المستند بنجاح!");
      };
       img.onerror = () => {
         img.onload = null;
         img.onerror = null;
         img.src = "";
         onUpdate(element.id, { imageSrc: localPath });
         useEditorStore.getState().pushHistory();
         toast.success("تم استعدال وعزل المستند بنجاح!");
       };
       img.src = localPath;
    } catch (err) {
      console.error(err);
      toast.error("فشل حفظ المستند المستعدل");
    }
  };
  const {
    isRemovingBg,
    bgProgress,
    bgProgressText,
    handleCancelBgRemoval,
    handleRemoveBg,
  } = useBgRemoval(onUpdate);
  const {
    isEnhancing,
    enhanceProgress,
    enhanceProgressText,
    remainingQuota,
    dailyLimit,
    handleEnhance,
  } = useAiEnhance(onUpdate);
  const {
    isFraming,
    frameProgress,
    frameProgressText,
    handleCancelFrame,
    handleFrameFace,
  } = useFaceFrame(onUpdate);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

   const handleOpenFile = async () => {
     if (isFileDialogOpen) return;
     setIsFileDialogOpen(true);
     try {
       const [b64] = await openImageFileDialog(false);
       if (b64) {
         const localPath = await SaveImageFromBase64(b64);
         onUpdate(element.id, { imageSrc: localPath });
         useEditorStore.getState().pushHistory();
       }
     } catch (err) {
       console.error(err);
       toast.error("فشل تغيير الصورة");
     } finally {
       setIsFileDialogOpen(false);
     }
   };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl space-y-3 shadow-xs fluent-specular">
        <div className="flex items-center justify-between border-b border-border/30 pb-2">
          <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>تحرير ومعالجة الصورة</span>
          </Label>
        </div>
        
        {/* زر عزل الخلفية الذكي (Hero Action) */}
        <Button
          variant={isRemovingBg ? "destructive" : "outline"}
          className={cn(
            "w-full flex items-center justify-between px-3 h-9 rounded-md transition-all duration-200 cursor-pointer active:scale-[0.99] group font-semibold text-xs border border-primary/40 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            isRemovingBg && "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          )}
          onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(element)}
          title={isRemovingBg ? "إلغاء العزل" : "عزل الخلفية الذكي للذكاء الاصطناعي"}
        >
          {isRemovingBg ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-destructive-foreground animate-spin shrink-0" />
              <span>{bgProgress > 0 ? `جاري العزل ... (${Math.round(bgProgress)}%)` : "جاري العزل ..."} (إلغاء)</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
                <span>عزل الخلفية الذكي</span>
              </div>
              {!isLicenseActive ? (
                <span className="text-[8.5px] bg-primary text-primary-foreground font-bold px-1.5 py-0.5 rounded-md tracking-wider uppercase">
                  PRO
                </span>
              ) : (
                <span className="text-[9px] bg-primary/20 border border-primary/40 text-primary px-1.5 py-0.5 rounded-md font-bold font-mono">
                  AI
                </span>
              )}
            </>
          )}
        </Button>

        {/* زر تحسين الجودة والوضوح (AI Enhance) */}
        <Button
          variant="outline"
          disabled={isEnhancing || isRemovingBg}
          className={cn(
            "w-full flex items-center justify-between px-3 h-9 rounded-md transition-all duration-200 cursor-pointer active:scale-[0.99] group font-semibold text-xs border border-primary/40 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            (isEnhancing || isRemovingBg) && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => handleEnhance(element)}
          title={`تحسين وتكبير دقة الصورة بالذكاء الاصطناعي (${remainingQuota}/${dailyLimit} المتبقي اليوم)`}
        >
          <div className="flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
            <span>تحسين الجودة والوضوح</span>
          </div>
          <span className="text-[9px] bg-primary/20 border border-primary/40 text-primary px-1.5 py-0.5 rounded-md font-bold font-mono">
            {remainingQuota}/{dailyLimit} اليوم
          </span>
        </Button>

        {/* زر ضبط الوجه تلقائياً (تأطير الهوية) */}
        <Button
          variant={isFraming ? "destructive" : "outline"}
          disabled={isEnhancing || isRemovingBg}
          className={cn(
            "w-full flex items-center justify-between px-3 h-9 rounded-md transition-all duration-200 cursor-pointer active:scale-[0.99] group font-semibold text-xs border border-primary/40 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            (isEnhancing || isRemovingBg) && "opacity-50 cursor-not-allowed",
            isFraming && "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
          )}
          onClick={isFraming ? handleCancelFrame : () => handleFrameFace(element)}
          title={isFraming ? "إلغاء ضبط الوجه" : "كشف الوجه وضبط مقاسه وموضعه وفق معايير الهوية تلقائياً"}
        >
          {isFraming ? (
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-destructive-foreground group-hover:scale-110 transition-transform shrink-0" />
              <span>إلغاء ضبط الوجه</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <ScanFace className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
                <span>ضبط الوجه تلقائياً</span>
              </div>
              <span className="text-[9px] bg-primary/20 border border-primary/40 text-primary px-1.5 py-0.5 rounded-md font-bold font-mono">
                محلي
              </span>
            </>
          )}
        </Button>

        {/* زر ماسح وتقويم المستندات الذكي (Doc Scanner) */}
        <Button
          variant="outline"
          className="w-full flex items-center justify-between px-3 h-9 rounded-md transition-all duration-200 cursor-pointer active:scale-[0.99] group font-semibold text-xs border border-primary/40 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          onClick={() => setScannerOpen(true)}
          title="مسح وتقويم حواف المستند وإزالة المنظور المائل"
        >
          <div className="flex items-center gap-2">
            <ScanLine className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
            <span>ماسح وتقويم المستند</span>
          </div>
          <span className="text-[9px] bg-primary/20 border border-primary/40 text-primary px-1.5 py-0.5 rounded-md font-bold font-mono">
            تلقائي
          </span>
        </Button>

        {/* قسم لون خلفية الصورة للشخصية / المعزولة */}
        <div className="space-y-2 pt-1 border-t border-border/25">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground/85 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span>خلفية الصورة المعزولة</span>
            </Label>
            <span className="text-[10px] text-muted-foreground font-medium">هويات / جوازات</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "trans", label: "شفاف", val: "transparent" },
              { id: "white", label: "أبيض للجوازات", val: "#ffffff" },
              { id: "blue", label: "أزرق رسمي", val: "#1d4ed8" },
              { id: "lblue", label: "أزرق فاتح", val: "#3b82f6" },
              { id: "gray", label: "رمادي", val: "#e5e7eb" },
            ].map((colorItem) => {
              const currBg = element.bgColor || "transparent";
              const isActive = currBg.toLowerCase() === colorItem.val.toLowerCase();
              return (
                <button
                  key={colorItem.id}
                  type="button"
                  title={colorItem.label}
                  onClick={() => {
                    onUpdate(element.id, { bgColor: colorItem.val });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "w-7 h-7 rounded-md border border-border/80 flex items-center justify-center cursor-pointer transition-all duration-150 relative shadow-2xs hover:scale-105 active:scale-95",
                    isActive && "ring-2 ring-primary ring-offset-1 border-primary"
                  )}
                  style={{
                    backgroundColor: colorItem.val === "transparent" ? undefined : colorItem.val,
                    backgroundImage: colorItem.val === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)" : undefined,
                    backgroundSize: colorItem.val === "transparent" ? "6px 6px" : undefined,
                    backgroundPosition: colorItem.val === "transparent" ? "0 0, 0 3px, 3px -3px, -3px 0px" : undefined,
                  }}
                >
                  {isActive && (
                    <Check className={cn("w-3.5 h-3.5 stroke-[3]", colorItem.val === "#ffffff" || colorItem.val === "#e5e7eb" ? "text-slate-900" : "text-white")} />
                  )}
                </button>
              );
            })}

            {/* Custom Color Input */}
            <div className="flex items-center gap-1 border border-border/80 rounded-md px-1.5 h-7 bg-background" title="لون مخصص">
              <input
                type="color"
                value={element.bgColor === "transparent" || !element.bgColor ? "#ffffff" : element.bgColor}
                onChange={(e) => onUpdate(element.id, { bgColor: e.target.value })}
                onBlur={() => useEditorStore.getState().pushHistory()}
                className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
              />
            </div>
          </div>
        </div>

        {/* أزرار القص وتغيير الصورة */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs group text-foreground shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            onClick={() => setCropOpen(true)}
            title="قص وتدوير الصورة"
          >
            <Scissors className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            <span>قص وتدوير</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs group text-foreground shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            onClick={handleOpenFile}
            title="تغيير الصورة"
          >
            <ImagePlus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            <span>تغيير الصورة</span>
          </Button>
        </div>

        {element.originalImageSrc && (
          <Button
            variant="outline"
            className="w-full mt-0.5 h-8 text-xs font-semibold transition-all duration-200 flex items-center justify-start px-3 gap-2 cursor-pointer rounded-md border-border/60 hover:border-primary/40 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            onClick={() => setRefineOpen(true)}
          >
            <Paintbrush className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            <span>تعديل يدوي وحواف</span>
          </Button>
        )}

        {isRemovingBg && (
          <div className="mt-2 p-2.5 rounded-xl bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] border border-indigo-500/10 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
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

        {isEnhancing && (
          <div className="mt-2 p-2.5 rounded-xl bg-violet-500/[0.05] dark:bg-violet-500/[0.08] border border-violet-500/20 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
            <div className="flex justify-between items-center text-[9px] font-bold text-violet-600 dark:text-violet-400">
              <span className="animate-pulse">{enhanceProgressText}</span>
              <span className="font-mono font-extrabold">{enhanceProgress}%</span>
            </div>
            <div className="w-full bg-muted dark:bg-muted/30 h-1.5 rounded-full overflow-hidden border border-border/15">
              <div 
                className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${enhanceProgress}%` }}
              />
            </div>
          </div>
        )}

        {isFraming && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08] border border-emerald-500/20 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
            <div className="flex justify-between items-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="animate-pulse">{frameProgressText}</span>
              <span className="font-mono font-extrabold">{frameProgress}%</span>
            </div>
            <div className="w-full bg-muted dark:bg-muted/30 h-1.5 rounded-full overflow-hidden border border-border/15">
              <div 
                className="bg-gradient-to-r from-emerald-600 via-teal-500 to-green-400 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${frameProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {element.imageSrc && cropOpen && (
        <Suspense fallback={null}>
          <CropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageSrc={element.imageSrc}
          originalImageSrc={element.originalImageSrc}
          onCropSave={async (cropped, dims) => {
            try {
              // حفظ الصورة المقصوصة محلياً بدلاً من تخزين Base64 في الذاكرة
              const localPath = await SaveImageFromBase64(cropped);
              
               const img = new Image();
               img.onload = () => {
                 const width = img.width;
                 const height = img.height;
                 img.onload = null;
                 img.onerror = null;
                 img.src = "";
                 if (!isMountedRef.current) return;
                
                const croppedAspect = (dims && dims.width > 0 && dims.height > 0) ? (dims.width / dims.height) : (width / height);
                const state = useEditorStore.getState();
                const canvasRatio = state.canvasWidth / state.canvasHeight;
                const newHeight = (element.width * canvasRatio) / croppedAspect;
                
                onUpdate(element.id, { 
                  imageSrc: localPath,
                  height: newHeight
                });
                
                state.setLastEditedImage(localPath);
                state.setLastEditedImageAspect(croppedAspect);
                // حفظ القص يُسجل كخطوة تراجع مستقلة (إصلاح E-5)
                state.pushHistory();
              };
               img.onerror = () => {
                 img.onload = null;
                 img.onerror = null;
                 img.src = "";
                 // إشعار فشل فك تشفير الصورة المقصوصة — بدون تحديث للعنصر
                 toast.error("فشل قراءة الصورة المقصوصة");
               };
               img.src = cropped;
            } catch (err) {
              console.error("Failed to save cropped image:", err);
              toast.error("فشل حفظ الصورة المقصوصة محلياً");
            }
          }}
          />
        </Suspense>
      )}

      {element.imageSrc && scannerOpen && (
        <Suspense fallback={null}>
          <DocumentScannerDialog
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          imageSrc={element.imageSrc}
          onSave={handleScannerSave}
          />
        </Suspense>
      )}

      {element.imageSrc && element.originalImageSrc && refineOpen && (
        <Suspense fallback={null}>
          <RefineBgDialog
          open={refineOpen}
          onOpenChange={setRefineOpen}
          element={element}
          onSave={async (newImageSrc) => {
            onUpdate(element.id, { imageSrc: newImageSrc });
            useEditorStore.getState().pushHistory();
          }}
          />
        </Suspense>
      )}
    </div>
  );
}
