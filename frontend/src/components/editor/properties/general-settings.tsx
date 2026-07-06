import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RefreshCw } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { BACKGROUND_COLORS, PAPER_SIZES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { ColorWheelPicker } from "./shared-controls";

export function GeneralSettings({
  backgroundColor,
  setBackgroundColor,
}: {
  backgroundColor: string;
  setBackgroundColor: (c: string) => void;
}) {
  const {
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    template,
    setTemplate,
    printSettings,
    setPrintSettings,
  } = useEditorStore();

  const [unit, setUnit] = useState<"px" | "mm">("px");
  const [widthVal, setWidthVal] = useState(canvasWidth.toString());
  const [heightVal, setHeightVal] = useState(canvasHeight.toString());
  const [dpiVal, setDpiVal] = useState(template?.dpi || printSettings.dpi || 300);

  // Sync inputs with store
  useEffect(() => {
    const dpi = template?.dpi || printSettings.dpi || 300;
    if (unit === "px") {
      setWidthVal(canvasWidth.toString());
      setHeightVal(canvasHeight.toString());
    } else {
      setWidthVal(Math.round((canvasWidth / dpi) * 25.4).toString());
      setHeightVal(Math.round((canvasHeight / dpi) * 25.4).toString());
    }
    setDpiVal(dpi);
  }, [canvasWidth, canvasHeight, unit, template, printSettings.dpi]);

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
      {/* لون الخلفية */}
      <div>
        <Label className="text-xs font-semibold mb-2 block text-foreground/90">لون الخلفية</Label>
        <div className="grid grid-cols-8 gap-1">
          {BACKGROUND_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setBackgroundColor(c.value)}
              className={cn(
                "aspect-square rounded-md border-[1.5px] transition-all",
                backgroundColor === c.value
                  ? "border-primary ring-2 ring-primary/20 dark:ring-primary/40"
                  : "border-border hover:border-primary/40"
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
        {/* Custom Color Wheel Widget */}
        <ColorWheelPicker
          color={backgroundColor}
          onChange={setBackgroundColor}
        />
      </div>

      <Separator className="bg-border/40" />

      {/* أبعاد الكانفس */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-foreground/90">أبعاد مساحة العمل</Label>
          
          {/* وحدة القياس */}
          <div className="flex rounded-md bg-muted/60 p-0.5 border border-border/30">
            <button
              onClick={() => setUnit("px")}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium rounded-sm transition-all",
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
                "px-2 py-0.5 text-[10px] font-medium rounded-sm transition-all",
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
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground font-semibold">أحجام قياسية جاهزة</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwapDimensions}
              className="h-6 px-1.5 text-[10px] flex items-center gap-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="تبديل العرض والارتفاع (أفقي/عمودي)"
            >
              <RefreshCw className="w-3 h-3" />
              <span>تبديل الاتجاه</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-1.5">
            {PAPER_SIZES.map((p) => {
              const dpi = dpiVal;
              const isMatch = 
                (Math.round((canvasWidth / dpi) * 25.4) === p.widthMM && Math.round((canvasHeight / dpi) * 25.4) === p.heightMM) ||
                (Math.round((canvasWidth / dpi) * 25.4) === p.heightMM && Math.round((canvasHeight / dpi) * 25.4) === p.widthMM);
                
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={cn(
                    "px-1.5 py-1.5 text-[11px] rounded-lg border text-center transition-all duration-300 font-bold truncate",
                    isMatch
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5 dark:bg-primary/20"
                      : "border-border/60 bg-card hover:bg-accent text-muted-foreground hover:text-foreground"
                  )}
                  title={p.name}
                >
                  {p.name.split(" (")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* حقول الأبعاد المدمجة بأسلوب Figma */}
        <div className="grid grid-cols-2 gap-2 text-[10.5px]">
          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8.5 shadow-xs" title="عرض مساحة العمل">
            <span className="text-muted-foreground/60 font-bold select-none text-[9px] truncate">العرض:</span>
            <input
              type="number"
              value={widthVal}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
              min={1}
            />
            <span className="text-[9px] text-muted-foreground/50 select-none shrink-0">{unit === "px" ? "px" : "مم"}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8.5 shadow-xs" title="ارتفاع مساحة العمل">
            <span className="text-muted-foreground/60 font-bold select-none text-[9px] truncate">الارتفاع:</span>
            <input
              type="number"
              value={heightVal}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
              min={1}
            />
            <span className="text-[9px] text-muted-foreground/50 select-none shrink-0">{unit === "px" ? "px" : "مم"}</span>
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
