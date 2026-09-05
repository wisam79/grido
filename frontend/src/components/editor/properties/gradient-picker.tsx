import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PopoverColorPicker, SliderControl } from "./shared-controls";
import { Check, ArrowsLeftRight, Sparkle, Palette } from "@phosphor-icons/react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export interface GradientPickerProps {
  fillType: "solid" | "linear" | "radial";
  color: string;
  colorStops: Array<number | string>;
  onChangeType: (type: "solid" | "linear" | "radial") => void;
  onChangeSolidColor: (color: string) => void;
  onChangeColorStops: (stops: Array<number | string>) => void;
  /** زاوية التدرج الخطي الحالية (0-360) — تُحسب من نقطتي البداية/النهاية */
  angle?: number;
  onChangeAngle?: (deg: number) => void;
  onCommitAngle?: (deg: number) => void;
}

import {
  formatGradientCss,
  GRADIENT_PRESETS,
} from "./gradient-utils";

const PRESET_CATEGORIES = [
  { id: "all", label: "الكل" },
  { id: "luxury", label: "استوديو ملكي" },
  { id: "aurora", label: "شفق وطبيعة" },
  { id: "neon", label: "عصري ونيون" },
  { id: "pastel", label: "باستيل هادئ" },
] as const;

const QUICK_ANGLES = [
  { deg: 0, label: "0°", tip: "أفقي (يمين ← يسار)" },
  { deg: 45, label: "45°", tip: "قطري صاعد" },
  { deg: 90, label: "90°", tip: "عمودي هابط" },
  { deg: 135, label: "135°", tip: "قطري قياسي" },
  { deg: 180, label: "180°", tip: "أفقي معكوس" },
  { deg: 270, label: "270°", tip: "عمودي صاعد" },
];

