import { Sparkles, Columns, Move, Square, Maximize2, Scissors } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { useRenderQuality } from "@/lib/canvas/render-quality";
import { Switch } from "@/components/ui/switch";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useRef, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// ─── Larger SliderControl built for the left panel ─────────────────────────
function PanelSlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  onCommit,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const flushPending = useCallback(() => {
    if (pendingRef.current !== null) {
      onChange(pendingRef.current);
      pendingRef.current = null;
    }
    rafRef.current = null;
  }, [onChange]);

  const handleChange = useCallback((v: number[]) => {
    pendingRef.current = v[0];
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(flushPending);
    }
  }, [flushPending]);

  const handlePointerDown = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingRef.current !== null) {
      onChange(pendingRef.current);
      pendingRef.current = null;
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      onCommit?.();
    }
  }, [onChange, onCommit]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-2.5 w-full h-8 group" dir="rtl">
      {/* Icon with Tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted/30 text-muted-foreground group-hover:text-foreground group-hover:bg-muted/60 transition-colors shrink-0 cursor-help">
            {icon}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-cairo text-xs font-bold">
          {label}
        </TooltipContent>
      </Tooltip>
      
      {/* Slider */}
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleChange}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="flex-1 py-1.5"
      />
      
      {/* Value Input Badge (Figma Style) */}
      <div className="flex items-center justify-center h-7 w-12 bg-background border border-border/60 hover:border-primary/45 rounded-md transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background shadow-2xs shrink-0" dir="ltr">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) onChange(Math.max(min, Math.min(max, val)));
          }}
          className="w-full bg-transparent border-0 p-0 text-[11px] font-mono font-bold text-center focus:ring-0 focus:outline-hidden text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-[9px] text-muted-foreground/50 pr-0.5 select-none">{unit}</span>
      </div>
    </div>
  );
}

