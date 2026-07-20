import { useState, useEffect, useRef } from "react";
import { ImageElement, useEditorStore } from "@/lib/editor-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, RefreshCw, Sun, Contrast, Droplet, 
  EyeOff, Scissors, Paintbrush, X, ImagePlus, Wand2
} from "lucide-react";
import { CropDialog } from "../../crop-dialog";
import { SliderControl } from "../shared-controls";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SaveImageFromBase64, OpenFile } from "../../../../../wailsjs/go/main/App";
import { RefineBgDialog } from "../../refine-bg-dialog";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
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
    <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
      {!showReset && (
        <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">
          تعديل الألوان
        </Label>
      )}
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

      {showReset && (
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
      )}
    </div>
  );
}

export function ImageStyleProperties({ element, onUpdate }: ImagePropertiesProps) {
  const [cropOpen, setCropOpen] = useState(false);
  const isLicenseActive = useEditorStore((state) => state.isLicenseActive());
  const [refineOpen, setRefineOpen] = useState(false);
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

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleOpenFile = async () => {
    try {
      const b64 = await OpenFile();
      if (b64) {
        const localPath = await SaveImageFromBase64(b64);
        onUpdate(element.id, { imageSrc: localPath });
        useEditorStore.getState().pushHistory();
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل تغيير الصورة");
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="bg-card/40 dark:bg-card/20 backdrop-blur-xs p-3.5 rounded-2xl border border-border/50 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/30 pb-2">
          <Label className="text-[11px] font-extrabold text-foreground/90 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>تحرير ومعالجة الصورة</span>
          </Label>
        </div>
        
        {/* زر عزل الخلفية الذكي */}
        <Button
          variant={isRemovingBg ? "destructive" : "outline"}
          className={cn(
            "w-full flex items-center justify-center gap-2 h-10.5 rounded-xl transition-all duration-300 cursor-pointer active:scale-[0.98] group font-extrabold text-xs shadow-xs",
            !isRemovingBg && "bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500/50"
          )}
          onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(element)}
          title={isRemovingBg ? "إلغاء العزل" : "عزل الخلفية الذكي للذكاء الاصطناعي"}
        >
          {isRemovingBg ? (
            <>
              <X className="w-4 h-4 group-hover:scale-110 transition-transform text-destructive-foreground" />
              <span>إلغاء العملية الحالية</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 group-hover:scale-115 group-hover:rotate-12 transition-all duration-300 text-emerald-500" />
              <span className="flex items-center gap-1.5">
                عزل الخلفية الذكي
                {!isLicenseActive && (
                  <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider scale-95 shadow-xs">PRO</span>
                )}
              </span>
            </>
          )}
        </Button>

        {/* زر تحسين الجودة والوضوح */}
        <Button
          variant="outline"
          disabled={isEnhancing || isRemovingBg}
          className={cn(
            "w-full flex items-center justify-between px-3.5 h-10.5 rounded-xl transition-all duration-300 cursor-pointer active:scale-[0.98] group font-extrabold text-xs bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-violet-500/10 hover:from-indigo-500/20 hover:to-violet-500/20 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:border-indigo-500/50 shadow-xs",
            (isEnhancing || isRemovingBg) && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => handleEnhance(element)}
          title={`تحسين وتكبير دقة الصورة بالذكاء الاصطناعي (${remainingQuota}/${dailyLimit} المتبقي اليوم)`}
        >
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 text-indigo-500" />
            <span>تحسين الجودة والوضوح ✨</span>
          </div>
          <span className="text-[9.5px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-extrabold shadow-2xs font-mono">
            {remainingQuota}/{dailyLimit} اليوم
          </span>
        </Button>

        {/* أزرار القص وتغيير الصورة */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-border/60 hover:border-primary/50 hover:bg-accent/60 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs shadow-2xs group"
            onClick={() => setCropOpen(true)}
            title="قص وتدوير الصورة"
          >
            <Scissors className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            <span>قص وتدوير</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-border/60 hover:border-primary/50 hover:bg-accent/60 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs shadow-2xs group"
            onClick={handleOpenFile}
            title="تغيير الصورة"
          >
            <ImagePlus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            <span>تغيير الصورة</span>
          </Button>
        </div>

        {element.originalImageSrc && (
          <Button
            variant="outline"
            className="w-full mt-1.5 h-9 text-[11px] font-bold transition-all gap-2 flex items-center justify-center cursor-pointer rounded-xl border-border/50 hover:bg-muted/60"
            onClick={() => setRefineOpen(true)}
          >
            <Paintbrush className="w-3.5 h-3.5 text-muted-foreground" />
            تعديل يدوي وحواف
          </Button>
        )}

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

        {isEnhancing && (
          <div className="mt-2 p-2.5 rounded-lg bg-violet-500/[0.05] dark:bg-violet-500/[0.08] border border-violet-500/20 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
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
      </div>

      {element.imageSrc && (
        <CropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageSrc={element.imageSrc}
          originalImageSrc={element.originalImageSrc}
          onCropSave={async (cropped) => {
            try {
              // حفظ الصورة المقصوصة محلياً بدلاً من تخزين Base64 في الذاكرة
              const localPath = await SaveImageFromBase64(cropped);
              
              const img = new Image();
              img.onload = () => {
                const width = img.width;
                const height = img.height;
                img.onload = null;
                img.onerror = null;
                if (!isMountedRef.current) return;
                
                const croppedAspect = width / height;
                const state = useEditorStore.getState();
                const canvasRatio = state.canvasWidth / state.canvasHeight;
                const newHeight = element.width * canvasRatio / croppedAspect;
                
                onUpdate(element.id, { 
                  imageSrc: localPath,
                  height: newHeight
                });
                
                state.setLastEditedImageAspect(croppedAspect);
              };
              img.onerror = () => {
                img.onload = null;
                img.onerror = null;
              };
              img.src = cropped;
            } catch (err) {
              console.error("Failed to save cropped image:", err);
              toast.error("فشل حفظ الصورة المقصوصة محلياً");
            }
          }}
        />
      )}

      {element.imageSrc && element.originalImageSrc && (
        <RefineBgDialog
          open={refineOpen}
          onOpenChange={setRefineOpen}
          element={element}
          onSave={async (newImageSrc) => {
            onUpdate(element.id, { imageSrc: newImageSrc });
            useEditorStore.getState().pushHistory();
          }}
        />
      )}
    </div>
  );
}
