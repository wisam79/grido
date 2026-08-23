import { useEffect, useState, useRef, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { BACKGROUND_COLORS } from "@/lib/templates";
import { PaintBucket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/editor-store";

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

  const flushPending = useCallback(() => {
    if (pendingRef.current !== null) {
      onChange(pendingRef.current);
      pendingRef.current = null;
    }
    rafRef.current = null;
  }, [onChange]);

  const handleChange = useCallback((v: number[]) => {
    const newVal = v[0];
    setLocalValue(newVal);
    pendingRef.current = newVal;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(flushPending);
    }
    // تعديلات لوحة المفاتيح لا تُطلق pointerup — نُجدول onCommit بتأجيل (إصلاح Bug#18)
    if (!isDraggingRef.current) {
      if (keyCommitTimerRef.current !== null) window.clearTimeout(keyCommitTimerRef.current);
      keyCommitTimerRef.current = window.setTimeout(() => {
        keyCommitTimerRef.current = null;
        onCommitRef.current?.(newVal);
      }, 500);
      latestValRef.current = newVal;
    }
  }, [flushPending]);

  const handlePointerDown = useCallback(() => {
    if (keyCommitTimerRef.current !== null) {
      window.clearTimeout(keyCommitTimerRef.current);
      keyCommitTimerRef.current = null;
    }
    isDraggingRef.current = true;
    onDragStart?.();
  }, [onDragStart]);

  const handlePointerUp = useCallback(() => {
    const finalValue = pendingRef.current ?? localValue;
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
      onCommit?.(finalValue);
      onDragEnd?.();
    }
  }, [onChange, onCommit, onDragEnd, localValue]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // عند إلغاء التركيب مع تعديل لوحة مفاتيح معلّق: نُثبته كخطوة تراجع
      if (keyCommitTimerRef.current !== null) {
        window.clearTimeout(keyCommitTimerRef.current);
        keyCommitTimerRef.current = null;
        onCommitRef.current?.(latestValRef.current);
      }
    };
  }, []);

  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  // قيم مخزنة قد تحمل كسوراً عائمة طويلة (من تحجيم الزخارف أو مشاريع قديمة)
  // — نعرضها مقربة لخانات الخطوة بدل الأرقام الخام
  const formatValue = (v: number) =>
    decimals === 0 ? String(Math.round(v)) : String(parseFloat(v.toFixed(decimals)));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <span className="text-xs text-foreground/80 font-mono font-semibold">
          {formatValue(localValue)}
          {unit}
        </span>
      </div>
      <Slider
        dir="ltr"
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
              ? "w-7 h-7 rounded-md border border-border/80 p-0.5 bg-background hover:border-primary/60 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              : "flex items-center justify-between gap-2 px-2.5 h-8 rounded-md border border-border/80 bg-background hover:border-primary/45 transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            className
          )}
          title="تغيير اللون"
        >
          {swatchOnly ? (
            <div
              className="w-full h-full rounded-xs border border-black/10 dark:border-white/10 shadow-2xs relative overflow-hidden"
              style={{ backgroundColor: color === "transparent" ? "#ffffff" : color }}
            >
              {color === "transparent" && (
                <div 
                  className="w-full h-full"
                  style={{
                    backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                    backgroundSize: "4px 4px"
                  }}
                />
              )}
            </div>
          ) : (
            <>
              {label && <div className="text-xs font-semibold text-muted-foreground shrink-0">{label}</div>}
              
              <div className="flex-1 flex items-center justify-end gap-1.5 font-mono text-xs font-semibold text-foreground/80" dir="ltr">
                {color.toUpperCase()}
              </div>
              
              <div
                className="w-4.5 h-4.5 rounded-xs border border-border/80 shrink-0 relative overflow-hidden"
                style={{ backgroundColor: color === "transparent" ? "#ffffff" : color }}
              >
                {color === "transparent" && (
                  <div 
                    className="w-full h-full"
                    style={{
                      backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                      backgroundSize: "4px 4px"
                    }}
                  />
                )}
              </div>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 border-0 bg-transparent shadow-none" sideOffset={8} align="end">
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

  const displayColor = isTransparent ? "#FFFFFF" : color;

  return (
    <div className="p-2.5 bg-card/95 backdrop-blur-2xl rounded-xl border border-border/80 dark:border-white/10 mt-1 flex flex-col gap-2 w-full shadow-2xl fluent-specular animate-in fade-in duration-200">
      <div className="custom-color-picker w-full">
        <HexColorPicker
          color={isTransparent ? "#ffffff" : color}
          onChange={(newColor) => {
            const upperColor = newColor.toUpperCase();
            setInputValue(upperColor);
            onChange(upperColor);
          }}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setInputValue("transparent");
            onChange("transparent");
          }}
          className={cn(
            "w-8 h-8 rounded-md border flex items-center justify-center shrink-0 shadow-2xs cursor-pointer transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
            isTransparent
              ? "border-primary bg-primary/10 text-primary font-bold"
              : "border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="خلفية شفافة"
        >
          <PaintBucket className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 flex items-center gap-1.5 bg-background border border-border/80 rounded-md px-2 h-8 shadow-2xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all">
          <span className="text-[10px] font-bold text-muted-foreground/60 select-none">HEX:</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleHexInput(e.target.value)}
            className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            placeholder="#HEX"
          />
          <div
            className="w-4 h-4 rounded-[3px] border border-border shadow-2xs shrink-0 relative overflow-hidden"
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

      <div className="space-y-1.5 pt-1.5 border-t border-border/20">
        <span className="text-xs font-bold text-muted-foreground block">ألوان سريعة</span>
        <div className="grid grid-cols-9 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setInputValue("transparent");
              onChange("transparent");
            }}
            className={cn(
              "aspect-square w-full rounded-md border shadow-xs transition-all cursor-pointer relative overflow-hidden active:scale-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
              isTransparent 
                ? "ring-2 ring-primary ring-offset-1 border-primary scale-95" 
                : "border-border/40 hover:scale-105"
            )}
            title="شفاف"
          >
            <div 
              className="absolute inset-0 bg-white"
              style={{
                backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                backgroundSize: "6px 6px"
              }}
            />
          </button>

          {BACKGROUND_COLORS.map((bg) => {
            const isActive = color.toUpperCase() === bg.value.toUpperCase();
            return (
              <button
                key={bg.value}
                type="button"
                onClick={() => {
                  setInputValue(bg.value);
                  onChange(bg.value);
                }}
                className={cn(
                  "aspect-square w-full rounded-md border shadow-xs transition-all cursor-pointer active:scale-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                  isActive 
                    ? "ring-2 ring-primary ring-offset-1 border-primary scale-95" 
                    : "border-border/40 hover:scale-105"
                )}
                style={{ backgroundColor: bg.value }}
                title={bg.name}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
