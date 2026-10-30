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
import {
  ArrowCounterClockwise,
  ArrowsLeftRight,
  CaretDown,
  Check,
  Copy,
  Crop,
  Crosshair,
  FlipVertical,
  GridFour,
  LockSimple,
  LockSimpleOpen,
} from '@/components/ui/icons';
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
  'h-8 min-w-0 ps-2 pe-7 text-start font-mono text-sm tabular-nums border-border/60 shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/** مقاسات الصور الجاهزة للاختيار السريع — نفس المقاسات في لوحة الشبكة */
const PRESET_PHOTO_TYPES: PhotoGridType[] = [
  'iq-national-id',
  'iq-civil-id',
  'visa',
  'iq-general-id',
  'iq-transactions',
];

/** تسامح مطابقة أبعاد الخلية الحالية مع المقاسات القياسية بالمليمتر */
const PRESET_MATCH_TOLERANCE_MM = 0.25;

function findMatchingPreset(widthMM: number, heightMM: number) {
  for (const type of PRESET_PHOTO_TYPES) {
    const dims = getPhotoDimensions(type);
    if (
      Math.abs(widthMM - dims.wMM) <= PRESET_MATCH_TOLERANCE_MM &&
      Math.abs(heightMM - dims.hMM) <= PRESET_MATCH_TOLERANCE_MM
    ) {
      return { type, ...dims };
    }
  }
  return null;
}

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
    resizeCollageSlot,
  } = useEditorStore(
    useShallow((state) => ({
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      collageGap: state.collageGap,
      collageMargin: state.collageMargin,
      hasPhysicalLayout: Boolean(state.collageTemplate?.physicalLayout),
      storedDpi: state.printSettings.dpi || 300,
      resizeCollageSlot: state.resizeCollageSlot,
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

  const matchedPreset = findMatchingPreset(widthMM, heightMM);

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
    const maxW = pxToMm(geo.availW - geo.gap, dpi);
    const maxH = pxToMm(geo.availH - geo.gap, dpi);
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
    <div className="space-y-2" dir="rtl">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full justify-between gap-2 px-2.5 text-xs font-sans border-border/60 shadow-none"
            title={hasPhysicalLayout ? 'تغيير المقاس يحوّل القالب إلى تخطيط مخصص' : undefined}
          >
            <span
              className={cn(
                'truncate',
                matchedPreset ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {matchedPreset ? matchedPreset.label : 'اختر مقاسًا...'}
            </span>
            <CaretDown className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 font-cairo text-xs">
          {PRESET_PHOTO_TYPES.map((type) => {
            const { wMM, hMM, label } = getPhotoDimensions(type);
            const isSelected = matchedPreset?.type === type;
            return (
              <DropdownMenuItem
                key={type}
                onClick={() => applyPresetSize(type)}
                className={cn(
                  'cursor-pointer flex items-center justify-between gap-2 py-1.5',
                  isSelected && 'bg-primary/10 text-primary font-semibold',
                )}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Check
                    className={cn(
                      'size-3.5 shrink-0',
                      isSelected ? 'text-primary opacity-100' : 'opacity-0',
                    )}
                    weight="bold"
                  />
                  <span className="truncate font-medium">{label}</span>
                </span>
                <span className="text-mini text-muted-foreground font-mono shrink-0" dir="ltr">
                  {wMM}×{hMM} مم
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-1.5">
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
            {lockAspect ? (
              <LockSimple className="size-3.5" weight="fill" />
            ) : (
              <LockSimpleOpen className="size-3.5" weight="regular" />
            )}
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
    applyCollageSlotSizeToAll,
  } = useEditorStore(
    useShallow((state) => ({
      slots: state.slots,
      swapSlots: state.swapSlots,
      fillAllSlots: state.fillAllSlots,
      fillEmptySlots: state.fillEmptySlots,
      setSlotImage: state.setSlotImage,
      lastEditedImage: state.lastEditedImage,
      applyCollageSlotSizeToAll: state.applyCollageSlotSizeToAll,
    })),
  );
  const [cropOpen, setCropOpen] = useState(false);
  const [lockSlotAspect, setLockSlotAspect] = useState(false);
  const [autoFill, setAutoFill] = useState(isAutoFillGridEnabled);

  const hasEmptySlots = useMemo(() => slots.some((s) => !s.imageSrc), [slots]);
  const hasColorChanges =
    (slot.brightness ?? 100) !== 100 ||
    (slot.contrast ?? 100) !== 100 ||
    (slot.saturation ?? 100) !== 100 ||
    Boolean(slot.filter && slot.filter !== 'none');

  const activeFilterObj = useMemo(
    () =>
      slot.filter && slot.filter !== 'none'
        ? IMAGE_FILTERS.find((f) => f.id === slot.filter)
        : undefined,
    [slot.filter],
  );

  const handleUseLastImage = () => {
    if (lastEditedImage) {
      setSlotImage(slot.id, lastEditedImage);
      if (autoFill) {
        fillAllSlots(lastEditedImage, slot.id);
      }
    }
  };

  return (
    <div className="min-w-0 font-cairo select-none pb-2" dir="rtl">
      {/* 1. مقاس الخلية — زر «تطبيق على الكل» مدمج بهدوء في رأس القسم لتوفير المساحة الرأسية */}
      <FluentSection
        title="مقاس الخلية"
        collapsible
        defaultOpen
        className="border-border/40 py-2.5"
        action={
          slots.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                const result = applyCollageSlotSizeToAll(slot.id);
                if (result.ok) {
                  toast.success('تم توحيد مقاس الخلايا');
                } else {
                  toast.error(APPLY_ALL_ERROR_MESSAGES[result.reason]);
                }
              }}
              className="inline-flex items-center gap-1 text-mini text-primary hover:text-primary/80 transition-colors cursor-pointer px-1 py-0.5 rounded-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Copy className="size-3 shrink-0" />
              <span>تطبيق على الكل</span>
            </button>
          ) : undefined
        }
      >
        <SlotSizeFields
          key={slot.id}
          slot={slot}
          lockAspect={lockSlotAspect}
          onLockAspectChange={() => setLockSlotAspect((value) => !value)}
        />
      </FluentSection>

      {/* 2. الصورة — شريط نظيف بلا خطوط داخلية مزدوجة */}
      <FluentSection title="الصورة" collapsible defaultOpen className="border-border/40 py-2.5">
        {slot.imageSrc ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              className="h-8 min-w-0 flex-1 gap-1.5 px-2 text-xs border-border/60 shadow-none"
              onClick={() => setCropOpen(true)}
              aria-label="قص الصورة"
            >
              <Crop className="size-4 text-primary shrink-0" weight="bold" />
              <span>قص</span>
            </Button>

            <FluentTooltip content="قلب عمودي" side="top">
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  'size-8 shrink-0 border-border/60 shadow-none',
                  slot.flipY && 'border-primary/45 text-primary bg-primary/10 hover:text-primary',
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

            <FluentTooltip content="إعادة توسيط الصورة" side="top">
              <Button
                variant="outline"
                size="icon"
                className="size-8 shrink-0 border-border/60 shadow-none"
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
              <Copy className="size-3.5 text-muted-foreground shrink-0" />
              <span>آخر صورة</span>
            </Button>
          )
        )}

        <FluentSettingRow label="تعبئة تلقائية" className="py-0.5">
          <Switch
            checked={autoFill}
            onCheckedChange={(checked) => {
              setAutoFill(checked);
              setAutoFillGridEnabled(checked);
            }}
            aria-label="تعبئة تلقائية"
          />
        </FluentSettingRow>
      </FluentSection>

      {slot.imageSrc && (
        <>
          {/* 3. ألوان الصورة — بلا فواصل داخلية زائدة، وزر الاستعادة في الرأس عند التغيير */}
          <FluentSection
            title="ألوان الصورة"
            collapsible
            defaultOpen
            className="border-border/40 py-2.5"
            action={
              hasColorChanges ? (
                <button
                  type="button"
                  aria-label="إعادة تعيين الألوان"
                  onClick={() => {
                    onUpdate(slot.id, {
                      filter: 'none',
                      brightness: 100,
                      contrast: 100,
                      saturation: 100,
                    });
                    useEditorStore.getState().pushHistory();
                  }}
                  className="inline-flex items-center gap-1 text-mini text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-1 py-0.5 rounded-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <ArrowCounterClockwise className="size-3 shrink-0" />
                  <span>إعادة تعيين</span>
                </button>
              ) : undefined
            }
          >
            <FluentSettingRow label="الخلفية" className="py-0">
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
                  className="w-full border-border/60 shadow-none"
                  ariaLabel="لون الخلفية"
                />
              </ColorPanel>
            </FluentSettingRow>

            <div className="space-y-2.5 pt-1">
              <FluentSliderField
                label="السطوع"
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
          </FluentSection>

          {/* 4. المرشحات — مطوية افتراضياً لمنع الازدحام البصري، مع إظهار اسم المرشح النشط في الرأس */}
          <FluentSection
            title="المرشحات"
            collapsible
            defaultOpen={false}
            className="border-border/40 py-2.5"
            badge={
              activeFilterObj ? (
                <span className="text-mini font-normal text-primary">
                  · {filterShortName(activeFilterObj.name)}
                </span>
              ) : undefined
            }
            action={
              activeFilterObj ? (
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(slot.id, { filter: 'none' });
                    useEditorStore.getState().pushHistory();
                  }}
                  className="text-mini text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-1 rounded-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  إزالة
                </button>
              ) : undefined
            }
          >
            <div className="grid grid-cols-3 gap-1.5">
              {IMAGE_FILTERS.map((filter) => {
                const isActive = (slot.filter || 'none') === filter.id;
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
                      'flex flex-col items-center gap-1 p-1 rounded-md border transition-colors duration-150 cursor-pointer',
                      'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                      isActive
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border/60 bg-card/60 hover:bg-accent/60 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="w-full aspect-4/3 rounded-sm overflow-hidden shrink-0 border border-foreground/10 bg-muted relative">
                      <img
                        src={slot.imageSrc}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ filter: filter.css }}
                      />
                    </span>
                    <span className="text-mini w-full text-center leading-tight truncate px-0.5">
                      {filterShortName(filter.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </FluentSection>

          {/* 5. توزيع الصورة — مطوي افتراضياً ومرتب في صف واحد نظيف عند الفتح */}
          {slots.length > 1 && (
            <FluentSection
              title="توزيع الصورة"
              collapsible
              defaultOpen={false}
              className="border-border/40 py-2.5"
            >
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasEmptySlots}
                  className="h-8 min-w-0 gap-1.5 px-2 text-xs font-medium border-border/60 shadow-none"
                  onClick={() => {
                    if (slot.imageSrc) fillEmptySlots(slot.imageSrc, slot.id);
                  }}
                  aria-label="تعبئة الخلايا الفارغة"
                >
                  <GridFour className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">تعبئة الفارغ</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 min-w-0 justify-between gap-1 px-2 text-xs font-medium border-border/60 shadow-none"
                      aria-label="تبديل مع خلية أخرى"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <ArrowsLeftRight className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">تبديل مع</span>
                      </span>
                      <CaretDown className="size-3 shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 font-cairo text-xs">
                    {slots
                      .filter((s) => s.id !== slot.id)
                      .map((otherSlot, idx) => (
                        <DropdownMenuItem
                          key={otherSlot.id}
                          onClick={() => swapSlots(slot.id, otherSlot.id)}
                          className="cursor-pointer flex items-center justify-between text-xs py-1.5"
                        >
                          <span className="font-medium">
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
            </FluentSection>
          )}
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
