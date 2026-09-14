import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { Palette, Eye, Check, Square, Sparkle } from "@phosphor-icons/react";
import { GradientPicker } from "../../gradient-picker";
import { gradientAngleFromPoints, gradientPointsFromAngle } from "../../gradient-utils";
import { PopoverColorPicker, SliderControl } from "../../shared-controls";
import { Label } from "@/components/ui/label";
import { STUDIO_PALETTE } from "@/lib/canvas/canvas-colors";
import type { TextTabProps } from "./text-tab-types";

export function TextColorTab({ element, onUpdate }: TextTabProps) {
  const currentOpacity = Math.round((element.opacity ?? 1) * 100);
  const currentColor = element.color || "#000000";
  const hasStroke = (element.strokeWidth ?? 0) > 0;
  const currentStroke = element.stroke || "#000000";
  const hasBadge = !!element.textBgColor && element.textBgColor !== "transparent";

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* 🎴 بطاقة 1: تعبئة ولون النص */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-3 shadow-xs fluent-specular overflow-hidden">
        <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5 border-b border-border/40 pb-1.5">
          <Palette className="w-4 h-4 text-primary" weight="duotone" />
          <span>تعبئة ولون النص</span>
        </Label>

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
            <span className="text-[10px] font-bold text-muted-foreground block">ألوان استوديو سريعة:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {STUDIO_PALETTE.map((c) => {
                const isCurrent = currentColor.toLowerCase() === c.color.toLowerCase();
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => {
                      onUpdate(element.id, { color: c.color, fillType: "solid" });
                      useEditorStore.getState().pushHistory();
                    }}
                    className={cn(
                      "h-7 rounded-lg border p-1 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 px-2",
                      isCurrent ? "border-primary ring-2 ring-primary ring-offset-1 bg-primary/5 font-bold" : "border-border/60 bg-background/60 hover:bg-background"
                    )}
                    title={c.label}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-sm border border-black/15 dark:border-white/20 shrink-0 flex items-center justify-center shadow-2xs relative overflow-hidden"
                      style={{ backgroundColor: c.color }}
                    >
                      {isCurrent && (
                        <Check className={cn("w-2.5 h-2.5 z-10", c.color === "#ffffff" ? "text-black" : "text-white")} weight="bold" />
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

      {/* 🎴 بطاقة 2: لون حد النص (Stroke) */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
          <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
            <Square className="w-4 h-4 text-primary" weight="duotone" />
            <span>حدود النص (إطار خارجي)</span>
          </Label>

          <div className="flex items-center gap-2">
            {hasStroke && (
              <PopoverColorPicker
                color={currentStroke}
                onChange={(val) => {
                  onUpdate(element.id, { stroke: val });
                  useEditorStore.getState().pushHistory();
                }}
                swatchOnly
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
              className={cn(
                "h-6.5 px-2 rounded-md border text-[10px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95",
                hasStroke
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted text-muted-foreground border-border/60"
              )}
            >
              {hasStroke ? "مفعّل" : "إضافة حد"}
            </button>
          </div>
        </div>

        {hasStroke && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-150">
            {/* باليتة سريعة للحد */}
            <div className="grid grid-cols-4 gap-1.5">
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

            <SliderControl
              label="سماكة الحد"
              icon={<Square className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
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
      </div>

      {/* 🎴 بطاقة 3: ألوان الشارة والخلفية إن وُجدت */}
      {hasBadge && (
        <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
          <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5 border-b border-border/40 pb-1.5">
            <Sparkle className="w-4 h-4 text-primary" weight="duotone" />
            <span>ألوان خلفية وشارة النص</span>
          </Label>

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
        </div>
      )}

      {/* 🎴 بطاقة 4: الشفافية */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2 shadow-xs fluent-specular">
        <SliderControl
          label="شفافية النص"
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
