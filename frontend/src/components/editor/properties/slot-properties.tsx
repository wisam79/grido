import React, { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { getPhotoDimensions } from '@/components/editor/panels/collage/collage-grid-math';
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
  GridFour,
  Crosshair,
  Trash,
  Copy,
  Lock,
  CaretDown,
} from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getCollageGeometry, getSlotRect } from '@/lib/canvas/collage-geometry';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { mmToPx, pxToMm } from '@/lib/canvas/units';
import { useEditorStore } from '@/lib/editor-store';
import { openImageFileDialog } from '@/lib/io/file-dialog-utils';
import { createLogger } from '@/lib/logger';
import { getEffectiveDpi } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { wailsIsDesktop } from '@/lib/wails-env';
import { toErrorMessage } from '@/lib/wails-error';

import { ColorField, ColorPanel } from './color-panel';
import { SaveImageFromBase64 } from '../../../../wailsjs/go/main/App';
import type { PhotoGridType } from '@/components/editor/panels/collage/collage-grid-math';

import type { CanvasSlot } from '@/lib/editor-store';
import type { CollageSlotSizeError } from '@/lib/store/slices/collage-slice';

const logger = createLogger('slot-properties');

const CropDialog = lazy(() =>
  import('../dialogs/crop-dialog').then((module) => ({ default: module.CropDialog })),
);

const SIZE_INPUT_CLASS =
  'h-8 ps-6 pe-6 text-center font-mono text-xs border-border/70 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/** مقاسات الصور الجاهزة للاختيار السريع — نفس المقاسات في لوحة الشبكة */
const PRESET_PHOTO_TYPES: PhotoGridType[] = [
  'iq-national-id',
  'iq-civil-id',
  'visa',
  'iq-general-id',
  'iq-transactions',
];

/** رسائل فشل تعديل مقاس الخلية — مصدر واحد بدل نسخة في كل مستهلك. */
const SIZE_ERROR_MESSAGES: Record<CollageSlotSizeError, string> = {
  'not-found': 'الخلية غير موجودة',
  invalid: 'المقاس غير صحيح',
  'out-of-bounds': 'المقاس يتجاوز حدود الورقة من موضع الخلية الحالي',
  overlap: 'المقاس يتداخل مع خلية أخرى — استخدم الكولاج الحر للمواضع المخصصة',
};

/** صياغة «تطبيق على الكل»: الفشل يشمل كل الخلايا لا الخلية المصدر وحدها. */
const APPLY_ALL_ERROR_MESSAGES: Record<CollageSlotSizeError, string> = {
  ...SIZE_ERROR_MESSAGES,
  'not-found': 'الخلية المصدر غير موجودة',
  'out-of-bounds': 'هذا المقاس يخرج بعض الخلايا عن حدود الورقة',
  overlap: 'المقاس يتداخل مع خلايا أخرى — استخدم الكولاج الحر للمواضع المخصصة',
};

