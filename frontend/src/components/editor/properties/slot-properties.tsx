import React, { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { getPhotoDimensions } from '@/components/editor/panels/collage/collage-grid-math';
import {
  FluentSection,
  FluentSettingRow,
  FluentSliderField,
  FluentTooltip,
} from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Crop, FlipVertical, Crosshair, Copy, Lock, CaretDown } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getCollageGeometry, getSlotRect } from '@/lib/canvas/collage-geometry';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { mmToPx, pxToMm } from '@/lib/canvas/units';
import { useEditorStore } from '@/lib/editor-store';
import { isAutoFillGridEnabled, setAutoFillGridEnabled } from '@/lib/local-prefs';
import { createLogger } from '@/lib/logger';
import { getEffectiveDpi, IMAGE_FILTERS, filterShortName } from '@/lib/templates';
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
  'h-8 min-w-0 ps-2 pe-7 text-start font-mono text-sm tabular-nums border-border/70 shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

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
            className="h-8 w-full justify-between px-2.5 text-xs font-sans border-border/70 hover:bg-accent/70 shadow-none"
            title={hasPhysicalLayout ? 'تغيير المقاس يحوّل القالب إلى تخطيط مخصص' : undefined}
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

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <FluentSettingRow
          label={<label htmlFor={`slot-width-${slot.id}`}>العرض</label>}
          layout="vertical"
          className="min-w-0"
        >
          <div className="relative" dir="ltr">
            <Input
              id={`slot-width-${slot.id}`}
              aria-label="عرض الخلية بالمليمتر"
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              {...fieldProps('width')}
              className={SIZE_INPUT_CLASS}
            />
            <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-xs font-sans text-muted-foreground select-none">
              مم
            </span>
          </div>
        </FluentSettingRow>

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

        <FluentSettingRow
          label={<label htmlFor={`slot-height-${slot.id}`}>الارتفاع</label>}
          layout="vertical"
          className="min-w-0"
        >
          <div className="relative" dir="ltr">
            <Input
              id={`slot-height-${slot.id}`}
              aria-label="ارتفاع الخلية بالمليمتر"
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              {...fieldProps('height')}
              className={SIZE_INPUT_CLASS}
            />
            <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-xs font-sans text-muted-foreground select-none">
              مم
            </span>
          </div>
        </FluentSettingRow>
      </div>

      {slotsCount > 1 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-center gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60"
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
    setSlotImage,
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
      setSlotImage: state.setSlotImage,
      lastEditedImage: state.lastEditedImage,
      printSettings: state.printSettings,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    })),
  );
  const [cropOpen, setCropOpen] = useState(false);
  const [lockSlotAspect, setLockSlotAspect] = useState(false);
  const [autoFill, setAutoFill] = useState(isAutoFillGridEnabled);

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
    <FluentSettingRow label="تعبئة تلقائية" className="border-t border-border/30 pt-2 pb-0">
      <Switch
        checked={autoFill}
        onCheckedChange={(checked) => {
          setAutoFill(checked);
          setAutoFillGridEnabled(checked);
        }}
        aria-label="تعبئة تلقائية"
      />
    </FluentSettingRow>
  );

  return (
    <div className="min-w-0 font-cairo select-none pb-2" dir="rtl">
      <FluentSection
        title="مقاس الخلية"
        collapsible
        defaultOpen
        className="border-border/40 py-2.5"
        badge={
          <span className="font-mono text-mini font-normal text-muted-foreground" dir="ltr">
            {Math.round(dpi)} DPI
          </span>
        }
      >
        <SlotSizeFields
          key={slot.id}
          slot={slot}
          lockAspect={lockSlotAspect}
          onLockAspectChange={() => setLockSlotAspect((value) => !value)}
        />
      </FluentSection>

      <FluentSection title="الصورة" collapsible defaultOpen className="border-border/40 py-2.5">
        {slot.imageSrc ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 min-w-0 flex-1 gap-1.5 px-2 text-xs shadow-none"
              onClick={() => setCropOpen(true)}
              aria-label="قص الصورة"
            >
              <Crop className="size-4 text-primary" weight="bold" />
              <span>قص</span>
            </Button>

            <FluentTooltip content="قلب عمودي" side="top">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'size-8 shrink-0',
                  slot.flipY && 'text-primary bg-primary/10 hover:text-primary',
                )}
                onClick={() => {
                  onUpdate(slot.id, { flipY: !slot.flipY });
                  useEditorStore.getState().pushHistory();
                }}
                aria-label="قلب عمودي"
                aria-pressed={Boolean(slot.flipY)}
              >
                <FlipVertical className="size-4" weight={slot.flipY ? 'fill' : 'regular'} />
              </Button>
            </FluentTooltip>

            <FluentTooltip content="توسيط" side="top">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => {
                  onUpdate(slot.id, { dragX: 0, dragY: 0, zoom: 1 });
                  useEditorStore.getState().pushHistory();
                }}
                aria-label="توسيط"
              >
                <Crosshair className="size-4" />
              </Button>
            </FluentTooltip>
          </div>
        ) : (
          lastEditedImage && (
            <Button
              variant="secondary"
              className="h-8 w-full gap-1.5 text-xs shadow-none"
              onClick={handleUseLastImage}
              aria-label="آخر صورة"
            >
              <Copy className="size-3.5 text-muted-foreground" />
              <span>آخر صورة</span>
            </Button>
          )
        )}

        {renderAutoFillToggle()}
      </FluentSection>

      {slot.imageSrc && (
        <>
          <FluentSection
            title="ألوان الصورة"
            collapsible
            defaultOpen
            className="border-border/40 py-2.5"
          >
            <FluentSettingRow label="الخلفية" className="py-0">
              <ColorPanel wheelPosition="bottom" className="w-48">
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
                  className="w-full bg-transparent shadow-none"
                  ariaLabel="لون الخلفية"
                />
              </ColorPanel>
            </FluentSettingRow>

            <div className="space-y-1.5 border-t border-border/30 pt-2">
              <FluentSliderField
                label="السطوع"
                layout="inline"
                labelWidth="w-14"
                value={slot.brightness ?? 100}
                min={0}
                max={200}
                step={1}
                unit="%"
                defaultValue={100}
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
                layout="inline"
                labelWidth="w-14"
                value={slot.contrast ?? 100}
                min={0}
                max={200}
                step={1}
                unit="%"
                defaultValue={100}
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
                layout="inline"
                labelWidth="w-14"
                value={slot.saturation ?? 100}
                min={0}
                max={200}
                step={1}
                unit="%"
                defaultValue={100}
                onChange={(v) => onUpdate(slot.id, { saturation: v })}
                onCommit={() => {
                  useRenderQuality.getState().setIsDraggingFilter(false);
                  useEditorStore.getState().pushHistory();
                }}
                onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true, slot.id)}
                onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
              />
            </div>

            <div className="space-y-1.5 border-t border-border/30 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-mini text-muted-foreground">المرشحات</span>
                {slot.filter && slot.filter !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate(slot.id, { filter: 'none' });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="text-mini text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    إزالة
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {IMAGE_FILTERS.map((filter) => {
                  const isActive = slot.filter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => {
                        onUpdate(slot.id, { filter: filter.id });
                        useEditorStore.getState().pushHistory();
                      }}
                      aria-pressed={isActive}
                      aria-label={filter.name}
                      title={filter.name}
                      className={cn(
                        'flex flex-col items-center gap-1 p-1 rounded-md border transition-colors cursor-pointer',
                        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-border/60 bg-card hover:bg-accent text-muted-foreground',
                      )}
                    >
                      <span className="w-full aspect-square rounded-md overflow-hidden shrink-0 border border-foreground/10 bg-muted relative">
                        <img
                          src={slot.imageSrc}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ filter: filter.css }}
                        />
                      </span>
                      <span className="text-mini w-full text-center leading-tight truncate">
                        {filterShortName(filter.name)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full text-xs font-medium shadow-none"
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
          </FluentSection>

          <FluentSection
            title="توزيع الصورة"
            collapsible
            defaultOpen={false}
            className="border-border/40 py-2.5"
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full min-w-0 gap-1.5 px-2 text-xs font-medium shadow-none"
              onClick={() => {
                if (slot.imageSrc) fillEmptySlots(slot.imageSrc, slot.id);
              }}
              aria-label="تعبئة الخلايا الفارغة"
            >
              تعبئة الفارغ
            </Button>

            {slots.length > 1 && (
              <FluentSettingRow label="تبديل مع" className="border-t border-border/40 pt-2.5 pb-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-xs shadow-none"
                      aria-label="تبديل مع خلية أخرى"
                    >
                      <span>خلية أخرى</span>
                      <CaretDown className="size-3.5" />
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
              </FluentSettingRow>
            )}
          </FluentSection>
        </>
      )}

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