export function CollageSettings() {
  const {
    collageGap,
    collageMargin,
    collageRadius,
    collageShowCutLines,
    collageShowEndCutLine,
    collageStrokeWidth,
    collageStrokeColor,
    setCollageGap,
    setCollageMargin,
    setCollageRadius,
    setCollageShowCutLines,
    setCollageShowEndCutLine,
    setCollageStrokeWidth,
    setCollageStrokeColor,
  } = useEditorStore(useShallow((state) => ({
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageRadius: state.collageRadius,
    collageShowCutLines: state.collageShowCutLines,
    collageShowEndCutLine: state.collageShowEndCutLine,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
    setCollageGap: state.setCollageGap,
    setCollageMargin: state.setCollageMargin,
    setCollageRadius: state.setCollageRadius,
    setCollageShowCutLines: state.setCollageShowCutLines,
    setCollageShowEndCutLine: state.setCollageShowEndCutLine,
    setCollageStrokeWidth: state.setCollageStrokeWidth,
    setCollageStrokeColor: state.setCollageStrokeColor,
  })));

  return (
    <div className="flex flex-col gap-3 font-cairo" dir="rtl">
      {/* 🎴 بطاقة 1: المسافات والاستدارة */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        <div className="flex items-center gap-1.5 justify-start border-b border-border/20 pb-1.5">
          <Columns className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-foreground/85">
            المسافات والاستدارة
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <PanelSlider
            label="المسافات بين الصور"
            icon={<Columns className="w-3.5 h-3.5" />}
            value={collageGap}
            min={0}
            max={60}
            step={2}
            unit="px"
            onChange={setCollageGap}
          />
          <PanelSlider
            label="الهامش الخارجي"
            icon={<Move className="w-3.5 h-3.5" />}
            value={collageMargin}
            min={0}
            max={100}
            step={2}
            unit="px"
            onChange={setCollageMargin}
          />
          <PanelSlider
            label="استدارة الزوايا"
            icon={<Square className="w-3.5 h-3.5" />}
            value={collageRadius}
            min={0}
            max={50}
            step={2}
            unit="px"
            onChange={setCollageRadius}
          />
        </div>
      </div>

      {/* 🎴 بطاقة 2: إطار وحدود الخلايا */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        <div className="flex items-center gap-1.5 justify-start border-b border-border/20 pb-1.5">
          <Maximize2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-foreground/85">
            إطار وحدود الصور
          </span>
        </div>

        <PanelSlider
          label="سُمك الإطار"
          icon={<Maximize2 className="w-3.5 h-3.5" />}
          value={collageStrokeWidth}
          min={0}
          max={15}
          step={1}
          unit="px"
          onChange={setCollageStrokeWidth}
        />

        {/* Frame Color Row — shown only when stroke is active */}
        {collageStrokeWidth > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-border/20 pt-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-1">
              {[
                { hex: "#e10e0e", label: "أحمر" },
                { hex: "#000000", label: "أسود" },
                { hex: "#9ca3af", label: "رمادي" },
                { hex: "#2563eb", label: "أزرق" },
                { hex: "#ffffff", label: "أبيض" },
              ].map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setCollageStrokeColor(hex)}
                  title={label}
                  className={cn(
                    "w-4 h-4 rounded-full border border-black/15 dark:border-white/20 transition-transform cursor-pointer hover:scale-125 shadow-2xs",
                    collageStrokeColor.toLowerCase() === hex.toLowerCase() && "ring-2 ring-primary ring-offset-1 scale-110"
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-background border border-border/60 hover:border-primary/45 rounded-md px-2 w-28 h-7.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background">
              <input
                type="text"
                value={collageStrokeColor}
                onChange={(e) => setCollageStrokeColor(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-bold"
              />
              <input
                type="color"
                value={collageStrokeColor}
                onChange={(e) => setCollageStrokeColor(e.target.value)}
                className="w-3.5 h-3.5 rounded-full border border-border/25 cursor-pointer p-0 bg-transparent shrink-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* 🎴 بطاقة 3: خطوط وعلامات القص */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 shadow-xs space-y-2.5 font-cairo fluent-specular">
        <div className="flex items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-foreground cursor-help">
                <div className="w-6 h-6 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Scissors className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <span className="text-xs font-bold">خطوط القص والمحاذاة</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-cairo text-xs font-bold">
              إظهار خطوط القص التلقائية بين صور الكولاج
            </TooltipContent>
          </Tooltip>
          <Switch
            checked={collageShowCutLines}
            onCheckedChange={setCollageShowCutLines}
          />
        </div>

        {/* Nested Sub-option: Blue End Line */}
        {collageShowCutLines && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/20 animate-in fade-in-50 duration-150 pr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-muted-foreground cursor-help">
                  <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/30 shrink-0 shadow-xs" />
                  <span className="text-[11px] font-bold text-foreground/90">خط نهاية الطباعة (الأزرق)</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-cairo text-xs font-bold">
                إظهار الخط الأزرق الذي يُحدد نهاية الطباعة على الورقة
              </TooltipContent>
            </Tooltip>
            <Switch
              checked={collageShowEndCutLine}
              onCheckedChange={setCollageShowEndCutLine}
              className="scale-90"
            />
          </div>
        )}
      </div>

      {/* 🎴 بطاقة 4: ترميم الكولاج بالذكاء الاصطناعي */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 shadow-xs fluent-specular">
        <BatchAiEnhanceButton />
      </div>
    </div>
  );
}

function BatchAiEnhanceButton() {
  const { slots, user, updateSlot } = useEditorStore(useShallow((state) => ({
    slots: state.slots,
    user: state.user,
    updateSlot: state.updateSlot,
  })));
  
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [progress, setProgress] = useState(0);

  const isPro = user?.plan === "pro" || user?.plan === "enterprise";
  
  const handleBatchEnhance = async () => {
    if (!isPro) {
      toast.warning("هذه الميزة متاحة للمشتركين في باقة PRO فقط");
      return;
    }

    const validSlots = slots.filter(s => s.imageSrc);
    if (validSlots.length === 0) {
      toast.info("لا توجد صور في الكولاج لتحسينها");
      return;
    }

    // Dynamic import to avoid circular dependencies if any, though regular import is fine
    const { SaveImageFromBase64, EnhanceImageWithAI } = await import("../../../../wailsjs/go/main/App");
    const { getUserDailyLimit, getTodayUsageCount, prepareImageForAiUpload } = await import("@/hooks/use-ai-enhance");

    const dailyLimit = getUserDailyLimit();
    const dailyCount = getTodayUsageCount();
    const remainingQuota = Math.max(0, dailyLimit - dailyCount);

    if (remainingQuota < validSlots.length) {
      toast.warning(`رصيدك المتبقي (${remainingQuota}) لا يكفي لتحسين ${validSlots.length} صور دفعة واحدة.`);
      return;
    }

    setIsEnhancing(true);
    setProgress(0);

    let successCount = 0;
    try {
      for (let i = 0; i < validSlots.length; i++) {
        const slot = validSlots[i];
        try {
          useRenderQuality.getState().setEnhancingElementId(slot.id);
          const base64Image = await prepareImageForAiUpload(slot.imageSrc!, 2048, 0.92);

          const token = user?.token || "";
          const resultStr = await EnhanceImageWithAI(base64Image, token, dailyLimit);
          
          if (resultStr && resultStr.startsWith("data:image/")) {
            const localPath = await SaveImageFromBase64(resultStr);
            updateSlot(slot.id, { 
              imageSrc: localPath, 
              originalImageSrc: slot.originalImageSrc || slot.imageSrc 
            });
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to enhance slot ${slot.id}:`, err);
        } finally {
          useRenderQuality.getState().setEnhancingElementId(null);
        }
        setProgress(((i + 1) / validSlots.length) * 100);
      }
    } finally {
      setIsEnhancing(false);
    }

    if (successCount > 0) {
      useEditorStore.getState().pushHistory();
      toast.success(`تم تحسين ${successCount} صورة بنجاح`);
    } else {
      toast.error("فشل تحسين الصور");
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleBatchEnhance}
        disabled={isEnhancing}
        className="w-full flex items-center justify-between px-3.5 h-9 rounded-md transition-all duration-200 cursor-pointer active:scale-[0.99] group font-semibold text-xs border border-primary/40 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-primary group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shrink-0" />
          <span>ترميم وتحسين الكولاج بالكامل</span>
        </div>
        {!isPro ? (
          <span className="text-[8.5px] bg-primary text-primary-foreground font-black px-1.5 py-0.5 rounded-md tracking-wider uppercase">
            PRO
          </span>
        ) : (
          <span className="text-[9px] bg-primary/20 border border-primary/40 text-primary px-1.5 py-0.5 rounded-md font-bold font-mono">
            AI Batch
          </span>
        )}
      </button>

      {isEnhancing && (
        <div className="p-2.5 rounded-xl bg-violet-500/[0.05] border border-violet-500/20 space-y-1.5 fluent-specular">
          <div className="flex justify-between items-center text-[9px] font-bold text-violet-600">
            <span className="animate-pulse">جاري التحسين الذكي للصور ...</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-violet-600 to-purple-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
