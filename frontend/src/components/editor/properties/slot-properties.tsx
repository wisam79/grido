import React, { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { wailsIsDesktop } from "@/lib/wails-env";
import {
  ImageSquare,
  Crop,
  FlipHorizontal,
  FlipVertical,
  ArrowClockwise,
  ArrowCounterClockwise,
  Sparkle,
  GridFour,
  Crosshair,
  Trash,
  Palette,
  Check,
  ArrowsLeftRight,
  Copy,
  Rows,
  Columns,
  Sun,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react";
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
import { PopoverColorPicker } from "./shared-controls";
import { FluentSection, FluentSliderField, FluentSegmentedControl } from "@/components/ui/blocks";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { Switch } from "@/components/ui/switch";
import { checkerColor } from "@/lib/canvas/canvas-colors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CropDialog = lazy(() => import("../dialogs/crop-dialog").then((module) => ({ default: module.CropDialog })));

type SlotTab = "image" | "colors" | "grid";

export const SlotProperties = React.memo(function SlotProperties({
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
    printSettings,
  } = useEditorStore(
    useShallow((state) => ({
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
    }))
  );

  const [activeTab, setActiveTab] = useState<SlotTab>("image");
  const [cropOpen, setCropOpen] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [autoFill, setAutoFill] = useState(() => {
    return localStorage.getItem("grido_auto_fill_grid") !== "false";
  });

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
    <div className="flex items-center justify-between pt-2 border-t border-border/20 font-cairo select-none" dir="rtl">
      <div className="flex items-center gap-1.5 text-start">
        <Copy className="w-4 h-4 text-primary shrink-0" weight="regular" />
        <span className="text-xs font-semibold text-foreground/90">تعبئة تلقائية</span>
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

  // حالة الخلية الفارغة — بطاقة وحيدة وموجزة دون أي تكدس
  if (!slot.imageSrc) {
    return (
      <div className="space-y-2.5 font-cairo select-none h-full flex flex-col justify-start">
        <FluentSection
          icon={<ImageSquare className="w-4 h-4" weight="duotone" />}
          title="أبعاد الخلية"
          action={
            <span className="text-micro font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 font-mono" dir="ltr">
              {widthMM} × {heightMM} mm
            </span>
          }
        >
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 h-8 rounded-md font-semibold cursor-pointer border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all text-xs"
              onClick={handleOpenFile}
            >
              <ImageSquare className="w-4 h-4 text-primary" weight="regular" />
              <span>رفع صورة</span>
            </Button>
            {lastEditedImage && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2 h-8 rounded-md font-semibold cursor-pointer text-xs"
                onClick={handleUseLastImage}
              >
                <Copy className="w-4 h-4 text-primary" weight="regular" />
                <span>آخر صورة معدلة</span>
              </Button>
            )}
            {renderAutoFillToggle()}
          </div>
        </FluentSection>
      </div>
    );
  }

  // خلية تحتوي صورة: واجهة مبوبة ثلاثية الأقسام خالية من التمرير الرأسي
  return (
    <div className="space-y-2.5 font-cairo select-none pb-2">
      {/* مبدل التبويبات القياسي للخلية */}
      <FluentSegmentedControl<SlotTab>
        layoutId="slot-properties-tabs"
        value={activeTab}
        onChange={setActiveTab}
        size="sm"
        options={[
          {
            id: "image",
            label: "الصورة",
            icon: (
              <ImageSquare
                className="w-4 h-4 shrink-0 transition-transform"
                weight={activeTab === "image" ? "duotone" : "regular"}
              />
            ),
          },
          {
            id: "colors",
            label: "الألوان",
            icon: (
              <Palette
                className="w-4 h-4 shrink-0 transition-transform"
                weight={activeTab === "colors" ? "duotone" : "regular"}
              />
            ),
          },
          {
            id: "grid",
            label: "التوزيع",
            icon: (
              <GridFour
                className="w-4 h-4 shrink-0 transition-transform"
                weight={activeTab === "grid" ? "duotone" : "regular"}
              />
            ),
          },
        ]}
      />

      {/* 1. تبويب الصورة: أبعاد، قص، استبدال، تكبير، وتحويل */}
      {activeTab === "image" && (
        <FluentSection
          icon={<ImageSquare className="w-4 h-4" weight="duotone" />}
          title="الصورة والتحويل"
          action={
            <span className="text-micro font-semibold text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-md border border-border/40 font-mono" dir="ltr">
              {widthMM} × {heightMM} mm
            </span>
          }
        >
          <div className="space-y-2.5">
            {/* أزرار الإجراء السريع: تغيير وقص */}
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs shadow-2xs"
                onClick={handleOpenFile}
              >
                <ImageSquare className="w-4 h-4 text-primary" weight="regular" />
                <span>تغيير</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs shadow-2xs"
                onClick={() => setCropOpen(true)}
              >
                <Crop className="w-4 h-4 text-primary" weight="regular" />
                <span>قص وتدوير</span>
              </Button>
            </div>

            {/* تكبير الصورة داخل الخلية */}
            <FluentSliderField
              label="التكبير"
              icon={<MagnifyingGlassPlus className="w-4 h-4" weight="regular" />}
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

            {/* صف التحويل والتدوير والتوسيط المدمج */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 flex-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-border/80 px-1",
                      slot.flipX && "bg-primary/10 text-primary border-primary/40 font-bold"
                    )}
                    onClick={() => {
                      onUpdate(slot.id, { flipX: !slot.flipX });
                      useEditorStore.getState().pushHistory();
                    }}
                  >
                    <FlipHorizontal className={cn("w-4 h-4", slot.flipX ? "text-primary" : "text-muted-foreground")} weight={slot.flipX ? "fill" : "regular"} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">قلب أفقي</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 flex-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-border/80 px-1",
                      slot.flipY && "bg-primary/10 text-primary border-primary/40 font-bold"
                    )}
                    onClick={() => {
                      onUpdate(slot.id, { flipY: !slot.flipY });
                      useEditorStore.getState().pushHistory();
                    }}
                  >
                    <FlipVertical className={cn("w-4 h-4", slot.flipY ? "text-primary" : "text-muted-foreground")} weight={slot.flipY ? "fill" : "regular"} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">قلب عمودي</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-border/80 hover:bg-accent px-1"
                    onClick={() => {
                      const currentRotation = slot.rotation ?? 0;
                      const newRotation = (currentRotation + 90) % 360;
                      onUpdate(slot.id, { rotation: newRotation });
                      useEditorStore.getState().pushHistory();
                    }}
                  >
                    <ArrowClockwise className="w-4 h-4" weight="regular" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">تدوير 90°</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!slot.flipX && !slot.flipY && !(slot.rotation ?? 0)}
                    className="h-8 flex-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-border/80 hover:bg-accent disabled:opacity-40 px-1"
                    onClick={() => {
                      onUpdate(slot.id, { flipX: false, flipY: false, rotation: 0 });
                      useEditorStore.getState().pushHistory();
                    }}
                  >
                    <ArrowCounterClockwise className="w-4 h-4" weight="regular" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">إعادة التعيين</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 rounded-md transition-all cursor-pointer flex items-center justify-center border-border/80 hover:bg-accent px-1"
                    onClick={() => {
                      onUpdate(slot.id, { dragX: 0, dragY: 0, zoom: 1 });
                      useEditorStore.getState().pushHistory();
                    }}
                  >
                    <Crosshair className="w-4 h-4 text-primary" weight="regular" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">توسيط الصورة</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </FluentSection>
      )}

      {/* 2. تبويب الألوان: لون الخلفية والسطوع والتباين */}
      {activeTab === "colors" && (
        <FluentSection
          icon={<Palette className="w-4 h-4 text-primary" weight="duotone" />}
          title="الخلفية والألوان"
        >
          <div className="space-y-2.5">
            {/* باليتة لون خلفية الصورة السريعة */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "trans", label: "شفاف", val: "transparent" },
                { id: "white", label: "أبيض للجوازات", val: "#FFFFFF" },
                { id: "blue", label: "أزرق رسمي", val: "#2563EB" },
                { id: "lblue", label: "أزرق فاتح", val: "#38BDF8" },
                { id: "gray", label: "رمادي استوديو", val: "#F4F4F5" },
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
                        freshStore.updateSlotsBatch(
                          freshStore.slots.map((s) => s.id),
                          { bgColor: colorItem.val }
                        );
                      } else {
                        onUpdate(slot.id, { bgColor: colorItem.val });
                      }
                      freshStore.pushHistory();
                    }}
                    className={cn(
                      "w-7 h-7 rounded-md border flex items-center justify-center cursor-pointer transition-all duration-150 relative shadow-2xs hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none overflow-hidden",
                      isActive
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary scale-105 z-10"
                        : "border-black/10 dark:border-white/15 hover:border-foreground/40"
                    )}
                    style={{
                      backgroundColor: colorItem.val === "transparent" ? undefined : colorItem.val,
                      backgroundImage: colorItem.val === "transparent" ? `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)` : undefined,
                      backgroundSize: colorItem.val === "transparent" ? "6px 6px" : undefined,
                      backgroundPosition: colorItem.val === "transparent" ? "0 0, 0 3px, 3px -3px, -3px 0px" : undefined,
                    }}
                  >
                    {isActive && (
                      <Check className={cn("w-3.5 h-3.5 z-10 drop-shadow-xs", colorItem.val === "#FFFFFF" || colorItem.val === "#F4F4F5" ? "text-slate-900" : "text-white")} weight="bold" />
                    )}
                  </button>
                );
              })}

              <PopoverColorPicker
                color={slot.bgColor === "transparent" || !slot.bgColor ? "#ffffff" : slot.bgColor}
                onChange={(val: string) => {
                  const freshStore = useEditorStore.getState();
                  if (autoFill) {
                    freshStore.updateSlotsBatch(
                      freshStore.slots.map((s) => s.id),
                      { bgColor: val }
                    );
                  } else {
                    onUpdate(slot.id, { bgColor: val });
                  }
                  freshStore.pushHistory();
                }}
                swatchOnly
                className="w-7 h-7"
              />
            </div>

            {/* مزالجات تعديل الألوان */}
            <div className="space-y-2 pt-1 border-t border-border/30">
              <FluentSliderField
                label="السطوع"
                icon={<Sun className="w-4 h-4" weight="regular" />}
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
              <FluentSliderField
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
              <FluentSliderField
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
                className="w-full rounded-md font-semibold text-xs h-7 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
          </div>
        </FluentSection>
      )}

      {/* 3. تبويب التوزيع: ملء الخلايا والتبديل */}
      {activeTab === "grid" && (
        <FluentSection
          icon={<GridFour className="w-4 h-4" weight="duotone" />}
          title="توزيع وملء الخلايا"
          action={
            slots.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-micro rounded-md gap-1 border-border/80 hover:bg-primary/5 hover:border-primary/40 font-semibold cursor-pointer text-primary"
                  >
                    <ArrowsLeftRight className="w-3.5 h-3.5" weight="bold" />
                    <span>تبديل</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 font-cairo text-xs">
                  <div className="px-2 py-1 text-micro font-bold text-muted-foreground border-b border-border/20">
                    تبديل مع الخلية:
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
                        <span className="text-micro text-muted-foreground font-mono">
                          {otherSlot.imageSrc ? "ممتلئة" : "فارغة"}
                        </span>
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        >
          <div className="space-y-2.5">
            {/* شبكة أزرار التعبئة السريعة 4 في صف واحد */}
            <div className="grid grid-cols-4 gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-8 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                    onClick={handleFillRow}
                  >
                    <Rows className="w-4 h-4 text-primary shrink-0" weight="regular" />
                    <span>الصف</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">تعبئة الصف</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-8 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                    onClick={handleFillColumn}
                  >
                    <Columns className="w-4 h-4 text-primary shrink-0" weight="regular" />
                    <span>العمود</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">تعبئة العمود</TooltipContent>
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
                    <Sparkle className="w-4 h-4 text-primary shrink-0" weight="regular" />
                    <span>الفارغة</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">تعبئة الخلايا الفارغة</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-8 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                    onClick={handleFillAll}
                  >
                    <GridFour className="w-4 h-4 text-primary shrink-0" weight="regular" />
                    <span>الكل</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">تعبئة جميع الخلايا</TooltipContent>
              </Tooltip>
            </div>

            {/* زر إفراغ الخلية */}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 rounded-md text-xs font-semibold border-border/80 hover:bg-destructive/10 hover:border-destructive/40 text-destructive cursor-pointer flex items-center justify-center gap-1.5"
              onClick={() => {
                onUpdate(slot.id, { imageSrc: undefined });
                useEditorStore.getState().pushHistory();
              }}
            >
              <Trash className="w-4 h-4" weight="regular" />
              <span>إفراغ الخلية</span>
            </Button>

            {renderAutoFillToggle()}
          </div>
        </FluentSection>
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
                if (wailsIsDesktop()) {
                  const localPath = await SaveImageFromBase64(cropped);
                  onUpdate(slot.id, { imageSrc: localPath });
                } else {
                  onUpdate(slot.id, { imageSrc: cropped });
                }
              } catch (err) {
                console.error("Failed to save cropped slot image:", err);
                toast.error("فشل حفظ القص");
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
});
