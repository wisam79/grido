import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { wailsIsDesktop } from "@/lib/wails-env";
import { Label } from "@/components/ui/label";
import {
  ImageAdd20Filled,
  Crop20Filled,
  FlipHorizontal20Filled,
  FlipVertical20Filled,
  ArrowRotateClockwise20Filled,
  ArrowReset20Regular,
  Sparkle20Filled,
  Grid20Filled,
  Target20Filled,
  Delete20Regular,
  Color20Filled,
  Checkmark20Filled,
  ArrowSwap20Filled,
  Copy20Filled,
  SplitHorizontal20Filled,
  SplitVertical20Filled,
} from "@fluentui/react-icons";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
import { toast } from "sonner";
import { useEditorStore, CanvasSlot } from "@/lib/editor-store";
import { useRenderQuality } from "@/lib/canvas/render-quality";
import { SliderControl } from "./shared-controls";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { useFaceFrame } from "@/hooks/use-face-frame";
import { Switch } from "@/components/ui/switch";
import { checkerColor } from "@/lib/canvas/canvas-colors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CropDialog = lazy(() => import("../dialogs/crop-dialog").then((module) => ({ default: module.CropDialog })));
const RefineBgDialog = lazy(() => import("../dialogs/refine-bg-dialog").then((module) => ({ default: module.RefineBgDialog })));

