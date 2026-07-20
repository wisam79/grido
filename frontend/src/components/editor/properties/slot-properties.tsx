import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  ImageIcon, Paintbrush, Sliders, ImagePlus, Scissors, Copy, Sparkles, X, Rows, Columns, LayoutGrid, Wand2
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { OpenFile, SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { toast } from "sonner";
import { useEditorStore, CanvasSlot } from "@/lib/editor-store";
import { CropDialog } from "../crop-dialog";
import { SliderControl } from "./shared-controls";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { RefineBgDialog } from "../refine-bg-dialog";
import { Switch } from "@/components/ui/switch";

export function SlotProperties({
  slot,
  onUpdate,
}: {
  slot: CanvasSlot;
  onUpdate: (id: string, patch: Partial<CanvasSlot>) => void;
}) {
  const { fillAllSlots, fillRowSlots, fillColumnSlots, setSlotImage, lastEditedImage, canvasWidth, canvasHeight, printSettings } = useEditorStore(useShallow((state) => ({
    fillAllSlots: state.fillAllSlots,
    fillRowSlots: state.fillRowSlots,
    fillColumnSlots: state.fillColumnSlots,
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
  
  const isLicenseActive = useEditorStore((state) => state.isLicenseActive());

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

  const handleOpenFile = async () => {
    try {
      const b64 = await OpenFile();
      if (b64) {
        // قراءة أحدث نسخة من الـ store بعد إغلاق نافذة الملف (لتجنب stale closure)
        const freshStore = useEditorStore.getState();
        freshStore.setSlotImage(slot.id, b64);
        if (autoFill) {
          freshStore.fillAllSlots(b64, slot.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFillAll = () => {
    if (slot.imageSrc) {
      fillAllSlots(slot.imageSrc, slot.id);
    }
  };

  const handleFillRow = () => {
    if (slot.imageSrc) {
      fillRowSlots(slot.id, slot.imageSrc);
    }
  };

  const handleFillColumn = () => {
    if (slot.imageSrc) {
      fillColumnSlots(slot.id, slot.imageSrc);
    }
  };

  const handleUseLastImage = () => {
    if (lastEditedImage) {
      setSlotImage(slot.id, lastEditedImage);
      if (autoFill) {
        fillAllSlots(lastEditedImage, slot.id);
      }
    }
  };

  const dpi = printSettings.dpi || 300;
  const widthMM = Math.round((slot.w * canvasWidth / dpi) * 25.4);
  const heightMM = Math.round((slot.h * canvasHeight / dpi) * 25.4);

  const renderAutoFillToggle = () => (
    <div className="flex items-center justify-between bg-muted/30 dark:bg-muted/15 p-2.5 rounded-xl border border-border/40 font-cairo" dir="rtl">
      <div className="flex items-center gap-2 text-right">
        <Copy className="w-3.5 h-3.5 text-primary shrink-0" />
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-foreground">تعبئة تلقائية</span>
          <span className="text-[9px] text-muted-foreground">تكرار الصورة في باقي الخلايا عند الرفع</span>
        </div>
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
      <div className="space-y-3 p-1 font-cairo">
        {/* أبعاد الخلية الفعالة */}
        <div className="flex items-center justify-between bg-card/80 border border-primary/20 rounded-xl px-3 py-2.5 shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground">أبعاد الخلية للطباعة</span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-base font-black text-primary">{widthMM} × {heightMM}</span>
            <span className="text-[10px] font-bold text-primary/80">مم</span>
            <span className="text-[9px] text-muted-foreground/60 mr-1">({dpi} DPI)</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center py-6 bg-muted/15 rounded-xl border border-dashed border-border/40">
          لا توجد صورة في هذه الخلية
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 h-10 rounded-xl font-bold cursor-pointer border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all"
          onClick={handleOpenFile}
        >
          <ImagePlus className="w-4 h-4 text-primary" />
          رفع صورة للخلية
        </Button>
        {lastEditedImage && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2 h-10 rounded-xl font-bold cursor-pointer"
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
    <div className="space-y-3.5 font-cairo">
      {/* شريط الأبعاد الهيدر */}
      <div className="flex items-center justify-between bg-card/80 border border-primary/20 rounded-xl px-3 py-2.5 shadow-xs">
        <span className="text-[10px] font-bold text-muted-foreground">أبعاد الخلية للطباعة</span>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-base font-black text-primary">{widthMM} × {heightMM}</span>
          <span className="text-[10px] font-bold text-primary/80">مم</span>
          <span className="text-[9px] text-muted-foreground/60 mr-1 font-medium">({dpi} DPI)</span>
        </div>
      </div>

      {/* عنوان خصائص الخلية */}
      <div className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border/15 pb-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        <span>خصائص صورة الخلية</span>
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9.5 p-[3px] bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/30">
          <TabsTrigger 
            value="style" 
            className="rounded-lg py-1 text-xs font-bold gap-1.5 cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground shadow-xs"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>التنسيق والمظهر</span>
          </TabsTrigger>
          <TabsTrigger 
            value="adjust" 
            className="rounded-lg py-1 text-xs font-bold gap-1.5 cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>تعديل الألوان</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="mt-3 space-y-3 animate-in fade-in duration-150">
          {/* أزرار العمليات الرئيسية */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-border/60 hover:border-primary/45 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs"
              onClick={handleOpenFile}
            >
              <ImagePlus className="w-4 h-4 text-primary" />
              <span>تغيير الصورة</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-border/60 hover:border-primary/45 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs"
              onClick={() => setCropOpen(true)}
            >
              <Scissors className="w-4 h-4 text-primary" />
              <span>قص وتدوير</span>
            </Button>
          </div>

          {/* تكرار الصورة في الخلايا */}
          <div className="space-y-1.5 bg-muted/20 dark:bg-muted/10 p-2.5 rounded-xl border border-border/30">
            <Label className="text-[10px] font-bold text-muted-foreground block text-right">تكرار الصورة في الخلايا</Label>
            <div className="grid grid-cols-3 gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs border-border/50 hover:bg-accent"
                      onClick={handleFillRow}
                    >
                      <Rows className="w-3.5 h-3.5 text-primary" />
                      <span>الصف</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">تعبئة الصف كاملاً</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs border-border/50 hover:bg-accent"
                      onClick={handleFillColumn}
                    >
                      <Columns className="w-3.5 h-3.5 text-primary" />
                      <span>العمود</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">تعبئة العمود كاملاً</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs border-border/50 hover:bg-accent"
                      onClick={handleFillAll}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                      <span>الكل</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">تعبئة كافة الخلايا</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {renderAutoFillToggle()}

          {/* عزل وتعديل الخلفية */}
          <div className="bg-muted/20 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2.5">
            <Label className="text-[11px] font-bold text-foreground/90 block">عزل وتعديل الخلفية</Label>
            
            <Button
              variant={isRemovingBg ? "destructive" : "secondary"}
              className={cn(
                "w-full flex items-center justify-center gap-2 h-10 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.98] group font-bold text-xs shadow-xs",
                !isRemovingBg && "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
              )}
              onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(slot)}
            >
              {isRemovingBg ? (
                <>
                  <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>إلغاء العملية</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform duration-300" />
                  <span className="flex items-center gap-1.5">
                    عزل الخلفية
                    {!isLicenseActive && (
                      <span className="text-[8px] bg-primary text-primary-foreground px-1 py-0.5 rounded font-extrabold uppercase select-none">PRO</span>
                    )}
                  </span>
                </>
              )}
            </Button>

            {slot.originalImageSrc && (
              <Button
                variant="outline"
                className="w-full h-8 text-xs font-semibold gap-1.5 flex items-center justify-center cursor-pointer rounded-lg border-border/40"
                onClick={() => setRefineOpen(true)}
              >
                <Paintbrush className="w-3.5 h-3.5 text-muted-foreground" />
                <span>تعديل يدوي</span>
              </Button>
            )}

            {isRemovingBg && (
              <div className="mt-2 p-2.5 rounded-lg bg-indigo-500/[0.05] border border-indigo-500/20 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex justify-between items-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                  <span className="animate-pulse">{bgProgressText}</span>
                  <span className="font-mono">{bgProgress}%</span>
                </div>
                <div className="w-full bg-muted dark:bg-muted/30 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${bgProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* الذكاء الاصطناعي */}
          {slot.imageSrc && (
            <div className="bg-violet-500/5 dark:bg-violet-500/10 p-3 rounded-xl border border-violet-500/20 space-y-2">
              <Label className="text-[11px] font-bold text-violet-700 dark:text-violet-300 block">الذكاء الاصطناعي</Label>
              <Button
                variant="outline"
                className={cn(
                  "w-full flex items-center justify-between px-3 h-10 rounded-xl transition-all duration-200 cursor-pointer font-bold text-xs bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 hover:from-violet-500/20 hover:to-indigo-500/20 border-violet-500/30 text-violet-700 dark:text-violet-300 shadow-xs",
                  isEnhancing && "opacity-50 cursor-not-allowed"
                )}
                disabled={isEnhancing}
                onClick={() => handleEnhance(slot)}
              >
                <div className="flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span>تحسين الجودة والوضوح ✨</span>
                </div>
                <span className="text-[9px] bg-violet-500/20 border border-violet-500/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-extrabold font-mono">
                  {remainingQuota}/{dailyLimit}
                </span>
              </Button>

              {isEnhancing && (
                <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center text-[9px] font-bold text-violet-600 dark:text-violet-400">
                    <span className="animate-pulse">{enhanceProgressText}</span>
                    <span className="font-mono">{enhanceProgress}%</span>
                  </div>
                  <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${enhanceProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تكبير الصورة (Zoom) */}
          {slot.imageSrc && (
            <div className="bg-muted/20 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2">
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
              <p className="text-[9px] text-muted-foreground/70 text-right leading-snug">
                💡 يمكنك تحريك موضع الصورة بالسحب المباشر بالفأرة داخل الخلية.
              </p>
            </div>
          )}

          {slot.imageSrc && (
            <CropDialog
              open={cropOpen}
              onOpenChange={setCropOpen}
              imageSrc={slot.imageSrc}
              originalImageSrc={slot.originalImageSrc}
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

        <TabsContent value="adjust" className="mt-3 space-y-3 animate-in fade-in duration-150">
          <div className="bg-muted/20 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
            <Label className="text-[11px] font-bold text-foreground/90 block border-b border-border/15 pb-1.5 mb-1">تعديل الألوان</Label>
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
              className="w-full mt-2 rounded-lg font-bold text-xs h-9"
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
