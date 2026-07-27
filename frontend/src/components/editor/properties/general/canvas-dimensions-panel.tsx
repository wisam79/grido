import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronDown } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { PAPER_SIZES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useShallow } from "zustand/react/shallow";
import { PresetMiniature } from "./preset-miniature";

export const CanvasDimensionsPanel = React.memo(function CanvasDimensionsPanel() {
  const {
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    template,
    setTemplate,
    printSettings,
    setPrintSettings,
  } = useEditorStore(useShallow((state) => ({
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    setCanvasSize: state.setCanvasSize,
    template: state.template,
    setTemplate: state.setTemplate,
    printSettings: state.printSettings,
    setPrintSettings: state.setPrintSettings,
  })));

  const [unit, setUnit] = useState<"px" | "mm">("px");
  const [dimensionsExpanded, setDimensionsExpanded] = useState(true);
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

  const handleWidthChange = (val: string) => {
    setWidthVal(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      if (unit === "px") {
        setCanvasSize(Math.round(num), canvasHeight);
        if (template) setTemplate(null);
      } else {
        const px = Math.round((num * dpiVal) / 25.4);
        setCanvasSize(px, canvasHeight);
        if (template) setTemplate(null);
      }
    }
  };

  const handleHeightChange = (val: string) => {
    setHeightVal(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      if (unit === "px") {
        setCanvasSize(canvasWidth, Math.round(num));
        if (template) setTemplate(null);
      } else {
        const px = Math.round((num * dpiVal) / 25.4);
        setCanvasSize(canvasWidth, px);
        if (template) setTemplate(null);
      }
    }
  };

  const handleDpiChange = (newDpi: number) => {
    setDpiVal(newDpi);
    setPrintSettings({ dpi: newDpi });
    if (unit === "mm") {
      const wMM = parseFloat(widthVal);
      const hMM = parseFloat(heightVal);
      if (!isNaN(wMM) && !isNaN(hMM)) {
        const wPx = Math.round((wMM * newDpi) / 25.4);
        const hPx = Math.round((hMM * newDpi) / 25.4);
        setCanvasSize(wPx, hPx);
      }
    }
  };

  const handlePresetChange = (presetId: string) => {
    const paper = PAPER_SIZES.find((p) => p.id === presetId);
    if (paper) {
      const dpi = dpiVal;
      const wPx = Math.round((paper.widthMM * dpi) / 25.4);
      const hPx = Math.round((paper.heightMM * dpi) / 25.4);

      setCanvasSize(wPx, hPx);
      if (template) setTemplate(null);

      if (unit === "px") {
        setWidthVal(wPx.toString());
        setHeightVal(hPx.toString());
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
    <div className="space-y-3 border border-border/40 rounded-xl bg-card/30 p-3">
      <button
        type="button"
        onClick={() => setDimensionsExpanded(!dimensionsExpanded)}
        className="flex items-center justify-between w-full text-right cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200 text-muted-foreground", !dimensionsExpanded && "-rotate-90")} />
          <Label className="text-sm font-bold text-foreground/90 cursor-pointer">أبعاد مساحة العمل</Label>
        </div>
        {!dimensionsExpanded && (
          <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded-md font-bold" dir="ltr">
            {canvasWidth}×{canvasHeight}px
          </span>
        )}
      </button>

      {dimensionsExpanded && (
        <div className="space-y-3 pt-2 border-t border-border/10 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">وحدة القياس</span>

            <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border/30">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setUnit("px"); }}
                className={cn(
                  "px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer",
                  unit === "px"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                بكسل
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setUnit("mm"); }}
                className={cn(
                  "px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer",
                  unit === "mm"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ملم
              </button>
            </div>
          </div>

          {/* الحجم القياسي (Visual Grid Cards) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground/80 font-bold pr-0.5">الحجم القياسي</Label>
            <div className="grid grid-cols-3 gap-2 text-xs" dir="rtl">
              {/* A4 Button */}
              <button
                type="button"
                onClick={() => handlePresetChange("a4")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full",
                  activePresetId === "a4"
                    ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                    : "border-border hover:bg-muted/20 text-foreground"
                )}
              >
                <PresetMiniature id="a4" active={activePresetId === "a4"} />
                <span className="text-[11px] font-bold">A4</span>
                <span className="text-[8.5px] text-muted-foreground/80 font-medium">٢١٠×٢٩٧ مم</span>
              </button>

              {/* 4x6 Photo Button */}
              <button
                type="button"
                onClick={() => handlePresetChange("4x6")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full",
                  activePresetId === "4x6"
                    ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                    : "border-border hover:bg-muted/20 text-foreground"
                )}
              >
                <PresetMiniature id="4x6" active={activePresetId === "4x6"} />
                <span className="text-[11px] font-bold">4×6 بوصة</span>
                <span className="text-[8.5px] text-muted-foreground/80 font-medium">١٠×١٥ سم</span>
              </button>

              {/* A5 Button */}
              <button
                type="button"
                onClick={() => handlePresetChange("a5")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full",
                  activePresetId === "a5"
                    ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                    : "border-border hover:bg-muted/20 text-foreground"
                )}
              >
                <PresetMiniature id="a5" active={activePresetId === "a5"} />
                <span className="text-[11px] font-bold">A5</span>
                <span className="text-[8.5px] text-muted-foreground/80 font-medium">١٤٨×٢١٠ مم</span>
              </button>

              {/* A3 Button */}
              <button
                type="button"
                onClick={() => handlePresetChange("a3")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full",
                  activePresetId === "a3"
                    ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                    : "border-border hover:bg-muted/20 text-foreground"
                )}
              >
                <PresetMiniature id="a3" active={activePresetId === "a3"} />
                <span className="text-[11px] font-bold">A3</span>
                <span className="text-[8.5px] text-muted-foreground/80 font-medium">٢٩٧×٤٢٠ مم</span>
              </button>

              {/* 5x7 Photo Button */}
              <button
                type="button"
                onClick={() => handlePresetChange("5x7")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full",
                  activePresetId === "5x7"
                    ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                    : "border-border hover:bg-muted/20 text-foreground"
                )}
              >
                <PresetMiniature id="5x7" active={activePresetId === "5x7"} />
                <span className="text-[11px] font-bold">5×7 بوصة</span>
                <span className="text-[8.5px] text-muted-foreground/80 font-medium">١٢×١٧ سم</span>
              </button>

              {/* Dropdown for other sizes */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full",
                      ["a4", "4x6", "a5", "a3", "5x7"].includes(activePresetId)
                        ? "border-border text-foreground hover:bg-muted/20"
                        : "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                    )}
                  >
                    <PresetMiniature id={activePresetId} active={!["a4", "4x6", "a5", "a3", "5x7"].includes(activePresetId)} />
                    {(() => {
                      const isCommon = ["a4", "4x6", "a5", "a3", "5x7"].includes(activePresetId);
                      if (isCommon) {
                        return (
                          <>
                            <span className="text-[11px] font-bold">أخرى...</span>
                            <span className="text-[8.5px] text-muted-foreground/80 font-medium">باقي المقاسات</span>
                          </>
                        );
                      }
                      if (activePresetId === "custom") {
                        return (
                          <>
                            <span className="text-[11px] font-bold">مخصص 📐</span>
                            <span className="text-[8.5px] text-primary/80 font-medium">مقاس حر</span>
                          </>
                        );
                      }
                      const activePaper = PAPER_SIZES.find((p) => p.id === activePresetId);
                      return (
                        <>
                          <span className="text-[11px] font-bold truncate max-w-[80px]">{activePaper?.name.split(" (")[0]}</span>
                          <span className="text-[8.5px] text-primary/80 font-medium">مقاس قياسي</span>
                        </>
                      );
                    })()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (template) setTemplate(null);
                    }}
                    className="text-xs text-right justify-end font-bold cursor-pointer"
                  >
                    📐 مقاس مخصص (Custom Size)
                  </DropdownMenuItem>
                  {PAPER_SIZES.map((p) => {
                    const nameParts = p.name.split(" (");
                    const mainName = nameParts[0].replace(" بوصة", "″");
                    const label = `${mainName} (${unit === "px" ? `${Math.round((p.widthMM * dpiVal) / 25.4)}×${Math.round((p.heightMM * dpiVal) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
                    return (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => handlePresetChange(p.id)}
                        className="text-xs text-right justify-end cursor-pointer"
                      >
                        {label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* حقول الأبعاد الموزعة بنمط Figma */}
          <div className="flex items-center gap-2" dir="rtl">
            {/* العرض */}
            <div className="flex-1 flex items-center bg-background border border-border/60 hover:border-primary/45 rounded-xl px-2.5 h-10 transition-all focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 shadow-2xs">
              <span className="text-[10px] font-black text-muted-foreground/45 select-none w-4 text-center">W</span>
              <input
                type="number"
                value={widthVal}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-sm font-bold font-mono focus:ring-0 focus:outline-hidden text-center text-foreground"
                min={1}
              />
              <span className="text-[9px] text-muted-foreground/45 select-none font-bold pr-1">{unit === "px" ? "px" : "mm"}</span>
            </div>

            {/* زر التبديل العائم */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwapDimensions}
              className="h-10 w-10 rounded-xl border border-border/60 bg-background hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-muted-foreground transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
              title="تبديل الاتجاه (أفقي/عمودي)"
            >
              <RefreshCw className="w-3.5 h-3.5 transition-transform duration-300 active:rotate-180" />
            </Button>

            {/* الارتفاع */}
            <div className="flex-1 flex items-center bg-background border border-border/60 hover:border-primary/45 rounded-xl px-2.5 h-10 transition-all focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 shadow-2xs">
              <span className="text-[10px] font-black text-muted-foreground/45 select-none w-4 text-center">H</span>
              <input
                type="number"
                value={heightVal}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-sm font-bold font-mono focus:ring-0 focus:outline-hidden text-center text-foreground"
                min={1}
              />
              <span className="text-[9px] text-muted-foreground/45 select-none font-bold pr-1">{unit === "px" ? "px" : "mm"}</span>
            </div>
          </div>

          {/* خيار الدقة DPI */}
          {unit === "mm" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground/80 font-bold">دقة الطباعة (DPI)</Label>
              <Select
                value={String(dpiVal)}
                onValueChange={(val) => handleDpiChange(Number(val))}
              >
                <SelectTrigger className="w-full h-10 text-xs bg-background border border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="150">150 DPI (منخفض)</SelectItem>
                  <SelectItem value="200">200 DPI (متوسط)</SelectItem>
                  <SelectItem value="300">300 DPI (عالي - موصى به)</SelectItem>
                  <SelectItem value="600">600 DPI (فائق الدقة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
