import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
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

  const MIN_PX = 1;
  const MAX_PX = 20000;

  // أثناء الكتابة نحدّث الحقل المحلي فقط — الالتزام الفعلي عند blur/Enter
  const handleWidthChange = (val: string) => {
    setWidthVal(val);
  };

  const handleWidthCommit = () => {
    const num = parseFloat(widthVal);
    if (isNaN(num) || num <= 0) {
      // إعادة العرض الصحيح دون تغيير المقاس
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

  const handleDpiChange = (newDpi: number) => {
    setDpiVal(newDpi);
    setPrintSettings({ dpi: newDpi });
    if (unit === "mm") {
      // احسب من مقادير الـ store الحقيقية لا من الحقول الجزئية حتى لا تُفقد الأبعاد أثناء الكتابة
      const wMM = (canvasWidth / currentDpi) * 25.4;
      const hMM = (canvasHeight / currentDpi) * 25.4;
      if (wMM > 0 && hMM > 0) {
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
    // setCanvasSize يزامن أبعاد الورقة والاتجاه من نسبة الكانفاس الجديدة تلقائياً
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
    <div className="space-y-3.5 bg-card border border-border/80 dark:border-white/10 p-3.5 rounded-xl shadow-xs font-cairo fluent-specular">
      {/* هيدر ثابت بدون تقليص */}
      <div className="flex items-center justify-between border-b border-border/25 pb-2.5">
        <Label className="text-xs font-extrabold text-foreground flex items-center gap-2 select-none">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <RefreshCw className="w-3.5 h-3.5" />
          </div>
          <span>مساحة العمل</span>
        </Label>
        <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 border border-border/20 px-2 py-0.5 rounded-md font-bold tracking-tight" dir="ltr">
          {canvasWidth} × {canvasHeight} px
        </span>
      </div>

      <div className="space-y-3 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div className="flex rounded-lg bg-muted/60 dark:bg-muted/30 p-0.5 border border-border/40 w-full gap-0.5">
            <button
              type="button"
              onClick={() => setUnit("px")}
              className={cn(
                "flex-1 h-7 text-[11px] font-bold rounded-md transition-all cursor-pointer text-center flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                unit === "px"
                  ? "bg-card text-foreground shadow-2xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              بكسل
            </button>
            <button
              type="button"
              onClick={() => setUnit("mm")}
              className={cn(
                "flex-1 h-7 text-[11px] font-bold rounded-md transition-all cursor-pointer text-center flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                unit === "mm"
                  ? "bg-card text-foreground shadow-2xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ملم
            </button>
          </div>
        </div>

        {/* الحجم القياسي (Visual Grid Cards) */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-2 text-xs" dir="rtl">
            {/* A4 Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("a4")}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                activePresetId === "a4"
                  ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                  : "border-border/60 hover:bg-muted/20 text-foreground"
              )}
            >
              <PresetMiniature id="a4" active={activePresetId === "a4"} />
              <span className="text-[11px] font-bold">A4</span>
              <span className="text-[8.5px] text-muted-foreground/80 font-mono font-medium" dir="ltr">210 × 297 mm</span>
            </button>

            {/* 4x6 Photo Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("4x6")}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                activePresetId === "4x6"
                  ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                  : "border-border/60 hover:bg-muted/20 text-foreground"
              )}
            >
              <PresetMiniature id="4x6" active={activePresetId === "4x6"} />
              <span className="text-[11px] font-bold">4×6 بوصة</span>
              <span className="text-[8.5px] text-muted-foreground/80 font-mono font-medium" dir="ltr">10 × 15 cm</span>
            </button>

            {/* A5 Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("a5")}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                activePresetId === "a5"
                  ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                  : "border-border/60 hover:bg-muted/20 text-foreground"
              )}
            >
              <PresetMiniature id="a5" active={activePresetId === "a5"} />
              <span className="text-[11px] font-bold">A5</span>
              <span className="text-[8.5px] text-muted-foreground/80 font-mono font-medium" dir="ltr">148 × 210 mm</span>
            </button>

            {/* A3 Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("a3")}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                activePresetId === "a3"
                  ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                  : "border-border/60 hover:bg-muted/20 text-foreground"
              )}
            >
              <PresetMiniature id="a3" active={activePresetId === "a3"} />
              <span className="text-[11px] font-bold">A3</span>
              <span className="text-[8.5px] text-muted-foreground/80 font-mono font-medium" dir="ltr">297 × 420 mm</span>
            </button>

            {/* 5x7 Photo Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("5x7")}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                activePresetId === "5x7"
                  ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                  : "border-border/60 hover:bg-muted/20 text-foreground"
              )}
            >
              <PresetMiniature id="5x7" active={activePresetId === "5x7"} />
              <span className="text-[11px] font-bold">5×7 بوصة</span>
              <span className="text-[8.5px] text-muted-foreground/80 font-mono font-medium" dir="ltr">12 × 17 cm</span>
            </button>

            {/* Dropdown for other sizes */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-16 bg-card select-none hover:border-primary/45 active:scale-[0.97] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    ["a4", "4x6", "a5", "a3", "5x7"].includes(activePresetId)
                      ? "border-border/60 text-foreground hover:bg-muted/20"
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
                          <span className="text-[8.5px] text-muted-foreground/80 font-medium">مقاسات أخرى</span>
                        </>
                      );
                    }
                    if (activePresetId === "custom") {
                      return (
                        <>
                          <span className="text-[11px] font-bold">مخصص</span>
                          <span className="text-[8.5px] text-primary/80 font-medium">مخصص</span>
                        </>
                      );
                    }
                    const activePaper = PAPER_SIZES.find((p) => p.id === activePresetId);
                    return (
                      <>
                        <span className="text-[11px] font-bold truncate max-w-[80px]">{activePaper?.name.split(" (")[0]}</span>
                        <span className="text-[8.5px] text-primary/80 font-medium">قياسي</span>
                      </>
                    );
                  })()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 font-cairo rounded-xl border fluent-specular bg-popover/95 backdrop-blur-xl" align="end">
                <DropdownMenuItem
                  onClick={() => {
                    if (template) setTemplate(null);
                  }}
                  className="text-xs text-right justify-end font-bold cursor-pointer rounded-md"
                >
                  مقاس مخصص
                </DropdownMenuItem>
                {PAPER_SIZES.map((p) => {
                  const nameParts = p.name.split(" (");
                  const mainName = nameParts[0].replace(" بوصة", "″");
                  const label = `${mainName} (${unit === "px" ? `${Math.round((p.widthMM * dpiVal) / 25.4)}×${Math.round((p.heightMM * dpiVal) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
                  return (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => handlePresetChange(p.id)}
                      className="text-xs text-right justify-end cursor-pointer rounded-md"
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
          <div className="flex-1 flex items-center bg-background/60 border border-border/80 hover:border-primary/45 rounded-md px-2.5 h-8 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground/60 select-none w-4 text-center">W</span>
            <input
              type="number"
              value={widthVal}
              onChange={(e) => handleWidthChange(e.target.value)}
              onBlur={handleWidthCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-full bg-transparent border-0 p-0 text-xs font-bold font-mono focus:ring-0 focus:outline-hidden text-center text-foreground"
              min={1}
            />
            <span className="text-[9px] text-muted-foreground/60 select-none font-bold pr-1">{unit === "px" ? "px" : "mm"}</span>
          </div>

          {/* زر التبديل العائم */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapDimensions}
            className="h-8 w-8 rounded-md border border-border/80 bg-background/60 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-muted-foreground transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            title="تبديل الاتجاه (أفقي/عمودي)"
          >
            <RefreshCw className="w-3.5 h-3.5 transition-transform duration-300 active:rotate-180" />
          </Button>

          {/* الارتفاع */}
          <div className="flex-1 flex items-center bg-background/60 border border-border/80 hover:border-primary/45 rounded-md px-2.5 h-8 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground/60 select-none w-4 text-center">H</span>
            <input
              type="number"
              value={heightVal}
              onChange={(e) => handleHeightChange(e.target.value)}
              onBlur={handleHeightCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-full bg-transparent border-0 p-0 text-xs font-bold font-mono focus:ring-0 focus:outline-hidden text-center text-foreground"
              min={1}
            />
            <span className="text-[9px] text-muted-foreground/60 select-none font-bold pr-1">{unit === "px" ? "px" : "mm"}</span>
          </div>
        </div>

        {/* خيار الدقة DPI */}
        {unit === "mm" && (
          <div className="space-y-1.5 font-cairo">
            <Label className="text-[11px] text-muted-foreground/80 font-bold">دقة الطباعة (DPI)</Label>
            <Select
              value={String(dpiVal)}
              onValueChange={(val) => handleDpiChange(Number(val))}
            >
              <SelectTrigger className="w-full h-8 text-xs bg-background/60 border border-border/80 rounded-md focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-cairo rounded-xl border fluent-specular bg-popover/95 backdrop-blur-xl">
                <SelectItem value="150" className="rounded-md text-xs cursor-pointer">150 DPI (منخفض)</SelectItem>
                <SelectItem value="200" className="rounded-md text-xs cursor-pointer">200 DPI (متوسط)</SelectItem>
                <SelectItem value="300" className="rounded-md text-xs cursor-pointer">300 DPI (عالي - موصى به)</SelectItem>
                <SelectItem value="600" className="rounded-md text-xs cursor-pointer">600 DPI (فائق الدقة)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
});
