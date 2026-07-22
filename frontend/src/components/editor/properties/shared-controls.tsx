import { useEffect, useState, useRef, useCallback } from "react";
import { Slider } from "@/components/ui/slider";

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
      onCommit?.(value);
    }
  }, [onChange, onCommit, value]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <span className="text-xs text-foreground/80 font-mono font-semibold">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
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

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { BACKGROUND_COLORS } from "@/lib/templates";
import { PaintBucket } from "lucide-react";
import { cn } from "@/lib/utils";

import { useEditorStore } from "@/lib/editor-store";

export function PopoverColorPicker({
  color,
  onChange,
  className,
  disabled,
  label
}: {
  color: string;
  onChange: (hex: string) => void;
  className?: string;
  disabled?: boolean;
  label?: React.ReactNode;
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
            "flex items-center justify-between gap-2 px-3 h-10 rounded-lg border border-border/60 bg-background hover:border-primary/45 transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
        >
          {label && <div className="text-xs font-bold text-muted-foreground shrink-0">{label}</div>}
          
          <div className="flex-1 flex items-center justify-end gap-1.5 font-mono text-xs font-bold text-foreground/80" dir="ltr">
            {color.toUpperCase()}
          </div>
          
          <div
            className="w-5 h-5 rounded-md border border-border/80 shrink-0 relative overflow-hidden"
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
    
    // تنظيف المدخلات وتدقيقها
    let cleanVal = val.trim();
    if (cleanVal === "transparent") {
      onChange("transparent");
      return;
    }

    if (!cleanVal.startsWith("#")) {
      cleanVal = "#" + cleanVal;
    }

    // التحقق من صحة كود HEX (3 أو 6 خانات)
    const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(cleanVal);
    if (isValidHex) {
      onChange(cleanVal.toUpperCase());
    }
  };

  const displayColor = isTransparent ? "#FFFFFF" : color;

  return (
    <div className="p-3.5 bg-card rounded-2xl border border-border/60 mt-2 flex flex-col gap-3.5 w-full shadow-sm animate-in fade-in duration-200">
      {/* منتقي الألوان الاحترافي */}
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

      {/* حقل الإدخال وزر الشفافية */}
      <div className="flex items-center gap-2">
        {/* زر الشفافية */}
        <button
          onClick={() => {
            setInputValue("transparent");
            onChange("transparent");
          }}
          className={cn(
            "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition-all active:scale-95",
            isTransparent
              ? "border-primary bg-primary/10 text-primary font-bold"
              : "border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title="خلفية شفافة"
        >
          <PaintBucket className="w-4 h-4" />
        </button>

        {/* حقل إدخال كود HEX */}
        <div className="flex-1 flex items-center gap-2 bg-background border border-border/60 rounded-lg px-2.5 h-9 shadow-inner focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
          <span className="text-xs font-bold text-muted-foreground/60 select-none">HEX:</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleHexInput(e.target.value)}
            className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            placeholder="#HEX"
          />
          <div
            className="w-4.5 h-4.5 rounded-md border border-border shadow-xs shrink-0 relative overflow-hidden"
            style={{
              backgroundColor: displayColor,
            }}
          >
            {isTransparent && (
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                  backgroundSize: "6px 6px"
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* قائمة الألوان السريعة */}
      <div className="space-y-2 pt-2 border-t border-border/20">
        <span className="text-xs font-bold text-muted-foreground block">ألوان سريعة</span>
        <div className="grid grid-cols-9 gap-1.5">
          {/* خيار شفاف مسبق */}
          <button
            onClick={() => {
              setInputValue("transparent");
              onChange("transparent");
            }}
            className={cn(
              "aspect-square w-full rounded-md border shadow-xs transition-all cursor-pointer relative overflow-hidden active:scale-90",
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

          {/* الألوان الجاهزة */}
          {BACKGROUND_COLORS.map((bg) => {
            const isActive = color.toUpperCase() === bg.value.toUpperCase();
            return (
              <button
                key={bg.value}
                onClick={() => {
                  setInputValue(bg.value);
                  onChange(bg.value);
                }}
                className={cn(
                  "aspect-square w-full rounded-md border shadow-xs transition-all cursor-pointer active:scale-90",
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
