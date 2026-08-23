import React, { useState, useEffect } from "react";
import { ArrowLeftRight, ChevronDown, Check, Maximize2 } from "lucide-react";
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
import { FluentSection } from "@/components/ui/blocks";

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
      icon={<Maximize2 className="w-3.5 h-3.5 text-primary" />}
      title="مساحة العمل"
      collapsible
      defaultOpen={true}
      action={
        <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 border border-border/60 px-2 py-0.5 rounded-md font-bold" dir="ltr">
          {canvasWidth} × {canvasHeight}
        </span>
      }
    >
      <div className="space-y-2.5 animate-in fade-in duration-200">
        {/* سطر اختيار القالب الجاهز + تبديل الوحدة */}
        <div className="flex items-center gap-1.5" dir="rtl">
          {/* القائمة المنسدلة للمقاسات الجاهزة */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex-1 flex items-center justify-between gap-2 px-2.5 h-8 rounded-md bg-input border border-border hover:border-primary/50 text-foreground text-xs font-semibold transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <span className="truncate">
                  {activePreset ? activePreset.name.split(" (")[0] : "مقاس مخصص"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 font-cairo rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-fluent-8" align="start">
              <DropdownMenuItem
                onClick={() => {
                  if (template) setTemplate(null);
                }}
                className="text-xs text-right justify-between font-bold cursor-pointer rounded-md"
              >
                <span>مقاس مخصص يدوي</span>
                {activePresetId === "custom" && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
              {PAPER_SIZES.map((p) => {
                const nameParts = p.name.split(" (");
                const mainName = nameParts[0].replace(" بوصة", "″");
                const label = `${mainName} (${unit === "px" ? `${Math.round((p.widthMM * dpiVal) / 25.4)}×${Math.round((p.heightMM * dpiVal) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
                return (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className="text-xs text-right justify-between cursor-pointer rounded-md flex items-center"
                  >
                    <span>{label}</span>
                    {activePresetId === p.id && <Check className="w-3.5 h-3.5 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* تبديل الوحدة بكسل / ملم */}
          <div className="flex bg-input border border-border rounded-md p-0.5 h-8 shrink-0">
            <button
              type="button"
              onClick={() => setUnit("px")}
              className={cn(
                "px-2.5 h-full rounded text-[11px] font-bold transition-all cursor-pointer select-none",
                unit === "px" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              px
            </button>
            <button
              type="button"
              onClick={() => setUnit("mm")}
              className={cn(
                "px-2.5 h-full rounded text-[11px] font-bold transition-all cursor-pointer select-none",
                unit === "mm" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              mm
            </button>
          </div>
        </div>

        {/* سطر الأبعاد W و H وزر التبديل (نمط Figma النظيف) */}
        <div className="flex items-center gap-1.5" dir="rtl">
          {/* العرض W */}
          <div className="flex-1 flex items-center bg-input border border-border hover:border-primary/45 rounded-md px-2 h-8 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 focus-within:ring-offset-background shadow-inner">
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
            aria-label="تبديل الاتجاه (أفقي/عمودي)"
            className="w-8 h-8 rounded-md bg-input hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          {/* الارتفاع H */}
          <div className="flex-1 flex items-center bg-input border border-border hover:border-primary/45 rounded-md px-2 h-8 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 focus-within:ring-offset-background shadow-inner">
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