export function SlotProperties({
  slot,
  onUpdate,
}: {
  slot: CanvasSlot;
  onUpdate: (id: string, patch: Partial<CanvasSlot>) => void;
}) {
  const {
    slots,
    swapSlots,
    fillAllSlots,
    fillEmptySlots,
    fillRowSlots,
    fillColumnSlots,
    setSlotImage,
    lastEditedImage,
    canvasWidth,
    canvasHeight,
    printSettings
  } = useEditorStore(useShallow((state) => ({
    slots: state.slots,
    swapSlots: state.swapSlots,
    fillAllSlots: state.fillAllSlots,
    fillEmptySlots: state.fillEmptySlots,
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
  
  const user = useEditorStore((state) => state.user);
  const isLicenseActiveFn = useEditorStore((state) => state.isLicenseActive);
  const isLicenseActive = isLicenseActiveFn();

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

   const handleOpenFile = async () => {
     if (isFileDialogOpen) return;
     setIsFileDialogOpen(true);
     try {
       const [b64] = await openImageFileDialog(false);
       if (b64) {
         const isWailsDesktop = wailsIsDesktop();
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
        // إشعار فشل تغيير الصورة بدل السكوت
        toast.error("فشل تغيير الصورة");
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
    <div className="flex items-center justify-between pt-2 border-t border-border/20 mt-2 font-cairo select-none" dir="rtl">
      <div className="flex items-center gap-1.5 text-right">
        <Copy20Filled className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold text-foreground/90">تعبئة تلقائية عند الرفع</span>
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
      <div className="space-y-3 font-cairo select-none h-full flex flex-col justify-start">
        <div className="flex items-center justify-between bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 shadow-xs fluent-specular">
          <span className="text-xs font-semibold text-muted-foreground">أبعاد الخلية</span>
          <div className="flex items-baseline gap-1 font-mono" dir="ltr">
            <span className="text-sm font-bold text-primary">{widthMM} × {heightMM}</span>
            <span className="text-[10px] font-semibold text-primary/80">mm</span>
            <span className="text-[9px] text-muted-foreground/70 ml-1">({dpi} DPI)</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border/60">
          لا توجد صورة في هذه الخلية
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 h-8 rounded-md font-semibold cursor-pointer border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all text-xs"
          onClick={handleOpenFile}
        >
          <ImageAdd20Filled className="w-4 h-4 text-primary" />
          <span>رفع صورة للخلية</span>
        </Button>
        {lastEditedImage && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2 h-8 rounded-md font-semibold cursor-pointer text-xs"
            onClick={handleUseLastImage}
          >
            <Copy20Filled className="w-4 h-4 text-primary" />
            <span>تعبئة بآخر صورة معدلة</span>
          </Button>
        )}

        <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 shadow-xs fluent-specular">
          {renderAutoFillToggle()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-cairo select-none h-full flex flex-col overflow-y-auto pr-0.5 pb-4">
      {/* 1. كرت الأبعاد والإجراءات الرئيسية */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 shadow-xs fluent-specular space-y-2.5">
        <div className="flex items-center justify-between border-b border-border/20 pb-2">
          <span className="text-xs font-semibold text-muted-foreground">أبعاد الطباعة</span>
          <div className="flex items-center gap-1.5 font-mono" dir="ltr">
            <span className="text-xs font-bold text-primary">{widthMM} × {heightMM} mm</span>
            <span className="text-[9px] font-semibold text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded-md border border-border/40 font-mono">
              {dpi} DPI
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs shadow-2xs"
            onClick={handleOpenFile}
          >
            <ImageAdd20Filled className="w-4 h-4 text-primary" />
            <span>تغيير الصورة</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs shadow-2xs"
            onClick={() => setCropOpen(true)}
          >
            <Crop20Filled className="w-4 h-4 text-primary" />
            <span>قص وتدوير</span>
          </Button>
        </div>
      </div>

      {/* 2. كرت التحويل والقلب */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-2.5 shadow-xs fluent-specular">
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 flex-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-border/80 hover:bg-accent",
                  slot.flipX && "bg-primary/10 border-primary/50 text-primary font-bold"
                )}
                onClick={() => {
                  onUpdate(slot.id, { flipX: !slot.flipX });
                  useEditorStore.getState().pushHistory();
                }}
              >
                <FlipHorizontal20Filled className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">قلب أفقي</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 flex-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-border/80 hover:bg-accent",
                  slot.flipY && "bg-primary/10 border-primary/50 text-primary font-bold"
                )}
                onClick={() => {
                  onUpdate(slot.id, { flipY: !slot.flipY });
                  useEditorStore.getState().pushHistory();
                }}
              >
                <FlipVertical20Filled className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">قلب عمودي</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 flex-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-border/80 hover:bg-accent",
                  (slot.rotation ?? 0) !== 0 && "bg-primary/10 border-primary/50 text-primary font-bold"
                )}
                onClick={() => {
                  onUpdate(slot.id, { rotation: (((slot.rotation ?? 0) + 90) % 360) });
                  useEditorStore.getState().pushHistory();
                }}
              >
                <ArrowRotateClockwise20Filled className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">تدوير 90° ({slot.rotation ?? 0}°)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                disabled={!slot.flipX && !slot.flipY && !(slot.rotation ?? 0)}
                className="h-8 flex-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-border/80 hover:bg-accent disabled:opacity-40"
                onClick={() => {
                  onUpdate(slot.id, { flipX: false, flipY: false, rotation: 0 });
                  useEditorStore.getState().pushHistory();
                }}
              >
                <ArrowReset20Regular className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">إعادة تعيين الاتجاه</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 3. كرت تكرار الخلية والتبديل والتعبئة */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-2.5 shadow-xs fluent-specular space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground/90 block">تعبئة الخلايا</Label>
          {slots.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px] rounded-md gap-1 border-border/80 hover:bg-primary/5 hover:border-primary/40 font-semibold cursor-pointer text-primary"
                >
                  <ArrowSwap20Filled className="w-3.5 h-3.5" />
                  <span>تبديل الموضع</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 font-cairo text-xs">
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground border-b border-border/20">
                  اختر الخلية للتبديل معها:
                </div>
                {slots
                  .filter((s) => s.id !== slot.id)
                  .map((otherSlot, idx) => (
                    <DropdownMenuItem
                      key={otherSlot.id}
                      onClick={() => swapSlots(slot.id, otherSlot.id)}
                      className="cursor-pointer flex items-center justify-between text-xs py-1.5"
                    >
                      <span className="font-semibold">الخلية #{otherSlot.cellIndex + 1 || idx + 1}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {otherSlot.imageSrc ? "ممتلئة" : "فارغة"}
                      </span>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                onClick={handleFillRow}
              >
                <SplitHorizontal20Filled className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>الصف</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">تعبئة الصف كاملاً</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                onClick={handleFillColumn}
              >
                <SplitVertical20Filled className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>العمود</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">تعبئة العمود كاملاً</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                onClick={() => {
                  if (slot.imageSrc) {
                    fillEmptySlots(slot.imageSrc, slot.id);
                  }
                }}
              >
                <Sparkle20Filled className="w-4 h-4 text-primary shrink-0" />
                <span>الفارغة</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">تعبئة الخانات الفارغة فقط</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                onClick={handleFillAll}
              >
                <Grid20Filled className="w-4 h-4 text-primary shrink-0" />
                <span>الكل</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">تعبئة كافة الخلايا</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 rounded-md text-xs font-semibold border-border/80 hover:bg-accent gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => {
                  onUpdate(slot.id, { dragX: 0, dragY: 0, zoom: 1 });
                  useEditorStore.getState().pushHistory();
                }}
              >
                <Target20Filled className="w-3.5 h-3.5 text-primary" />
                <span>توسيط الصورة</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">تصفير الإزاحة وتوسيط الصورة داخل الخانة</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 rounded-md text-xs font-semibold border-border/80 hover:bg-destructive/10 hover:border-destructive/40 text-destructive cursor-pointer"
                onClick={() => {
                  onUpdate(slot.id, { imageSrc: undefined });
                  useEditorStore.getState().pushHistory();
                }}
              >
                <Delete20Regular className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">إفراغ الخلية</TooltipContent>
          </Tooltip>
        </div>

        {renderAutoFillToggle()}
      </div>

      {/* 3.5 كرت لون خلفية صورة الهوية المعزولة */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-2.5 shadow-xs fluent-specular space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/90">
          <Color20Filled className="w-4 h-4 text-primary" />
          <span>خلفية الصورة</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "trans", label: "شفاف", val: "transparent" },
            { id: "white", label: "أبيض للجوازات", val: "#ffffff" },
            { id: "blue", label: "أزرق رسمي", val: "#1d4ed8" },
            { id: "lblue", label: "أزرق فاتح", val: "#3b82f6" },
            { id: "gray", label: "رمادي", val: "#e5e7eb" },
          ].map((colorItem) => {
            const currBg = slot.bgColor || "transparent";
            const isActive = currBg.toLowerCase() === colorItem.val.toLowerCase();
            return (
              <button
                key={colorItem.id}
                type="button"
                title={colorItem.label}
                onClick={() => {
                  const freshStore = useEditorStore.getState();
                  if (autoFill) {
                    freshStore.slots.forEach((s) => {
                      freshStore.updateSlot(s.id, { bgColor: colorItem.val });
                    });
                  } else {
                    onUpdate(slot.id, { bgColor: colorItem.val });
                  }
                  freshStore.pushHistory();
                }}
                className={cn(
                  "w-7 h-7 rounded-md border border-border/80 flex items-center justify-center cursor-pointer transition-all duration-150 relative shadow-2xs hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                  isActive && "ring-2 ring-primary ring-offset-1 border-primary font-bold"
                )}
                style={{
                  backgroundColor: colorItem.val === "transparent" ? undefined : colorItem.val,
                  backgroundImage: colorItem.val === "transparent" ? `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)` : undefined,
                  backgroundSize: colorItem.val === "transparent" ? "6px 6px" : undefined,
                  backgroundPosition: colorItem.val === "transparent" ? "0 0, 0 3px, 3px -3px, -3px 0px" : undefined,
                }}
              >
                {isActive && (
                  <Checkmark20Filled className={cn("w-3.5 h-3.5", colorItem.val === "#ffffff" || colorItem.val === "#e5e7eb" ? "text-slate-900" : "text-white")} />
                )}
              </button>
            );
          })}

          {/* Color Picker مخصص */}
          <div className="flex items-center gap-1 border border-border/80 rounded-md px-1.5 py-0.5 bg-background" title="لون مخصص">
            <input
              type="color"
              value={slot.bgColor === "transparent" || !slot.bgColor ? "#ffffff" : slot.bgColor}
              onChange={(e) => {
                const freshStore = useEditorStore.getState();
                if (autoFill) {
                  freshStore.slots.forEach((s) => {
                    freshStore.updateSlot(s.id, { bgColor: e.target.value });
                  });
                } else {
                  onUpdate(slot.id, { bgColor: e.target.value });
                }
              }}
              onBlur={() => useEditorStore.getState().pushHistory()}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
            />
          </div>
        </div>
      </div>

      {/* 4. كرت تعديل الألوان والسطوع */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 shadow-xs fluent-specular space-y-3">
        <Label className="text-xs font-bold text-foreground/90 block border-b border-border/20 pb-1.5">تعديل الألوان والسطوع</Label>
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
          variant="ghost"
          size="sm"
          className="w-full rounded-md font-semibold text-xs h-8 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mt-1"
          onClick={() =>
            onUpdate(slot.id, {
              filter: "none",
              brightness: 100,
              contrast: 100,
              saturation: 100,
            })
          }
        >
          إعادة تعيين الألوان
        </Button>
      </div>

      {/* 5. كرت تكبير الصورة */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 shadow-xs fluent-specular">
        <SliderControl
          label="تكبير الصورة"
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
      </div>

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
    </div>
  );
}
