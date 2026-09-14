import { Label } from "@/components/ui/label";
import { ShapeElement, useEditorStore } from "@/lib/editor-store";
import { Palette, Square, BoundingBox, Eye, Check } from "@phosphor-icons/react";
import { SliderControl, PopoverColorPicker } from "../shared-controls";
import { GradientPicker } from "../gradient-picker";
import { gradientAngleFromPoints, gradientPointsFromAngle } from "../gradient-utils";
import { cn } from "@/lib/utils";

export interface ShapePropertiesProps {
  element: ShapeElement;
  onUpdate: (id: string, patch: Partial<ShapeElement>) => void;
  onNavigateTab?: (tab: string) => void;
}

export const STUDIO_PALETTE = [
  { label: "أبيض", color: "#ffffff" },
  { label: "أسود", color: "#000000" },
  { label: "أزرق", color: "#2563eb" },
  { label: "ذهبي", color: "#d97706" },
  { label: "زمردي", color: "#059669" },
  { label: "أحمر", color: "#dc2626" },
  { label: "بنفسجي", color: "#7c3aed" },
  { label: "رمادي", color: "#4b5563" },
];

/**
 * تبويب التنسيق للأشكال (Shape Style Properties):
 * يركز على استدارة الزوايا، سماكة الحد، وعينة سريعة للون
 */
export function ShapeStyleProperties({ element, onUpdate, onNavigateTab }: ShapePropertiesProps) {
  const currentFill = element.fill || "#6366f1";
  const isLine = element.shape === "line";

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* بطاقة: الحدود والاستدارة الهندسية */}
      <div className="bg-card border border-border p-3 rounded-xl shadow-xs fluent-specular space-y-3">
        <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/40 pb-1.5">
          <Square className="w-4 h-4 text-primary" weight="duotone" />
          <span>الحدود والاستدارة</span>
        </Label>

        {/* عينة اللون السريعة مع زر الانتقال لتبويب الألوان */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/40">
          <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary" weight="duotone" />
            <span>لون الشكل</span>
          </span>
          <div className="flex items-center gap-2">
            <PopoverColorPicker
              color={currentFill}
              onChange={(col) => {
                onUpdate(element.id, {
                  fill: col,
                  stroke: isLine ? col : (element.stroke || col),
                });
                useEditorStore.getState().pushHistory();
              }}
              swatchOnly
            />
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab("adjust")}
                className="text-[10.5px] text-primary font-bold hover:underline cursor-pointer transition-colors"
              >
                تخصيص كامل ←
              </button>
            )}
          </div>
        </div>

        <SliderControl
          label={isLine ? "سمك الخط" : "سماكة الحد"}
          icon={<BoundingBox className="w-4 h-4 text-muted-foreground/75" weight="regular" />}
          value={isLine ? (element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 4) : (element.strokeWidth ?? 0)}
          min={isLine ? 1 : 0}
          max={50}
          step={0.5}
          unit="px"
          onChange={(v) => onUpdate(element.id, { strokeWidth: v })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />

        {element.shape === "rect" && (
          <SliderControl
            label="استدارة الزوايا"
            icon={<Square className="w-4 h-4 text-muted-foreground/75" weight="regular" />}
            value={element.radius ?? 0}
            min={0}
            max={50}
            step={1}
            unit=""
            onChange={(v) => onUpdate(element.id, { radius: v })}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        )}
      </div>
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
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* بطاقة 1: التعبئة والتدرج */}
      <div className="bg-card border border-border p-3 rounded-xl shadow-xs fluent-specular space-y-3 overflow-hidden">
        <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/40 pb-1.5">
          <Palette className="w-4 h-4 text-primary" weight="duotone" />
          <span>تعبئة ولون الشكل</span>
        </Label>

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
            <span className="text-[10px] font-bold text-muted-foreground block">ألوان استوديو سريعة:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {STUDIO_PALETTE.map((c) => {
                const isSelected = currentFill.toLowerCase() === c.color.toLowerCase();
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => {
                      onUpdate(element.id, {
                        fill: c.color,
                        fillType: "solid",
                        stroke: isLine ? c.color : (element.stroke || c.color),
                      });
                      useEditorStore.getState().pushHistory();
                    }}
                    className={cn(
                      "h-7 rounded-lg border p-1 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 px-2",
                      isSelected ? "border-primary ring-2 ring-primary ring-offset-1 bg-primary/5 font-bold" : "border-border/60 bg-background/60 hover:bg-background"
                    )}
                    title={c.label}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-sm border border-black/15 dark:border-white/20 shrink-0 flex items-center justify-center shadow-2xs relative overflow-hidden"
                      style={{ backgroundColor: c.color }}
                    >
                      {isSelected && (
                        <Check className={cn("w-2.5 h-2.5", c.color === "#ffffff" ? "text-black" : "text-white")} weight="bold" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold truncate text-foreground/80">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* بطاقة 2: لون الحد أو الخط */}
      {!isLine && (
        <div className="bg-card border border-border p-3 rounded-xl shadow-xs fluent-specular space-y-3">
          <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/40 pb-1.5">
            <Square className="w-4 h-4 text-primary" weight="duotone" />
            <span>لون الحد والإطار</span>
          </Label>

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-foreground/80">لون الحد</span>
            <PopoverColorPicker
              color={currentStroke}
              onChange={(val) => {
                onUpdate(element.id, { stroke: val });
                useEditorStore.getState().pushHistory();
              }}
              swatchOnly
            />
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-border/30">
            {STUDIO_PALETTE.map((c) => {
              const isSelected = currentStroke.toLowerCase() === c.color.toLowerCase();
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { stroke: c.color });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "h-6.5 rounded-md border p-0.5 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1",
                    isSelected ? "border-primary ring-1 ring-primary bg-primary/10" : "border-border/50 bg-background/50"
                  )}
                  title={c.label}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-[9px] font-bold truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* بطاقة 3: الشفافية العامة */}
      <div className="bg-card border border-border p-3 rounded-xl shadow-xs fluent-specular space-y-2.5">
        <SliderControl
          label="شفافية الشكل"
          icon={<Eye className="w-4 h-4 text-muted-foreground/75" weight="regular" />}
          value={currentOpacity}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />
      </div>
    </div>
  );
}

/** للتوافق السابق */
export function ShapeProperties({ element, onUpdate, onNavigateTab }: ShapePropertiesProps) {
  return <ShapeStyleProperties element={element} onUpdate={onUpdate} onNavigateTab={onNavigateTab} />;
}
