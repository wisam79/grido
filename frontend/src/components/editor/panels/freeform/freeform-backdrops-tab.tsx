import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLineDown,
  ArrowCounterClockwise,
  ArrowsLeftRight,
  Check,
  Drop,
  GridNine,
  Selection,
  SelectionAll,
  SlidersHorizontal,
  Square,
  Trash,
  XCircle,
} from '@/components/ui/icons';
import { useEditorStore, type CanvasElement } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FluentIconButton,
  FluentSection,
  FluentSegmentedControl,
  FluentSliderField,
} from '@/components/ui/blocks';
import {
  PaperBackgroundSummary,
  PopoverColorPicker,
} from '@/components/editor/properties/shared-controls';
import {
  GRADIENT_PRESETS,
  formatGradientCss,
  gradientPointsFromAngle,
  type GradientPreset,
} from '@/components/editor/properties/gradient-utils';

/* ═══════════════════════════════════════════════════════════════
   الخلفيات والأنماط — خلفيات ومستطيلات التعديل الحر.

   القدرات هنا:
   1) بطاقة حالة خلفية الورقة: تعرض اللون/التدرج وتنقل إلى أداة الورقة
      الوحيدة في لوحة الخصائص (لا نُكرّر الأداة نفسها في لوحتين).
   2) تدرجات جاهزة: مكتبة واحدة بأسماء واضحة، تُطبَّق على العنصر
      المحدد أو تُضاف كمستطيل خلفي كامل، بحالة نشطة مشتقة من الكانفاس.
   3) تدرج مخصص: لونان وزاوية حرة بنفس صيغة هندسة التدرج الموحّدة.
   ═══════════════════════════════════════════════════════════════ */

type GradientTarget = 'backdrop' | 'element';

/** زاوية معاينة وتطبيق بطاقات المكتبة — موحّدة لتصبح المقارنة عادلة */
const PRESET_ANGLE = 135;

const QUICK_ANGLES = [
  { deg: 0, label: '0°', tip: 'أفقي' },
  { deg: 45, label: '45°', tip: 'قطري صاعد' },
  { deg: 90, label: '90°', tip: 'عمودي هابط' },
  { deg: 135, label: '135°', tip: 'قطري قياسي' },
  { deg: 180, label: '180°', tip: 'أفقي معكوس' },
  { deg: 270, label: '270°', tip: 'عمودي صاعد' },
];

const GRADIENT_CATEGORIES: { id: GradientPreset['category']; label: string }[] = [
  { id: 'luxury', label: 'ملكي' },
  { id: 'aurora', label: 'طبيعي' },
  { id: 'neon', label: 'نيون' },
  { id: 'pastel', label: 'باستيل' },
];

/** مستطيل خلفية كامل: يغطي الورقة تماماً من أصلها */
function isFullPageBackdrop(el: CanvasElement): boolean {
  return (
    el.type === 'shape' &&
    el.shape === 'rect' &&
    el.visible !== false &&
    Math.abs(el.x) < 1e-6 &&
    Math.abs(el.y) < 1e-6 &&
    el.width >= 0.999 &&
    el.height >= 0.999
  );
}

/** بصمة ألوان التدرج — لمطابقة تدرج مطبَّق فعلاً على الكانفاس ببطاقة المعرض */
function colorSignature(stops?: Array<number | string> | null): string | null {
  if (!stops || stops.length < 4) return null;
  const colors: string[] = [];
  for (let i = 1; i < stops.length; i += 2) colors.push(String(stops[i]).toUpperCase());
  return colors.join('|');
}

function firstStopColor(stops?: Array<number | string> | null): string | null {
  return stops && stops.length >= 4 ? String(stops[1]) : null;
}

