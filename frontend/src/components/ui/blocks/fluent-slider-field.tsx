import React, { useEffect, useState, useRef, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface FluentSliderFieldProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  className?: string;
  valueFormatter?: (val: number) => string;
}

export const FluentSliderField = React.memo(function FluentSliderField({
  label,
  icon,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  onCommit,
  onDragStart,
  onDragEnd,
  disabled = false,
  className,
  valueFormatter,
}: FluentSliderFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

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

  const handleChange = useCallback(
    (v: number[]) => {
      const newVal = v[0];
      setLocalValue(newVal);
      pendingRef.current = newVal;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flushPending);
      }
    },
    [flushPending]
  );

  const handlePointerDown = useCallback(() => {
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
    };
  }, []);

  const displayVal = valueFormatter
    ? valueFormatter(localValue)
    : `${localValue}${unit ? ` ${unit}` : ""}`;

  return (
    <div
      className={cn(
        "space-y-1.5 select-none",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground/90">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <span>{label}</span>
        </div>
        <span
          dir="ltr"
          className="font-mono font-bold text-[11px] bg-muted/60 dark:bg-muted/40 px-1.5 py-0.5 rounded border border-border/40 text-foreground/90 select-none"
        >
          {displayVal}
        </span>
      </div>

      <Slider
        value={[localValue]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={handleChange}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="py-1"
      />
    </div>
  );
});

FluentSliderField.displayName = "FluentSliderField";
