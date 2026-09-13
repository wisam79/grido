import React, { useState, useEffect } from "react";
import { CaretDown, Check, Crop } from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { PAPER_SIZES, CARD_AND_LABEL_SIZES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
    setShowBleedGuides,
    setBleedMarginMM,
    setCutShapeType,
  } = useEditorStore(useShallow((state) => ({
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    setCanvasSize: state.setCanvasSize,
    template: state.template,
    setTemplate: state.setTemplate,
    printSettings: state.printSettings,
    setShowBleedGuides: state.setShowBleedGuides,
    setBleedMarginMM: state.setBleedMarginMM,
    setCutShapeType: state.setCutShapeType,
  })));

  const [unit, setUnit] = useState<"px" | "mm">("px");
  const [widthVal, setWidthVal] = useState(canvasWidth.toString());
  const [heightVal, setHeightVal] = useState(canvasHeight.toString());

  const currentDpi = template?.dpi || printSettings?.dpi || 300;

  useEffect(() => {
    const nextWidthVal =
      unit === "px"
        ? canvasWidth.toString()
        : Number(((canvasWidth / currentDpi) * 25.4).toFixed(1)).toString();
    const nextHeightVal =
      unit === "px"
        ? canvasHeight.toString()
        : Number(((canvasHeight / currentDpi) * 25.4).toFixed(1)).toString();

    const rafId = requestAnimationFrame(() => {
      setWidthVal(nextWidthVal);
      setHeightVal(nextHeightVal);
    });

    return () => cancelAnimationFrame(rafId);
  }, [canvasWidth, canvasHeight, unit, currentDpi]);

  const MIN_PX = 10;
  const MAX_PX = 20000;

  const handleWidthChange = (val: string) => {
    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setWidthVal(val);
    }
  };

  const handleWidthCommit = () => {
    const num = parseFloat(widthVal);
    if (isNaN(num) || num <= 0) {
      setWidthVal(
        unit === "px"
          ? canvasWidth.toString()
          : Number(((canvasWidth / currentDpi) * 25.4).toFixed(1)).toString()
      );
      return;
    }
    if (unit === "px") {
      const px = Math.max(MIN_PX, Math.min(MAX_PX, Math.round(num)));
      setWidthVal(px.toString());
      if (px !== canvasWidth) {
        setCanvasSize(px, canvasHeight);
        if (template) setTemplate(null);
      }
    } else {
      const mm = Math.min(Math.max(1, num), 3000);
      const px = Math.max(MIN_PX, Math.min(MAX_PX, Math.round((mm * currentDpi) / 25.4)));
      setWidthVal(num.toString());
      if (px !== canvasWidth) {
        setCanvasSize(px, canvasHeight);
        if (template) setTemplate(null);
      }
    }
  };

  const handleHeightChange = (val: string) => {
    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setHeightVal(val);
    }
  };

  const handleHeightCommit = () => {
    const num = parseFloat(heightVal);
    if (isNaN(num) || num <= 0) {
      setHeightVal(
        unit === "px"
          ? canvasHeight.toString()
          : Number(((canvasHeight / currentDpi) * 25.4).toFixed(1)).toString()
      );
      return;
    }
    if (unit === "px") {
      const px = Math.max(MIN_PX, Math.min(MAX_PX, Math.round(num)));
      setHeightVal(px.toString());
      if (px !== canvasHeight) {
        setCanvasSize(canvasWidth, px);
        if (template) setTemplate(null);
      }
    } else {
      const mm = Math.min(Math.max(1, num), 3000);
      const px = Math.max(MIN_PX, Math.min(MAX_PX, Math.round((mm * currentDpi) / 25.4)));
      setHeightVal(num.toString());
      if (px !== canvasHeight) {
        setCanvasSize(canvasWidth, px);
        if (template) setTemplate(null);
      }
    }
  };

  const handlePresetChange = (presetId: string) => {
    if (presetId === "custom") {
      if (template) setTemplate(null);
      return;
    }

    const cardOrLabel = CARD_AND_LABEL_SIZES.find((p) => p.id === presetId);
    if (cardOrLabel) {
      const dpi = currentDpi;
      let targetW = (cardOrLabel.widthMM * dpi) / 25.4;
      let targetH = (cardOrLabel.heightMM * dpi) / 25.4;

      const isCurrentLandscape = canvasWidth > canvasHeight;
      if (isCurrentLandscape && targetW < targetH) {
        const temp = targetW;
        targetW = targetH;
        targetH = temp;
      }

      const finalW = Math.round(targetW);
      const finalH = Math.round(targetH);

      setCanvasSize(finalW, finalH);
      setShowBleedGuides(true);
      setBleedMarginMM(cardOrLabel.defaultBleedMM || 2);
      setCutShapeType(cardOrLabel.shape || "rectangle");
      if (template) setTemplate(null);
      return;
    }

    const paper = PAPER_SIZES.find((p) => p.id === presetId);
    if (!paper) return;

    const dpi = currentDpi;
    let targetW = (paper.widthMM * dpi) / 25.4;
    let targetH = (paper.heightMM * dpi) / 25.4;

    const isCurrentLandscape = canvasWidth > canvasHeight;
    if (isCurrentLandscape && targetW < targetH) {
      const temp = targetW;
      targetW = targetH;
      targetH = temp;
    }

    const finalW = Math.round(targetW);
    const finalH = Math.round(targetH);

    setCanvasSize(finalW, finalH);
    setShowBleedGuides(false);

    if (template) {
      setTemplate({
        ...template,
        width: finalW,
        height: finalH,
        dpi,
      });
    }
  };

  const handleSwapDimensions = () => {
    setCanvasSize(canvasHeight, canvasWidth);
    if (template) {
      setTemplate({
        ...template,
        width: canvasHeight,
        height: canvasWidth,
      });
    }
  };

  const activePaperPreset = PAPER_SIZES.find((p) => {
    const dpi = currentDpi;
    const currentWMM = (canvasWidth / dpi) * 25.4;
    const currentHMM = (canvasHeight / dpi) * 25.4;
    return (
      (Math.abs(currentWMM - p.widthMM) <= 1.5 && Math.abs(currentHMM - p.heightMM) <= 1.5) ||
      (Math.abs(currentWMM - p.heightMM) <= 1.5 && Math.abs(currentHMM - p.widthMM) <= 1.5)
    );
  });

  const activeCardPreset = CARD_AND_LABEL_SIZES.find((p) => {
    const dpi = currentDpi;
    const currentWMM = (canvasWidth / dpi) * 25.4;
    const currentHMM = (canvasHeight / dpi) * 25.4;
    return (
      (Math.abs(currentWMM - p.widthMM) <= 1.5 && Math.abs(currentHMM - p.heightMM) <= 1.5) ||
      (Math.abs(currentWMM - p.heightMM) <= 1.5 && Math.abs(currentHMM - p.widthMM) <= 1.5)
    );
  });

  const activePreset = activeCardPreset || activePaperPreset;
  const activePresetId = activePreset ? activePreset.id : "custom";

  return (
    <FluentSection
      icon={<Crop className="w-3.5 h-3.5 text-primary" weight="duotone" />}
      title="مساحة العمل"
      collapsible
      defaultOpen={true}
      action={
        <span 
          className="text-[10px] text-muted-foreground font-mono bg-muted/60 border border-border/60 px-2 py-0.5 rounded-md font-bold shrink-0 select-none" 
          dir="ltr"
        >
          {unit === "px" 
            ? `${canvasWidth} × ${canvasHeight}` 
            : `${Number(((canvasWidth / currentDpi) * 25.4).toFixed(1))} × ${Number(((canvasHeight / currentDpi) * 25.4).toFixed(1))} mm`}
        </span>
      }
    >
      <div className="space-y-2.5 animate-in fade-in duration-200">
        {/* سطر اختيار القالب الجاهز + تبديل الوحدة */}
        <div className="flex items-center gap-1.5 w-full min-w-0" dir="rtl">
          {/* القائمة المنسدلة للمقاسات الجاهزة */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex-1 min-w-0 flex items-center justify-between gap-1.5 px-2.5 h-8 rounded-md bg-input border border-border hover:border-primary/50 text-foreground text-xs font-semibold transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none overflow-hidden"
              >
                <span className="truncate text-right">
                  {activePreset ? activePreset.name.split(" (")[0] : "مقاس مخصص"}
                </span>
                <CaretDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 font-cairo rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-fluent-8 max-h-[380px] overflow-y-auto" align="start">
              <DropdownMenuItem
                onClick={() => {
                  if (template) setTemplate(null);
                }}
                className="text-xs text-right justify-between font-bold cursor-pointer rounded-md"
              >
                <span>مقاس مخصص يدوي</span>
                {activePresetId === "custom" && <Check className="w-3.5 h-3.5 text-primary" weight="bold" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>أوراق الطباعة القياسية</DropdownMenuLabel>
              {PAPER_SIZES.map((p) => {
                const nameParts = p.name.split(" (");
                const mainName = nameParts[0].replace(" بوصة", "″");
                const label = `${mainName} (${unit === "px" ? `${Math.round((p.widthMM * currentDpi) / 25.4)}×${Math.round((p.heightMM * currentDpi) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
                return (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className="text-xs text-right justify-between cursor-pointer rounded-md flex items-center"
                  >
                    <span>{label}</span>
                    {activePresetId === p.id && <Check className="w-3.5 h-3.5 text-primary" weight="bold" />}
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>كروت وبطاقات العمل</DropdownMenuLabel>
              {CARD_AND_LABEL_SIZES.filter((p) => p.category === "card").map((p) => {
                const label = `${p.name} (${unit === "px" ? `${Math.round((p.widthMM * currentDpi) / 25.4)}×${Math.round((p.heightMM * currentDpi) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
                return (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className="text-xs text-right justify-between cursor-pointer rounded-md flex items-center"
                  >
                    <span>{label}</span>
                    {activePresetId === p.id && <Check className="w-3.5 h-3.5 text-primary" weight="bold" />}
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>ملصقات دائرية وتجارية</DropdownMenuLabel>
              {CARD_AND_LABEL_SIZES.filter((p) => p.category !== "card").map((p) => {
                const label = `${p.name} (${unit === "px" ? `${Math.round((p.widthMM * currentDpi) / 25.4)}×${Math.round((p.heightMM * currentDpi) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
                return (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className="text-xs text-right justify-between cursor-pointer rounded-md flex items-center"
                  >
                    <span>{label}</span>
                    {activePresetId === p.id && <Check className="w-3.5 h-3.5 text-primary" weight="bold" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* تبديل الوحدة بكسل / ملم */}
          <div className="flex bg-input border border-border rounded-md p-0.5 h-8 shrink-0 select-none">
            <button
              type="button"
              onClick={() => setUnit("px")}
              className={cn(
                "px-2.5 h-full rounded text-xs font-bold transition-all cursor-pointer",
                unit === "px" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              px
            </button>
            <button
              type="button"
              onClick={() => setUnit("mm")}
              className={cn(
                "px-2.5 h-full rounded text-xs font-bold transition-all cursor-pointer",
                unit === "mm" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              mm
            </button>
          </div>
        </div>

        {/* سطر الأبعاد: العرض والارتفاع كأعمدة مستقلة واضحة بدون تداخل أو خروج عن الحدود */}
        <div className="grid grid-cols-2 gap-2" dir="rtl">
          {/* حقل العرض */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground px-0.5 select-none">
              <span>العرض</span>
              <span className="font-mono text-[10px] text-muted-foreground/70">{unit}</span>
            </div>
            <div 
              className="flex items-center bg-input border border-border hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-md px-2.5 h-8 shadow-2xs transition-all"
              dir="ltr"
            >
              <input
                type="text"
                inputMode="decimal"
                aria-label="عرض مساحة العمل"
                value={widthVal}
                onChange={(e) => handleWidthChange(e.target.value)}
                onBlur={handleWidthCommit}
                onKeyDown={(e) => e.key === "Enter" && handleWidthCommit()}
                className="w-full bg-transparent border-0 p-0 text-center font-mono text-xs font-bold text-foreground focus:ring-0 focus:outline-none select-all"
              />
            </div>
          </div>

          {/* حقل الارتفاع */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground px-0.5 select-none">
              <span>الارتفاع</span>
              <span className="font-mono text-[10px] text-muted-foreground/70">{unit}</span>
            </div>
            <div 
              className="flex items-center bg-input border border-border hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-md px-2.5 h-8 shadow-2xs transition-all"
              dir="ltr"
            >
              <input
                type="text"
                inputMode="decimal"
                aria-label="ارتفاع مساحة العمل"
                value={heightVal}
                onChange={(e) => handleHeightChange(e.target.value)}
                onBlur={handleHeightCommit}
                onKeyDown={(e) => e.key === "Enter" && handleHeightCommit()}
                className="w-full bg-transparent border-0 p-0 text-center font-mono text-xs font-bold text-foreground focus:ring-0 focus:outline-none select-all"
              />
            </div>
          </div>
        </div>

        {/* محدد الاتجاه: عمودي / أفقي */}
        <div className="flex items-center justify-between bg-input/40 border border-border rounded-md px-2.5 h-8 select-none" dir="rtl">
          <span className="text-[11px] font-bold text-muted-foreground">الاتجاه</span>
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded">
            <button
              type="button"
              onClick={() => {
                if (canvasWidth > canvasHeight) {
                  handleSwapDimensions();
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-6 text-[11px] font-bold rounded transition-all cursor-pointer",
                canvasWidth <= canvasHeight
                  ? "bg-card text-primary shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="اتجاه رأسي (عمودي)"
            >
              <span className="w-2.5 h-3.5 border-[1.5px] border-current rounded-xs inline-block shrink-0" />
              <span>عمودي</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (canvasWidth < canvasHeight) {
                  handleSwapDimensions();
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-6 text-[11px] font-bold rounded transition-all cursor-pointer",
                canvasWidth > canvasHeight
                  ? "bg-card text-primary shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="اتجاه أفقي"
            >
              <span className="w-3.5 h-2.5 border-[1.5px] border-current rounded-xs inline-block shrink-0" />
              <span>أفقي</span>
            </button>
          </div>
        </div>
      </div>
    </FluentSection>
  );
});