export const GradientPicker = ({
  fillType,
  color,
  colorStops,
  onChangeType,
  onChangeSolidColor,
  onChangeColorStops,
  angle = 135,
  onChangeAngle,
  onCommitAngle,
}: GradientPickerProps) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const stop1 = (colorStops[1] as string) || "#3b82f6";
  const stop2 = (colorStops[colorStops.length - 1] as string) || "#8b5cf6";

  const handleStop1Change = (newColor: string) => {
    const updated = [...colorStops];
    if (updated.length >= 2) updated[1] = newColor;
    else return onChangeColorStops([0, newColor, 1, stop2]);
    onChangeColorStops(updated);
  };

  const handleStop2Change = (newColor: string) => {
    const updated = [...colorStops];
    if (updated.length >= 4) updated[updated.length - 1] = newColor;
    else return onChangeColorStops([0, stop1, 1, newColor]);
    onChangeColorStops(updated);
  };

  const handleReverseStops = () => {
    if (!colorStops || colorStops.length < 4) return;
    const newStops: Array<number | string> = [];
    const count = colorStops.length / 2;
    for (let i = 0; i < count; i++) {
      const originalColorIndex = (count - 1 - i) * 2 + 1;
      const originalPos = Number(colorStops[i * 2]);
      newStops.push(originalPos, colorStops[originalColorIndex]);
    }
    onChangeColorStops(newStops);
  };

  const filteredPresets = useMemo(() => {
    if (activeCategory === "all") return GRADIENT_PRESETS;
    return GRADIENT_PRESETS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const liveGradientCss = useMemo(() => {
    return formatGradientCss(colorStops, fillType === "radial" ? "radial" : "linear", angle);
  }, [colorStops, fillType, angle]);

  const isPresetSelected = (presetStops: Array<number | string>) => {
    if (!colorStops || colorStops.length !== presetStops.length) return false;
    for (let i = 1; i < colorStops.length; i += 2) {
      if (String(colorStops[i]).toUpperCase() !== String(presetStops[i]).toUpperCase()) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="space-y-2 font-cairo w-full max-w-full overflow-hidden" dir="rtl">
      {/* محول نوع التعبئة (مصمت / خطي / دائري) */}
      <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/40 gap-0.5 w-full">
        {(["solid", "linear", "radial"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChangeType(t)}
            className={cn(
              "flex-1 h-6.5 rounded-md transition-all cursor-pointer flex items-center justify-center text-[10px] font-bold active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              fillType === t
                ? "bg-card text-foreground shadow-2xs font-extrabold border border-border/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "solid" ? "لون مصمت" : t === "linear" ? "تدرج خطي ⇄" : "تدرج دائري ⊙"}
          </button>
        ))}
      </div>

      {fillType === "solid" ? (
        <div className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded-xl border border-border/40 shadow-2xs w-full">
          <span className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 shrink-0">
            <Palette className="w-4 h-4 text-primary" weight="duotone" />
            لون العنصر:
          </span>
          <PopoverColorPicker color={color} onChange={onChangeSolidColor} swatchOnly className="w-8 h-8" />
        </div>
      ) : (
        <div className="space-y-2 w-full max-w-full overflow-hidden">
          {/* شريط المعاينة الحي للتدرج مع زر العكس السريع */}
          <div className="space-y-1.5 bg-background/50 p-2 rounded-xl border border-border/60 shadow-2xs w-full fluent-specular">
            <div className="flex items-center justify-between gap-1.5 text-[9.5px] font-bold text-muted-foreground">
              <span>المعاينة المباشرة:</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleReverseStops}
                    className="h-5 px-2 rounded-md bg-muted/60 hover:bg-primary/15 hover:text-primary text-muted-foreground text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-border/40 active:scale-95"
                  >
                    <ArrowsLeftRight className="w-2.5 h-2.5" weight="bold" />
                    <span>عكس الألوان</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">عكس ترتيب وتدرج الألوان</TooltipContent>
              </Tooltip>
            </div>

            {/* إطار المعاينة الاحترافي مع بريق زجاجي علوي */}
            <div className="p-[1.5px] rounded-lg bg-gradient-to-b from-black/20 to-black/5 dark:from-white/25 dark:to-white/5 shadow-xs">
              <div
                className="w-full h-5 rounded-[6px] relative overflow-hidden shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45),inset_0_-1px_1.5px_rgba(0,0,0,0.25)] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none"
                style={{ background: liveGradientCss }}
              />
            </div>
          </div>

          {/* محددات ألوان أطراف التدرج */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="flex items-center justify-between bg-background/40 px-2.5 py-1.5 rounded-lg border border-border/40 min-w-0">
              <span className="text-[10.5px] text-muted-foreground font-bold">البداية:</span>
              <PopoverColorPicker color={stop1} onChange={handleStop1Change} swatchOnly className="w-7.5 h-7.5" />
            </div>
            <div className="flex items-center justify-between bg-background/40 px-2.5 py-1.5 rounded-lg border border-border/40 min-w-0">
              <span className="text-[10.5px] text-muted-foreground font-bold">النهاية:</span>
              <PopoverColorPicker color={stop2} onChange={handleStop2Change} swatchOnly className="w-7.5 h-7.5" />
            </div>
          </div>

          {/* التحكم بزاوية التدرج الخطي */}
          {fillType === "linear" && onChangeAngle && (
            <div className="space-y-1.5 pt-1 border-t border-border/30 w-full">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-muted-foreground shrink-0">زاوية التدرج:</span>
                {/* زوايا سريعة شائعة */}
                <div className="flex items-center gap-0.5 flex-wrap justify-end">
                  {QUICK_ANGLES.map(({ deg, label, tip }) => {
                    const isAngleActive = Math.round(angle) === deg;
                    return (
                      <Tooltip key={deg}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => {
                              onChangeAngle(deg);
                              onCommitAngle?.(deg);
                            }}
                            className={cn(
                              "h-5 px-1.5 text-[9.5px] font-mono font-bold rounded-md transition-all cursor-pointer border",
                              isAngleActive
                                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                                : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40"
                            )}
                          >
                            {label}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10.5px]">{tip}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              <SliderControl
                label="زاوية حرة"
                value={angle}
                min={0}
                max={360}
                step={1}
                unit="°"
                onChange={onChangeAngle}
                onCommit={() => onCommitAngle?.(angle)}
              />
            </div>
          )}

          {/* 🎨 معرض التدرجات الجاهزة والمصنفة */}
          <div className="space-y-1.5 pt-1.5 border-t border-border/40 w-full max-w-full overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold text-foreground flex items-center gap-1">
                <Sparkle className="w-3 h-3 text-amber-500" weight="duotone" />
                تدرجات جاهزة
              </span>
              <span className="text-[9.5px] text-muted-foreground font-mono">({filteredPresets.length})</span>
            </div>

            {/* أزرار الفئات العلوية المدمجة */}
            <div 
              className="flex items-center gap-1 overflow-x-auto pb-0.5 w-full min-w-0 max-w-full custom-scrollbar"
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "h-5 px-1.5 text-[9.5px] font-bold rounded-md transition-all cursor-pointer shrink-0 border select-none",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* شريط كبسولات التدرجات: صف واحد فقط مع إطار احترافي وتمرير جانبي */}
            <div 
              className="flex items-center gap-2 overflow-x-auto py-1.5 px-1 w-full min-w-0 max-w-full custom-scrollbar"
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              {filteredPresets.map((preset) => {
                const isSelected = isPresetSelected(preset.stops);
                const bgCss = formatGradientCss(preset.stops, fillType === "radial" ? "radial" : "linear", 135);

                return (
                  <Tooltip key={preset.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onChangeColorStops(preset.stops)}
                        className={cn(
                          "group relative w-7 h-7 shrink-0 rounded-lg p-[1.5px] transition-all duration-150 cursor-pointer overflow-visible flex items-center justify-center shadow-2xs hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10 shadow-sm bg-gradient-to-b from-primary to-primary/60"
                            : "bg-gradient-to-b from-black/25 via-black/10 to-black/30 dark:from-white/30 dark:via-white/10 dark:to-white/5 hover:from-primary/60 hover:to-primary/30"
                        )}
                        aria-label={preset.name}
                      >
                        {/* جسم الكبسولة الملون مع حواف ناعمة وبريق زجاجي خفيف */}
                        <div
                          className="w-full h-full rounded-[5.5px] relative overflow-hidden flex items-center justify-center shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.25)] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none"
                          style={{ background: bgCss }}
                        >
                          {isSelected && (
                            <div className="w-3.5 h-3.5 rounded-full bg-black/55 backdrop-blur-xs flex items-center justify-center text-white border border-white/70 shadow-xs z-10 animate-in zoom-in-75 duration-150">
                              <Check className="w-2.5 h-2.5" weight="bold" />
                            </div>
                          )}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10.5px] font-bold font-cairo">
                      {preset.name}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