/** حقول سياقية لمقاس الخلية المحددة؛ تُحفظ كخطوة تراجع واحدة عند تأكيد القيمة. */
function SlotSizeFields({
  slot,
  lockAspect,
  onLockAspectChange,
}: {
  slot: CanvasSlot;
  lockAspect: boolean;
  onLockAspectChange: () => void;
}) {
  const {
    canvasWidth,
    canvasHeight,
    collageGap,
    collageMargin,
    hasPhysicalLayout,
    storedDpi,
    slotsCount,
    resizeCollageSlot,
    applyCollageSlotSizeToAll,
  } = useEditorStore(
    useShallow((state) => ({
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      collageGap: state.collageGap,
      collageMargin: state.collageMargin,
      hasPhysicalLayout: Boolean(state.collageTemplate?.physicalLayout),
      storedDpi: state.printSettings.dpi || 300,
      slotsCount: state.slots.length,
      resizeCollageSlot: state.resizeCollageSlot,
      applyCollageSlotSizeToAll: state.applyCollageSlotSizeToAll,
    })),
  );
  const dpi = useMemo(
    () => getEffectiveDpi(canvasWidth, canvasHeight, storedDpi),
    [canvasWidth, canvasHeight, storedDpi],
  );
  const geo = useMemo(
    () =>
      getCollageGeometry(canvasWidth, canvasHeight, collageMargin, collageGap, hasPhysicalLayout),
    [canvasWidth, canvasHeight, collageMargin, collageGap, hasPhysicalLayout],
  );
  const rect = useMemo(() => getSlotRect(slot, geo), [slot, geo]);
  const widthMM = pxToMm(rect.width, dpi);
  const heightMM = pxToMm(rect.height, dpi);
  const [width, setWidth] = useState(widthMM.toFixed(1));
  const [height, setHeight] = useState(heightMM.toFixed(1));
  const [activeField, setActiveField] = useState<'width' | 'height' | null>(null);
  const [prevWidthMM, setPrevWidthMM] = useState(widthMM);
  const [prevHeightMM, setPrevHeightMM] = useState(heightMM);
  const skipCommitRef = useRef(false);

  // مزامنة المسودات مع تحديثات الكانفاس/الهندسة (الورق، DPI، الفجوة، الهامش)
  // دون إعادة تركيب المكون وفقدان تركيز لوحة المفاتيح
  if (widthMM !== prevWidthMM) {
    setPrevWidthMM(widthMM);
    if (activeField !== 'width') {
      setWidth(widthMM.toFixed(1));
    }
  }
  if (heightMM !== prevHeightMM) {
    setPrevHeightMM(heightMM);
    if (activeField !== 'height') {
      setHeight(heightMM.toFixed(1));
    }
  }

  const resetDraft = () => {
    setWidth(widthMM.toFixed(1));
    setHeight(heightMM.toFixed(1));
  };

  const commitSize = (axis: 'width' | 'height') => {
    let nextW = Number(width);
    let nextH = Number(height);
    if (!Number.isFinite(nextW) || !Number.isFinite(nextH) || nextW <= 0 || nextH <= 0) {
      toast.error('أدخل مقاسًا صحيحًا أكبر من صفر');
      resetDraft();
      return;
    }
    if (lockAspect) {
      const ratio = rect.width / rect.height;
      if (axis === 'width') nextH = nextW / ratio;
      else nextW = nextH * ratio;
    }
    const maxW = pxToMm((1 - slot.x) * geo.availW - geo.gap, dpi);
    const maxH = pxToMm((1 - slot.y) * geo.availH - geo.gap, dpi);
    if (maxW < 1 || maxH < 1) {
      toast.error('لا توجد مساحة كافية لهذه الخلية على الورقة');
      resetDraft();
      return;
    }
    if (lockAspect) {
      // تصغير متناسب بدل قصّ كل بُعد منفرداً حتى لا تنكسر نسبة القفل.
      const scale = Math.min(1, maxW / nextW, maxH / nextH);
      nextW *= scale;
      nextH *= scale;
    } else {
      // بلا قفل: يُقيَّد كل بُعد بمساحته المستقلة — لا يُصغَّر البُعد الآخر خفيةً.
      nextW = Math.min(nextW, maxW);
      nextH = Math.min(nextH, maxH);
    }
    if (nextW < 1 || nextH < 1) {
      toast.error('الحد الأدنى لمقاس الخلية هو 1 مم');
      resetDraft();
      return;
    }
    const nextNormalizedW = (mmToPx(nextW, dpi) + geo.gap) / geo.availW;
    const nextNormalizedH = (mmToPx(nextH, dpi) + geo.gap) / geo.availH;
    const result = resizeCollageSlot(slot.id, nextNormalizedW, nextNormalizedH);
    if (!result.ok) {
      toast.error(SIZE_ERROR_MESSAGES[result.reason]);
      resetDraft();
      return;
    }
    setWidth(nextW.toFixed(1));
    setHeight(nextH.toFixed(1));
  };

  const fieldProps = (axis: 'width' | 'height') => ({
    type: 'number' as const,
    min: 1,
    step: 0.1,
    dir: 'ltr' as const,
    title: 'أدخل المقاس ثم اضغط Enter للتطبيق، أو Esc للإلغاء',
    onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
      setActiveField(axis);
      event.currentTarget.select();
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') event.currentTarget.blur();
      if (event.key === 'Escape') {
        skipCommitRef.current = true;
        resetDraft();
        event.currentTarget.blur();
      }
    },
    onBlur: () => {
      setActiveField(null);
      if (skipCommitRef.current) {
        skipCommitRef.current = false;
        return;
      }
      commitSize(axis);
    },
  });

  /** تطبيق مقاس جاهز على الخلية — يحوّل المليمتر إلى إحداثيات طبيعية ويطبّقها. */
  const applyPresetSize = (photoType: PhotoGridType) => {
    const { wMM, hMM } = getPhotoDimensions(photoType);
    const normalizedW = (mmToPx(wMM, dpi) + geo.gap) / geo.availW;
    const normalizedH = (mmToPx(hMM, dpi) + geo.gap) / geo.availH;
    const result = resizeCollageSlot(slot.id, normalizedW, normalizedH);
    if (!result.ok) {
      toast.error(SIZE_ERROR_MESSAGES[result.reason]);
      return;
    }
    setWidth(wMM.toFixed(1));
    setHeight(hMM.toFixed(1));
    toast.success(`تم تطبيق مقاس ${getPhotoDimensions(photoType).label}`);
  };

  return (
    <div className="space-y-2.5" dir="rtl">
      {/* قائمة المقاسات الجاهزة */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full justify-between px-2.5 text-xs font-sans border-border/70 hover:bg-accent/70"
          >
            <span className="flex-1 text-start text-muted-foreground">اختر مقاسًا...</span>
            <CaretDown className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 font-cairo text-xs">
          {PRESET_PHOTO_TYPES.map((type) => {
            const { wMM, hMM, label } = getPhotoDimensions(type);
            return (
              <DropdownMenuItem
                key={type}
                onClick={() => applyPresetSize(type)}
                className="cursor-pointer flex items-center justify-between py-1.5"
              >
                <span className="font-semibold">{label}</span>
                <span className="text-mini text-muted-foreground font-mono" dir="ltr">
                  {wMM}×{hMM} مم
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* حقول العرض والارتفاع المدمجة مع قفل النسبة */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        <div className="relative">
          <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-muted-foreground select-none">
            ع
          </span>
          <Input
            id={`slot-width-${slot.id}`}
            aria-label="عرض الخلية بالمليمتر"
            value={width}
            onChange={(event) => setWidth(event.target.value)}
            {...fieldProps('width')}
            className={SIZE_INPUT_CLASS}
          />
          <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-3xs font-sans text-muted-foreground select-none">
            مم
          </span>
        </div>

        <FluentTooltip content={lockAspect ? 'إلغاء قفل النسبة' : 'قفل نسبة الأبعاد'} side="top">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={lockAspect ? 'إلغاء قفل نسبة الأبعاد' : 'قفل نسبة الأبعاد'}
            aria-pressed={lockAspect}
            className={cn(
              'size-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent/60',
              lockAspect && 'text-primary bg-primary/15 hover:bg-primary/20 hover:text-primary',
            )}
            onClick={onLockAspectChange}
          >
            <Lock className="size-3.5" weight={lockAspect ? 'fill' : 'regular'} />
          </Button>
        </FluentTooltip>

        <div className="relative">
          <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-3xs font-bold text-muted-foreground select-none">
            ط
          </span>
          <Input
            id={`slot-height-${slot.id}`}
            aria-label="ارتفاع الخلية بالمليمتر"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            {...fieldProps('height')}
            className={SIZE_INPUT_CLASS}
          />
          <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-3xs font-sans text-muted-foreground select-none">
            مم
          </span>
        </div>
      </div>

      {(hasPhysicalLayout || slotsCount > 1) && (
        <div className="space-y-1 pt-1">
          {slotsCount > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-center gap-1.5 px-2 text-mini text-muted-foreground hover:text-foreground hover:bg-accent/60"
              onClick={() => {
                const result = applyCollageSlotSizeToAll(slot.id);
                if (result.ok) {
                  toast.success('تم توحيد مقاس الخلايا');
                } else {
                  toast.error(APPLY_ALL_ERROR_MESSAGES[result.reason]);
                }
              }}
            >
              <Copy className="size-3.5 text-primary" />
              <span>تطبيق على الكل</span>
            </Button>
          )}
          {hasPhysicalLayout && (
            <p className="text-micro text-center text-muted-foreground/70">
              تعديل المقاس يدويًا يحوّل القالب إلى تخطيط مخصص
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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
    printSettings,
    canvasWidth,
    canvasHeight,
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
      printSettings: state.printSettings,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    })),
  );
  const [cropOpen, setCropOpen] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [lockSlotAspect, setLockSlotAspect] = useState(false);
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

  const dpi = useMemo(
    () => getEffectiveDpi(canvasWidth, canvasHeight, printSettings?.dpi || 300),
    [canvasWidth, canvasHeight, printSettings?.dpi],
  );

  const renderAutoFillToggle = () => (
    <div
      className="flex items-center justify-between pt-2 border-t border-border/20 mt-2 font-cairo select-none"
      dir="rtl"
    >
      <span className="text-xs font-semibold text-foreground/90">تعبئة تلقائية</span>
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
      <div className="space-y-3 font-cairo select-none" dir="rtl">
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full h-10 gap-2 rounded-md font-semibold text-xs border-primary/40 hover:bg-primary/10 hover:border-primary cursor-pointer text-primary"
            onClick={handleOpenFile}
          >
            <ImageSquare className="size-4" weight="bold" />
            <span>رفع صورة</span>
          </Button>

          {lastEditedImage && (
            <Button
              variant="secondary"
              className="w-full h-8 gap-2 rounded-md font-medium text-xs cursor-pointer"
              onClick={handleUseLastImage}
            >
              <Copy className="size-3.5 text-muted-foreground" />
              <span>آخر صورة</span>
            </Button>
          )}
        </div>

        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/80">المقاس</span>
            <span className="font-mono text-3xs" dir="ltr">
              {Math.round(dpi)} DPI
            </span>
          </div>
          <SlotSizeFields
            key={slot.id}
            slot={slot}
            lockAspect={lockSlotAspect}
            onLockAspectChange={() => setLockSlotAspect((value) => !value)}
          />
        </div>

        {renderAutoFillToggle()}
      </div>
    );
  }

  return (
    <div className="space-y-3 font-cairo select-none pb-2" dir="rtl">
      {/* الإجراءات الأساسية السريعة */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-md border-border/80 hover:bg-accent gap-1.5 text-xs font-semibold cursor-pointer"
            onClick={() => setCropOpen(true)}
          >
            <Crop className="size-4 text-primary" weight="bold" />
            <span>قص</span>
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-md border-border/80 hover:bg-accent gap-1.5 text-xs font-semibold cursor-pointer"
            onClick={handleOpenFile}
          >
            <ImageSquare className="size-4 text-primary" />
            <span>استبدال</span>
          </Button>
        </div>

        {/* زر التعبئة السريع المباشر */}
        <Button
          variant="secondary"
          className="w-full h-8 rounded-md gap-1.5 text-xs font-semibold cursor-pointer hover:bg-accent"
          onClick={handleFillAll}
        >
          <GridFour className="size-3.5 text-primary" />
          <span>تعبئة الكل</span>
        </Button>

        {/* شريط أدوات مصغر هادئ */}
        <div className="flex items-center justify-between gap-1 p-1 bg-muted/40 rounded-lg border border-border/50">
          <FluentTooltip content="تدوير 90°" side="top">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded text-muted-foreground hover:text-foreground hover:bg-background"
              onClick={() => {
                const currentRotation = slot.rotation ?? 0;
                const newRotation = (currentRotation + 90) % 360;
                onUpdate(slot.id, { rotation: newRotation });
                useEditorStore.getState().pushHistory();
              }}
              aria-label="تدوير"
            >
              <ArrowClockwise className="size-3.5" />
            </Button>
          </FluentTooltip>

          <FluentTooltip content="قلب أفقي" side="top">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'size-7 rounded text-muted-foreground hover:text-foreground hover:bg-background',
                slot.flipX && 'text-primary bg-background shadow-2xs font-bold',
              )}
              onClick={() => {
                onUpdate(slot.id, { flipX: !slot.flipX });
                useEditorStore.getState().pushHistory();
              }}
              aria-label="قلب أفقي"
            >
              <FlipHorizontal className="size-3.5" weight={slot.flipX ? 'fill' : 'regular'} />
            </Button>
          </FluentTooltip>

          <FluentTooltip content="قلب عمودي" side="top">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'size-7 rounded text-muted-foreground hover:text-foreground hover:bg-background',
                slot.flipY && 'text-primary bg-background shadow-2xs font-bold',
              )}
              onClick={() => {
                onUpdate(slot.id, { flipY: !slot.flipY });
                useEditorStore.getState().pushHistory();
              }}
              aria-label="قلب عمودي"
            >
              <FlipVertical className="size-3.5" weight={slot.flipY ? 'fill' : 'regular'} />
            </Button>
          </FluentTooltip>

          <FluentTooltip content="توسيط" side="top">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded text-muted-foreground hover:text-foreground hover:bg-background"
              onClick={() => {
                onUpdate(slot.id, { dragX: 0, dragY: 0, zoom: 1 });
                useEditorStore.getState().pushHistory();
              }}
              aria-label="توسيط"
            >
              <Crosshair className="size-3.5" />
            </Button>
          </FluentTooltip>

          <div className="h-4 w-px bg-border/60 mx-0.5" />

          <FluentTooltip content="إفراغ" side="top">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                onUpdate(slot.id, { imageSrc: undefined });
                useEditorStore.getState().pushHistory();
              }}
              aria-label="إفراغ"
            >
              <Trash className="size-3.5" />
            </Button>
          </FluentTooltip>
        </div>
      </div>

      {/* قسم وحيد مطوي للخيارات الإضافية */}
      <FluentSection title="خيارات إضافية" collapsible defaultOpen={false}>
        <div className="space-y-3 pt-1">
          {/* مقاس الخلية */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-mini text-muted-foreground font-medium">
              <span>المقاس</span>
              <span className="font-mono text-3xs" dir="ltr">
                {Math.round(dpi)} DPI
              </span>
            </div>
            <SlotSizeFields
              key={slot.id}
              slot={slot}
              lockAspect={lockSlotAspect}
              onLockAspectChange={() => setLockSlotAspect((value) => !value)}
            />
          </div>

          {/* تعبئة وتبديل */}
          <div className="space-y-2 pt-2 border-t border-border/30">
            <span className="text-mini text-muted-foreground font-medium">توزيع متقدم</span>
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-3xs font-medium"
                onClick={handleFillRow}
              >
                الصف
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-3xs font-medium"
                onClick={handleFillColumn}
              >
                العمود
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-3xs font-medium"
                onClick={() => {
                  if (slot.imageSrc) fillEmptySlots(slot.imageSrc, slot.id);
                }}
              >
                الفارغة
              </Button>
            </div>

            {slots.length > 1 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-3xs text-muted-foreground">تبديل مع:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 text-3xs px-2 gap-1">
                      <span>خلية أخرى</span>
                      <CaretDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 font-cairo text-xs">
                    {slots
                      .filter((s) => s.id !== slot.id)
                      .map((otherSlot, idx) => (
                        <DropdownMenuItem
                          key={otherSlot.id}
                          onClick={() => swapSlots(slot.id, otherSlot.id)}
                          className="cursor-pointer flex items-center justify-between text-xs py-1"
                        >
                          <span>
                            الخلية #
                            {otherSlot.cellIndex !== undefined ? otherSlot.cellIndex + 1 : idx + 1}
                          </span>
                          <span className="text-3xs text-muted-foreground">
                            {otherSlot.imageSrc ? 'ممتلئة' : 'فارغة'}
                          </span>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* خلفية الخلية */}
          <div className="space-y-2 pt-2 border-t border-border/30">
            <span className="text-mini text-muted-foreground font-medium">لون الخلفية</span>
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
                ariaLabel="لون الخلفية"
              />
            </ColorPanel>
          </div>

          {/* تعديل الألوان */}
          <div className="space-y-2.5 pt-2 border-t border-border/30">
            <span className="text-mini text-muted-foreground font-medium">تعديل الألوان</span>
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
              onClick={() => {
                onUpdate(slot.id, {
                  filter: 'none',
                  brightness: 100,
                  contrast: 100,
                  saturation: 100,
                });
                useEditorStore.getState().pushHistory();
              }}
            >
              إعادة تعيين الألوان
            </Button>
          </div>

          {renderAutoFillToggle()}
        </div>
      </FluentSection>

      {/* حوار القص */}
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
