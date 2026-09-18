import React, { useState, useEffect } from "react";
import { CaretDown, Check, Crop, FileText, ArrowsLeftRight, ArrowsClockwise } from "@phosphor-icons/react";
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
    rulerUnit,
    setRulerUnit,
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
    rulerUnit: state.rulerUnit,
    setRulerUnit: state.setRulerUnit,
  })));

  const activeUnit = rulerUnit === "px" ? "px" : "mm";
  const [widthVal, setWidthVal] = useState(canvasWidth.toString());
  const [heightVal, setHeightVal] = useState(canvasHeight.toString());

  const currentDpi = template?.dpi || printSettings?.dpi || 300;

  useEffect(() => {
    const nextWidthVal =
      activeUnit === "px"
        ? canvasWidth.toString()
        : Number(((canvasWidth / currentDpi) * 25.4).toFixed(1)).toString();
    const nextHeightVal =
      activeUnit === "px"
        ? canvasHeight.toString()
        : Number(((canvasHeight / currentDpi) * 25.4).toFixed(1)).toString();

    const rafId = requestAnimationFrame(() => {
      setWidthVal(nextWidthVal);
      setHeightVal(nextHeightVal);
    });

    return () => cancelAnimationFrame(rafId);
  }, [canvasWidth, canvasHeight, activeUnit, currentDpi]);

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
        activeUnit === "px"
          ? canvasWidth.toString()
          : Number(((canvasWidth / currentDpi) * 25.4).toFixed(1)).toString()
      );
      return;
    }
    if (activeUnit === "px") {
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
        activeUnit === "px"
          ? canvasHeight.toString()
          : Number(((canvasHeight / currentDpi) * 25.4).toFixed(1)).toString()
      );
      return;
    }
    if (activeUnit === "px") {
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
          className="text-micro font-mono font-bold text-foreground/80 bg-muted/60 dark:bg-muted/40 border border-border/50 px-2 py-0.5 rounded-md shrink-0 select-none shadow-2xs" 
          dir="ltr"
        >
          {activeUnit === "px" 
            ? `${canvasWidth} × ${canvasHeight}` 
            : `${Number(((canvasWidth / currentDpi) * 25.4).toFixed(1))} × ${Number(((canvasHeight / currentDpi) * 25.4).toFixed(1))} mm`}
        </span>
      }
    >
      <div className="space-y-2.5 animate-in fade-in duration-200 font-cairo">
        {/* سطر اختيار القالب الجاهز + تبديل الوحدة */}
        <div className="flex items-center gap-1.5 w-full min-w-0" dir="rtl">
          {/* القائمة المنسدلة للمقاسات الجاهزة */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex-1 min-w-0 flex items-center justify-between gap-1.5 px-2.5 h-8 rounded-md bg-input/60 hover:bg-input border border-border hover:border-primary/50 text-foreground text-xs font-semibold transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none overflow-hidden"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" weight="duotone" />
                  <span className="truncate text-xs font-semibold">
                    {activePreset ? activePreset.name.split(" (")[0] : "مقاس مخصص"}
                  </span>
                </div>
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
                const label = `${mainName} (${activeUnit === "px" ? `${Math.round((p.widthMM * currentDpi) / 25.4)}×${Math.round((p.heightMM * currentDpi) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
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
                const label = `${p.name} (${activeUnit === "px" ? `${Math.round((p.widthMM * currentDpi) / 25.4)}×${Math.round((p.heightMM * currentDpi) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
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
                const label = `${p.name} (${activeUnit === "px" ? `${Math.round((p.widthMM * currentDpi) / 25.4)}×${Math.round((p.heightMM * currentDpi) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
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
          <div className="flex items-center bg-input/60 border border-border/80 rounded-md p-0.5 h-8 shrink-0 select-none shadow-2xs">
            <button
              type="button"
              onClick={() => setRulerUnit("px")}
              className={cn(
                "px-2.5 h-full rounded text-mini font-mono transition-all cursor-pointer flex items-center justify-center select-none",
                activeUnit === "px"
                  ? "bg-card text-primary font-semibold shadow-2xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground font-normal"
              )}
            >
              px
            </button>
            <button
              type="button"
              onClick={() => setRulerUnit("mm")}
              className={cn(
                "px-2.5 h-full rounded text-mini font-mono transition-all cursor-pointer flex items-center justify-center select-none",
                activeUnit === "mm"
                  ? "bg-card text-primary font-semibold shadow-2xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground font-normal"
              )}
            >
              mm
            </button>
          </div>
        </div>

        {/* سطر الأبعاد: العرض والارتفاع في بطاقة إحداثيات مدمجة مع زر التدوير */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5" dir="rtl">
          {/* حقل العرض W */}
          <div 
            className="flex items-center gap-1.5 bg-input/60 hover:bg-input border border-border/80 hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-md px-2 h-8 shadow-2xs transition-all"
            dir="ltr"
            title="العرض"
          >
            <span className="text-3xs font-bold text-muted-foreground/70 uppercase select-none shrink-0 font-mono">W</span>
            <input
              type="text"
              inputMode="decimal"
              aria-label="عرض مساحة العمل"
              value={widthVal}
              onChange={(e) => handleWidthChange(e.target.value)}
              onBlur={handleWidthCommit}
              onKeyDown={(e) => e.key === "Enter" && handleWidthCommit()}
              className="w-full bg-transparent border-0 p-0 text-left font-mono text-xs font-semibold text-foreground focus:ring-0 focus:outline-none select-all"
              dir="ltr"
            />
          </div>

          {/* زر تبديل الأبعاد السريع */}
          <button
            type="button"
            onClick={handleSwapDimensions}
            className="w-8 h-8 rounded-md border border-border/80 bg-input/40 hover:bg-primary/10 hover:text-primary hover:border-primary/40 text-muted-foreground flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0"
            title="تبديل العرض والارتفاع (تدوير الورقة)"
          >
            <ArrowsLeftRight className="w-3.5 h-3.5" weight="bold" />
          </button>

          {/* حقل الارتفاع H */}
          <div 
            className="flex items-center gap-1.5 bg-input/60 hover:bg-input border border-border/80 hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-md px-2 h-8 shadow-2xs transition-all"
            dir="ltr"
            title="الارتفاع"
          >
            <span className="text-3xs font-bold text-muted-foreground/70 uppercase select-none shrink-0 font-mono">H</span>
            <input
              type="text"
              inputMode="decimal"
              aria-label="ارتفاع مساحة العمل"
              value={heightVal}
              onChange={(e) => handleHeightChange(e.target.value)}
              onBlur={handleHeightCommit}
              onKeyDown={(e) => e.key === "Enter" && handleHeightCommit()}
              className="w-full bg-transparent border-0 p-0 text-left font-mono text-xs font-semibold text-foreground focus:ring-0 focus:outline-none select-all"
              dir="ltr"
            />
          </div>
        </div>

        {/* محدد الاتجاه: عمودي / أفقي */}
        <div className="flex items-center justify-between bg-input/40 border border-border/80 rounded-md px-2.5 h-8 select-none" dir="rtl">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/85">
            <ArrowsClockwise className="w-3.5 h-3.5 text-primary" weight="duotone" />
            <span>الاتجاه</span>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border/40">
            <button
              type="button"
              onClick={() => {
                if (canvasWidth > canvasHeight) {
                  handleSwapDimensions();
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-6 text-mini font-sans rounded transition-all cursor-pointer select-none",
                canvasWidth <= canvasHeight
                  ? "bg-card text-foreground font-semibold shadow-2xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground font-normal"
              )}
              title="اتجاه رأسي (عمودي)"
            >
              <div className={cn(
                "w-2.5 h-3.5 rounded-[2px] border-[1.5px] transition-colors shrink-0",
                canvasWidth <= canvasHeight ? "border-primary bg-primary/25" : "border-muted-foreground/60"
              )} />
              <span className="font-sans">عمودي</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (canvasWidth < canvasHeight) {
                  handleSwapDimensions();
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-6 text-mini font-sans rounded transition-all cursor-pointer select-none",
                canvasWidth > canvasHeight
                  ? "bg-card text-foreground font-semibold shadow-2xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground font-normal"
              )}
              title="اتجاه أفقي"
            >
              <div className={cn(
                "w-3.5 h-2.5 rounded-[2px] border-[1.5px] transition-colors shrink-0",
                canvasWidth > canvasHeight ? "border-primary bg-primary/25" : "border-muted-foreground/60"
              )} />
              <span className="font-sans">أفقي</span>
            </button>
          </div>
        </div>
      </div>
    </FluentSection>
  );
});
