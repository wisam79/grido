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
          <Label className="text-[10px] text-muted-foreground font-semibold">أحجام قياسية جاهزة</Label>
          <div className="grid grid-cols-2 gap-2">
            {PAPER_SIZES.map((p) => {
              const dpi = dpiVal;
              const isMatch = 
                (Math.round((canvasWidth / dpi) * 25.4) === p.widthMM && Math.round((canvasHeight / dpi) * 25.4) === p.heightMM) ||
                (Math.round((canvasWidth / dpi) * 25.4) === p.heightMM && Math.round((canvasHeight / dpi) * 25.4) === p.widthMM);
                
              const nameParts = p.name.split(" (");
              const mainName = nameParts[0];
              const isLandscape = p.widthMM > p.heightMM;

              // حساب البكسل المقابل ديناميكياً للبطاقة الجاهزة
              const wPx = Math.round((p.widthMM * dpiVal) / 25.4);
              const hPx = Math.round((p.heightMM * dpiVal) / 25.4);

              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={cn(
                    "flex flex-row items-center gap-2.5 p-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95",
                    isMatch
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold"
                      : "border-border/60 bg-card hover:border-primary/30 hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                  )}
                  title={p.name}
                  dir="rtl"
                >
                  {/* أيقونة مصغرة للورقة توضح المقاس والاتجاه بصرياً فقط بدون أي نصوص داخلها لتجنب تشوه المظهر */}
                  <div className={cn(
                    "shrink-0 rounded-xs border flex items-center justify-center bg-muted/20 shadow-2xs",
                    isMatch ? "border-primary/70 bg-primary/10 text-primary" : "border-muted-foreground/30 text-muted-foreground",
                    isLandscape ? "w-7 h-5" : "w-5 h-7"
                  )} />
                  
                  <div className="flex flex-col min-w-0 items-start text-right">
                    <span className="text-[11px] font-bold leading-tight text-foreground truncate">{mainName}</span>
                    <span className="text-[8.5px] font-medium opacity-80 mt-0.5 truncate font-mono text-muted-foreground">
                      {unit === "px" ? `${wPx}×${hPx} بكسل` : `${p.widthMM}×${p.heightMM} مم`}
                    </span>
                    <span className="text-[7.5px] font-mono text-muted-foreground/50 truncate leading-none mt-0.5">
                      {unit === "px" ? `${p.widthMM}×${p.heightMM} مم` : `${wPx}×${hPx} px`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* حقول الأبعاد المدمجة أفقياً بأسلوب البرامج الاحترافية مع زر التبديل */}
        <div className="flex items-end gap-2 text-xs">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-muted-foreground font-bold pr-0.5">العرض</Label>
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

          {/* زر تبديل الاتجاه في المنتصف عمودياً */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwapDimensions}
            className="h-9 w-9 shrink-0 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer transition-colors shadow-xs border border-border/40"
            title="تبديل الاتجاه (أفقي/عمودي)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-muted-foreground font-bold pr-0.5">الارتفاع</Label>
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

        {/* عرض تفاصيل القياس الحالي بجودة عالية ودقة تامة */}
        <div className="space-y-1.5 bg-muted/40 dark:bg-muted/15 p-3 rounded-xl border border-border/30">
          <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
            <span>مساحة العمل الحالية</span>
            <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-[9px] font-bold">{dpiVal} DPI</span>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/20 pt-2 text-xs">
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground/80 leading-none">الحجم الرقمي</span>
              <span className="font-mono font-bold text-foreground mt-1.5">{canvasWidth} × {canvasHeight} px</span>
            </div>
            <div className="flex flex-col border-r border-border/20 pr-2">
              <span className="text-[9px] text-muted-foreground/80 leading-none">حجم الطباعة الفعلي</span>
              <span className="font-mono font-bold text-foreground mt-1.5">
                {Math.round((canvasWidth / dpiVal) * 25.4)} × {Math.round((canvasHeight / dpiVal) * 25.4)} مم
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
