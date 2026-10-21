import { ShapeGlyph } from '@/components/editor/shapes/shape-glyph';
import {
  FluentSection,
  FluentSegmentedControl,
  FluentSettingRow,
  FluentSliderField,
} from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { Palette, BoundingBox, Eye, Sparkle } from '@/components/ui/icons';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { resolveRingInnerRadius, ringInnerRadiusMax } from '@/lib/canvas/ring-geometry';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { GradientPicker } from '../gradient-picker';
import { gradientAngleFromPoints, gradientPointsFromAngle } from '../gradient-utils';
import { normalizeImageFillPatch } from '../image-fill-patch';
import { PopoverColorPicker, QuickColorPalette } from '../shared-controls';

import type { ShapeElement } from '@/lib/editor-store';

export interface ShapePropertiesProps {
  element: ShapeElement;
  onUpdate: (id: string, patch: Partial<ShapeElement>) => void;
  onNavigateTab?: (tab: string) => void;
}

const STROKE_WIDTH_PRESETS = [
  { label: 'بدون', val: 0 },
  { label: '1px', val: 1 },
  { label: '2px', val: 2 },
  { label: '4px', val: 4 },
  { label: '8px', val: 8 },
];

const CORNER_RADIUS_PRESETS = [
  { label: 'حادة', val: 0 },
  { label: 'ناعمة', val: 8 },
  { label: 'مستديرة', val: 16 },
  { label: 'دائرية', val: 32 },
];

const OPACITY_PRESETS = [25, 50, 75, 100];

/** ترتيب الزوايا يطابق عقد Konva.cornerRadius: [أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار] */
const CORNER_LABELS = ['أعلى يسار', 'أعلى يمين', 'أسفل يمين', 'أسفل يسار'];

const ARC_ANGLE_PRESETS = [90, 180, 270, 360];

/**
 * تبويب التنسيق للأشكال (Shape Style Properties):
 * يركز على استدارة الزوايا، سماكة الحد، وعينة سريعة للون متوافقة مع معايير Fluent 2
 */
