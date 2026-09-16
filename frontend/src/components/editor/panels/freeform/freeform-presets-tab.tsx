import React, { useMemo, useCallback } from "react";
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

  const currentDpi = template?.dpi || printSettings?.dpi || 300;
  const currentW_MM = Math.round((canvasWidth / currentDpi) * 25.4);
  const currentH_MM = Math.round((canvasHeight / currentDpi) * 25.4);

  // تصنيف المقاسات إلى مجموعات
  const categories = useMemo(() => {
    return [
      {
        id: "id",
        label: "وثائق وهوية رسمية",
        icon: <IdentificationCard className="w-4 h-4 text-primary" weight="duotone" />,
        presets: CANVAS_SIZE_PRESETS.filter((p) => p.category === "id"),
      },
      {
        id: "print",
        label: "كروت ومطبوعات",
        icon: <Printer className="w-4 h-4 text-primary" weight="duotone" />,
        presets: CANVAS_SIZE_PRESETS.filter((p) => p.category === "print"),
      },
      {
        id: "social",
        label: "وسائط وشاشات — للشاشة فقط",
        icon: <DeviceMobile className="w-4 h-4 text-primary" weight="duotone" />,
        presets: CANVAS_SIZE_PRESETS.filter((p) => p.category === "social"),
      },
    ];
  }, []);

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
    <div className="space-y-3.5 font-cairo animate-in fade-in duration-150" dir="rtl">
      {/* 📐 بطاقة المقاس الحالي مع زر تبديل الاتجاه */}
      <div className="bg-card border border-border p-3 rounded-xl shadow-xs fluent-specular space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <FrameCorners className="w-4 h-4 text-primary" weight="duotone" />
            <span>المقاس الفعلي الحالي</span>
          </div>

          <button
            type="button"
            onClick={handleToggleOrientation}
            className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-muted/60 hover:bg-muted px-2 py-1 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            title="تبديل الاتجاه بين أفقي وعمودي"
          >
            <ArrowsClockwise className="w-3.5 h-3.5" />
            <span>{canvasWidth >= canvasHeight ? "أفقي" : "رأسي"}</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs font-mono bg-muted/30 p-2 rounded-lg border border-border/40">
          <span className="font-bold text-foreground">
            {currentW_MM} × {currentH_MM} ملم
          </span>
          <span className="text-[11px] text-muted-foreground font-sans">
            {canvasWidth} × {canvasHeight} بكسل ({currentDpi} DPI)
          </span>
        </div>
      </div>

      {/* 📚 مجموعات المقاسات القياسية */}
      <div className="space-y-3">
        {categories.map((group) => (
          <div key={group.id} className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1 text-xs font-bold text-foreground/80">
              {group.icon}
              <span>{group.label}</span>
            </div>

            <div className="space-y-1">
              {group.presets.map((preset) => {
                const active = isPresetActive(preset);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-xl border text-right transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none select-none",
                      active
                        ? "bg-primary/10 border-primary/50 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                        : "bg-card hover:bg-accent/40 border-border/60 hover:border-primary/40 text-foreground"
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs truncate">{preset.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground truncate">{preset.tag}</span>
                    </div>

                    {active ? (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3 h-3" weight="bold" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 font-mono">
                        {preset.dpi} DPI
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
