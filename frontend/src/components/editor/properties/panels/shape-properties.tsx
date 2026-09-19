import { ShapeElement, useEditorStore } from "@/lib/editor-store";
import {
  Palette,
  Square,
  BoundingBox,
  Eye,
  Sparkle,
  Circle,
  LineSegment,
  Star,
  Polygon,
} from "@phosphor-icons/react";
import { PopoverColorPicker, QuickColorPalette } from "../shared-controls";
import { FluentSection, FluentSliderField } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GradientPicker } from "../gradient-picker";
import { gradientAngleFromPoints, gradientPointsFromAngle } from "../gradient-utils";

export interface ShapePropertiesProps {
  element: ShapeElement;
  onUpdate: (id: string, patch: Partial<ShapeElement>) => void;
  onNavigateTab?: (tab: string) => void;
}

const STROKE_WIDTH_PRESETS = [
  { label: "بدون", val: 0 },
  { label: "1px", val: 1 },
  { label: "2px", val: 2 },
  { label: "4px", val: 4 },
  { label: "8px", val: 8 },
];

const CORNER_RADIUS_PRESETS = [
  { label: "حادة", val: 0 },
  { label: "ناعمة", val: 8 },
  { label: "مستديرة", val: 16 },
  { label: "دائرية", val: 32 },
];

const OPACITY_PRESETS = [25, 50, 75, 100];

/**
 * تبويب التنسيق للأشكال (Shape Style Properties):
 * يركز على استدارة الزوايا، سماكة الحد، وعينة سريعة للون متوافقة مع معايير Fluent 2
 */
