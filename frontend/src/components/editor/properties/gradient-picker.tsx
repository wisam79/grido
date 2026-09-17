import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PopoverColorPicker } from "./shared-controls";
import { FluentSegmentedControl, FluentSliderField } from "@/components/ui/blocks";
import { Check, ArrowsLeftRight, Sparkle, Palette } from "@phosphor-icons/react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  formatGradientCss,
  GRADIENT_PRESETS,
} from "./gradient-utils";

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

const PRESET_CATEGORIES = [
  { id: "luxury", label: "ملكي" },
  { id: "aurora", label: "طبيعي" },
  { id: "neon", label: "نيون" },
  { id: "pastel", label: "باستيل" },
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
  const [activeCategory, setActiveCategory] = useState<string>("luxury");

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
    <div className="space-y-2.5 font-cairo w-full max-w-full overflow-hidden" dir="rtl">
      {/* محول نوع التعبئة القياسي بأسلوب Fluent 2 الموحد */}
      <FluentSegmentedControl<"solid" | "linear" | "radial">
        layoutId="gradient-fill-type"
        value={fillType}
        onChange={onChangeType}
        size="sm"
        options={[
          { id: "solid", label: "مصمت" },
          { id: "linear", label: "خطي" },
          { id: "radial", label: "دائري" },
        ]}
      />

      {fillType === "solid" ? (
        <div className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded-xl border border-border/40 shadow-2xs w-full">
          <span className="text-xs text-foreground/90 font-semibold flex items-center gap-1.5 shrink-0">
            <Palette className="w-4 h-4 text-primary" weight="duotone" />
            <span>لون التعبئة</span>
          </span>
          <PopoverColorPicker color={color} onChange={onChangeSolidColor} swatchOnly className="w-8 h-8" />
        </div>
      ) : (
        <div className="space-y-2.5 w-full max-w-full overflow-hidden">
          {/* وحدة التدرج الموحدة الفاخرة (شريط معاينة زجاجي + مقابض لونية متناسقة) */}
          <div className="p-2 rounded-xl bg-background/50 border border-border/60 shadow-2xs space-y-2 fluent-specular">
            {/* شريط المعاينة التفاعلي الرشيق */}
            <div className="relative h-7 w-full rounded-lg overflow-hidden border border-black/15 dark:border-white/20 shadow-inner">
              <div
                className="w-full h-full relative before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
                style={{ background: liveGradientCss }}
              />
            </div>

            {/* شريط التحكم اللوني المدمج والموزع بانتظام */}
            <div className="flex items-center justify-between gap-1.5">
              {/* بداية التدرج */}
              <div className="flex-1 flex items-center justify-between bg-muted/40 hover:bg-muted/70 px-2.5 py-1.5 rounded-lg border border-border/40 transition-colors min-w-0">
                <span className="text-micro font-bold text-muted-foreground">البداية</span>
                <PopoverColorPicker color={stop1} onChange={handleStop1Change} swatchOnly className="w-6 h-6 rounded-md shadow-2xs border border-white/10" />
              </div>

              {/* زر عكس التدرج الأنيق */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleReverseStops}
                    className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-primary/15 hover:text-primary text-muted-foreground border border-border/50 hover:border-primary/40 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
                    title="عكس ترتيب الألوان"
                  >
                    <ArrowsLeftRight className="w-3.5 h-3.5" weight="bold" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-cairo">عكس ترتيب الألوان</TooltipContent>
              </Tooltip>

              {/* نهاية التدرج */}
              <div className="flex-1 flex items-center justify-between bg-muted/40 hover:bg-muted/70 px-2.5 py-1.5 rounded-lg border border-border/40 transition-colors min-w-0">
                <span className="text-micro font-bold text-muted-foreground">النهاية</span>
                <PopoverColorPicker color={stop2} onChange={handleStop2Change} swatchOnly className="w-6 h-6 rounded-md shadow-2xs border border-white/10" />
              </div>
            </div>
          </div>

          {/* التحكم بزاوية التدرج الخطي: سلايدر + أزرار سريعة موحدة */}
          {fillType === "linear" && onChangeAngle && (
            <div className="space-y-2 pt-1 border-t border-border/30 w-full">
              <FluentSliderField
                label="زاوية التدرج"
                value={Math.round(angle)}
                min={0}
                max={360}
                step={1}
                unit="°"
                onChange={(v) => onChangeAngle?.(v)}
                onCommit={() => onCommitAngle?.(angle)}
              />

              <div className="grid grid-cols-6 gap-1 w-full">
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
                            "h-6 text-micro font-semibold rounded-md transition-all cursor-pointer border flex items-center justify-center active:scale-95 tabular-nums select-none",
                            isAngleActive
                              ? "bg-primary/20 text-primary border-primary/40 font-bold shadow-2xs"
                              : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40 hover:text-foreground"
                          )}
                        >
                          {label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-mini">{tip}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}

          {/* 🎨 معرض التدرجات الجاهزة المصنفة */}
          <div className="space-y-2 pt-1 border-t border-border/40 w-full max-w-full overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-mini font-bold text-foreground flex items-center gap-1">
                <Sparkle className="w-3.5 h-3.5 text-amber-500" weight="duotone" />
                <span>تدرجات جاهزة</span>
              </span>
              <span className="text-micro text-muted-foreground font-semibold tabular-nums">({filteredPresets.length})</span>
            </div>

            {/* تصنيفات التدرجات بمكون FluentSegmentedControl القياسي */}
            <FluentSegmentedControl<string>
              layoutId="gradient-preset-categories"
              value={activeCategory}
              onChange={setActiveCategory}
              size="sm"
              options={PRESET_CATEGORIES.map((c) => ({
                id: c.id,
                label: c.label,
              }))}
            />

            {/* شبكة عينات التدرجات بنمط زجاجي مقوس ونظيف */}
            <div className="grid grid-cols-6 gap-1.5 py-0.5 w-full">
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
                          "group relative w-full aspect-square rounded-lg p-[1.5px] transition-all duration-150 cursor-pointer flex items-center justify-center shadow-2xs hover:scale-108 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10 shadow-xs border border-primary"
                            : "border border-black/10 dark:border-white/15 hover:border-primary/50"
                        )}
                        aria-label={preset.name}
                      >
                        <div
                          className="w-full h-full rounded-[6px] relative overflow-hidden flex items-center justify-center shadow-inner before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
                          style={{ background: bgCss }}
                        >
                          {isSelected && (
                            <div className="w-3.5 h-3.5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white border border-white/70 shadow-xs z-10 animate-in zoom-in-75 duration-150">
                              <Check className="w-2.5 h-2.5" weight="bold" />
                            </div>
                          )}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-mini font-bold font-cairo">
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
