import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, Grid3x3, Monitor, FileText, Printer, Eye, EyeOff, Magnet, Columns, Palette } from "lucide-react";
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

import { useShallow } from "zustand/react/shallow";
import { Row } from "./shared-controls";

export function GeneralSettings() {
  const {
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    template,
    setTemplate,
    printSettings,
    setPrintSettings,
    mode,
    showGrid,
    setShowGrid,
    gridSize,
    setGridSize,
    gridColor,
    setGridColor,
    gridOpacity,
    setGridOpacity,
    gridSubdivisions,
    setGridSubdivisions,
    gridType,
    setGridType,
    snapToGrid,
    setSnapToGrid,
    showColumns,
    setShowColumns,
    columnsCount,
    setColumnsCount,
    columnsColor,
    setColumnsColor,
    columnsMargin,
    setColumnsMargin,
    columnsGutter,
    setColumnsGutter,
  } = useEditorStore(useShallow((state) => ({
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    setCanvasSize: state.setCanvasSize,
    template: state.template,
    setTemplate: state.setTemplate,
    printSettings: state.printSettings,
    setPrintSettings: state.setPrintSettings,
    mode: state.mode,
    showGrid: state.showGrid,
    setShowGrid: state.setShowGrid,
    gridSize: state.gridSize,
    setGridSize: state.setGridSize,
    gridColor: state.gridColor,
    setGridColor: state.setGridColor,
    gridOpacity: state.gridOpacity,
    setGridOpacity: state.setGridOpacity,
    gridSubdivisions: state.gridSubdivisions,
    setGridSubdivisions: state.setGridSubdivisions,
    gridType: state.gridType,
    setGridType: state.setGridType,
    snapToGrid: state.snapToGrid,
    setSnapToGrid: state.setSnapToGrid,
    showColumns: state.showColumns,
    setShowColumns: state.setShowColumns,
    columnsCount: state.columnsCount,
    setColumnsCount: state.setColumnsCount,
    columnsColor: state.columnsColor,
    setColumnsColor: state.setColumnsColor,
    columnsMargin: state.columnsMargin,
    setColumnsMargin: state.setColumnsMargin,
    columnsGutter: state.columnsGutter,
    setColumnsGutter: state.setColumnsGutter,
  })));

  const [unit, setUnit] = useState<"px" | "mm">("px");
  const [activeGridTab, setActiveGridTab] = useState<"grid" | "columns">("grid");
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
    <div className="space-y-4">
      {/* أبعاد مساحة العمل */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-foreground/90">أبعاد مساحة العمل</Label>
          
          {/* وحدة القياس */}
          <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border/30">
            <button
              onClick={() => setUnit("px")}
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
              onClick={() => setUnit("mm")}
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
          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* A4 Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("a4")}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-14 bg-card select-none hover:border-primary/45 active:scale-[0.97]",
                activePresetId === "a4"
                  ? "border-2 border-primary bg-primary/5 text-primary shadow-xs font-bold"
                  : "border-border hover:bg-muted/20 text-foreground"
              )}
            >
              <span className="text-[11.5px] font-bold">A4</span>
              <span className="text-[9px] text-muted-foreground/80 font-medium">٢١٠×٢٩٧ مم</span>
            </button>

            {/* 4x6 Photo Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("4x6")}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-14 bg-card select-none hover:border-primary/45 active:scale-[0.97]",
                activePresetId === "4x6"
                  ? "border-2 border-primary bg-primary/5 text-primary shadow-xs font-bold"
                  : "border-border hover:bg-muted/20 text-foreground"
              )}
            >
              <span className="text-[11.5px] font-bold">4×6 بوصة</span>
              <span className="text-[9px] text-muted-foreground/80 font-medium">١٠×١٥ سم</span>
            </button>

            {/* A5 Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("a5")}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-14 bg-card select-none hover:border-primary/45 active:scale-[0.97]",
                activePresetId === "a5"
                  ? "border-2 border-primary bg-primary/5 text-primary shadow-xs font-bold"
                  : "border-border hover:bg-muted/20 text-foreground"
              )}
            >
              <span className="text-[11.5px] font-bold">A5</span>
              <span className="text-[9px] text-muted-foreground/80 font-medium">١٤٨×٢١٠ مم</span>
            </button>

            {/* A3 Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("a3")}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-14 bg-card select-none hover:border-primary/45 active:scale-[0.97]",
                activePresetId === "a3"
                  ? "border-2 border-primary bg-primary/5 text-primary shadow-xs font-bold"
                  : "border-border hover:bg-muted/20 text-foreground"
              )}
            >
              <span className="text-[11.5px] font-bold">A3</span>
              <span className="text-[9px] text-muted-foreground/80 font-medium">٢٩٧×٤٢٠ مم</span>
            </button>

            {/* 5x7 Photo Button */}
            <button
              type="button"
              onClick={() => handlePresetChange("5x7")}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-14 bg-card select-none hover:border-primary/45 active:scale-[0.97]",
                activePresetId === "5x7"
                  ? "border-2 border-primary bg-primary/5 text-primary shadow-xs font-bold"
                  : "border-border hover:bg-muted/20 text-foreground"
              )}
            >
              <span className="text-[11.5px] font-bold">5×7 بوصة</span>
              <span className="text-[9px] text-muted-foreground/80 font-medium">١٢×١٧ سم</span>
            </button>

            {/* Dropdown for other sizes (styled as grid button card) */}
            <Select
              value={activePresetId}
              onValueChange={(val) => {
                if (val !== "custom") {
                  handlePresetChange(val);
                } else {
                  if (template) setTemplate(null);
                }
              }}
            >
              <SelectTrigger
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer h-14 bg-card hover:bg-muted/20 hover:border-primary/45 shadow-none focus:ring-0 focus:ring-offset-0 [&>span]:w-full [&>span]:flex [&>span]:flex-col [&>span]:items-center [&>span]:justify-center [&>svg]:hidden select-none active:scale-[0.97]",
                  ["a4", "4x6", "a5", "a3", "5x7"].includes(activePresetId)
                    ? "border-border text-foreground"
                    : "border-2 border-primary bg-primary/5 text-primary shadow-xs font-bold"
                )}
              >
                <SelectValue placeholder="أخرى...">
                  {(() => {
                    const isCommon = ["a4", "4x6", "a5", "a3", "5x7"].includes(activePresetId);
                    if (isCommon) {
                      return (
                        <>
                          <span className="text-[11.5px] font-bold">أخرى...</span>
                          <span className="text-[9px] text-muted-foreground/80 font-medium">باقي المقاسات</span>
                        </>
                      );
                    }
                    if (activePresetId === "custom") {
                      return (
                        <>
                          <span className="text-[11.5px] font-bold">مخصص 📐</span>
                          <span className="text-[9px] text-primary/80 font-medium">مقاس حر</span>
                        </>
                      );
                    }
                    const activePaper = PAPER_SIZES.find((p) => p.id === activePresetId);
                    return (
                      <>
                        <span className="text-[11.5px] font-bold truncate max-w-[80px]">{activePaper?.name.split(" (")[0]}</span>
                        <span className="text-[9px] text-primary/80 font-medium">مقاس قياسي</span>
                      </>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">📐 مقاس مخصص (Custom Size)</SelectItem>
                {PAPER_SIZES.map((p) => {
                  const nameParts = p.name.split(" (");
                  const mainName = nameParts[0].replace(" بوصة", "″");
                  const label = `${mainName} (${unit === "px" ? `${Math.round((p.widthMM * dpiVal) / 25.4)}×${Math.round((p.heightMM * dpiVal) / 25.4)} px` : `${p.widthMM}×${p.heightMM} مم`})`;
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* حقول الأبعاد الموزعة في بطاقة موحدة (Figma Style) لتبدو كأداة تصميم احترافية */}
        <div className="relative border border-border/60 bg-background hover:border-primary/45 rounded-xl overflow-hidden grid grid-cols-2 divide-x divide-x-reverse divide-border/60 shadow-2xs transition-all focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20">
          {/* العرض */}
          <div className="flex flex-col gap-0.5 px-4 py-2 hover:bg-muted/10 transition-colors">
            <span className="text-[10px] font-bold text-muted-foreground/60 select-none text-right">العرض</span>
            <div className="flex items-center gap-1.5" dir="ltr">
              <input
                type="number"
                value={widthVal}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-bold"
                min={1}
              />
              <span className="text-[10px] text-muted-foreground/45 select-none shrink-0 font-bold">{unit === "px" ? "px" : "mm"}</span>
            </div>
          </div>

          {/* الارتفاع */}
          <div className="flex flex-col gap-0.5 px-4 py-2 hover:bg-muted/10 transition-colors">
            <span className="text-[10px] font-bold text-muted-foreground/60 select-none text-right">الارتفاع</span>
            <div className="flex items-center gap-1.5" dir="ltr">
              <input
                type="number"
                value={heightVal}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-bold"
                min={1}
              />
              <span className="text-[10px] text-muted-foreground/45 select-none shrink-0 font-bold">{unit === "px" ? "px" : "mm"}</span>
            </div>
          </div>

          {/* زر التبديل العائم في المنتصف تماماً على الخط الفاصل */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwapDimensions}
              className="h-7 w-7 rounded-full border border-border/60 bg-background hover:bg-muted text-muted-foreground hover:text-primary transition-all shadow-xs cursor-pointer active:scale-90"
              title="تبديل الاتجاه (أفقي/عمودي)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
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

        {/* تفاصيل مساحة العمل (Metadata Rows) - تمثيل عمودي نظيف كالمحترفين */}
        <div className="space-y-1 rounded-xl border border-border/40 bg-muted/10 p-2.5 pt-2" dir="rtl">
          <Row label="الأبعاد الرقمية" value={`${canvasWidth} × ${canvasHeight} px`} />
          <Row label="الأبعاد الفعلية" value={`${Math.round((canvasWidth / dpiVal) * 25.4)} × ${Math.round((canvasHeight / dpiVal) * 25.4)} mm`} />
          <Row label="دقة الطباعة" value={`${dpiVal} DPI`} />
        </div>

        {/* قسم إعدادات شبكة ومخطط العمل (Figma-style Layout Grid Options) */}
        {mode === "single" && (
          <div className="space-y-3 bg-muted/20 dark:bg-muted/5 p-3 rounded-lg border border-border/10">
            {/* Title & Visibility Control Toggles */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5 select-none">
                <Grid3x3 className="w-4 h-4 text-primary" /> شبكة ومخطط العمل
              </Label>
            </div>
            
            <div className="flex items-center justify-between gap-2.5 pt-1.5">
              {/* Tab Switchers (Figma layout styling) - takes full width */}
              <div className="flex flex-1 bg-muted/40 p-0.5 rounded-lg border border-border/10">
                <button
                  onClick={() => setActiveGridTab("grid")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] font-bold",
                    activeGridTab === "grid" 
                      ? "bg-background text-primary shadow-xs border border-border/10" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                  <span>الشبكة</span>
                </button>
                <button
                  onClick={() => setActiveGridTab("columns")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] font-bold",
                    activeGridTab === "columns" 
                      ? "bg-background text-primary shadow-xs border border-border/10" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>الأعمدة</span>
                </button>
              </div>

              {/* Visibility buttons */}
              <div className="flex items-center gap-1">
                {activeGridTab === "grid" ? (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowGrid(!showGrid)}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-colors cursor-pointer bg-background border-border/60",
                        showGrid 
                          ? "bg-primary/10 text-primary border-primary/30" 
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title={showGrid ? "إخفاء الشبكة" : "إظهار الشبكة"}
                    >
                      {showGrid ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSnapToGrid(!snapToGrid)}
                      className={cn(
                        "h-8 w-8 rounded-lg transition-colors cursor-pointer bg-background border-border/60",
                        snapToGrid 
                          ? "bg-primary/10 text-primary border-primary/30" 
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title="محاذاة مغناطيسية للشبكة"
                    >
                      <Magnet className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowColumns(!showColumns)}
                    className={cn(
                      "h-8 w-8 rounded-lg transition-colors cursor-pointer bg-background border-border/60",
                      showColumns 
                        ? "bg-primary/10 text-primary border-primary/30" 
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    title={showColumns ? "إخفاء الأعمدة" : "إظهار الأعمدة"}
                  >
                    {showColumns ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Grid Configuration Content */}
            {activeGridTab === "grid" && showGrid && (
              <div className="space-y-3 pt-3 border-t border-border/10 animate-in fade-in duration-200">
                {/* Size and subdivisions row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">حجم المربع</span>
                    <div className="flex items-center gap-1 bg-background border border-border/60 rounded-md px-2 h-9 shadow-xs">
                      <input
                        type="number"
                        min={5}
                        max={200}
                        value={gridSize}
                        onChange={(e) => setGridSize(Math.max(5, Number(e.target.value)))}
                        className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-center text-foreground font-semibold"
                      />
                      <span className="text-[9px] text-muted-foreground/60 font-bold select-none shrink-0">px</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">التقسيم الرئيسي</span>
                    <Select
                      value={String(gridSubdivisions)}
                      onValueChange={(val) => setGridSubdivisions(Number(val))}
                    >
                      <SelectTrigger className="w-full h-9 text-xs bg-background border border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">تعطيل</SelectItem>
                        <SelectItem value="2">كل 2 مربعات</SelectItem>
                        <SelectItem value="5">كل 5 مربعات</SelectItem>
                        <SelectItem value="10">كل 10 مربعات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Grid Type & Drawing Pattern */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">نمط الرسم</span>
                  <div className="grid grid-cols-2 gap-1 bg-muted/30 p-0.5 rounded-md border border-border/10">
                    <button
                      onClick={() => setGridType("lines")}
                      className={cn(
                        "py-1.5 text-xs font-bold rounded-sm transition-all cursor-pointer",
                        gridType === "lines" 
                          ? "bg-background text-primary shadow-2xs" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      خطوط متصلة
                    </button>
                    <button
                      onClick={() => setGridType("dots")}
                      className={cn(
                        "py-1.5 text-xs font-bold rounded-sm transition-all cursor-pointer",
                        gridType === "dots" 
                          ? "bg-background text-primary shadow-2xs" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      نقاط إرشادية
                    </button>
                  </div>
                </div>

                {/* Color presets and opacity slider row */}
                <div className="space-y-2 pt-2 border-t border-border/10">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> لون الشبكة وشفافيتها</span>
                    <span className="font-mono text-xs">{Math.round(gridOpacity * 100)}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    {/* Circle Color pickers */}
                    <div className="flex items-center gap-1.5">
                      {[
                        { hex: "#000000", title: "أسود" },
                        { hex: "#3B82F6", title: "أزرق" },
                        { hex: "#EC4899", title: "زهري" },
                        { hex: "#10B981", title: "أخضر" },
                        { hex: "#F59E0B", title: "برتقالي" }
                      ].map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => setGridColor(c.hex)}
                          className={cn(
                            "w-4.5 h-4.5 rounded-full border border-black/10 transition-all cursor-pointer relative",
                            gridColor === c.hex 
                              ? "ring-2 ring-primary ring-offset-1 scale-110" 
                              : "hover:scale-105"
                          )}
                          style={{ backgroundColor: c.hex }}
                          title={c.title}
                        />
                      ))}
                    </div>

                    {/* Opacity slider */}
                    <input
                      type="range"
                      min={0.05}
                      max={0.8}
                      step={0.05}
                      value={gridOpacity}
                      onChange={(e) => setGridOpacity(Number(e.target.value))}
                      className="w-24 accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Layout Columns Configuration Content */}
            {activeGridTab === "columns" && showColumns && (
              <div className="space-y-3 pt-3 border-t border-border/10 animate-in fade-in duration-200">
                {/* Column settings parameters */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">الأعمدة</span>
                    <div className="flex items-center bg-background border border-border/60 rounded-md px-1.5 h-9 shadow-xs">
                      <input
                        type="number"
                        min={2}
                        max={32}
                        value={columnsCount}
                        onChange={(e) => setColumnsCount(Math.max(2, Math.min(32, Number(e.target.value))))}
                        className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-center text-foreground font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">الهامش</span>
                    <div className="flex items-center gap-0.5 bg-background border border-border/60 rounded-md px-1.5 h-9 shadow-xs">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={columnsMargin}
                        onChange={(e) => setColumnsMargin(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-center text-foreground font-semibold"
                      />
                      <span className="text-[8.5px] text-muted-foreground/60 font-bold select-none shrink-0">px</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">المسافة</span>
                    <div className="flex items-center gap-0.5 bg-background border border-border/60 rounded-md px-1.5 h-9 shadow-xs">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={columnsGutter}
                        onChange={(e) => setColumnsGutter(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-center text-foreground font-semibold"
                      />
                      <span className="text-[8.5px] text-muted-foreground/60 font-bold select-none shrink-0">px</span>
                    </div>
                  </div>
                </div>

                {/* Column color preset picker circles */}
                <div className="space-y-1.5 pt-1.5 border-t border-border/10">
                  <span className="text-[10px] text-muted-foreground font-semibold block mb-1">لون الأعمدة ومخطط التخطيط</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { hex: "rgba(239, 68, 68, 0.08)", label: "أحمر خفيف" },
                      { hex: "rgba(59, 130, 246, 0.08)", label: "أزرق خفيف" },
                      { hex: "rgba(16, 185, 129, 0.08)", label: "أخضر خفيف" },
                      { hex: "rgba(139, 92, 246, 0.08)", label: "بنفسجي خفيف" },
                      { hex: "rgba(0, 0, 0, 0.08)", label: "رمادي خفيف" }
                    ].map((colorObj) => (
                      <button
                        key={colorObj.hex}
                        onClick={() => setColumnsColor(colorObj.hex)}
                        className={cn(
                          "w-5 h-5 rounded-md border border-black/10 transition-all cursor-pointer relative",
                          columnsColor === colorObj.hex 
                            ? "ring-2 ring-primary ring-offset-1 scale-110" 
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: colorObj.hex.replace("0.08", "0.25") }} // render slightly darker circle for pick preview
                        title={colorObj.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