export function FreeformBackdropsTab() {
  const {
    elements,
    selectedIds,
    updateElement,
    updateElements,
    backgroundColor,
    addBackdropRect,
    removeElements,
    selectAllElements,
    pushHistory,
  } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedIds: state.selectedIds,
      updateElement: state.updateElement,
      updateElements: state.updateElements,
      backgroundColor: state.backgroundColor,
      addBackdropRect: state.addBackdropRect,
      removeElements: state.removeElements,
      selectAllElements: state.selectAllElements,
      pushHistory: state.pushHistory,
    })),
  );

  // «خلفية كاملة» افتراضاً: ضغطة واحدة على أي تدرج تُنتج نتيجة مرئية دائماً
  const [gradientTarget, setGradientTarget] = useState<GradientTarget>('backdrop');
  const [category, setCategory] = useState<GradientPreset['category']>('luxury');

  // التدرج المخصص — يبدأ من لون الورقة الحالي حتى يبقى متسقاً مع التصميم
  const [customFrom, setCustomFrom] = useState(() => backgroundColor || '#D4AF37');
  const [customTo, setCustomTo] = useState('#1E40AF');
  const [customAngle, setCustomAngle] = useState(PRESET_ANGLE);

  const selectedElements = useMemo(
    () => elements.filter((element) => selectedIds.includes(element.id)),
    [elements, selectedIds],
  );

  /** مستطيلات الخلفية الكاملة مرتبة بالعمق — الأخير هو الأعلى */
  const backdropRects = useMemo(() => {
    return elements.filter(isFullPageBackdrop).sort((a, b) => a.zIndex - b.zIndex);
  }, [elements]);

  const topBackdrop = backdropRects.length > 0 ? backdropRects[backdropRects.length - 1] : null;

  const gradients = useMemo(
    () => GRADIENT_PRESETS.filter((preset) => preset.category === category),
    [category],
  );

  /** التدرج النشط على الهدف الحالي — مشتق من الكانفاس (لا حالة محلية تشيخ) */
  const activeSignature = useMemo(() => {
    if (gradientTarget === 'backdrop') {
      return colorSignature(topBackdrop?.fillLinearGradientColorStops);
    }
    if (selectedElements.length === 1 && selectedElements[0].fillType === 'linear') {
      return colorSignature(selectedElements[0].fillLinearGradientColorStops);
    }
    return null;
  }, [gradientTarget, topBackdrop, selectedElements]);

  const gradientPatch = (stops: Array<number | string>, angle: number) => {
    const { start, end } = gradientPointsFromAngle(angle);
    return {
      fillType: 'linear' as const,
      fillLinearGradientStartPoint: start,
      fillLinearGradientEndPoint: end,
      fillLinearGradientColorStops: stops,
    };
  };

  /** تطبيق تدرج على الهدف الحالي: عنصر محدد أو مستطيل خلفي كامل واحد */
  const applyGradient = (stops: Array<number | string>, angle: number, name: string) => {
    if (gradientTarget === 'backdrop') {
      const patch = gradientPatch(stops, angle);
      if (topBackdrop) {
        updateElement(topBackdrop.id, patch);
        pushHistory();
        toast.success(`حُدِّثت الخلفية الكاملة إلى «${name}»`);
      } else {
        addBackdropRect(patch);
        toast.success(`أُضيفت خلفية «${name}» خلف كل العناصر`);
      }
      return;
    }

    if (selectedElements.length === 0) {
      toast.info('اختر عنصراً أو بدّل للخلفية');
      return;
    }

    updateElements(
      selectedElements.map((element) => ({ id: element.id, patch: gradientPatch(stops, angle) })),
    );
    pushHistory();
    toast.success(
      selectedElements.length === 1
        ? `تدرج «${name}»`
        : `تدرج «${name}» على ${selectedElements.length}`,
    );
  };

  /** إزالة التدرج عن العناصر المحددة (رجوع إلى اللون الأول كمصمت) */
  const removeElementGradient = () => {
    const targets = selectedElements.filter((el) => el.fillType && el.fillType !== 'solid');
    if (targets.length === 0) return;

    updateElements(
      targets.map((el) => {
        // اللون الأول من التدرج هو أقرب بديل مصمت للشكل الحالي
        const fallback = el.type === 'text' ? el.color : el.type === 'shape' ? el.fill : undefined;
        const color = firstStopColor(el.fillLinearGradientColorStops) || fallback || '#3b82f6';
        const patch: Partial<CanvasElement> =
          el.type === 'text' ? { fillType: 'solid', color } : { fillType: 'solid', fill: color };
        return { id: el.id, patch };
      }),
    );
    pushHistory();
    toast.success('أُزيل التدرج');
  };

  const removeAllBackdrops = () => {
    // removeElements تُسجّل في السجل داخلياً — الحذف قابل للتراجع
    removeElements(backdropRects.map((el) => el.id));
    toast.success(
      backdropRects.length === 1
        ? 'حُذفت الخلفية الكاملة'
        : `حُذفت ${backdropRects.length} خلفيات كاملة`,
    );
  };

  const backdropContext = topBackdrop ? 'يُحدَّث الخلفي الحالي' : 'مستطيل خلف كل العناصر';

  const elementContext =
    selectedElements.length > 0
      ? `على ${selectedElements.length} ${selectedElements.length === 1 ? 'عنصر' : 'عناصر'}`
      : 'لا تحديد بعد';

  const customPreview = formatGradientCss([0, customFrom, 1, customTo], 'linear', customAngle);

  /** تسمية مختصرة تُبقي زر «تطبيق» داخل العرض حتى في أضيق لوحة */
  const targetLabel = gradientTarget === 'backdrop' ? 'الخلفية' : 'التحديد';
  const targetLongLabel = gradientTarget === 'backdrop' ? 'الخلفية الكاملة' : 'العناصر المحددة';

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* ═══ 1) حالة الورقة + الانتقال إلى أداة الورقة الوحيدة ═══
          لا أدوات ألوان هنا: الأداة في لوحة الخصائص وحدها، وتُفتح بالزر. */}
      <PaperBackgroundSummary
        extraStatus={
          backdropRects.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-1.5 py-0.5 text-micro font-bold leading-none text-muted-foreground">
              <ArrowLineDown className="w-2.5 h-2.5" weight="bold" />
              {backdropRects.length === 1 ? 'خلفية كاملة' : `${backdropRects.length} خلفيات كاملة`}
            </span>
          )
        }
        actions={
          backdropRects.length > 0 && (
            <FluentIconButton
              variant="ghost"
              size="compact"
              icon={<Trash className="w-3.5 h-3.5" weight="regular" />}
              tooltip={`حذف ${backdropRects.length === 1 ? 'الخلفية' : 'الخلفيات'}`}
              aria-label="حذف الخلفيات الكاملة"
              onClick={removeAllBackdrops}
              className="px-1.5 hover:bg-destructive/15 hover:text-destructive"
            />
          )
        }
      />

      {/* ═══ 2) مكتبة التدرجات — ببطاقات مسماة ومعاينة كاملة ═══ */}
      <FluentSection
        icon={<GridNine className="w-3.5 h-3.5" weight="duotone" />}
        title="تدرجات جاهزة"
        subtitle={gradientTarget === 'backdrop' ? 'خلفية كاملة للورقة' : 'تُطبَّق على التحديد'}
        badge={
          <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.2 text-micro font-mono font-bold text-primary">
            {gradients.length}
          </span>
        }
      >
        <FluentSegmentedControl<GradientTarget>
          layoutId="freeform-backdrop-gradient-target"
          value={gradientTarget}
          onChange={setGradientTarget}
          size="sm"
          options={[
            {
              id: 'backdrop',
              label: 'خلفية كاملة',
              icon: <Square className="w-3.5 h-3.5" weight="duotone" />,
              tooltip: 'يغطي الورقة',
            },
            {
              id: 'element',
              label: 'العنصر المحدد',
              icon: <Selection className="w-3.5 h-3.5" weight="duotone" />,
              tooltip: 'تعبئة التحديد',
            },
          ]}
        />

        {/* سياق الهدف: ماذا سيحدث بالضبط عند الضغط */}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/40 px-2 py-1.5">
          <span className="min-w-0 truncate text-micro font-semibold text-muted-foreground">
            {gradientTarget === 'backdrop' ? backdropContext : elementContext}
          </span>
          {gradientTarget === 'element' && elements.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectAllElements()}
              title="تحديد الكل"
              className="h-6 shrink-0 px-1.5"
            >
              <SelectionAll className="w-3 h-3 text-primary" weight="bold" />
              <span className="text-micro">تحديد الكل</span>
            </Button>
          )}
        </div>

        <FluentSegmentedControl<GradientPreset['category']>
          layoutId="freeform-backdrop-gradient-category"
          value={category}
          onChange={setCategory}
          size="sm"
          options={GRADIENT_CATEGORIES.map((item) => ({ id: item.id, label: item.label }))}
        />

        <div className="grid grid-cols-2 gap-1.5">
          {gradients.map((preset) => {
            const isActive =
              activeSignature !== null && activeSignature === colorSignature(preset.stops);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyGradient(preset.stops, PRESET_ANGLE, preset.name)}
                aria-pressed={isActive}
                aria-label={
                  gradientTarget === 'backdrop'
                    ? `خلفية كاملة بتدرج ${preset.name}`
                    : `تطبيق تدرج ${preset.name} على العنصر المحدد`
                }
                title={preset.name}
                className={cn(
                  'group relative overflow-hidden rounded-xl border text-start transition-all duration-150 cursor-pointer',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                  isActive
                    ? 'border-primary ring-2 ring-primary/40 shadow-xs'
                    : 'border-border/80 hover:border-primary/60 hover:shadow-xs active:scale-[0.98]',
                )}
              >
                <span
                  className="block h-10 w-full"
                  style={{ background: formatGradientCss(preset.stops, 'linear', PRESET_ANGLE) }}
                />
                <span className="flex h-6 items-center justify-between gap-1 bg-card px-2">
                  <span className="min-w-0 truncate text-micro font-bold text-foreground">
                    {preset.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {isActive ? (
                      <span className="flex w-3.5 h-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="w-2.5 h-2.5" weight="bold" />
                      </span>
                    ) : gradientTarget === 'backdrop' ? (
                      <ArrowLineDown className="w-3 h-3 text-muted-foreground" weight="bold" />
                    ) : (
                      <Drop className="w-3 h-3 text-muted-foreground" weight="bold" />
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </FluentSection>

      {/* ═══ 3) تدرج مخصص — لونان وزاوية حرة ═══ */}
      <FluentSection
        icon={<SlidersHorizontal className="w-3.5 h-3.5" weight="duotone" />}
        title="تدرج مخصص"
        subtitle={`على ${targetLongLabel}`}
        collapsible
        defaultOpen={false}
      >
        {/* شريط المعاينة الحيّ بالزاوية الفعلية */}
        <div className="relative h-8 w-full overflow-hidden rounded-lg border border-black/15 dark:border-white/20 shadow-inner">
          <div className="h-full w-full" style={{ background: customPreview }} />
          <span className="absolute bottom-0.5 left-1 rounded bg-black/45 px-1 text-micro font-mono font-bold text-white">
            {customAngle}°
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2 py-1.5">
            <span className="text-micro font-bold text-muted-foreground">من</span>
            <PopoverColorPicker
              color={customFrom}
              onChange={setCustomFrom}
              swatchOnly
              label="لون بداية التدرج"
              className="w-6 h-6"
            />
          </div>

          <FluentIconButton
            variant="ghost"
            size="compact"
            icon={<ArrowsLeftRight className="w-3.5 h-3.5" weight="bold" />}
            tooltip="عكس اللونين"
            aria-label="عكس اللونين"
            onClick={() => {
              setCustomFrom(customTo);
              setCustomTo(customFrom);
            }}
            className="px-1.5"
          />

          <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2 py-1.5">
            <span className="text-micro font-bold text-muted-foreground">إلى</span>
            <PopoverColorPicker
              color={customTo}
              onChange={setCustomTo}
              swatchOnly
              label="لون نهاية التدرج"
              className="w-6 h-6"
            />
          </div>
        </div>

        <FluentSliderField
          label="زاوية التدرج"
          value={customAngle}
          min={0}
          max={360}
          step={5}
          unit="°"
          onChange={setCustomAngle}
        />

        <div className="grid grid-cols-6 gap-1">
          {QUICK_ANGLES.map((item) => {
            const isAngleActive = customAngle === item.deg;
            return (
              <button
                key={item.deg}
                type="button"
                onClick={() => setCustomAngle(item.deg)}
                title={item.tip}
                aria-label={`زاوية ${item.label} — ${item.tip}`}
                aria-pressed={isAngleActive}
                className={cn(
                  'h-6 rounded-md border text-micro font-bold tabular-nums transition-colors cursor-pointer',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                  isAngleActive
                    ? 'border-primary/40 bg-primary/20 text-primary shadow-2xs'
                    : 'border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={() =>
              applyGradient([0, customFrom, 1, customTo], customAngle, 'التدرج المخصص')
            }
            className="flex-1"
          >
            <Drop className="w-3.5 h-3.5" weight="duotone" />
            <span>تطبيق على {targetLabel}</span>
          </Button>

          {gradientTarget === 'element' ? (
            <FluentIconButton
              variant="outline"
              size="compact"
              disabled={selectedElements.every((el) => !el.fillType || el.fillType === 'solid')}
              icon={<XCircle className="w-3.5 h-3.5" weight="duotone" />}
              tooltip="إزالة التدرج"
              aria-label="إزالة التدرج عن العناصر المحددة"
              onClick={removeElementGradient}
              className="px-1.5"
            />
          ) : (
            <FluentIconButton
              variant="outline"
              size="compact"
              disabled={backdropRects.length === 0}
              icon={<XCircle className="w-3.5 h-3.5" weight="duotone" />}
              tooltip="حذف الخلفية الكاملة"
              aria-label="حذف الخلفية الكاملة"
              onClick={removeAllBackdrops}
              className="px-1.5"
            />
          )}

          <FluentIconButton
            variant="outline"
            size="compact"
            icon={<ArrowCounterClockwise className="w-3.5 h-3.5" weight="bold" />}
            tooltip="استعادة القيم الافتراضية"
            aria-label="استعادة القيم الافتراضية للتدرج المخصص"
            onClick={() => {
              setCustomFrom(backgroundColor || '#D4AF37');
              setCustomTo('#1E40AF');
              setCustomAngle(PRESET_ANGLE);
            }}
            className="px-1.5"
          />
        </div>

        <p className="text-mini leading-relaxed text-muted-foreground">صيغة خطية قابلة للتعديل</p>
      </FluentSection>
    </div>
  );
}
