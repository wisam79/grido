import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { Palette, Eye, Check } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GradientPicker, gradientAngleFromPoints, gradientPointsFromAngle } from "../../gradient-picker";
import { Slider } from "@/components/ui/slider";
import type { TextTabProps } from "./text-tab-types";

const STUDIO_PALETTE = [
  { label: "أبيض", color: "#ffffff" },
  { label: "أسود", color: "#000000" },
  { label: "أزرق", color: "#2563eb" },
  { label: "ذهبي", color: "#d97706" },
  { label: "زمردي", color: "#059669" },
  { label: "أحمر", color: "#dc2626" },
  { label: "بنفسجي", color: "#7c3aed" },
  { label: "رمادي", color: "#4b5563" },
];

export function TextColorTab({ element, onUpdate }: TextTabProps) {
  const currentOpacity = Math.round((element.opacity ?? 1) * 100);

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150">
      {/* 🎴 بطاقة 1: لون النص والتعبئة */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary" weight="duotone" />
            <span>لون النص والتعبئة</span>
          </span>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 rounded-lg border border-border/80 dark:border-white/10 p-0.5 bg-input/40 hover:bg-input hover:border-primary/60 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                title="تغيير لون وتعبئة النص"
              >
                <div
                  className="w-full h-full rounded-md border border-black/15 dark:border-white/20 shadow-2xs relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
                  style={{
                    background:
                      element.fillType === "linear" || element.fillType === "radial"
                        ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                        : element.color || "#000000",
                  }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent side="left" className="w-72 sm:w-80 p-3 font-cairo shadow-lg rounded-xl border-border/60 fluent-specular z-50 overflow-hidden">
              <GradientPicker
                fillType={element.fillType || "solid"}
                color={element.color || "#000000"}
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
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 🎴 بطاقة 2: الشفافية والألوان السريعة */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        {/* الشفافية */}
        <div className="space-y-1 p-2 bg-muted/20 rounded-lg border border-border/30">
          <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-primary/70" weight="regular" />
              <span>الشفافية</span>
            </span>
            <span className="font-mono text-foreground font-bold">{currentOpacity}%</span>
          </div>
          <Slider
            value={[currentOpacity]}
            min={10}
            max={100}
            step={5}
            onValueChange={(val) => onUpdate(element.id, { opacity: val[0] / 100 })}
            onPointerUp={() => useEditorStore.getState().pushHistory()}
            className="py-1"
          />
        </div>

        {/* ألوان سريعة */}
        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
          {STUDIO_PALETTE.map((c) => {
            const isCurrent = (element.color || "#000000").toLowerCase() === c.color.toLowerCase() && (element.fillType === "solid" || !element.fillType);
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  onUpdate(element.id, { color: c.color, fillType: "solid" });
                  useEditorStore.getState().pushHistory();
                }}
                className={cn(
                  "h-7.5 rounded-lg border p-1 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 px-2",
                  isCurrent ? "border-primary ring-2 ring-primary ring-offset-1 bg-primary/5 font-bold" : "border-border/60 bg-background/60 hover:bg-background"
                )}
                title={c.label}
              >
                <div
                  className="w-4 h-4 rounded-md border border-black/15 dark:border-white/20 shrink-0 flex items-center justify-center shadow-2xs relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
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
    </div>
  );
}
