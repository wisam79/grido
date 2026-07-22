import { Sparkles, Columns, Move, Square, Maximize2, Scissors, PaintBucket } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { Switch } from "@/components/ui/switch";
import { useShallow } from "zustand/react/shallow";
import { Slider } from "@/components/ui/slider";
import { useRef, useCallback, useEffect } from "react";

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
    </div>
  );
}
