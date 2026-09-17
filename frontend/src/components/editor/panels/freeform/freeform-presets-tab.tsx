import React, { useState, useMemo, useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import {
  IdentificationCard,
  Printer,
  DeviceMobile,
  Check,
  FrameCorners,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { CANVAS_SIZE_PRESETS, CanvasSizePreset } from "./freeform-panel-constants";
import { cn } from "@/lib/utils";
import { FluentFilterChips } from "@/components/ui/blocks";

export const FreeformPresetsTab = React.memo(function FreeformPresetsTab() {
  const {
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    printSettings,
    template,
  } = useEditorStore(
    useShallow((state) => ({
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      setCanvasSize: state.setCanvasSize,
      printSettings: state.printSettings,
      template: state.template,
    }))
  );

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const currentDpi = template?.dpi || printSettings?.dpi || 300;
  const currentW_MM = Math.round((canvasWidth / currentDpi) * 25.4);
  const currentH_MM = Math.round((canvasHeight / currentDpi) * 25.4);

  // تصفية المقاسات حسب الفئة المختارة
  const filteredPresets = useMemo(() => {
    if (selectedCategory === "all") return CANVAS_SIZE_PRESETS;
    return CANVAS_SIZE_PRESETS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // فحص المقاس النشط حالياً
  const isPresetActive = useCallback(
    (preset: CanvasSizePreset) => {
      if (preset.widthMM && preset.heightMM) {
        return (
          (currentW_MM === preset.widthMM && currentH_MM === preset.heightMM) ||
          (currentW_MM === preset.heightMM && currentH_MM === preset.widthMM)
        );
      }
      return (
        (canvasWidth === preset.widthPx && canvasHeight === preset.heightPx) ||
        (canvasWidth === preset.heightPx && canvasHeight === preset.widthPx)
      );
    },
    [currentW_MM, currentH_MM, canvasWidth, canvasHeight]
  );

  const handleSelectPreset = useCallback(
    (preset: CanvasSizePreset) => {
      setCanvasSize(preset.widthPx, preset.heightPx);
      toast.success(`تم ضبط الكانفاس: ${preset.name} (${preset.tag})`);
    },
    [setCanvasSize]
  );

  // تبديل اتجاه الورقة (أفقي / رأسي)
  const handleToggleOrientation = () => {
    setCanvasSize(canvasHeight, canvasWidth);
    toast.success("تم تبديل اتجاه الكانفاس (أفقي / رأسي)");
  };

  return (
    <div className="space-y-3 font-cairo animate-in fade-in duration-150" dir="rtl">
      {/* 📐 بطاقة المقاس النشط بتصميم Fluent 2 الأكريليكي */}
      <div className="bg-card/70 border border-border/80 p-3 rounded-xl shadow-2xs fluent-specular space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <FrameCorners className="w-4 h-4 text-primary" weight="duotone" />
            <span>المقاس النشط</span>
          </div>

          <button
            type="button"
            onClick={handleToggleOrientation}
            className="flex items-center gap-1.5 text-mini font-bold text-muted-foreground hover:text-primary transition-all cursor-pointer bg-muted/50 hover:bg-muted px-2 py-1 rounded-md border border-border/50 shadow-2xs active:scale-95"
            title="تبديل الاتجاه بين أفقي وعمودي"
          >
            <ArrowsClockwise className="w-3.5 h-3.5" />
            <span>{canvasWidth >= canvasHeight ? "أفقي" : "رأسي"}</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs bg-muted/40 p-2 rounded-lg border border-border/40">
          <div className="flex flex-col text-start">
            <span className="font-bold text-foreground font-mono text-xs">
              {currentW_MM} × {currentH_MM} ملم
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {canvasWidth} × {canvasHeight} px
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            {currentDpi} DPI
          </span>
        </div>
      </div>

      {/* 🧭 كبسولات التصفية السريعة بين فئات المقاسات */}
      <FluentFilterChips
        value={selectedCategory}
        onChange={setSelectedCategory}
        variant="tint"
        size="sm"
        options={[
          { id: "all", label: "الكل" },
          { id: "id", label: "وثائق رسمية", icon: <IdentificationCard /> },
          { id: "print", label: "مطبوعات", icon: <Printer /> },
          { id: "social", label: "وسائط", icon: <DeviceMobile /> },
        ]}
      />


      {/* 📄 شبكة المقاسات المصغرة (2 أعمدة ببطاقات تفاعلية بصرية بدل القائمة الطويلة) */}
      <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-270px)] overflow-y-auto pr-0.5 scrollbar-thin">
        {filteredPresets.map((preset) => {
          const active = isPresetActive(preset);
          const ratio = preset.widthPx / preset.heightPx;

          // حساب أبعاد الورقة المصغرة هندسياً لتعكس النسبة الحقيقية للورقة
          let thumbW = 28;
          let thumbH = 28;
          if (ratio >= 1) {
            thumbW = 32;
            thumbH = Math.max(14, Math.round(32 / ratio));
          } else {
            thumbH = 32;
            thumbW = Math.max(14, Math.round(32 * ratio));
          }

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              title={`${preset.name} - ${preset.tag}`}
              className={cn(
                "group relative p-2.5 rounded-xl border text-center transition-all duration-150 cursor-pointer flex flex-col items-center justify-between gap-1.5 select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none shadow-2xs hover:shadow-fluent-8",
                active
                  ? "bg-primary/12 border-primary/60 text-primary shadow-xs ring-1 ring-primary/25 font-bold"
                  : "bg-card/70 hover:bg-accent/40 border-border/70 hover:border-primary/40 text-foreground"
              )}
            >
              {/* شارة الاختيار النشط */}
              {active && (
                <span className="absolute top-1.5 start-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5" weight="bold" />
                </span>
              )}

              {/* ورقة مصغرة بنسب الأبعاد الحقيقية */}
              <div className="w-full h-12 rounded-lg bg-muted/40 dark:bg-muted/20 flex items-center justify-center p-1">
                <div
                  style={{ width: `${thumbW}px`, height: `${thumbH}px` }}
                  className={cn(
                    "rounded-xs border transition-all duration-150 shadow-2xs flex items-center justify-center relative overflow-hidden group-hover:scale-105",
                    active
                      ? "border-primary bg-primary/20 shadow-primary/20"
                      : "border-border/80 bg-background/90 group-hover:border-primary/50"
                  )}
                >
                  <div className="w-2 h-0.5 bg-current opacity-25 rounded-full" />
                </div>
              </div>

              {/* اسم المقاس والأبعاد */}
              <div className="flex flex-col items-center w-full min-w-0">
                <span className="text-xs font-bold truncate w-full group-hover:text-primary transition-colors">
                  {preset.name}
                </span>
                <span className="text-micro font-mono text-muted-foreground mt-0.5 truncate w-full">
                  {preset.tag}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
