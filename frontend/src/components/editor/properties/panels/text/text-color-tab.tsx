import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { Palette, Eye, Sparkle, BoundingBox } from "@phosphor-icons/react";
import { GradientPicker } from "../../gradient-picker";
import { gradientAngleFromPoints, gradientPointsFromAngle } from "../../gradient-utils";
import { PopoverColorPicker, QuickColorPalette } from "../../shared-controls";
import { FluentSection, FluentSliderField } from "@/components/ui/blocks";
import type { TextTabProps } from "./text-tab-types";

export function TextColorTab({ element, onUpdate }: TextTabProps) {
  const currentOpacity = Math.round((element.opacity ?? 1) * 100);
  const currentColor = element.color || "#000000";
  const hasStroke = (element.strokeWidth ?? 0) > 0;
  const currentStroke = element.stroke || "#000000";
  const hasBadge = !!element.textBgColor && element.textBgColor !== "transparent";

  return (
    <div className="space-y-3 animate-in fade-in duration-150 font-cairo">
      {/* 🎴 بطاقة 1: تعبئة ولون النص */}
      <FluentSection
        icon={<Palette className="w-4 h-4 text-primary" weight="duotone" />}
        title="تعبئة ولون النص"
        collapsible
        defaultOpen={true}
        action={
          element.fillType && element.fillType !== "solid" ? (
            <span className="text-micro font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 border border-border/50 select-none">
              {element.fillType === "linear" ? "خطي" : "دائري"}
            </span>
          ) : undefined
        }
      >
        <GradientPicker
          fillType={element.fillType || "solid"}
          color={currentColor}
          colorStops={element.fillLinearGradientColorStops || element.fillRadialGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"]}
          onChangeType={(type) => {
            onUpdate(element.id, { fillType: type });
            useEditorStore.getState().pushHistory();
          }}
          onChangeSolidColor={(col) => {
            onUpdate(element.id, { color: col });
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

        {/* باليتة الألوان السريعة في حالة اللون المصمت */}
        {(element.fillType === "solid" || !element.fillType) && (
          <div className="pt-2 border-t border-border/30 space-y-1.5">
            <span className="text-micro font-semibold text-muted-foreground block">ألوان سريعة</span>
            <QuickColorPalette
              currentColor={currentColor}
              onSelectColor={(col) => {
                onUpdate(element.id, { color: col, fillType: "solid" });
                useEditorStore.getState().pushHistory();
              }}
            />
          </div>
        )}
      </FluentSection>

      {/* 🎴 بطاقة 2: إطار وحدود النص (Stroke) */}
      <FluentSection
        icon={<BoundingBox className="w-4 h-4 text-primary" weight="duotone" />}
        title="إطار وحدود النص"
        open={hasStroke}
        action={
          <div className="flex items-center gap-2">
            {hasStroke && (
              <PopoverColorPicker
                color={currentStroke}
                onChange={(val) => {
                  onUpdate(element.id, { stroke: val });
                  useEditorStore.getState().pushHistory();
                }}
                swatchOnly
                className="w-6 h-6 rounded-md shadow-2xs border border-white/10"
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (hasStroke) {
                  onUpdate(element.id, { strokeWidth: 0 });
                } else {
                  onUpdate(element.id, { stroke: element.stroke || "#000000", strokeWidth: 2 });
                }
                useEditorStore.getState().pushHistory();
              }}
              aria-label={hasStroke ? "مفعّل" : "إضافة"}
              className={cn(
                "h-6 px-2.5 rounded-full text-micro font-bold transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 border select-none",
                hasStroke
                  ? "bg-card text-foreground border border-border/80 dark:border-white/15 shadow-xs font-bold ring-1 ring-primary/40"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              {hasStroke && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />}
              <span>{hasStroke ? "مفعّل" : "إضافة"}</span>
            </button>
          </div>
        }
      >
        {hasStroke && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            {/* وحدة لون الحد المدمجة */}
            <div className="space-y-1.5 bg-background/40 p-2 rounded-xl border border-border/50 shadow-2xs">
              <div className="flex items-center justify-between text-micro font-bold text-muted-foreground px-0.5">
                <span>لون الحد</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground/70 uppercase select-none" dir="ltr">
                    {currentStroke}
                  </span>
                  <PopoverColorPicker
                    color={currentStroke}
                    onChange={(val) => {
                      onUpdate(element.id, { stroke: val });
                      useEditorStore.getState().pushHistory();
                    }}
                    swatchOnly
                    className="w-5 h-5 rounded"
                  />
                </div>
              </div>
              <QuickColorPalette
                currentColor={currentStroke}
                onSelectColor={(col) => {
                  onUpdate(element.id, { stroke: col });
                  useEditorStore.getState().pushHistory();
                }}
              />
            </div>

            <FluentSliderField
              label="سماكة الحد"
              value={element.strokeWidth ?? 2}
              min={0.5}
              max={20}
              step={0.5}
              unit="px"
              onChange={(v) => onUpdate(element.id, { strokeWidth: v })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
          </div>
        )}
      </FluentSection>

      {/* 🎴 بطاقة 3: ألوان الشارة والخلفية إن وُجدت */}
      {hasBadge && (
        <FluentSection
          icon={<Sparkle className="w-4 h-4 text-primary" weight="duotone" />}
          title="ألوان خلفية وشارة النص"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground/80">لون الخلفية</span>
            <PopoverColorPicker
              color={element.textBgColor || "#2563eb"}
              onChange={(val) => {
                onUpdate(element.id, { textBgColor: val });
                useEditorStore.getState().pushHistory();
              }}
              swatchOnly
            />
          </div>

          {(element.textBgBorderWidth ?? 0) > 0 && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
              <span className="text-xs font-semibold text-foreground/80">لون إطار الشارة</span>
              <PopoverColorPicker
                color={element.textBgBorderColor || "#000000"}
                onChange={(val) => {
                  onUpdate(element.id, { textBgBorderColor: val });
                  useEditorStore.getState().pushHistory();
                }}
                swatchOnly
              />
            </div>
          )}
        </FluentSection>
      )}

      {/* 🎴 بطاقة 4: الشفافية */}
      <FluentSection
        icon={<Eye className="w-4 h-4 text-primary" weight="duotone" />}
        title="الشفافية"
        action={
          <span className="text-micro font-bold font-mono px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-foreground/90 tabular-nums select-none" dir="ltr">
            {currentOpacity}%
          </span>
        }
      >
        <FluentSliderField
          label="شفافية النص"
          value={currentOpacity}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />
      </FluentSection>
    </div>
  );
}
