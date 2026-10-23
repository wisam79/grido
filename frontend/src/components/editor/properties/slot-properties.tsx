import React, { lazy, Suspense, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { FluentSection, FluentSliderField, FluentTooltip } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  ArrowsLeftRight,
  Copy,
  Rows,
  Columns,
} from '@/components/ui/icons';
import { Switch } from '@/components/ui/switch';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { pxToMm } from '@/lib/canvas/units';
import { useEditorStore } from '@/lib/editor-store';
import { openImageFileDialog } from '@/lib/io/file-dialog-utils';
import { createLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { wailsIsDesktop } from '@/lib/wails-env';
import { toErrorMessage } from '@/lib/wails-error';

import { ColorField, ColorPanel } from './color-panel';
import { SaveImageFromBase64 } from '../../../../wailsjs/go/main/App';

import type { CanvasSlot } from '@/lib/editor-store';

const logger = createLogger('slot-properties');

const CropDialog = lazy(() =>
  import('../dialogs/crop-dialog').then((module) => ({ default: module.CropDialog })),
);

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
    setSlotImagesBatch,
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
      setSlotImagesBatch: state.setSlotImagesBatch,
      lastEditedImage: state.lastEditedImage,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      printSettings: state.printSettings,
    })),
  );
  const [cropOpen, setCropOpen] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [autoFill, setAutoFill] = useState(() => {
    return localStorage.getItem('grido_auto_fill_grid') !== 'false';
  });

  const handleOpenFile = async () => {
    if (isFileDialogOpen) return;
    setIsFileDialogOpen(true);
    try {
      const [b64] = await openImageFileDialog(false);
      if (b64) {
        const isWailsDesktop = wailsIsDesktop();
        let srcToUse = b64;
        if (isWailsDesktop && b64.startsWith('data:image/')) {
          try {
            const localPath = await SaveImageFromBase64(b64);
            if (localPath) srcToUse = localPath;
          } catch (e) {
            logger.error('Failed to save image locally:', e);
          }
        }
        const freshStore = useEditorStore.getState();
        if (autoFill) {
          // 🚀 إجراء واحد = لقطة تراجع واحدة — كان setSlotImage + fillAllSlots
          // يولّدان لقطتين (الثانية بكل الخلايا تحمل الصورة) فتستنزف سقف الـ 30
          // لقطة وتحرم المستخدم من التراجع عن خطوات سابقة (BUG-HIGH-10)
          const assignments = freshStore.slots.map((sl) => ({ slotId: sl.id, src: srcToUse }));
          setSlotImagesBatch(assignments, srcToUse);
        } else {
          freshStore.setSlotImage(slot.id, srcToUse);
        }
      }
    } catch (err) {
      logger.error(err);
      // إشعار فشل تغيير الصورة بدل السكوت
      toast.error(toErrorMessage(err, 'فشل تغيير الصورة'));
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
  const widthMM = Math.round(pxToMm(slot.w * canvasWidth, dpi));
  const heightMM = Math.round(pxToMm(slot.h * canvasHeight, dpi));

  const renderAutoFillToggle = () => (
    <div
      className="flex items-center justify-between pt-2 border-t border-border/20 mt-2 font-cairo select-none"
      dir="rtl"
    >
      <div className="flex items-center gap-1.5 text-start">
        <Copy className="w-4 h-4 text-primary shrink-0" weight="regular" />
        <span className="text-xs font-semibold text-foreground/90">تعبئة تلقائية</span>
      </div>
      <Switch
        checked={autoFill}
        onCheckedChange={(checked) => {
          setAutoFill(checked);
          localStorage.setItem('grido_auto_fill_grid', String(checked));
        }}
        aria-label="تعبئة تلقائية"
      />
    </div>
  );

  if (!slot.imageSrc) {
    return (
      <div className="space-y-3 font-cairo select-none h-full flex flex-col justify-start">
        <FluentSection
          title="أبعاد الخلية"
          action={
            <span
              className="text-mini font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 font-mono"
              dir="ltr"
            >
              {widthMM} × {heightMM} mm · {dpi} DPI
            </span>
          }
        >
          <div className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-md border border-dashed border-border/60 mb-2.5">
            لا توجد صورة
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 h-8 rounded-md font-semibold cursor-pointer border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors text-xs"
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
          </div>
        </FluentSection>

        {/* بلا قسم يكرّر تسمية الصف نفسه — المفتاح يحمل عنوانه وأيقونته */}
        {renderAutoFillToggle()}
      </div>
    );
  }

  return (
    <div className="space-y-3 font-cairo select-none pb-4">
      {/* 🎴 بطاقة 1: أبعاد ومعاينة الخلية — متقدمة، مطوية افتراضياً */}
      <FluentSection
        title="أبعاد الطباعة"
        collapsible
        defaultOpen={false}
        action={
          <span
            className="text-mini font-semibold text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-md border border-border/40 font-mono"
            dir="ltr"
          >
            {widthMM} × {heightMM} mm · {dpi} DPI
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs shadow-2xs"
            onClick={handleOpenFile}
          >
            <ImageSquare className="w-4 h-4 text-primary" weight="regular" />
            <span>تغيير الصورة</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-border/80 hover:border-primary/45 hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-semibold text-xs shadow-2xs"
            onClick={() => setCropOpen(true)}
          >
            <Crop className="w-4 h-4 text-primary" weight="regular" />
            <span>قص وتدوير</span>
          </Button>
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 2: تحويل وتدوير الصورة */}
      <FluentSection title="تحويل وتدوير">
        <div className="flex items-center gap-1.5">
          <FluentTooltip content="قلب أفقي" side="top">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 flex-1 rounded-md transition-colors cursor-pointer flex items-center justify-center border-border/80',
                slot.flipX &&
                  'bg-card text-foreground border border-border/80 dark:border-white/15 shadow-xs font-bold ring-1 ring-primary/40',
              )}
              onClick={() => {
                onUpdate(slot.id, { flipX: !slot.flipX });
                useEditorStore.getState().pushHistory();
              }}
            >
              <FlipHorizontal
                className={cn('w-4 h-4', slot.flipX ? 'text-primary' : 'text-muted-foreground')}
                weight={slot.flipX ? 'fill' : 'regular'}
              />
            </Button>
          </FluentTooltip>

          <FluentTooltip content="قلب عمودي" side="top">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 flex-1 rounded-md transition-colors cursor-pointer flex items-center justify-center border-border/80',
                slot.flipY &&
                  'bg-card text-foreground border border-border/80 dark:border-white/15 shadow-xs font-bold ring-1 ring-primary/40',
              )}
              onClick={() => {
                onUpdate(slot.id, { flipY: !slot.flipY });
                useEditorStore.getState().pushHistory();
              }}
            >
              <FlipVertical
                className={cn('w-4 h-4', slot.flipY ? 'text-primary' : 'text-muted-foreground')}
                weight={slot.flipY ? 'fill' : 'regular'}
              />
            </Button>
          </FluentTooltip>

          <FluentTooltip content="تدوير 90°" side="top">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 rounded-md transition-colors cursor-pointer flex items-center justify-center border-border/80 hover:bg-accent"
              onClick={() => {
                const currentRotation = slot.rotation ?? 0;
                const newRotation = (currentRotation + 90) % 360;
                onUpdate(slot.id, { rotation: newRotation });
                useEditorStore.getState().pushHistory();
              }}
            >
              <ArrowClockwise className="w-4 h-4" weight="regular" />
            </Button>
          </FluentTooltip>

          <FluentTooltip content="إعادة تعيين الاتجاه" side="top">
            <Button
              variant="outline"
              size="sm"
              disabled={!slot.flipX && !slot.flipY && !(slot.rotation ?? 0)}
              className="h-8 flex-1 rounded-md transition-colors cursor-pointer flex items-center justify-center border-border/80 hover:bg-accent disabled:opacity-40"
              onClick={() => {
                onUpdate(slot.id, { flipX: false, flipY: false, rotation: 0 });
                useEditorStore.getState().pushHistory();
              }}
            >
              <ArrowCounterClockwise className="w-4 h-4" weight="regular" />
            </Button>
          </FluentTooltip>
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 3: تعبئة الخلايا والموضع */}
      <FluentSection
        title="تعبئة الخلايا"
        collapsible
        defaultOpen={false}
        action={
          slots.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-mini rounded-md gap-1 border-border/80 hover:bg-primary/5 hover:border-primary/40 font-semibold cursor-pointer text-primary"
                >
                  <ArrowsLeftRight className="w-3.5 h-3.5" weight="bold" />
                  <span>تبديل الموضع</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 font-cairo text-xs">
                <div className="px-2 py-1 text-mini font-bold text-muted-foreground border-b border-border/20">
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
                      <span className="font-semibold">
                        الخلية #{otherSlot.cellIndex + 1 || idx + 1}
                      </span>
                      <span className="text-mini text-muted-foreground font-mono">
                        {otherSlot.imageSrc ? 'ممتلئة' : 'فارغة'}
                      </span>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      >
        <div className="space-y-2.5">
          <div className="grid grid-cols-4 gap-1.5">
            <FluentTooltip content="تعبئة الصف" side="top">
              <Button
                variant="outline"
                className="h-8 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                onClick={handleFillRow}
              >
                <Rows className="w-3.5 h-3.5 text-primary shrink-0" weight="regular" />
                <span>الصف</span>
              </Button>
            </FluentTooltip>

            <FluentTooltip content="تعبئة العمود" side="top">
              <Button
                variant="outline"
                className="h-8 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                onClick={handleFillColumn}
              >
                <Columns className="w-3.5 h-3.5 text-primary shrink-0" weight="regular" />
                <span>العمود</span>
              </Button>
            </FluentTooltip>

            <FluentTooltip content="تعبئة الفارغة" side="top">
              <Button
                variant="outline"
                className="h-8 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                onClick={() => {
                  if (slot.imageSrc) {
                    fillEmptySlots(slot.imageSrc, slot.id);
                  }
                }}
              >
                <Sparkle className="w-3.5 h-3.5 text-primary shrink-0" weight="regular" />
                <span>الفارغة</span>
              </Button>
            </FluentTooltip>

            <FluentTooltip content="تعبئة الكل" side="top">
              <Button
                variant="outline"
                className="h-8 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold border-border/80 hover:bg-accent hover:border-primary/40 px-1"
                onClick={handleFillAll}
              >
                <GridFour className="w-3.5 h-3.5 text-primary shrink-0" weight="regular" />
                <span>الكل</span>
              </Button>
            </FluentTooltip>
          </div>

          <div className="flex items-center gap-1.5">
            <FluentTooltip content="تصفير الإزاحة وتوسيط الصورة" side="top">
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 rounded-md text-xs font-semibold border-border/80 hover:bg-accent gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => {
                  onUpdate(slot.id, { dragX: 0, dragY: 0, zoom: 1 });
                  useEditorStore.getState().pushHistory();
                }}
              >
                <Crosshair className="w-3.5 h-3.5 text-primary" weight="regular" />
                <span>توسيط الصورة</span>
              </Button>
            </FluentTooltip>

            <FluentTooltip content="إفراغ الخلية" side="top">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 rounded-md text-xs font-semibold border-border/80 hover:bg-destructive/10 hover:border-destructive/40 text-destructive cursor-pointer"
                onClick={() => {
                  onUpdate(slot.id, { imageSrc: undefined });
                  useEditorStore.getState().pushHistory();
                }}
              >
                <Trash className="w-3.5 h-3.5" weight="regular" />
              </Button>
            </FluentTooltip>
          </div>

          {renderAutoFillToggle()}
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 4: لون خلفية صورة الهوية — متقدمة، مطوية افتراضياً */}
      <FluentSection title="خلفية الصورة" collapsible defaultOpen={false}>
        <ColorPanel wheelPosition="bottom">
          <ColorField
            color={slot.bgColor ?? 'transparent'}
            onChange={(val: string) => {
              const freshStore = useEditorStore.getState();
              if (autoFill) {
                freshStore.updateSlotsBatch(
                  freshStore.slots.map((s) => s.id),
                  { bgColor: val },
                );
              } else {
                onUpdate(slot.id, { bgColor: val });
              }
            }}
            onCommit={() => useEditorStore.getState().pushHistory()}
            className="w-full"
            ariaLabel="لون خلفية الخانة"
          />
        </ColorPanel>
      </FluentSection>

      {/* 🎴 بطاقة 5: تعديل الألوان والسطوع */}
      <FluentSection title="تعديل الألوان" collapsible defaultOpen={true}>
        <div className="space-y-3">
          <FluentSliderField
            label="السطوع"
            value={slot.brightness ?? 100}
            min={0}
            max={200}
            step={1}
            unit="%"
            onChange={(v) => onUpdate(slot.id, { brightness: v })}
            onCommit={() => {
              useRenderQuality.getState().setIsDraggingFilter(false);
              useEditorStore.getState().pushHistory();
            }}
            onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true, slot.id)}
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
            onCommit={() => {
              useRenderQuality.getState().setIsDraggingFilter(false);
              useEditorStore.getState().pushHistory();
            }}
            onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true, slot.id)}
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
            onCommit={() => {
              useRenderQuality.getState().setIsDraggingFilter(false);
              useEditorStore.getState().pushHistory();
            }}
            onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true, slot.id)}
            onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
          />

          <Button
            variant="ghost"
            size="sm"
            className="w-full rounded-md font-semibold text-xs h-8 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mt-1"
            onClick={() =>
              onUpdate(slot.id, {
                filter: 'none',
                brightness: 100,
                contrast: 100,
                saturation: 100,
              })
            }
          >
            إعادة تعيين الألوان
          </Button>
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 6: تكبير الصورة داخل الخلية — متقدمة، مطوية افتراضياً */}
      <FluentSection title="تكبير الصورة" collapsible defaultOpen={false}>
        <FluentSliderField
          label="نسبة التكبير"
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
      </FluentSection>

      {slot.imageSrc && cropOpen && (
        <Suspense fallback={null}>
          <CropDialog
            open={cropOpen}
            onOpenChange={setCropOpen}
            imageSrc={slot.imageSrc}
            originalImageSrc={slot.originalImageSrc}
            onCropSave={async (cropped) => {
              try {
                let localPath = cropped;
                if (wailsIsDesktop() && cropped.startsWith('data:image/')) {
                  localPath = await SaveImageFromBase64(cropped);
                }
                onUpdate(slot.id, { imageSrc: localPath });
              } catch (err) {
                logger.error('Failed to save cropped slot image:', err);
                toast.error(toErrorMessage(err, 'فشل حفظ القص'));
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
});
