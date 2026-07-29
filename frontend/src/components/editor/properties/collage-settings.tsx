import { Sparkles, Columns, Move, Square, Maximize2, Scissors, PaintBucket } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { Switch } from "@/components/ui/switch";
import { useShallow } from "zustand/react/shallow";
import { Slider } from "@/components/ui/slider";
import { useRef, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
    <div className="flex items-center gap-3 w-full h-8 group" dir="rtl">
      {/* Icon & Label */}
      <div className="flex items-center gap-1.5 w-20 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
        {icon}
        <span className="text-xs font-bold">{label}</span>
      </div>
      
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
      <div className="flex items-center justify-center h-7 w-12 bg-background border border-border/60 hover:border-primary/45 rounded-lg transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 shadow-2xs" dir="ltr">
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
    collageStrokeWidth,
    collageStrokeColor,
    setCollageGap,
    setCollageMargin,
    setCollageRadius,
    setCollageShowCutLines,
    setCollageStrokeWidth,
    setCollageStrokeColor,
  } = useEditorStore(useShallow((state) => ({
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageRadius: state.collageRadius,
    collageShowCutLines: state.collageShowCutLines,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
    setCollageGap: state.setCollageGap,
    setCollageMargin: state.setCollageMargin,
    setCollageRadius: state.setCollageRadius,
    setCollageShowCutLines: state.setCollageShowCutLines,
    setCollageStrokeWidth: state.setCollageStrokeWidth,
    setCollageStrokeColor: state.setCollageStrokeColor,
  })));

  return (
    <div className="flex flex-col gap-4 border-t border-border/20 pt-4" dir="rtl">
      {/* Section Header */}
      <div className="flex items-center gap-1.5 justify-start">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-foreground/70">
          تنسيق الكولاج
        </span>
      </div>

      {/* Sliders Container */}
      <div className="flex flex-col gap-3">
        <PanelSlider
          label="المسافات"
          icon={<Columns className="w-3.5 h-3.5" />}
          value={collageGap}
          min={0}
          max={60}
          step={2}
          unit="px"
          onChange={setCollageGap}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />
        <PanelSlider
          label="الهامش"
          icon={<Move className="w-3.5 h-3.5" />}
          value={collageMargin}
          min={0}
          max={100}
          step={2}
          unit="px"
          onChange={setCollageMargin}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />
        <PanelSlider
          label="الزوايا"
          icon={<Square className="w-3.5 h-3.5" />}
          value={collageRadius}
          min={0}
          max={50}
          step={2}
          unit="px"
          onChange={setCollageRadius}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />
        <PanelSlider
          label="الإطار"
          icon={<Maximize2 className="w-3.5 h-3.5" />}
          value={collageStrokeWidth}
          min={0}
          max={15}
          step={1}
          unit="px"
          onChange={setCollageStrokeWidth}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />
      </div>

      {/* Frame Color Row — shown only when stroke is active */}
      {collageStrokeWidth > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border/10 pt-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <PaintBucket className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">لون الإطار</span>
          </div>
          <div className="flex items-center gap-2 bg-background border border-border/60 hover:border-primary/45 rounded-xl px-2 w-32 h-8 transition-colors focus-within:border-primary">
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
              className="w-5 h-5 rounded-md border border-border/25 cursor-pointer p-0 bg-transparent shrink-0"
            />
          </div>
        </div>
      )}

      {/* Cut Lines Toggle */}
      <div className="flex items-center justify-between bg-muted/20 border border-border/30 hover:border-primary/20 rounded-xl px-3.5 py-2.5 transition-all">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Scissors className="w-3.5 h-3.5 animate-pulse" />
          <span className="text-xs font-bold text-foreground/80">خطوط القص والمحاذاة</span>
        </div>
        <Switch
          checked={collageShowCutLines}
          onCheckedChange={setCollageShowCutLines}
          className="scale-90"
        />
      </div>

      {/* Batch AI Enhance */}
      <div className="pt-2 border-t border-border/20">
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
    const { getUserDailyLimit, getTodayUsageCount } = await import("@/hooks/use-ai-enhance");

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
    for (let i = 0; i < validSlots.length; i++) {
      const slot = validSlots[i];
      try {
        let base64Image = slot.imageSrc!;
        if (!base64Image.startsWith("data:image/")) {
          const response = await fetch(base64Image);
          const blob = await response.blob();
          base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

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
      }
      setProgress(((i + 1) / validSlots.length) * 100);
    }

    setIsEnhancing(false);
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
        className="w-full flex items-center justify-between px-3.5 h-11 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.99] group font-extrabold text-xs border-[1.5px] border-primary/70 hover:border-primary bg-primary/10 hover:bg-primary/20 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-primary group-hover:scale-115 group-hover:rotate-12 transition-all duration-300 shrink-0" />
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
        <div className="p-2.5 rounded-lg bg-violet-500/[0.05] border border-violet-500/20 space-y-1.5">
          <div className="flex justify-between items-center text-[9px] font-bold text-violet-600">
            <span className="animate-pulse">جاري التحسين الذكي للصور...</span>
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
