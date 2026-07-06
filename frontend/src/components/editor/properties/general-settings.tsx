import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
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
    <div className="space-y-4">
      {/* أبعاد الكانفس */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground/90">أبعاد مساحة العمل</Label>
          
          {/* وحدة القياس */}
          <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border/30">
            <button
              onClick={() => setUnit("px")}
              className={cn(
                "px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer",
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
                "px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer",
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground font-semibold">أحجام قياسية جاهزة</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwapDimensions}
              className="h-6 px-2 text-[10px] flex items-center gap-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors rounded-md cursor-pointer"
              title="تبديل العرض والارتفاع (أفقي/عمودي)"
            >
              <RefreshCw className="w-3 h-3" />
              <span>تبديل الاتجاه</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {PAPER_SIZES.map((p) => {
              const dpi = dpiVal;
              const isMatch = 
                (Math.round((canvasWidth / dpi) * 25.4) === p.widthMM && Math.round((canvasHeight / dpi) * 25.4) === p.heightMM) ||
                (Math.round((canvasWidth / dpi) * 25.4) === p.heightMM && Math.round((canvasHeight / dpi) * 25.4) === p.widthMM);
                
              const nameParts = p.name.split(" (");
              const mainName = nameParts[0];
              const isLandscape = p.widthMM > p.heightMM;

              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={cn(
                    "flex flex-row items-center gap-2 p-2 rounded-xl border text-right transition-all duration-200 cursor-pointer active:scale-95",
                    isMatch
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold"
                      : "border-border/60 bg-card hover:border-primary/30 hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                  )}
                  title={p.name}
                >
                  {/* أيقونة مصغرة للورقة توضح المقاس والاتجاه */}
                  <div className={cn(
                    "shrink-0 rounded-xs border flex items-center justify-center bg-muted/20",
                    isMatch ? "border-primary/70 bg-primary/5" : "border-muted-foreground/30",
                    isLandscape ? "w-6 h-4" : "w-4 h-6"
                  )}>
                    <span className="text-[7px] font-mono opacity-65 scale-80">{mainName}</span>
                  </div>
                  
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold leading-tight truncate">{mainName}</span>
                    <span className="text-[8px] font-medium opacity-70 mt-0.5 truncate font-mono">
                      {p.widthMM}×{p.heightMM} مم
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* حقول الأبعاد المدمجة بأسلوب Figma */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground font-bold block pr-0.5">العرض</Label>
            <div className="flex items-center gap-1.5 bg-background border border-border/60 hover:border-primary/40 focus-within:border-primary rounded-lg px-2.5 h-9 transition-all shadow-xs" dir="ltr">
              <input
                type="number"
                value={widthVal}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                min={1}
              />
              <span className="text-[10px] text-muted-foreground/60 select-none shrink-0 font-bold">{unit === "px" ? "px" : "mm"}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground font-bold block pr-0.5">الارتفاع</Label>
            <div className="flex items-center gap-1.5 bg-background border border-border/60 hover:border-primary/40 focus-within:border-primary rounded-lg px-2.5 h-9 transition-all shadow-xs" dir="ltr">
              <input
                type="number"
                value={heightVal}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                min={1}
              />
              <span className="text-[10px] text-muted-foreground/60 select-none shrink-0 font-bold">{unit === "px" ? "px" : "mm"}</span>
            </div>
          </div>
        </div>

        {/* إذا كانت الوحدة بالملم، يظهر خيار الدقة DPI المنسق */}
        {unit === "mm" && (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground font-semibold">دقة الطباعة (DPI)</Label>
            <select
              value={dpiVal}
              onChange={(e) => handleDpiChange(Number(e.target.value))}
              className="w-full bg-background border border-border/60 rounded-md p-1.5 text-xs text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
            >
              <option value={150}>150 DPI (منخفض)</option>
              <option value={200}>200 DPI (متوسط)</option>
              <option value={300}>300 DPI (عالي - موصى به)</option>
              <option value={600}>600 DPI (فائق الدقة)</option>
            </select>
          </div>
        )}

        {/* عرض القيمة المكافئة للوحدة الأخرى */}
        <div className="text-[10px] text-muted-foreground/80 bg-muted/30 dark:bg-muted/10 p-2 rounded border border-border/20 flex justify-between items-center">
          <span>الحجم الحالي:</span>
          <span className="font-mono text-foreground/90">
            {unit === "px" ? (
              <>
                {Math.round((canvasWidth / dpiVal) * 25.4)} × {Math.round((canvasHeight / dpiVal) * 25.4)} مم
                <span className="text-[9px] text-muted-foreground/60 mr-1">({dpiVal} DPI)</span>
              </>
            ) : (
              <>{canvasWidth} × {canvasHeight} بكسل</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
