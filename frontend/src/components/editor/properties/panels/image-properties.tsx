import { useState, useEffect, useRef } from "react";
import { ImageElement, useEditorStore } from "@/lib/editor-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, RefreshCw, Sun, Contrast, Droplet, 
  EyeOff, Scissors, Paintbrush, X
} from "lucide-react";
import { CropDialog } from "../../crop-dialog";
import { SliderControl } from "../shared-controls";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SaveImageFromBase64 } from "../../../../../wailsjs/go/main/App";
import { RefineBgDialog } from "../../refine-bg-dialog";
import { useBgRemoval } from "@/hooks/use-bg-removal";

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

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2.5">
        <Label className="text-[11px] font-bold text-foreground/80 block">تحرير الصورة</Label>
        
        <Button
          variant={isRemovingBg ? "destructive" : "secondary"}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 h-10 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.97] group font-bold text-xs",
            !isRemovingBg && "hover:bg-primary/10 hover:text-primary"
          )}
          onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(element)}
          title={isRemovingBg ? "إلغاء عملية عزل الخلفية" : "إزالة الخلفية بالذكاء الاصطناعي"}
        >
          {isRemovingBg ? (
            <>
              <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>إلغاء العملية</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 group-hover:scale-115 group-hover:rotate-6 transition-all duration-300" />
              <span className="flex items-center gap-1">
                عزل الخلفية
                {!isLicenseActive && (
                  <span className="text-[8px] bg-primary text-primary-foreground px-1 py-0.5 rounded font-extrabold uppercase scale-90 select-none leading-none">PRO</span>
                )}
              </span>
            </>
          )}
        </Button>

        {element.originalImageSrc && (
          <Button
            variant="outline"
            className="w-full mt-2 h-9 text-[11px] font-semibold transition-colors gap-2"
            onClick={() => setRefineOpen(true)}
          >
            <Paintbrush className="w-3.5 h-3.5 text-muted-foreground" />
            تعديل القص يدوياً (ممحاة / استرجاع)
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
