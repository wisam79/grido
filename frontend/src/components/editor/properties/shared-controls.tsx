import { useEffect, useState, useRef, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import {
  Palette,
  Eyedropper,
  Check,
  PaintBrush,
  Copy,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/editor-store";
import { previewWhite, checkerColor } from "@/lib/canvas/canvas-colors";
import { BACKGROUND_COLORS } from "@/lib/templates";

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/10 last:border-b-0 text-xs">
      <span className="text-muted-foreground font-semibold">{label}</span>
      <span className="font-mono font-bold text-foreground/85 text-left" dir="auto">{value}</span>
    </div>
  );
}

export function SliderControl({
  label,
  icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  onCommit,
  onDragStart,
  onDragEnd,
}: {
  label: string;
  icon?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const keyCommitTimerRef = useRef<number | null>(null);
  const onCommitRef = useRef(onCommit);
  const latestValRef = useRef(value);
  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = useCallback((val: number[]) => {
    const v = val[0];
    setLocalValue(v);
    latestValRef.current = v;
    pendingRef.current = v;

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingRef.current !== null) {
          onChange(pendingRef.current);
          pendingRef.current = null;
        }
        rafRef.current = null;
      });
    }

    if (!isDraggingRef.current && onCommitRef.current) {
      if (keyCommitTimerRef.current !== null) {
        clearTimeout(keyCommitTimerRef.current);
      }
      keyCommitTimerRef.current = window.setTimeout(() => {
        onCommitRef.current?.(latestValRef.current);
        keyCommitTimerRef.current = null;
      }, 300);
    }
  }, [onChange]);

  const handlePointerDown = useCallback(() => {
    isDraggingRef.current = true;
    onDragStart?.();
  }, [onDragStart]);

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingRef.current !== null) {
        onChange(pendingRef.current);
        pendingRef.current = null;
      }
      onCommitRef.current?.(latestValRef.current);
      onDragEnd?.();
    }
  }, [onChange, onDragEnd]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (keyCommitTimerRef.current !== null) clearTimeout(keyCommitTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5 font-semibold text-xs text-foreground/90">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <span>{label}</span>
        </span>
        <span
          className="font-mono text-[11px] font-bold text-foreground/90 bg-muted/60 dark:bg-muted/40 px-1.5 py-0.5 rounded-md border border-border/40 select-none tracking-tight"
          dir="ltr"
        >
          {localValue} {unit}
        </span>
      </div>
      <Slider
        value={[localValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleChange}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="py-1"
      />
    </div>
  );
}