export function ShapeStyleProperties({ element, onUpdate, onNavigateTab }: ShapePropertiesProps) {
  const currentFill = element.fill || '#6366f1';
  const isLine = element.shape === 'line';
  const isLinearShape = element.shape === 'line' || element.shape === 'arrow';
  // مقاسات الكانفس مطلوبة لتحويل أبعاد الحلقة النسبية إلى بكسل — محدّثات
  // عبر محدِّد المتجر (وليس getState) حتى تُعاد حوسبة الحدود عند تغيّرها
  const canvasWidth = useEditorStore((state) => state.canvasWidth);
  const canvasHeight = useEditorStore((state) => state.canvasHeight);
  const ringWidthPx = element.width * canvasWidth;
  const ringHeightPx = element.height * canvasHeight;

  // معاينة هندسية حقيقية من الكتالوج الموحّد — لا مفتاح أيقونات تقريبية هنا
  const shapeGlyph = (
    <ShapeGlyph
      kind={element.shape}
      path={element.svgPath}
      sides={element.sides}
      starPoints={element.starPoints}
      className="w-4 h-4 text-primary"
    />
  );

  const sectionTitle = isLine
    ? 'تنسيق الخط'
    : element.shape === 'arrow'
      ? 'تنسيق السهم'
      : element.shape === 'ellipse' ||
          element.shape === 'ring' ||
          element.shape === 'polygon' ||
          element.shape === 'arc' ||
          element.shape === 'wedge'
        ? 'الحدود والهندسة'
        : 'الحدود والاستدارة';

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150 font-cairo">
      {/* بطاقة: الحدود والاستدارة الهندسية */}
      <FluentSection icon={shapeGlyph} title={sectionTitle} collapsible defaultOpen={true}>
        {/* بطاقة لون التعبئة / الخط: العنوان والوصف في صف، والمنتقي بعرض كامل تحته
            حتى لا يزاحم شارة الـHEX النصَّ ويقتطعه في لوح بعرض ~296px */}
        <div className="p-2.5 rounded-md bg-muted/30 dark:bg-muted/20 border border-border/60 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <span className="text-xs font-bold text-foreground block truncate">
                  {isLine ? 'لون الخط' : 'لون الشكل'}
                </span>
                <span className="text-mini text-muted-foreground block truncate">
                  {element.fillType === 'linear'
                    ? 'تدرج خطي'
                    : element.fillType === 'radial'
                      ? 'تدرج شعاعي'
                      : element.fillType === 'image'
                        ? 'تعبئة بصورة'
                        : 'لون مصمت'}
                </span>
              </div>
            </div>

            {onNavigateTab && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onNavigateTab('adjust')}
                    aria-label="استوديو الألوان والتدرجات"
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <Sparkle className="w-4 h-4 text-primary" weight="duotone" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">استوديو الألوان والتدرجات</TooltipContent>
              </Tooltip>
            )}
          </div>

          <PopoverColorPicker
            color={currentFill}
            onChange={(col) => {
              onUpdate(element.id, {
                fill: col,
                stroke: isLine ? col : element.stroke || col,
              });
              useEditorStore.getState().pushHistory();
            }}
            ariaLabel={isLine ? 'لون الخط' : 'لون الشكل'}
            className="w-full"
          />
        </div>

        {/* سلايدر سماكة الحد مع أزرار سريعة */}
        <div className="space-y-1.5 pt-1">
          <FluentSliderField
            label={isLine ? 'سمك الخط' : 'سماكة الحد'}
            value={
              isLine
                ? element.strokeWidth && element.strokeWidth > 0
                  ? element.strokeWidth
                  : 4
                : (element.strokeWidth ?? 0)
            }
            min={isLine ? 1 : 0}
            max={50}
            step={0.5}
            unit="px"
            onChange={(v) => onUpdate(element.id, { strokeWidth: v })}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />

          {/* أزرار سماكة سريعة في مسار مجوف Fluent 2 */}
          <div className="grid grid-cols-5 gap-1 p-1 rounded-md bg-muted/60 dark:bg-black/35 border border-border/70 dark:border-white/10 fluent-specular shadow-2xs">
            {STROKE_WIDTH_PRESETS.map((preset) => {
              const currVal = isLine
                ? element.strokeWidth && element.strokeWidth > 0
                  ? element.strokeWidth
                  : 4
                : (element.strokeWidth ?? 0);
              const isActive = Math.round(currVal) === preset.val;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={cn(
                    'h-7 px-1 text-mini font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center select-none',
                    isActive
                      ? 'bg-card text-foreground font-bold border border-border/80 dark:border-white/15 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/40 border-transparent font-medium',
                  )}
                  onClick={() => {
                    onUpdate(element.id, { strokeWidth: preset.val });
                    useEditorStore.getState().pushHistory();
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* اختيار لون الحد عند تفعيل سماكة أكبر من الصفر للأشكال المغلقة */}
        {!isLine && (element.strokeWidth ?? 0) > 0 && (
          <div className="animate-in fade-in duration-150">
            <FluentSettingRow
              layout="vertical"
              label="لون الحد"
              control={
                <PopoverColorPicker
                  color={element.stroke || '#000000'}
                  onChange={(val) => {
                    onUpdate(element.id, { stroke: val });
                    useEditorStore.getState().pushHistory();
                  }}
                  ariaLabel="لون الحد"
                  className="w-full"
                />
              }
            />
          </div>
        )}

        {/* نمط الحد: متصل / متقطع / منقّط — خصائص Konva أصلية (dash + lineCap)
            والـdash يتدرّج مع سماكة الحد فلا تختفي الشرطات في الحدود السميكة */}
        <div className="space-y-1.5 pt-2 border-t border-border/30">
          <span className="text-mini font-semibold text-muted-foreground block">نمط الحد</span>
          <FluentSegmentedControl<'solid' | 'dashed' | 'dotted'>
            layoutId="shape-stroke-style"
            variant="field"
            value={element.strokeStyle ?? 'solid'}
            onChange={(style) => {
              onUpdate(element.id, { strokeStyle: style });
              useEditorStore.getState().pushHistory();
            }}
            size="sm"
            options={[
              { id: 'solid', label: 'متصل' },
              { id: 'dashed', label: 'متقطع' },
              { id: 'dotted', label: 'منقّط' },
            ]}
          />
          {/* طرف الخط — للخط والسهم فقط، والمنقّط يُثبَّت على مستدير
              (توثيق Konva: النقاط الدائرية تحتاج lineCap: round) */}
          {isLinearShape && (element.strokeStyle ?? 'solid') !== 'dotted' && (
            <FluentSegmentedControl<'butt' | 'round' | 'square'>
              layoutId="shape-line-cap"
              variant="field"
              value={element.lineCap ?? 'butt'}
              onChange={(cap) => {
                onUpdate(element.id, { lineCap: cap });
                useEditorStore.getState().pushHistory();
              }}
              size="sm"
              options={[
                { id: 'round', label: 'مستدير' },
                { id: 'butt', label: 'مسطح' },
                { id: 'square', label: 'مربع' },
              ]}
            />
          )}
        </div>

        {/* سلايدر استدارة الزوايا للمستطيلات مع كبسولات سريعة */}
        {element.shape === 'rect' &&
          (() => {
            // عند تفعيل الزوايا المستقلة تُطبَّق الاستدارة الموحدة على الزوايا الأربع
            // معاً — وإلا صار السلايدر معطلاً لأن المصفوفة تتقدم على radius في الرسم
            const independent = Array.isArray(element.radiusCorners);
            const uniformRadius = independent
              ? (element.radiusCorners?.[0] ?? 0)
              : (element.radius ?? 0);
            const applyUniformRadius = (v: number) => {
              onUpdate(
                element.id,
                independent ? { radius: v, radiusCorners: [v, v, v, v] } : { radius: v },
              );
            };

            return (
              <div className="space-y-1.5 pt-2 border-t border-border/30">
                <FluentSliderField
                  label="الزوايا"
                  value={uniformRadius}
                  min={0}
                  max={50}
                  step={1}
                  unit="px"
                  onChange={applyUniformRadius}
                  onCommit={() => useEditorStore.getState().pushHistory()}
                />

                {/* أزرار استدارة سريعة في مسار مجوف Fluent 2 */}
                <div className="grid grid-cols-4 gap-1 p-1 rounded-md bg-muted/60 dark:bg-black/35 border border-border/70 dark:border-white/10 fluent-specular shadow-2xs">
                  {CORNER_RADIUS_PRESETS.map((preset) => {
                    const isActive = uniformRadius === preset.val;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        className={cn(
                          'h-7 px-1 text-mini font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center select-none',
                          isActive
                            ? 'bg-card text-foreground font-bold border border-border/80 dark:border-white/15 shadow-xs'
                            : 'text-muted-foreground hover:text-foreground hover:bg-card/40 border-transparent font-medium',
                        )}
                        onClick={() => {
                          applyUniformRadius(preset.val);
                          useEditorStore.getState().pushHistory();
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* زوايا مستقلة: أربع قيم منفصلة [أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار]
                  (Konva.cornerRadius يقبل مصفوفة) — وإلغاء التفعيل يعيد الاستدارة الموحدة */}
                <FluentSettingRow
                  label="زوايا مستقلة"
                  control={
                    <Switch
                      checked={!!element.radiusCorners}
                      aria-label="زوايا مستقلة"
                      onCheckedChange={(checked) => {
                        const radius = element.radius ?? 8;
                        onUpdate(element.id, {
                          radiusCorners: checked ? [radius, radius, radius, radius] : undefined,
                        });
                        useEditorStore.getState().pushHistory();
                      }}
                    />
                  }
                />

                {element.radiusCorners && (
                  <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                    {CORNER_LABELS.map((label, idx) => (
                      <FluentSliderField
                        key={label}
                        label={label}
                        value={element.radiusCorners?.[idx] ?? 0}
                        min={0}
                        max={80}
                        step={1}
                        unit="px"
                        onChange={(v) => {
                          const next = [...(element.radiusCorners ?? [0, 0, 0, 0])];
                          next[idx] = v;
                          onUpdate(element.id, { radiusCorners: next });
                        }}
                        onCommit={() => useEditorStore.getState().pushHistory()}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

        {/* سلايدر عدد أضلاع المضلع */}
        {element.shape === 'polygon' && (
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <FluentSliderField
              label="عدد أضلاع المضلع"
              value={element.sides ?? 6}
              min={3}
              max={12}
              step={1}
              unit=""
              onChange={(v) => onUpdate(element.id, { sides: v })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
          </div>
        )}

        {/* رؤوس النجمة وعمقها — Konva.Star الأصلي (numPoints + innerRadius) */}
        {element.shape === 'star' && (
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <FluentSliderField
              label="عدد الرؤوس"
              value={element.starPoints ?? 5}
              min={3}
              max={20}
              step={1}
              unit=""
              onChange={(v) => onUpdate(element.id, { starPoints: v })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
            <FluentSliderField
              label="عمق الرؤوس"
              value={Math.round((element.starInnerRatio ?? 0.5) * 100)}
              min={10}
              max={90}
              step={5}
              unit="%"
              onChange={(v) => onUpdate(element.id, { starInnerRatio: v / 100 })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
          </div>
        )}

        {/* زاوية القوس/القطاع الدائري — تبدأ دائماً من أعلى الشكل */}
        {(element.shape === 'arc' || element.shape === 'wedge') && (
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <FluentSliderField
              label="زاوية القوس"
              value={element.arcAngle ?? (element.shape === 'wedge' ? 90 : 270)}
              min={10}
              max={360}
              step={5}
              unit="°"
              onChange={(v) => onUpdate(element.id, { arcAngle: v })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
            <div className="grid grid-cols-4 gap-1 p-1 rounded-md bg-muted/60 dark:bg-black/35 border border-border/70 dark:border-white/10 fluent-specular shadow-2xs">
              {ARC_ANGLE_PRESETS.map((deg) => {
                const defaultAngle = element.shape === 'wedge' ? 90 : 270;
                const isActive = Math.round(element.arcAngle ?? defaultAngle) === deg;
                return (
                  <button
                    key={deg}
                    type="button"
                    className={cn(
                      'h-7 px-1 text-mini font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center select-none',
                      isActive
                        ? 'bg-card text-foreground font-bold border border-border/80 dark:border-white/15 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/40 border-transparent font-medium',
                    )}
                    onClick={() => {
                      onUpdate(element.id, { arcAngle: deg });
                      useEditorStore.getState().pushHistory();
                    }}
                  >
                    {deg}°
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* سلايدر نصف القطر الداخلي للحلقة والقوس الحلقي (هندسة واحدة مشتركة) */}
        {(element.shape === 'ring' || element.shape === 'arc') && (
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <FluentSliderField
              label="نصف القطر الداخلي"
              value={resolveRingInnerRadius(element.innerRadius, ringWidthPx, ringHeightPx)}
              min={1}
              max={ringInnerRadiusMax(ringWidthPx, ringHeightPx)}
              step={1}
              unit="px"
              onChange={(v) => onUpdate(element.id, { innerRadius: v })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
          </div>
        )}

        {/* سلايدر رأس السهم المتجه */}
        {element.shape === 'arrow' && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <FluentSliderField
              label="طول رأس السهم"
              value={element.pointerLength ?? 14}
              min={6}
              max={40}
              step={1}
              unit="px"
              onChange={(v) => onUpdate(element.id, { pointerLength: v })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
            <FluentSliderField
              label="عرض رأس السهم"
              value={element.pointerWidth ?? 14}
              min={6}
              max={40}
              step={1}
              unit="px"
              onChange={(v) => onUpdate(element.id, { pointerWidth: v })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />

            {/* رأس في البداية — يحوّل السهم إلى مزدوج الرأسين (Konva.pointerAtBeginning) */}
            <FluentSettingRow
              label="رأس في البداية"
              control={
                <Switch
                  checked={element.pointerAtBeginning === true}
                  aria-label="رأس في البداية"
                  onCheckedChange={(checked) => {
                    onUpdate(element.id, { pointerAtBeginning: checked });
                    useEditorStore.getState().pushHistory();
                  }}
                />
              }
            />
          </div>
        )}
      </FluentSection>
    </div>
  );
}

/**
 * تبويب الألوان للأشكال (Shape Color Studio):
 * استوديو متكامل للتعبئة والتدرجات وألوان الحدود والشفافية
 */
export function ShapeColorProperties({ element, onUpdate }: ShapePropertiesProps) {
  const isLine = element.shape === 'line';
  const currentFill = element.fill || '#6366f1';
  const currentStroke = element.stroke || currentFill;
  const currentOpacity = Math.round((element.opacity ?? 1) * 100);

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150 font-cairo">
      {/* بطاقة 1: التعبئة والتدرج */}
      <FluentSection
        icon={<Palette className="w-4 h-4 text-primary" weight="duotone" />}
        title="تعبئة الشكل"
        collapsible
        defaultOpen={true}
      >
        <GradientPicker
          fillType={element.fillType || 'solid'}
          allowImageFill
          imageFill={{
            fillImageSrc: element.fillImageSrc,
            fillImageFit: element.fillImageFit,
            fillImageScale: element.fillImageScale,
            fillImageRotation: element.fillImageRotation,
            fillImageOffsetX: element.fillImageOffsetX,
            fillImageOffsetY: element.fillImageOffsetY,
          }}
          onChangeImageFill={(patch) => {
            // إزالة الصورة تُعيد الشكل لتعبئة مصمتة بدل إبقاء وضع صورة بلا صورة
            onUpdate(element.id, normalizeImageFillPatch(patch));
          }}
          onCommitImageFill={() => useEditorStore.getState().pushHistory()}
          color={currentFill}
          colorStops={
            element.fillLinearGradientColorStops ||
            element.fillRadialGradientColorStops || [0, '#3b82f6', 1, '#8b5cf6']
          }
          onChangeType={(type) => {
            onUpdate(element.id, { fillType: type });
            useEditorStore.getState().pushHistory();
          }}
          onChangeSolidColor={(col) => {
            onUpdate(element.id, {
              fill: col,
              stroke: isLine ? col : element.stroke || col,
            });
            useEditorStore.getState().pushHistory();
          }}
          onChangeColorStops={(stops) => {
            onUpdate(element.id, {
              fillLinearGradientColorStops: stops,
              fillRadialGradientColorStops: stops,
            });
            useEditorStore.getState().pushHistory();
          }}
          angle={gradientAngleFromPoints(
            element.fillLinearGradientStartPoint,
            element.fillLinearGradientEndPoint,
          )}
          onChangeAngle={(deg) => {
            const { start, end } = gradientPointsFromAngle(deg);
            onUpdate(element.id, {
              fillLinearGradientStartPoint: start,
              fillLinearGradientEndPoint: end,
            });
          }}
          onCommitAngle={() => useEditorStore.getState().pushHistory()}
        />

        {/* باليتة ألوان سريعة في حالة اللون المصمت */}
        {(element.fillType === 'solid' || !element.fillType) && (
          <div className="pt-2 border-t border-border/30 space-y-1.5">
            <span className="text-mini font-semibold text-muted-foreground block">ألوان سريعة</span>
            <QuickColorPalette
              currentColor={currentFill}
              onSelectColor={(col) => {
                onUpdate(element.id, {
                  fill: col,
                  fillType: 'solid',
                  stroke: isLine ? col : element.stroke || col,
                });
                useEditorStore.getState().pushHistory();
              }}
            />
          </div>
        )}
      </FluentSection>

      {/* بطاقة 2: لون الحد أو الخط */}
      {!isLine && (
        <FluentSection
          icon={<BoundingBox className="w-4 h-4 text-primary" weight="duotone" />}
          title="لون الحد"
        >
          <FluentSettingRow
            layout="vertical"
            label="لون الحد"
            control={
              <PopoverColorPicker
                color={currentStroke}
                onChange={(val) => {
                  onUpdate(element.id, {
                    stroke: val,
                    strokeWidth:
                      element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 2,
                  });
                  useEditorStore.getState().pushHistory();
                }}
                ariaLabel="لون الحد"
                className="w-full"
              />
            }
          />

          <div className="space-y-1 pt-1 border-t border-border/30">
            <span className="text-mini font-semibold text-muted-foreground block">ألوان الحد</span>
            <QuickColorPalette
              currentColor={currentStroke}
              onSelectColor={(col) => {
                onUpdate(element.id, {
                  stroke: col,
                  strokeWidth:
                    element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 2,
                });
                useEditorStore.getState().pushHistory();
              }}
            />
          </div>
        </FluentSection>
      )}

      {/* بطاقة 3: الشفافية العامة */}
      <FluentSection
        icon={<Eye className="w-4 h-4 text-primary" weight="duotone" />}
        title="الشفافية"
      >
        <FluentSliderField
          label="شفافية الشكل"
          value={currentOpacity}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />

        {/* أزرار الشفافية السريعة في مسار مجوف Fluent 2 */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-md bg-muted/60 dark:bg-black/35 border border-border/70 dark:border-white/10 fluent-specular shadow-2xs">
          {OPACITY_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              className={cn(
                'h-7 px-1 text-mini font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center select-none',
                currentOpacity === pct
                  ? 'bg-card text-foreground font-bold border border-border/80 dark:border-white/15 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40 border-transparent font-medium',
              )}
              onClick={() => {
                onUpdate(element.id, { opacity: pct / 100 });
                useEditorStore.getState().pushHistory();
              }}
            >
              {pct}%
            </button>
          ))}
        </div>
      </FluentSection>
    </div>
  );
}

/** للتوافق السابق */
export function ShapeProperties({ element, onUpdate, onNavigateTab }: ShapePropertiesProps) {
  return (
    <ShapeStyleProperties element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />
  );
}
