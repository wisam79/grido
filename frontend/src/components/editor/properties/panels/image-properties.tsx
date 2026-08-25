import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { ImageElement, useEditorStore } from "@/lib/editor-store";
import { useRenderQuality } from "@/lib/canvas/render-quality";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, RefreshCw, Sun, Contrast, Droplet, 
  Eye, EyeOff, Scissors, Paintbrush, X, ImagePlus, Wand2, ScanLine, ScanFace, Palette, Check, Loader2, RotateCcw
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
    <div className="bg-card border border-border p-3 rounded-xl shadow-xs fluent-specular space-y-3">
      {!showReset && (
        <Label className="text-xs font-bold text-foreground/80 block border-b border-border/40 pb-1.5 mb-1">
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
    <div className="space-y-2.5 font-cairo animate-in fade-in duration-200">
      {/* 🎴 بطاقة 1: شبكة أدوات الذكاء الاصطناعي الفاخرة (2x2 Grid) */}
      <div className="bg-card border border-border/80 p-2.5 rounded-xl space-y-2 shadow-xs fluent-specular">
        <div className="grid grid-cols-2 gap-1.5">
          {/* 1. عزل الخلفية */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isRemovingBg ? "destructive" : "outline"}
                className={cn(
                  "h-12 flex flex-col items-center justify-center gap-1 rounded-lg border border-border/70 hover:border-primary/50 bg-input/40 hover:bg-primary/10 transition-all cursor-pointer p-1 group shadow-2xs",
                  isRemovingBg && "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
                )}
                onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(element)}
              >
                {isRemovingBg ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
                )}
                <span className="text-[11px] font-bold">{isRemovingBg ? "إلغاء" : "عزل الخلفية"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isRemovingBg ? bgProgressText || "إلغاء عزل الخلفية" : "عزل الخلفية الذكي (AI)"}
            </TooltipContent>
          </Tooltip>

          {/* 2. ترميم الوجه */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                disabled={isEnhancing || isRemovingBg}
                className={cn(
                  "h-12 flex flex-col items-center justify-center gap-1 rounded-lg border border-border/70 hover:border-primary/50 bg-input/40 hover:bg-primary/10 transition-all cursor-pointer p-1 group shadow-2xs",
                  (isEnhancing || isRemovingBg) && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleEnhance(element)}
              >
                {isEnhancing ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <Wand2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
                )}
                <span className="text-[11px] font-bold">{isEnhancing ? "معالجة..." : "ترميم الوجه"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {`ترميم الوجه ورفع الدقة بالذكاء الاصطناعي (${remainingQuota}/${dailyLimit} المتبقي اليوم)`}
            </TooltipContent>
          </Tooltip>

          {/* 3. تأطير الوجه */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isFraming ? "destructive" : "outline"}
                className={cn(
                  "h-12 flex flex-col items-center justify-center gap-1 rounded-lg border border-border/70 hover:border-primary/50 bg-input/40 hover:bg-primary/10 transition-all cursor-pointer p-1 group shadow-2xs",
                  isFraming && "animate-pulse"
                )}
                onClick={isFraming ? handleCancelFrame : () => handleFrameFace(element)}
              >
                {isFraming ? (
                  <X className="w-4 h-4 text-destructive-foreground shrink-0" />
                ) : (
                  <ScanFace className="w-4 h-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
                )}
                <span className="text-[11px] font-bold">{isFraming ? "إلغاء" : "تأطير الوجه"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isFraming ? frameProgressText || "إلغاء ضبط الوجه" : "كشف وتأطير الوجه وفق معايير الهوية (محلي)"}
            </TooltipContent>
          </Tooltip>

          {/* 4. مسح المستند */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-12 flex flex-col items-center justify-center gap-1 rounded-lg border border-border/70 hover:border-primary/50 bg-input/40 hover:bg-primary/10 transition-all cursor-pointer p-1 group shadow-2xs"
                onClick={() => setScannerOpen(true)}
              >
                <ScanLine className="w-4 h-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] font-bold">مسح المستند</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              مسح وتقويم حواف المستند وإزالة المنظور المائل
            </TooltipContent>
          </Tooltip>
        </div>

        {/* أشرطة تقدم العمليات */}
        {isRemovingBg && (
          <div className="p-2 rounded-lg bg-primary/[0.05] border border-primary/10 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
            <div className="flex justify-between items-center text-[9px] font-bold text-primary">
              <span className="animate-pulse">{bgProgressText}</span>
              <span>{Math.round(bgProgress)}%</span>
            </div>
            <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${bgProgress}%` }}
              />
            </div>
          </div>
        )}

        {isEnhancing && (
          <div className="p-2 rounded-lg bg-primary/[0.05] border border-primary/10 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
            <div className="flex justify-between items-center text-[9px] font-bold text-primary">
              <span className="animate-pulse">{enhanceProgressText}</span>
              <span>{Math.round(enhanceProgress)}%</span>
            </div>
            <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${enhanceProgress}%` }}
              />
            </div>
          </div>
        )}

        {isFraming && (
          <div className="p-2 rounded-lg bg-primary/[0.05] border border-primary/10 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
            <div className="flex justify-between items-center text-[9px] font-bold text-primary">
              <span className="animate-pulse">{frameProgressText}</span>
              <span>{Math.round(frameProgress)}%</span>
            </div>
            <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${frameProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 🎴 بطاقة 2: خلفية الصورة */}
      <div className="bg-card border border-border/80 p-2.5 rounded-xl space-y-2 shadow-xs fluent-specular">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/85">
          <Palette className="w-3.5 h-3.5 text-primary" />
          <span>خلفية الصورة</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "trans", label: "شفاف", val: "transparent" },
            { id: "white", label: "أبيض", val: "#ffffff" },
            { id: "blue", label: "أزرق رسمي", val: "#1d4ed8" },
            { id: "lblue", label: "أزرق فاتح", val: "#3b82f6" },
            { id: "gray", label: "رمادي", val: "#e5e7eb" },
          ].map((colorItem) => {
            const currBg = element.bgColor || "transparent";
            const isActive = currBg.toLowerCase() === colorItem.val.toLowerCase();
            return (
              <Tooltip key={colorItem.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate(element.id, { bgColor: colorItem.val });
                      useEditorStore.getState().pushHistory();
                    }}
                    className={cn(
                      "w-7 h-7 rounded-md border border-border flex items-center justify-center cursor-pointer transition-all duration-150 relative shadow-2xs hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
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
                </TooltipTrigger>
                <TooltipContent side="top">{colorItem.label}</TooltipContent>
              </Tooltip>
            );
          })}

          {/* Custom Color Input */}
          <div className="flex items-center gap-1 border border-border rounded-md px-1.5 h-7 bg-input" title="لون مخصص">
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

      {/* 🎴 بطاقة 3: أدوات الصورة والقص */}
      <div className="bg-card border border-border/80 p-2.5 rounded-xl space-y-2 shadow-xs fluent-specular">
        <div className="grid grid-cols-2 gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs group text-foreground shadow-2xs"
                onClick={() => setCropOpen(true)}
              >
                <Scissors className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <span>قص وتدوير</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">قص وتدوير الصورة</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs group text-foreground shadow-2xs"
                onClick={handleOpenFile}
              >
                <ImagePlus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <span>تبديل الصورة</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">استبدال ملف الصورة</TooltipContent>
          </Tooltip>
        </div>

        {element.originalImageSrc && (
          <div className="space-y-1.5 pt-1.5 border-t border-border/30 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                onClick={() => {
                  onUpdate(element.id, {
                    imageSrc: element.originalImageSrc,
                    originalImageSrc: undefined,
                    bgColor: "transparent"
                  });
                  useEditorStore.getState().pushHistory();
                  toast.success("تمت استعادة الصورة الأصلية");
                }}
                title="استعادة الصورة الأصلية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>الأصل</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer select-none active:bg-primary active:text-primary-foreground"
                onMouseDown={() => {
                  const curr = element.imageSrc;
                  onUpdate(element.id, { imageSrc: element.originalImageSrc });
                  const restore = () => {
                    onUpdate(element.id, { imageSrc: curr });
                    window.removeEventListener("mouseup", restore);
                  };
                  window.addEventListener("mouseup", restore);
                }}
                title="اضغط مطولاً للمقارنة مع الأصل"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>مقارنة</span>
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full h-8 text-xs font-semibold transition-all duration-200 flex items-center justify-center px-3 gap-1.5 cursor-pointer rounded-md border-border/60 hover:border-primary/40 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground group"
              onClick={() => setRefineOpen(true)}
            >
              <Paintbrush className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <span>تعديل العزل يدوياً</span>
            </Button>
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