export function PopoverColorPicker({
  color,
  onChange,
  className,
  disabled,
  label,
  swatchOnly,
}: {
  color: string;
  onChange: (hex: string) => void;
  className?: string;
  disabled?: boolean;
  label?: React.ReactNode;
  swatchOnly?: boolean;
}) {
  const colorOnOpenRef = useRef<string | null>(null);

  return (
    <Popover onOpenChange={(open) => {
      if (open) {
        colorOnOpenRef.current = color;
      } else if (colorOnOpenRef.current !== null && color !== colorOnOpenRef.current) {
        useEditorStore.getState().pushHistory();
        colorOnOpenRef.current = null;
      }
    }}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            swatchOnly
              ? "w-8 h-8 rounded-lg border border-border/80 dark:border-white/10 p-0.5 bg-input/40 hover:bg-input hover:border-primary/60 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              : "flex items-center justify-between gap-2 px-3 h-8.5 rounded-lg border border-border/80 dark:border-white/10 bg-input/40 hover:bg-input/80 hover:border-primary/45 transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            className
          )}
          title="تغيير اللون"
        >
          {swatchOnly ? (
            <div
              className="w-full h-full rounded-md border border-black/15 dark:border-white/20 shadow-2xs relative overflow-hidden transition-all before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
              style={{ backgroundColor: color === "transparent" ? previewWhite() : color }}
            >
              {color === "transparent" && (
                <div 
                  className="w-full h-full"
                  style={{
                    backgroundImage: `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)`,
                    backgroundSize: "4px 4px"
                  }}
                />
              )}
            </div>
          ) : (
            <>
              {label && <div className="text-xs font-semibold text-muted-foreground shrink-0">{label}</div>}
              
              <div
                className="w-5.5 h-5.5 rounded-md border border-black/15 dark:border-white/20 shrink-0 relative overflow-hidden shadow-2xs before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
                style={{ backgroundColor: color === "transparent" ? previewWhite() : color }}
              >
                {color === "transparent" && (
                  <div 
                    className="w-full h-full"
                    style={{
                      backgroundImage: `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)`,
                      backgroundSize: "4px 4px"
                    }}
                  />
                )}
              </div>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 border-0 bg-transparent shadow-none" sideOffset={8} align="end">
        <ColorWheelPicker color={color} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

export function ColorWheelPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  const isTransparent = color === "transparent";
  const [inputValue, setInputValue] = useState(color);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setInputValue(color);
    });
    return () => cancelAnimationFrame(rafId);
  }, [color]);

  const handleHexInput = (val: string) => {
    setInputValue(val);
    
    const cleanVal = val.trim();
    if (cleanVal === "transparent") {
      onChange("transparent");
      return;
    }

    let hexVal = cleanVal;
    if (!hexVal.startsWith("#")) {
      hexVal = "#" + hexVal;
    }

    const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(hexVal);
    if (isValidHex) {
      onChange(hexVal.toUpperCase());
    }
  };

  const handleEyeDropper = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const upper = result.sRGBHex.toUpperCase();
          setInputValue(upper);
          onChange(upper);
        }
      } catch {
        // cancelled
      }
    }
  };

  const handleCopyHex = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(color.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;
  const displayColor = isTransparent ? "#FFFFFF" : color;

  return (
    <div className="p-3.5 bg-popover/98 backdrop-blur-2xl rounded-2xl border border-border/80 dark:border-white/10 shadow-fluent-24 fluent-specular animate-in fade-in duration-150 flex flex-col gap-3 w-72 select-none" dir="rtl">
      <div className="custom-color-picker w-full rounded-xl overflow-hidden shadow-inner border border-border/40">
        <HexColorPicker
          color={isTransparent ? "#ffffff" : color}
          onChange={(newColor) => {
            const upperColor = newColor.toUpperCase();
            setInputValue(upperColor);
            onChange(upperColor);
          }}
        />
      </div>

      <div className="flex items-center gap-1.5" dir="ltr">
        <button
          type="button"
          onClick={() => {
            setInputValue("transparent");
            onChange("transparent");
          }}
          className={cn(
            "w-8.5 h-8.5 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs cursor-pointer transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
            isTransparent
              ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-2 ring-primary/30"
              : "border-border/60 bg-input/80 text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          title="خلفية شفافة"
        >
          <Palette className="w-4 h-4" weight="regular" />
        </button>

        {hasEyeDropper && (
          <button
            type="button"
            onClick={handleEyeDropper}
            className="w-8.5 h-8.5 rounded-lg border border-border/60 bg-input/80 hover:bg-accent text-muted-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
            title="سحب لون من الشاشة (قطارة)"
          >
            <Eyedropper className="w-4 h-4" weight="regular" />
          </button>
        )}

        <div className="flex-1 flex items-center gap-1.5 bg-input/90 border border-border/80 rounded-lg px-2.5 h-8.5 shadow-2xs focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
          <span className="text-[11px] font-bold text-muted-foreground/60 select-none">#</span>
          <input
            type="text"
            value={inputValue.startsWith("#") ? inputValue.slice(1) : inputValue}
            onChange={(e) => handleHexInput(e.target.value)}
            className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold uppercase"
            placeholder="FFFFFF"
          />
          <button
            type="button"
            onClick={handleCopyHex}
            className="text-muted-foreground/50 hover:text-foreground transition-colors p-0.5"
            title="نسخ كود اللون"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" weight="bold" /> : <Copy className="w-3.5 h-3.5" weight="regular" />}
          </button>
          <div
            className="w-4.5 h-4.5 rounded-md border border-black/15 dark:border-white/20 shadow-2xs shrink-0 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
            style={{
              backgroundColor: displayColor,
            }}
          >
            {isTransparent && (
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                  backgroundSize: "4px 4px"
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-border/30">
        <span className="text-[11px] font-extrabold text-muted-foreground block text-right">ألوان الاستوديو الرسمية</span>
        <div className="grid grid-cols-8 gap-1.5" dir="rtl">
          {BACKGROUND_COLORS.map((bg) => {
            const isActive = color.toUpperCase() === bg.value.toUpperCase();
            return (
              <button
                key={bg.value}
                type="button"
                aria-label={bg.name}
                aria-pressed={isActive}
                onClick={() => {
                  setInputValue(bg.value);
                  onChange(bg.value);
                }}
                className={cn(
                  "aspect-square w-full rounded-lg border shadow-2xs transition-all cursor-pointer relative flex items-center justify-center active:scale-90 hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/25 before:to-transparent before:pointer-events-none",
                  isActive 
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary scale-105 z-10" 
                    : "border-black/10 dark:border-white/15 hover:border-foreground/40"
                )}
                style={{ backgroundColor: bg.value }}
                title={bg.name}
              >
                {isActive && (
                  <Check
                    className={cn(
                      "w-3.5 h-3.5 z-10 drop-shadow-xs",
                      bg.value === "#FFFFFF" || bg.value === "#F4F4F5" || bg.value === "#E4E4E7" || bg.value === "#F5F5F4"
                        ? "text-slate-900"
                        : "text-white"
                    )}
                    weight="bold"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * لوحة ألوان مساحة العمل المتقدمة للاستوديو
 * توفر عينات سريعة مباشرة + قطارة ألوان + منتقي مخصص
 */
export function StudioCanvasColorDeck({
  color,
  onChange,
  className,
}: {
  color: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  const isTransparent = color === "transparent";

  const handleEyeDropper = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          onChange(result.sRGBHex.toUpperCase());
          useEditorStore.getState().pushHistory();
        }
      } catch {
        // cancelled
      }
    }
  };

  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  const studioPresets = [
    { name: "أبيض استوديو", value: "#FFFFFF" },
    { name: "رمادي وثائق", value: "#F1F5F9" },
    { name: "رمادي حيادي", value: "#E2E8F0" },
    { name: "أزرق هوية وطنية", value: "#2563EB" },
    { name: "كحلي رسمي", value: "#1E40AF" },
    { name: "أحمر جوازات", value: "#DC2626" },
    { name: "أسود داكن", value: "#18181B" },
  ];

  return (
    <div className={cn("space-y-2.5 p-2.5 rounded-xl bg-card/60 border border-border/70 fluent-specular shadow-2xs w-full overflow-hidden", className)} dir="rtl">
      {/* شبكة العينات السريعة للألوان (8 أعمدة متناسقة بنسبة 100%) */}
      <div className="grid grid-cols-8 gap-1.5 w-full">
        {/* زر الشفاف */}
        <button
          type="button"
          onClick={() => {
            onChange("transparent");
            useEditorStore.getState().pushHistory();
          }}
          className={cn(
            "aspect-square w-full rounded-lg border transition-all cursor-pointer relative overflow-hidden shadow-2xs hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none flex items-center justify-center",
            isTransparent
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary scale-105 z-10"
              : "border-border/60 hover:border-border"
          )}
          title="شفاف"
        >
          <div
            className="w-full h-full bg-white"
            style={{
              backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
              backgroundSize: "4px 4px",
            }}
          />
          {isTransparent && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-slate-900 drop-shadow-xs" weight="bold" />
            </div>
          )}
        </button>

        {/* عينات الألوان المعتمدة */}
        {studioPresets.map((preset) => {
          const isSelected = color.toUpperCase() === preset.value.toUpperCase();
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                onChange(preset.value);
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "aspect-square w-full rounded-lg border transition-all cursor-pointer shadow-2xs hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none relative flex items-center justify-center overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/25 before:to-transparent before:pointer-events-none",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary scale-105 z-10"
                  : "border-black/10 dark:border-white/15 hover:border-foreground/40"
              )}
              style={{ backgroundColor: preset.value }}
              title={preset.name}
            >
              {isSelected && (
                <Check
                  className={cn(
                    "w-3.5 h-3.5 z-10 drop-shadow-xs",
                    preset.value === "#FFFFFF" || preset.value === "#F1F5F9" || preset.value === "#E2E8F0"
                      ? "text-slate-900"
                      : "text-white"
                  )}
                  weight="bold"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* صف منتقي اللون المخصص التفاعلي + القطارة */}
      <div className="flex items-center gap-1.5 w-full">
        <PopoverColorPicker
          color={color}
          onChange={onChange}
          className="flex-1 h-8.5 rounded-lg border-border/80 bg-input/50 hover:bg-input/80 hover:border-primary/40 shadow-2xs"
          label={
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <PaintBrush className="w-4 h-4 text-primary shrink-0" weight="duotone" />
              <span>لون مخصص</span>
            </div>
          }
        />

        {hasEyeDropper && (
          <button
            type="button"
            onClick={handleEyeDropper}
            className="w-8.5 h-8.5 rounded-lg border border-border/70 bg-input/80 hover:bg-accent/70 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            title="قطارة الألوان (سحب لون من الشاشة)"
          >
            <Eyedropper className="w-4 h-4" weight="regular" />
          </button>
        )}
      </div>
    </div>
  );
}
