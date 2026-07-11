import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  ImageIcon, Paintbrush, Sliders, ImagePlus, Scissors, Copy, FolderHeart, Trash2, Sparkles, X
} from "lucide-react";
import { OpenFile, SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { toast } from "sonner";
import { useEditorStore, CanvasSlot } from "@/lib/editor-store";
import { CropDialog } from "../crop-dialog";
import { SliderControl } from "./shared-controls";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { RefineBgDialog } from "../refine-bg-dialog";
import { Switch } from "@/components/ui/switch";

export function SlotProperties({
  slot,
  onUpdate,
}: {
  slot: CanvasSlot;
  onUpdate: (id: string, patch: Partial<CanvasSlot>) => void;
}) {
  const { fillAllSlots, setSlotImage, lastEditedImage, canvasWidth, canvasHeight, printSettings } = useEditorStore(useShallow((state) => ({
    fillAllSlots: state.fillAllSlots,
    setSlotImage: state.setSlotImage,
    lastEditedImage: state.lastEditedImage,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    printSettings: state.printSettings,
  })));
  const [cropOpen, setCropOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [autoFill, setAutoFill] = useState(() => {
    return localStorage.getItem("grido_auto_fill_grid") !== "false";
  });
  
  const {
    isRemovingBg,
    bgProgress,
    bgProgressText,
    handleCancelBgRemoval,
    handleRemoveBg,
  } = useBgRemoval(onUpdate);

  const handleOpenFile = async () => {
    try {
      const b64 = await OpenFile();
      if (b64) {
        setSlotImage(slot.id, b64);
        if (autoFill) {
          fillAllSlots(b64);
        }
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
      if (autoFill) {
        fillAllSlots(lastEditedImage);
      }
    }
  };

  const dpi = printSettings.dpi || 300;
  const widthMM = Math.round((slot.w * canvasWidth / dpi) * 25.4);
  const heightMM = Math.round((slot.h * canvasHeight / dpi) * 25.4);

  const renderAutoFillToggle = () => (
    <div className="flex items-center justify-between bg-muted/40 dark:bg-muted/15 p-3 rounded-xl border border-border/40 mt-1 font-cairo" dir="rtl">
      <div className="flex flex-col text-right">
        <span className="text-[10px] font-bold text-foreground">تعبئة تلقائية لكافة الخلايا</span>
        <span className="text-[8px] text-muted-foreground mt-0.5">تكرار نفس الصورة تلقائياً عند الرفع</span>
      </div>
      <Switch 
        checked={autoFill}
        onCheckedChange={(checked) => {
          setAutoFill(checked);
          localStorage.setItem("grido_auto_fill_grid", String(checked));
        }}
      />
    </div>
  );

  if (!slot.imageSrc) {
    return (
      <div className="space-y-4 p-2">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-right space-y-1 font-cairo shadow-inner">
          <span className="text-[10px] font-bold text-muted-foreground block">أبعاد الخلية الفعلية للطباعة</span>
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="text-lg font-extrabold text-primary">{widthMM} × {heightMM}</span>
            <span className="text-[11px] font-bold text-primary/80">مم</span>
            <span className="text-[9px] text-muted-foreground/60 mr-2 font-medium">({dpi} DPI)</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center py-4">
          لا توجد صورة في هذه الخلية.
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 h-10 rounded-xl font-bold cursor-pointer"
          onClick={handleOpenFile}
        >
          <ImagePlus className="w-4 h-4 text-primary" />
          رفع صورة للخلية
        </Button>
        {lastEditedImage && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-1.5 h-10 rounded-xl font-bold cursor-pointer"
            onClick={handleUseLastImage}
          >
            <Copy className="w-4 h-4 text-primary" />
            تعبئة بآخر صورة معدلة
          </Button>
        )}

        {renderAutoFillToggle()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-right space-y-1 font-cairo shadow-inner">
        <span className="text-[10px] font-bold text-muted-foreground block">أبعاد الخلية الفعلية للطباعة</span>
        <div className="flex items-baseline justify-end gap-1.5">
          <span className="text-lg font-extrabold text-primary">{widthMM} × {heightMM}</span>
          <span className="text-[11px] font-bold text-primary/80">مم</span>
          <span className="text-[9px] text-muted-foreground/60 mr-2 font-medium">({dpi} DPI)</span>
        </div>
      </div>

      <div className="text-xs font-semibold text-primary flex items-center justify-between border-b border-border/10 pb-2">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>خصائص صورة الخلية</span>
        </div>
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9 p-[3px] bg-muted rounded-lg border">
          <TabsTrigger value="style" title="التنسيق والمظهر" className="rounded-md py-1 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
            <Paintbrush className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="adjust" title="تعديل الألوان" className="rounded-md py-1 cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
            <Sliders className="w-3.5 h-3.5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="mt-3.5 space-y-3.5 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-border/60 hover:border-primary/45 hover:bg-accent/50 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs"
              onClick={handleOpenFile}
              title="تغيير الصورة"
            >
              <ImagePlus className="w-4 h-4 text-primary" />
              <span>تغيير الصورة</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-border/60 hover:border-primary/45 hover:bg-accent/50 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs"
              onClick={() => setCropOpen(true)}
              title="قص وتدوير الصورة"
            >
              <Scissors className="w-4 h-4 text-primary" />
              <span>قص وتدوير</span>
            </Button>
          </div>

          <Button
            variant="secondary"
            className="w-full h-10 gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-900/30 transition-all cursor-pointer flex items-center justify-center font-bold text-xs shadow-xs active:scale-[0.98]"
            onClick={handleFillAll}
          >
            <Copy className="w-4 h-4" />
            <span>تكرار هذه الصورة في كل الخلايا</span>
          </Button>

          {renderAutoFillToggle()}

          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 mt-3 space-y-2.5">
            <Label className="text-[11px] font-bold text-foreground/80 block">عزل وتعديل الخلفية</Label>
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
                onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(slot)}
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

            {slot.originalImageSrc && (
              <Button
                variant="outline"
                className="w-full mt-2 h-9 text-[11px] font-semibold border-indigo-500/30 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950 transition-colors gap-2 flex items-center justify-center cursor-pointer"
                onClick={() => setRefineOpen(true)}
              >
                <Paintbrush className="w-3.5 h-3.5 text-primary" />
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

          {slot.imageSrc && (
            <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 mt-3 space-y-2">
              <SliderControl
                label="تكبير الصورة (Zoom)"
                value={Math.round((slot.zoom ?? 1) * 100)}
                min={100}
                max={300}
                step={5}
                onChange={(v) => {
                  onUpdate(slot.id, { zoom: v / 100 });
                }}
                unit="%"
              />
              <p className="text-[9px] text-muted-foreground/60 text-right leading-relaxed">
                💡 يمكنك تحريك موضع الصورة بالفأرة (سحب وإفلات) مباشرة داخل الخلية بعد تحديدها.
              </p>
            </div>
          )}

          {slot.imageSrc && (
            <CropDialog
              open={cropOpen}
              onOpenChange={setCropOpen}
              imageSrc={slot.imageSrc}
              onCropSave={async (cropped) => {
                try {
                  const localPath = await SaveImageFromBase64(cropped);
                  onUpdate(slot.id, { imageSrc: localPath });
                } catch (err) {
                  console.error("Failed to save cropped slot image:", err);
                  toast.error("فشل حفظ الصورة المقصوصة محلياً");
                }
              }}
            />
          )}

          {slot.imageSrc && slot.originalImageSrc && (
            <RefineBgDialog
              open={refineOpen}
              onOpenChange={setRefineOpen}
              element={slot}
              onSave={async (newImageSrc) => {
                onUpdate(slot.id, { imageSrc: newImageSrc });
                useEditorStore.getState().pushHistory();
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="adjust" className="mt-3.5 space-y-3.5 animate-in fade-in duration-200">
          <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
            <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">تعديل الألوان</Label>
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
              className="w-full mt-2"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