export function ShapeStyleProperties({ element, onUpdate, onNavigateTab }: ShapePropertiesProps) {
  const currentFill = element.fill || "#6366f1";
  const isLine = element.shape === "line";

  const getShapeIcon = () => {
    switch (element.shape) {
      case "line":
        return <LineSegment className="w-4 h-4 text-primary" weight="duotone" />;
      case "ellipse":
        return <Circle className="w-4 h-4 text-primary" weight="duotone" />;
      case "star":
        return <Star className="w-4 h-4 text-primary" weight="duotone" />;
      case "path":
        return <Polygon className="w-4 h-4 text-primary" weight="duotone" />;
      case "rect":
      default:
        return <Square className="w-4 h-4 text-primary" weight="duotone" />;
    }
  };

  const sectionTitle = isLine
    ? "تنسيق الخط"
    : element.shape === "ellipse"
      ? "الحدود والهندسة"
      : "الحدود والاستدارة";

  return (
    <div className="space-y-3 animate-in fade-in duration-200 font-cairo">
      {/* بطاقة: الحدود والاستدارة الهندسية */}
      <FluentSection
        icon={getShapeIcon()}
        title={sectionTitle}
        collapsible
        defaultOpen={true}
      >
        {/* صف لون التعبئة / الخط القياسي في Fluent 2 */}
        <div className="p-2.5 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/60 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Palette className="w-4 h-4" weight="duotone" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">
                {isLine ? "لون الخط" : "لون الشكل"}
              </span>
              <span className="text-micro text-muted-foreground block truncate">
                {element.fillType === "linear" ? "تدرج خطي" : element.fillType === "radial" ? "تدرج شعاعي" : "لون مصمت"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <PopoverColorPicker
              color={currentFill}
              onChange={(col) => {
                onUpdate(element.id, {
                  fill: col,
                  stroke: isLine ? col : (element.stroke || col),
                });
                useEditorStore.getState().pushHistory();
              }}
            />
            {onNavigateTab && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onNavigateTab("adjust")}
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    <Sparkle className="w-4 h-4 text-primary" weight="duotone" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">استوديو الألوان والتدرجات</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* سلايدر سماكة الحد مع أزرار سريعة */}
        <div className="space-y-1.5 pt-1">
          <FluentSliderField
            label={isLine ? "سمك الخط" : "سماكة الحد"}
            icon={<BoundingBox className="w-4 h-4" weight="regular" />}
            value={isLine ? (element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 4) : (element.strokeWidth ?? 0)}
            min={isLine ? 1 : 0}
            max={50}
            step={0.5}
            unit="px"
            onChange={(v) => onUpdate(element.id, { strokeWidth: v })}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />

          {/* أزرار سماكة سريعة في مسار مجوف Fluent 2 */}
          <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-muted/60 dark:bg-black/35 border border-border/70 dark:border-white/10 fluent-specular shadow-2xs">
            {STROKE_WIDTH_PRESETS.map((preset) => {
              const currVal = isLine
                ? (element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 4)
                : (element.strokeWidth ?? 0);
              const isActive = Math.round(currVal) === preset.val;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={cn(
                    "h-7 px-1 text-micro font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center select-none active:scale-95",
                    isActive
                      ? "bg-card text-foreground font-bold border border-border/80 dark:border-white/15 shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/40 border-transparent font-medium"
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
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20 border border-border/40 text-xs animate-in fade-in duration-150">
            <span className="text-foreground/80 font-semibold flex items-center gap-1.5 text-xs">
              <Palette className="w-3.5 h-3.5 text-primary shrink-0" weight="duotone" />
              <span>لون الحد</span>
            </span>
            <PopoverColorPicker
              color={element.stroke || "#000000"}
              onChange={(val) => {
                onUpdate(element.id, { stroke: val });
                useEditorStore.getState().pushHistory();
              }}
            />
          </div>
        )}

        {/* سلايدر استدارة الزوايا للمستطيلات مع كبسولات سريعة */}
        {element.shape === "rect" && (
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <FluentSliderField
              label="استدارة الزوايا"
              icon={<Square className="w-4 h-4" weight="regular" />}
              value={element.radius ?? 0}
              min={0}
              max={50}
              step={1}
              unit="px"
              onChange={(v) => onUpdate(element.id, { radius: v })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />

            {/* أزرار استدارة سريعة في مسار مجوف Fluent 2 */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted/60 dark:bg-black/35 border border-border/70 dark:border-white/10 fluent-specular shadow-2xs">
              {CORNER_RADIUS_PRESETS.map((preset) => {
                const isActive = (element.radius ?? 0) === preset.val;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={cn(
                      "h-7 px-1 text-micro font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center select-none active:scale-95",
                      isActive
                        ? "bg-card text-foreground font-bold border border-border/80 dark:border-white/15 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/40 border-transparent font-medium"
                    )}
                    onClick={() => {
                      onUpdate(element.id, { radius: preset.val });
                      useEditorStore.getState().pushHistory();
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
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
  const isLine = element.shape === "line";
  const currentFill = element.fill || "#6366f1";
  const currentStroke = element.stroke || currentFill;
  const currentOpacity = Math.round((element.opacity ?? 1) * 100);

  return (
    <div className="space-y-3 animate-in fade-in duration-200 font-cairo">
      {/* بطاقة 1: التعبئة والتدرج */}
      <FluentSection
        icon={<Palette className="w-4 h-4 text-primary" weight="duotone" />}
        title="تعبئة الشكل"
        collapsible
        defaultOpen={true}
      >
        <GradientPicker
          fillType={element.fillType || "solid"}
          color={currentFill}
          colorStops={element.fillLinearGradientColorStops || element.fillRadialGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"]}
          onChangeType={(type) => {
            onUpdate(element.id, { fillType: type });
            useEditorStore.getState().pushHistory();
          }}
          onChangeSolidColor={(col) => {
            onUpdate(element.id, { 
              fill: col, 
              stroke: isLine ? col : (element.stroke || col) 
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
            element.fillLinearGradientEndPoint
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
        {(element.fillType === "solid" || !element.fillType) && (
          <div className="pt-2 border-t border-border/30 space-y-1.5">
            <span className="text-micro font-semibold text-muted-foreground block">ألوان سريعة</span>
            <QuickColorPalette
              currentColor={currentFill}
              onSelectColor={(col) => {
                onUpdate(element.id, {
                  fill: col,
                  fillType: "solid",
                  stroke: isLine ? col : (element.stroke || col),
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
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-foreground/90">لون الحد</span>
            <PopoverColorPicker
              color={currentStroke}
              onChange={(val) => {
                onUpdate(element.id, {
                  stroke: val,
                  strokeWidth: (element.strokeWidth && element.strokeWidth > 0) ? element.strokeWidth : 2,
                });
                useEditorStore.getState().pushHistory();
              }}
            />
          </div>

          <div className="space-y-1 pt-1 border-t border-border/30">
            <span className="text-micro font-semibold text-muted-foreground block">ألوان الحد</span>
            <QuickColorPalette
              currentColor={currentStroke}
              onSelectColor={(col) => {
                onUpdate(element.id, {
                  stroke: col,
                  strokeWidth: (element.strokeWidth && element.strokeWidth > 0) ? element.strokeWidth : 2,
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
          icon={<Eye className="w-4 h-4" weight="regular" />}
          value={currentOpacity}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />

        {/* أزرار الشفافية السريعة في مسار مجوف Fluent 2 */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted/60 dark:bg-black/35 border border-border/70 dark:border-white/10 fluent-specular shadow-2xs">
          {OPACITY_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              className={cn(
                "h-7 px-1 text-micro font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center select-none active:scale-95",
                currentOpacity === pct
                  ? "bg-card text-foreground font-bold border border-border/80 dark:border-white/15 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40 border-transparent font-medium"
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
  return <ShapeStyleProperties element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />;
}
