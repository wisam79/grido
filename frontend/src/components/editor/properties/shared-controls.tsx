import React, { useEffect, useState, useRef, useCallback } from "react";
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
import { previewWhite, checkerColor, STUDIO_PALETTE } from "@/lib/canvas/canvas-colors";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
          className="font-cairo text-xs font-semibold text-foreground/90 bg-muted/60 dark:bg-muted/40 px-1.5 py-0.5 rounded-md border border-border/40 select-none tracking-tight tabular-nums"
          dir="ltr"
        >
          {localValue}{unit === "°" || unit === "%" ? unit : ` ${unit}`}
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
              ? "w-8 h-8 rounded-md border border-border/80 dark:border-white/10 p-0.5 bg-input/40 hover:bg-input hover:border-primary/60 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              : "flex items-center justify-between gap-2 px-2.5 h-8 rounded-md border border-border bg-input/50 hover:bg-input hover:border-primary/45 transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            className
          )}
          title="تغيير اللون"
        >
          {swatchOnly ? (
            <div
              className="w-full h-full rounded border border-black/15 dark:border-white/20 shadow-2xs relative overflow-hidden transition-all before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
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
              {label && <div className="text-xs font-semibold text-foreground/90 shrink-0">{label}</div>}
              
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-1.5 py-0.5 rounded bg-muted/60 dark:bg-muted/40 border border-border/40 font-mono text-mini font-bold text-foreground/80 tracking-tight select-none" dir="ltr">
                  {color === "transparent" ? "شفاف" : color.toUpperCase()}
                </span>
                <div
                  className="w-5 h-5 rounded-md border border-black/15 dark:border-white/20 shrink-0 relative overflow-hidden shadow-2xs before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
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

/**
 * باليتة ألوان استوديو سريعة مدمجة (8 ألوان) بأزرار دائرية/مربعة أنيقة مع Tooltip
 * تلغي تماماً حشر النصوص المشوهة أو المقتطعة داخل الأزرار
 */
export const QuickColorPalette = React.memo(function QuickColorPalette({
  currentColor,
  onSelectColor,
  className,
}: {
  currentColor?: string;
  onSelectColor: (hex: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-8 gap-1.5 w-full", className)}>
      {STUDIO_PALETTE.map((c) => {
        const isCurrent = currentColor?.toLowerCase() === c.color.toLowerCase();
        return (
          <Tooltip key={c.color}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelectColor(c.color)}
                className={cn(
                  "aspect-square rounded-md border relative transition-all cursor-pointer flex items-center justify-center p-0.5 overflow-hidden",
                  "hover:scale-105 active:scale-95 shadow-2xs",
                  "before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/25 before:to-transparent before:pointer-events-none",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                  isCurrent
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-105 z-10 shadow-xs border-primary"
                    : "border-black/10 dark:border-white/15 hover:border-foreground/40"
                )}
                style={{ backgroundColor: c.color }}
                aria-label={c.label}
              >
                {isCurrent && (
                  <Check
                    className={cn(
                      "w-3.5 h-3.5 z-10 drop-shadow-xs",
                      c.color.toLowerCase() === "#ffffff" ? "text-slate-900" : "text-white"
                    )}
                    weight="bold"
                  />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-bold font-cairo">
              {c.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
});

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
            "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs cursor-pointer transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
            isTransparent
              ? "bg-card text-foreground border border-border/80 dark:border-white/15 font-bold shadow-xs ring-1 ring-primary/40"
              : "border-border/60 bg-input/80 text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          title="خلفية شفافة"
        >
          <Palette className={cn("w-4 h-4", isTransparent ? "text-primary" : "text-muted-foreground")} weight={isTransparent ? "fill" : "regular"} />
        </button>

        {hasEyeDropper && (
          <button
            type="button"
            onClick={handleEyeDropper}
            className="w-8 h-8 rounded-lg border border-border/60 bg-input/80 hover:bg-accent text-muted-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            title="قطارة الشاشة"
          >
            <Eyedropper className="w-4 h-4" weight="regular" />
          </button>
        )}

        <div className="flex-1 flex items-center gap-1.5 bg-input/90 border border-border/80 rounded-lg px-2.5 h-8 shadow-2xs focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
          <span className="text-xs font-bold text-muted-foreground/60 select-none">#</span>
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
            title="نسخ اللون"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" weight="bold" /> : <Copy className="w-3.5 h-3.5" weight="regular" />}
          </button>
          <div
            className="w-4 h-4 rounded-md border border-black/15 dark:border-white/20 shadow-2xs shrink-0 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
            style={{
              backgroundColor: displayColor,
            }}
          >
            {isTransparent && (
              <div 
                className="absolute inset-0"
                  style={{
                    backgroundImage: `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)`,
                    backgroundSize: "4px 4px"
                  }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-border/30">
        <span className="text-xs font-extrabold text-muted-foreground block text-right">ألوان الاستوديو</span>
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
                  "aspect-square w-full rounded-lg border shadow-2xs transition-all cursor-pointer relative flex items-center justify-center active:scale-90 hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/25 before:to-transparent before:pointer-events-none",
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
export const StudioCanvasColorDeck = React.memo(function StudioCanvasColorDeck({
  color,
  onChange,
  className,
  compact = false,
}: {
  color: string;
  onChange: (hex: string) => void;
  className?: string;
  /** وضع مضغوط: عينات وقطارة في سطر واحد للأدوات المدمجة */
  compact?: boolean;
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
    { name: "رمادي وثائق", value: "#E2E8F0" },
    { name: "رمادي حيادي", value: "#94A3B8" },
    { name: "أزرق هوية وطنية", value: "#2563EB" },
    { name: "كحلي رسمي", value: "#1E40AF" },
    { name: "أحمر جوازات", value: "#DC2626" },
    { name: "أسود داكن", value: "#18181B" },
  ];

  return (
    <div
      className={cn(
        "space-y-2.5 w-full font-cairo",
        compact && "space-y-1.5",
        className
      )}
      dir="rtl"
    >
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
            "aspect-square w-full rounded-lg border transition-all cursor-pointer relative overflow-hidden shadow-2xs hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none flex items-center justify-center",
            isTransparent
              ? "ring-2 ring-primary ring-offset-2 ring-offset-card border-primary scale-105 z-10 shadow-xs"
              : "border-black/15 dark:border-white/15 hover:border-primary/50"
          )}
          title="خلفية شفافة"
        >
          <div
            className="w-full h-full bg-white"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)",
              backgroundSize: "6px 6px",
            }}
          />
          {isTransparent && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <Check className="w-3.5 h-3.5 text-slate-900 drop-shadow-xs" weight="bold" />
            </div>
          )}
        </button>

        {/* عينات الألوان المعتمدة */}
        {studioPresets.map((preset) => {
          const isSelected = color.toUpperCase() === preset.value.toUpperCase();
          const isLight = preset.value === "#FFFFFF" || preset.value === "#F1F5F9" || preset.value === "#E2E8F0";
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                onChange(preset.value);
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "aspect-square w-full rounded-lg border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none relative flex items-center justify-center overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/25 before:to-transparent before:pointer-events-none",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-card border-primary scale-105 z-10 shadow-xs"
                  : "border-black/15 dark:border-white/15 hover:border-primary/50"
              )}
              style={{ backgroundColor: preset.value }}
              title={preset.name}
            >
              {isSelected && (
                <Check
                  className={cn(
                    "w-3.5 h-3.5 z-10 drop-shadow-xs",
                    isLight ? "text-slate-900" : "text-white"
                  )}
                  weight="bold"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* صف منتقي اللون المخصص التفاعلي + القطارة */}
      <div className="flex items-center gap-1.5 w-full pt-0.5">
        <PopoverColorPicker
          color={color}
          onChange={onChange}
          className={cn(
            "flex-1 h-8 rounded-md border-border/80 bg-input/50 hover:bg-input hover:border-primary/40 shadow-2xs",
            compact && "h-7 text-micro"
          )}
          label={
            <div className={cn("flex items-center gap-1.5 text-xs font-semibold text-foreground/90", compact && "text-micro gap-1")}>
              <PaintBrush className="text-primary shrink-0 w-3.5 h-3.5" weight="duotone" />
              <span>لون مخصص</span>
            </div>
          }
        />

        {hasEyeDropper && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleEyeDropper}
                className={cn(
                  "w-8 h-8 rounded-md border border-border/80 bg-input/50 hover:bg-primary/10 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  compact && "w-7 h-7"
                )}
                aria-label="قطارة الألوان"
              >
                <Eyedropper className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} weight="duotone" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">قطارة الشاشة</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});
