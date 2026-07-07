import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, Grid3x3 } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { PAPER_SIZES } from "@/lib/templates";
import { cn } from "@/lib/utils";

import { useShallow } from "zustand/react/shallow";

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
    gridType,
    setGridType,
    snapToGrid,
    setSnapToGrid,
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
    gridType: state.gridType,
    setGridType: state.setGridType,
    snapToGrid: state.snapToGrid,
    setSnapToGrid: state.setSnapToGrid,
  })));

  const [unit, setUnit] = useState<"px" | "mm">("px");
  const [widthVal, setWidthVal] = useState(canvasWidth.toString());
  const [heightVal, setHeightVal] = useState(canvasHeight.toString());
  const [dpiVal, setDpiVal] = useState(template?.dpi || printSettings.dpi || 300);

  const [prevSyncKey, setPrevSyncKey] = useState({ canvasWidth, canvasHeight, unit, templateId: template?.id, dpi: printSettings.dpi });

  const currentDpi = template?.dpi || printSettings.dpi || 300;

  if (canvasWidth !== prevSyncKey.canvasWidth ||
      canvasHeight !== prevSyncKey.canvasHeight ||
      unit !== prevSyncKey.unit ||
      template?.id !== prevSyncKey.templateId ||
      printSettings.dpi !== prevSyncKey.dpi) {
      
      setPrevSyncKey({ canvasWidth, canvasHeight, unit, templateId: template?.id, dpi: printSettings.dpi });
      if (unit === "px") {
        setWidthVal(canvasWidth.toString());
        setHeightVal(canvasHeight.toString());
      } else {
        setWidthVal(Math.round((canvasWidth / currentDpi) * 25.4).toString());
        setHeightVal(Math.round((canvasHeight / currentDpi) * 25.4).toString());
      }
      setDpiVal(currentDpi);
  }

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

  return (
    <div className="space-y-3">
      {/* أبعاد الكانفس */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground/90">أبعاد مساحة العمل</Label>
          
          {/* وحدة القياس */}
          <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border/30">
            <button
              onClick={() => setUnit("px")}
              className={cn(
                "px-2 py-0.5 text-[9.5px] font-bold rounded-md transition-all cursor-pointer",
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
                "px-2 py-0.5 text-[9.5px] font-bold rounded-md transition-all cursor-pointer",
                unit === "mm"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ملم
            </button>
          </div>
        </div>

        {/* اختيار حجم قياسي جاهز */}
        <div className="space-y-1.5">
          <Label className="text-[9.5px] text-muted-foreground/80 font-bold">أحجام قياسية جاهزة</Label>
          <div className="grid grid-cols-3 gap-1">
            {PAPER_SIZES.map((p) => {
              const dpi = dpiVal;
              const isMatch = 
                (Math.round((canvasWidth / dpi) * 25.4) === p.widthMM && Math.round((canvasHeight / dpi) * 25.4) === p.heightMM) ||
                (Math.round((canvasWidth / dpi) * 25.4) === p.heightMM && Math.round((canvasHeight / dpi) * 25.4) === p.widthMM);
                
              const nameParts = p.name.split(" (");
              const mainName = nameParts[0];
              const isLandscape = p.widthMM > p.heightMM;

              // تنظيف الاسم من الكلمات الطويلة واستخدام رمز البوصة الاحترافي للاختصار
              const cleanName = mainName.replace(" بوصة", "″");

              // حساب البكسل المقابل ديناميكياً للبطاقة الجاهزة
              const wPx = Math.round((p.widthMM * dpiVal) / 25.4);
              const hPx = Math.round((p.heightMM * dpiVal) / 25.4);

              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={cn(
                    "flex flex-col items-center justify-center text-center gap-1 p-1 rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 min-w-0",
                    isMatch
                      ? "border-primary bg-primary/10 text-primary shadow-2xs font-bold"
                      : "border-border/60 bg-card hover:border-primary/30 hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                  )}
                  title={p.name}
                  dir="rtl"
                >
                  {/* أيقونة مصغرة للورقة توضح المقاس والاتجاه بصرياً */}
                  <div className={cn(
                    "shrink-0 rounded-xs border flex items-center justify-center bg-muted/15 shadow-2xs mb-0.5",
                    isMatch ? "border-primary/60 bg-primary/5 text-primary" : "border-muted-foreground/20 text-muted-foreground",
                    isLandscape ? "w-5.5 h-4" : "w-4 h-5.5"
                  )} />
                  
                  <span className="text-[9.5px] font-bold leading-none text-foreground truncate w-full">{cleanName}</span>
                  <span className="text-[7.5px] font-mono text-muted-foreground mt-0.5 truncate w-full">
                    {unit === "px" ? `${wPx}×${hPx}` : `${p.widthMM}×${p.heightMM}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* حقول الأبعاد المدمجة أفقياً بأسلوب البرامج الاحترافية مع زر التبديل */}
        <div className="flex items-end gap-1.5 text-xs">
          <div className="flex-1 space-y-1">
            <Label className="text-[9.5px] text-muted-foreground/80 font-bold pr-0.5">العرض</Label>
            <div className="flex items-center gap-1 bg-background border border-border/60 hover:border-primary/40 focus-within:border-primary rounded-lg px-2 h-8.5 transition-all shadow-2xs" dir="ltr">
              <input
                type="number"
                value={widthVal}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                min={1}
              />
              <span className="text-[9px] text-muted-foreground/60 select-none shrink-0 font-bold">{unit === "px" ? "px" : "mm"}</span>
            </div>
          </div>

          {/* زر تبديل الاتجاه في المنتصف عمودياً */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwapDimensions}
            className="h-8.5 w-8.5 shrink-0 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer transition-colors shadow-2xs border border-border/40"
            title="تبديل الاتجاه (أفقي/عمودي)"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>

          <div className="flex-1 space-y-1">
            <Label className="text-[9.5px] text-muted-foreground/80 font-bold pr-0.5">الارتفاع</Label>
            <div className="flex items-center gap-1 bg-background border border-border/60 hover:border-primary/40 focus-within:border-primary rounded-lg px-2 h-8.5 transition-all shadow-2xs" dir="ltr">
              <input
                type="number"
                value={heightVal}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                min={1}
              />
              <span className="text-[9px] text-muted-foreground/60 select-none shrink-0 font-bold">{unit === "px" ? "px" : "mm"}</span>
            </div>
          </div>
        </div>

        {/* إذا كانت الوحدة بالملم، يظهر خيار الدقة DPI المنسق */}
        {unit === "mm" && (
          <div className="space-y-1">
            <Label className="text-[9.5px] text-muted-foreground/80 font-bold">دقة الطباعة (DPI)</Label>
            <select
              value={dpiVal}
              onChange={(e) => handleDpiChange(Number(e.target.value))}
              className="w-full bg-background border border-border/60 rounded-md p-1 px-1.5 text-[10.5px] text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
            >
              <option value={150}>150 DPI (منخفض)</option>
              <option value={200}>200 DPI (متوسط)</option>
              <option value={300}>300 DPI (عالي - موصى به)</option>
              <option value={600}>600 DPI (فائق الدقة)</option>
            </select>
          </div>
        )}

        {/* عرض تفاصيل القياس الحالي بشكل مدمج للغاية */}
        <div className="flex items-center justify-between bg-muted/30 dark:bg-muted/10 px-2.5 py-1.5 rounded-lg border border-border/20 text-[9px] text-muted-foreground font-mono leading-none">
          <span className="font-sans font-semibold">المساحة الفعلية:</span>
          <span>
            {canvasWidth}×{canvasHeight}px ({Math.round((canvasWidth / dpiVal) * 25.4)}×{Math.round((canvasHeight / dpiVal) * 25.4)}مم) @ {dpiVal}DPI
          </span>
        </div>

        {/* قسم إعدادات شبكة الإرشاد (فقط في وضع التعديل الحر) */}
        {mode === "single" && (
          <div className="space-y-2.5 bg-muted/20 dark:bg-muted/5 p-2.5 rounded-xl border border-border/20">
            <div className="flex items-center justify-between pb-1 border-b border-border/10">
              <Label className="text-[10px] font-bold text-foreground/90 flex items-center gap-1">
                <Grid3x3 className="w-3 h-3 text-primary" /> شبكة الإرشاد والمحاذاة
              </Label>
            </div>

            {/* تفعيل الشبكة والمحاذاة بشكل خطي مضغوط */}
            <div className="flex items-center gap-4 px-1 py-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-[9.5px] font-bold text-muted-foreground select-none hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-3.2 h-3.2 cursor-pointer"
                />
                <span>إظهار الشبكة</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[9.5px] font-bold text-muted-foreground select-none hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-3.2 h-3.2 cursor-pointer"
                />
                <span>محاذاة مغناطيسية</span>
              </label>
            </div>

            {showGrid && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                {/* حجم الشبكة */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
                    <span>حجم المربعات</span>
                    <span className="font-mono bg-muted px-1 py-0.5 rounded-xs text-[9px]">{gridSize} بكسل</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={gridSize}
                      onChange={(e) => setGridSize(Number(e.target.value))}
                      className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* نوع الشبكة ولونها */}
                <div className="grid grid-cols-2 gap-2">
                  {/* نوع الشبكة */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-muted-foreground font-semibold">نمط الرسم</span>
                    <select
                      value={gridType}
                      onChange={(e) => setGridType(e.target.value as any)}
                      className="w-full bg-background border border-border/60 rounded-md p-1 text-[9px] text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
                    >
                      <option value="lines">خطوط متصلة</option>
                      <option value="dots">نقاط إرشادية</option>
                    </select>
                  </div>

                  {/* لون الشبكة */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-muted-foreground font-semibold">اللون</span>
                    <select
                      value={gridColor}
                      onChange={(e) => setGridColor(e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-md p-1 text-[9px] text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer font-mono"
                    >
                      <option value="rgba(0, 0, 0, 0.08)">رمادي خفيف</option>
                      <option value="rgba(0, 0, 0, 0.16)">رمادي متوسط</option>
                      <option value="rgba(59, 130, 246, 0.25)">أزرق خفيف</option>
                      <option value="rgba(236, 72, 153, 0.25)">زهري خفيف</option>
                    </select>
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
