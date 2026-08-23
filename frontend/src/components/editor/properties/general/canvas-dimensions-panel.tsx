import React, { useState, useEffect } from "react";
import { RefreshCw, ArrowLeftRight, ChevronDown, Check } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { PAPER_SIZES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useShallow } from "zustand/react/shallow";
import { PresetMiniature } from "./preset-miniature";
import { FluentSection, FluentSegmentedControl } from "@/components/ui/blocks";

export const CanvasDimensionsPanel = React.memo(function CanvasDimensionsPanel() {
  const {
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    template,
    setTemplate,
    printSettings,
  } = useEditorStore(useShallow((state) => ({
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    setCanvasSize: state.setCanvasSize,
    template: state.template,
    setTemplate: state.setTemplate,
    printSettings: state.printSettings,
  })));

  const [unit, setUnit] = useState<"px" | "mm">("px");
  const [widthVal, setWidthVal] = useState(canvasWidth.toString());
  const [heightVal, setHeightVal] = useState(canvasHeight.toString());
  const [dpiVal, setDpiVal] = useState(template?.dpi || printSettings.dpi || 300);

  const currentDpi = template?.dpi || printSettings.dpi || 300;

  useEffect(() => {
    const nextWidthVal =
      unit === "px"
        ? canvasWidth.toString()
        : Math.round((canvasWidth / currentDpi) * 25.4).toString();
    const nextHeightVal =
      unit === "px"
        ? canvasHeight.toString()
        : Math.round((canvasHeight / currentDpi) * 25.4).toString();

    const rafId = requestAnimationFrame(() => {
      setWidthVal(nextWidthVal);
      setHeightVal(nextHeightVal);
      setDpiVal(currentDpi);
    });

    return () => cancelAnimationFrame(rafId);
  }, [canvasWidth, canvasHeight, unit, currentDpi]);

  const MIN_PX = 1;
  const MAX_PX = 20000;

  const handleWidthChange = (val: string) => {
    setWidthVal(val);
  };

  const handleWidthCommit = () => {
    const num = parseFloat(widthVal);
    if (isNaN(num) || num <= 0) {
      setWidthVal(canvasWidth.toString());
      return;
    }
    if (unit === "px") {
      const px = Math.max(MIN_PX, Math.min(MAX_PX, Math.round(num)));
      setWidthVal(px.toString());
      setCanvasSize(px, canvasHeight);
      if (template) setTemplate(null);
    } else {
      const mm = Math.min(num, 2000);
      setWidthVal(mm.toString());
      const px = Math.round((mm * dpiVal) / 25.4);
      setCanvasSize(Math.max(MIN_PX, px), canvasHeight);
      if (template) setTemplate(null);
    }
  };

  const handleHeightChange = (val: string) => {
    setHeightVal(val);
  };

  const handleHeightCommit = () => {
    const num = parseFloat(heightVal);
    if (isNaN(num) || num <= 0) {
      setHeightVal(canvasHeight.toString());
      return;
    }
    if (unit === "px") {
      const px = Math.max(MIN_PX, Math.min(MAX_PX, Math.round(num)));
      setHeightVal(px.toString());
      setCanvasSize(canvasWidth, px);
      if (template) setTemplate(null);
    } else {
      const mm = Math.min(num, 2000);
      setHeightVal(mm.toString());
      const px = Math.round((mm * dpiVal) / 25.4);
      setCanvasSize(canvasWidth, Math.max(MIN_PX, px));
      if (template) setTemplate(null);
    }
  };

  const handlePresetChange = (presetId: string) => {
    const paper = PAPER_SIZES.find((p) => p.id === presetId);
    if (!paper) return;

    const dpi = dpiVal;
    let targetW = (paper.widthMM * dpi) / 25.4;
    let targetH = (paper.heightMM * dpi) / 25.4;

    const isCurrentLandscape = canvasWidth > canvasHeight;
    if (isCurrentLandscape) {
      const temp = targetW;
      targetW = targetH;
      targetH = temp;
    }

    const finalW = Math.round(targetW);
    const finalH = Math.round(targetH);

    setCanvasSize(finalW, finalH);

    if (template) {
      setTemplate({
        ...template,
        width: finalW,
        height: finalH,
        dpi,
      });
    }

    if (unit === "px") {
      setWidthVal(finalW.toString());
      setHeightVal(finalH.toString());
    } else {
      if (isCurrentLandscape) {
        setWidthVal(paper.heightMM.toString());
        setHeightVal(paper.widthMM.toString());
      } else {
        setWidthVal(paper.widthMM.toString());
        setHeightVal(paper.heightMM.toString());
      }
    }
  };

  const handleSwapDimensions = () => {
    setCanvasSize(canvasHeight, canvasWidth);
    if (template) setTemplate(null);

    const temp = widthVal;
    setWidthVal(heightVal);
    setHeightVal(temp);
  };

  const activePreset = PAPER_SIZES.find((p) => {
    const dpi = dpiVal;
    return (
      (Math.round((canvasWidth / dpi) * 25.4) === p.widthMM && Math.round((canvasHeight / dpi) * 25.4) === p.heightMM) ||
      (Math.round((canvasWidth / dpi) * 25.4) === p.heightMM && Math.round((canvasHeight / dpi) * 25.4) === p.widthMM)
    );
  });
  const activePresetId = activePreset ? activePreset.id : "custom";

  return (
    <FluentSection
      icon={<RefreshCw className="w-3.5 h-3.5 text-primary" />}
      title="مساحة العمل"
      action={
        <span className="text-[9.5px] text-muted-foreground font-mono bg-muted/40 border border-border/40 px-2 py-0.5 rounded-md font-bold" dir="ltr">
          {canvasWidth} × {canvasHeight} px
        </span>
      }
    >
      <div className="space-y-3 animate-in fade-in duration-200">
        <FluentSegmentedControl<"px" | "mm">
          value={unit}
          onChange={setUnit}
          size="sm"
          options={[
            { id: "px", label: "بكسل" },
            { id: "mm", label: "ملم" },
          ]}
        />

        {/* بطاقات مقاسات الورق الأنيقة والرشيقة */}
        <div className="grid grid-cols-2 gap-1.5" dir="rtl">
          {/* A4 Button */}
          <button
            type="button"
            onClick={() => handlePresetChange("a4")}
            className={cn(
              "relative flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer h-12 bg-card select-none hover:border-primary/45 active:scale-[0.98] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              activePresetId === "a4"
                ? "border-2 border-primary bg-primary/15 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                : "border-border/60 hover:bg-muted/30 text-foreground"
            )}
          >
            <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-muted/40 border border-border/40">
              <PresetMiniature id="a4" active={activePresetId === "a4"} />
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[11px] font-bold leading-tight">ورقة A4</span>
              <span className="text-[8.5px] text-muted-foreground font-mono leading-none mt-0.5" dir="ltr">210 × 297 mm</span>
            </div>
            {activePresetId === "a4" && <Check className="w-3.5 h-3.5 text-primary shrink-0 stroke-[2.5]" />}
          </button>

          {/* 4x6 Photo Button (10x15 cm) */}
          <button
            type="button"
            onClick={() => handlePresetChange("4x6")}
            className={cn(
              "relative flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer h-12 bg-card select-none hover:border-primary/45 active:scale-[0.98] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              activePresetId === "4x6"
                ? "border-2 border-primary bg-primary/15 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                : "border-border/60 hover:bg-muted/30 text-foreground"
            )}
          >
            <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-muted/40 border border-border/40">
              <PresetMiniature id="4x6" active={activePresetId === "4x6"} />
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[11px] font-bold leading-tight">4×6 (10×15)</span>
              <span className="text-[8.5px] text-muted-foreground font-mono leading-none mt-0.5" dir="ltr">100 × 150 mm</span>
            </div>
            {activePresetId === "4x6" && <Check className="w-3.5 h-3.5 text-primary shrink-0 stroke-[2.5]" />}
          </button>

          {/* A5 Button */}
          <button
            type="button"
            onClick={() => handlePresetChange("a5")}
            className={cn(
              "relative flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer h-12 bg-card select-none hover:border-primary/45 active:scale-[0.98] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              activePresetId === "a5"
                ? "border-2 border-primary bg-primary/15 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                : "border-border/60 hover:bg-muted/30 text-foreground"
            )}
          >
            <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-muted/40 border border-border/40">
              <PresetMiniature id="a5" active={activePresetId === "a5"} />
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[11px] font-bold leading-tight">ورقة A5</span>
              <span className="text-[8.5px] text-muted-foreground font-mono leading-none mt-0.5" dir="ltr">148 × 210 mm</span>
            </div>
            {activePresetId === "a5" && <Check className="w-3.5 h-3.5 text-primary shrink-0 stroke-[2.5]" />}
          </button>

          {/* Dropdown for other sizes */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative flex items-center justify-between gap-1.5 p-2 rounded-xl border text-right transition-all cursor-pointer h-12 bg-card select-none hover:border-primary/45 active:scale-[0.98] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                  !["a4", "4x6", "a5"].includes(activePresetId)
                    ? "border-2 border-primary bg-primary/15 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                    : "border-border/60 text-foreground hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-muted/40 border border-border/40">
                    <PresetMiniature id={activePresetId} active={!["a4", "4x6", "a5"].includes(activePresetId)} />
                  </div>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-[11px] font-bold leading-tight truncate">
                      {activePresetId === "custom"
                        ? "مقاس مخصص"
                        : PAPER_SIZES.find((p) => p.id === activePresetId)?.name.split(" (")[0] || "مقاسات أخرى"}
                    </span>
                    <span className="text-[8.5px] text-muted-foreground leading-none mt-0.5">
                      {activePresetId === "custom" ? "يدوي" : "A3, 5×7, ..."}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 font-cairo rounded-xl border fluent-specular bg-popover/95 backdrop-blur-xl" align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (template) setTemplate(null);
                }}
                className="text-xs text-right justify-end font-bold cursor-pointer rounded-md"
              >
                مقاس مخصص يدوي
              </DropdownMenuItem>
              {PAPER_SIZES.map((p) => {
                const nameParts = p.name.split(" (");
                const mainName = nameParts[0].replace(" بوصة", "″");
                const label = `${mainName} (${unit === "px" ? `${Math.round((p.widthMM * dpiVal) / 25.4)}×${Math.round((p.heightMM * dpiVal) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
                return (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className="text-xs text-right justify-end cursor-pointer rounded-md flex items-center justify-between"
                  >
                    <span>{label}</span>
                    {activePresetId === p.id && <Check className="w-3.5 h-3.5 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* حقول الأبعاد الموزعة بنمط Figma الراقي */}
        <div className="flex items-center gap-1.5" dir="rtl">
          {/* العرض W */}
          <div className="flex-1 flex items-center bg-background/70 border border-border/80 hover:border-primary/45 rounded-lg px-2 h-8 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 focus-within:ring-offset-background shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground/70 select-none w-3 text-center">W</span>
            <input
              type="number"
              value={widthVal}
              onChange={(e) => handleWidthChange(e.target.value)}
              onBlur={handleWidthCommit}
              onKeyDown={(e) => e.key === "Enter" && handleWidthCommit()}
              className="w-full bg-transparent border-0 p-0 text-center text-xs font-mono focus:ring-0 focus:outline-hidden text-foreground font-bold"
            />
            <span className="text-[9px] text-muted-foreground/60 select-none font-mono">{unit}</span>
          </div>

          {/* زر تبديل الاتجاه والتدوير */}
          <button
            type="button"
            onClick={handleSwapDimensions}
            title="تبديل الاتجاه (أفقي/عمودي)"
            className="w-8 h-8 rounded-lg bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/70 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          {/* الارتفاع H */}
          <div className="flex-1 flex items-center bg-background/70 border border-border/80 hover:border-primary/45 rounded-lg px-2 h-8 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 focus-within:ring-offset-background shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground/70 select-none w-3 text-center">H</span>
            <input
              type="number"
              value={heightVal}
              onChange={(e) => handleHeightChange(e.target.value)}
              onBlur={handleHeightCommit}
              onKeyDown={(e) => e.key === "Enter" && handleHeightCommit()}
              className="w-full bg-transparent border-0 p-0 text-center text-xs font-mono focus:ring-0 focus:outline-hidden text-foreground font-bold"
            />
            <span className="text-[9px] text-muted-foreground/60 select-none font-mono">{unit}</span>
          </div>
        </div>
      </div>
    </FluentSection>
  );
});
