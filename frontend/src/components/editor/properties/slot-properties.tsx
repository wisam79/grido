import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  ImageIcon, Paintbrush, Sliders, ImagePlus, Scissors, Copy, Sparkles, X, Rows, Columns, LayoutGrid, Wand2,
  FlipHorizontal2, FlipVertical2, RotateCw, Undo2
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { openImageFileDialog } from "@/lib/file-dialog-utils";
import { toast } from "sonner";
import { useEditorStore, CanvasSlot } from "@/lib/editor-store";
import { useRenderQuality } from "@/lib/render-quality";
import { SliderControl } from "./shared-controls";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { Switch } from "@/components/ui/switch";

const CropDialog = lazy(() => import("../crop-dialog").then((module) => ({ default: module.CropDialog })));
const RefineBgDialog = lazy(() => import("../refine-bg-dialog").then((module) => ({ default: module.RefineBgDialog })));

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
   const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
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
     if (isFileDialogOpen) return;
     setIsFileDialogOpen(true);
     try {
       const [b64] = await openImageFileDialog(false);
       if (b64) {
         const isWailsDesktop = typeof (window as any).go?.main?.App !== "undefined";
         let srcToUse = b64;
         if (isWailsDesktop && b64.startsWith("data:image/")) {
           try {
             const localPath = await SaveImageFromBase64(b64);
             if (localPath) srcToUse = localPath;
           } catch (e) {
             console.error("Failed to save image locally:", e);
           }
         }
         const freshStore = useEditorStore.getState();
         freshStore.setSlotImage(slot.id, srcToUse);
         if (autoFill) {
           freshStore.fillAllSlots(srcToUse, slot.id);
         }
       }
     } catch (err) {
       console.error(err);
     } finally {
       setIsFileDialogOpen(false);
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
            </div>
          </div>

          {renderAutoFillToggle()}

          {/* عزل وتعديل الخلفية */}
          <div className="bg-muted/20 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2.5">
            <Label className="text-[11px] font-bold text-foreground/90 block">عزل وتعديل الخلفية</Label>
            
            <Button
              variant={isRemovingBg ? "destructive" : "outline"}
              className={cn(
                "w-full flex items-center justify-between px-3.5 h-11 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.99] group font-extrabold text-xs border-[1.5px] border-primary/70 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground shadow-xs",
                isRemovingBg && "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent"
              )}
              onClick={isRemovingBg ? handleCancelBgRemoval : () => handleRemoveBg(slot)}
              title={isRemovingBg ? "إلغاء العزل" : "عزل الخلفية الذكي بالذكاء الاصطناعي"}
            >
              {isRemovingBg ? (
                <div className="flex items-center gap-2.5">
                  <X className="w-4 h-4 text-destructive-foreground group-hover:scale-110 transition-transform shrink-0" />
                  <span>إلغاء العملية الحالية</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-primary group-hover:scale-115 group-hover:rotate-12 transition-all duration-300 shrink-0" />
                    <span>عزل الخلفية الذكي</span>
                  </div>
                  {!isLicenseActive ? (
                    <span className="text-[8.5px] bg-primary text-primary-foreground font-black px-1.5 py-0.5 rounded-md tracking-wider uppercase">
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
            <div className="bg-muted/20 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2.5">
              <Label className="text-[11px] font-bold text-foreground/90 block">الذكاء الاصطناعي</Label>
              <Button
                variant="outline"
                disabled={isEnhancing || isRemovingBg}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 h-11 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.99] group font-extrabold text-xs border-[1.5px] border-primary/70 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground shadow-xs",
                  (isEnhancing || isRemovingBg) && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleEnhance(slot)}
                title={`تحسين وتكبير دقة الصورة بالذكاء الاصطناعي (${remainingQuota}/${dailyLimit} المتبقي اليوم)`}
              >
                <div className="flex items-center gap-2.5">
                  <Wand2 className="w-4 h-4 text-primary group-hover:scale-115 group-hover:rotate-12 transition-all duration-300 shrink-0" />
                  <span>تحسين الجودة والوضوح</span>
                </div>
                <span className="text-[9.5px] bg-primary/20 border border-primary/40 text-primary px-2 py-0.5 rounded-md font-extrabold font-mono">
                  {remainingQuota}/{dailyLimit} اليوم
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
                onCommit={() => useEditorStore.getState().pushHistory()}
                unit="%"
              />
              <p className="text-[9px] text-muted-foreground/70 text-right leading-snug">
                💡 يمكنك تحريك موضع الصورة بالسحب المباشر بالفأرة داخل الخلية.
              </p>
            </div>
          )}

          {/* القلب والتدوير — تُطبق على المعاينة والطباعة معاً */}
          {slot.imageSrc && (
            <div className="space-y-1.5 bg-muted/20 dark:bg-muted/10 p-2.5 rounded-xl border border-border/30">
              <Label className="text-[10px] font-bold text-muted-foreground block text-right">قلب وتدوير الصورة</Label>
              <div className="grid grid-cols-4 gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 rounded-lg transition-all cursor-pointer flex items-center justify-center border-border/50 hover:bg-accent",
                        slot.flipX && "bg-primary/10 border-primary/50 text-primary"
                      )}
                      onClick={() => {
                        onUpdate(slot.id, { flipX: !slot.flipX });
                        useEditorStore.getState().pushHistory();
                      }}
                    >
                      <FlipHorizontal2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">قلب أفقي</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 rounded-lg transition-all cursor-pointer flex items-center justify-center border-border/50 hover:bg-accent",
                        slot.flipY && "bg-primary/10 border-primary/50 text-primary"
                      )}
                      onClick={() => {
                        onUpdate(slot.id, { flipY: !slot.flipY });
                        useEditorStore.getState().pushHistory();
                      }}
                    >
                      <FlipVertical2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">قلب عمودي</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 rounded-lg transition-all cursor-pointer flex items-center justify-center border-border/50 hover:bg-accent",
                        (slot.rotation ?? 0) !== 0 && "bg-primary/10 border-primary/50 text-primary"
                      )}
                      onClick={() => {
                        onUpdate(slot.id, { rotation: (((slot.rotation ?? 0) + 90) % 360) });
                        useEditorStore.getState().pushHistory();
                      }}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">تدوير 90° ({slot.rotation ?? 0}°)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!slot.flipX && !slot.flipY && !(slot.rotation ?? 0)}
                      className="h-9 rounded-lg transition-all cursor-pointer flex items-center justify-center border-border/50 hover:bg-accent disabled:opacity-40"
                      onClick={() => {
                        onUpdate(slot.id, { flipX: false, flipY: false, rotation: 0 });
                        useEditorStore.getState().pushHistory();
                      }}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">إعادة تعيين التحويلات</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {slot.imageSrc && cropOpen && (
            <Suspense fallback={null}>
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
            </Suspense>
          )}

          {slot.imageSrc && slot.originalImageSrc && refineOpen && (
            <Suspense fallback={null}>
              <RefineBgDialog
              open={refineOpen}
              onOpenChange={setRefineOpen}
              element={slot}
              onSave={async (newImageSrc) => {
                onUpdate(slot.id, { imageSrc: newImageSrc });
                useEditorStore.getState().pushHistory();
              }}
              />
            </Suspense>
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
              onCommit={() => { useRenderQuality.getState().setIsDraggingFilter(false); useEditorStore.getState().pushHistory(); }}
              onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true)}
              onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
            />
            <SliderControl
              label="التباين"
              value={slot.contrast ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={(v) => onUpdate(slot.id, { contrast: v })}
              onCommit={() => { useRenderQuality.getState().setIsDraggingFilter(false); useEditorStore.getState().pushHistory(); }}
              onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true)}
              onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
            />
            <SliderControl
              label="التشبع"
              value={slot.saturation ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={(v) => onUpdate(slot.id, { saturation: v })}
              onCommit={() => { useRenderQuality.getState().setIsDraggingFilter(false); useEditorStore.getState().pushHistory(); }}
              onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true)}
              onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
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
