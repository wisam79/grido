import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

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
  layout?: 'stacked' | 'inline';
  labelWidth?: string;
}

export const FluentSliderField = React.memo(function FluentSliderField({
  label,
  icon,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  onCommit,
  onDragStart,
  onDragEnd,
  disabled = false,
  className,
  valueFormatter,
  layout = 'stacked',
  labelWidth,
}: FluentSliderFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const latestValRef = useRef(value);
  const isDraggingRef = useRef(false);
  const pendingRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const keyCommitTimerRef = useRef<number | null>(null);

  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);

  // 🛡️ a11y: ربط ملصق الحقل بمنزلق Radix (role=slider) باسم قابل للوصول
  const labelId = React.useId();

  useEffect(() => {
    onChangeRef.current = onChange;
    onCommitRef.current = onCommit;
    onDragStartRef.current = onDragStart;
    onDragEndRef.current = onDragEnd;
  });

  // مزامنة القيمة المحلية عند تغيّر الـ prop من الخارج (طالما المستخدم لا يسحب حالياً)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
      latestValRef.current = value;
    }
  }, [value]);

  const flushPending = useCallback(() => {
    if (pendingRef.current !== null) {
      const val = pendingRef.current;
      pendingRef.current = null;
      onChangeRef.current(val);
    }
    rafRef.current = null;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingRef.current !== null) {
      const val = pendingRef.current;
      pendingRef.current = null;
      onChangeRef.current(val);
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const finalVal = latestValRef.current;
      onCommitRef.current?.(finalVal);
      onDragEndRef.current?.();
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    if (keyCommitTimerRef.current !== null) {
      window.clearTimeout(keyCommitTimerRef.current);
      keyCommitTimerRef.current = null;
    }
    isDraggingRef.current = true;
    onDragStartRef.current?.();

    // 🛡️ صمام أمان عالمي: رصد pointerup على مستوى window بالكامل
    // لضمان إنهاء حالة السحب حتى لو حرر المستخدم الفأرة خارج إطار السلايدر
    const handleGlobalPointerUp = () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      handleDragEnd();
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
  }, [handleDragEnd]);

  const handleChange = useCallback(
    (v: number[]) => {
      const newVal = v[0];
      setLocalValue(newVal);
      latestValRef.current = newVal;
      pendingRef.current = newVal;

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flushPending);
      }

      // تعديلات لوحة المفاتيح (أسهم/Home/End) لا تُطلق pointerdown/up
      if (!isDraggingRef.current) {
        if (keyCommitTimerRef.current !== null) window.clearTimeout(keyCommitTimerRef.current);
        keyCommitTimerRef.current = window.setTimeout(() => {
          keyCommitTimerRef.current = null;
          onCommitRef.current?.(newVal);
        }, 400);
      }
    },
    [flushPending],
  );

  const handleValueCommit = useCallback(
    (v: number[]) => {
      const commitVal = v[0] ?? latestValRef.current;
      latestValRef.current = commitVal;
      handleDragEnd();
    },
    [handleDragEnd],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (keyCommitTimerRef.current !== null) {
        window.clearTimeout(keyCommitTimerRef.current);
        keyCommitTimerRef.current = null;
        onCommitRef.current?.(latestValRef.current);
      }
    };
  }, []);

  const displayVal = valueFormatter
    ? valueFormatter(localValue)
    : `${localValue}${unit ? (unit === '%' || unit === '°' ? unit : ` ${unit}`) : ''}`;

  if (layout === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 select-none h-7',
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
      >
        <div
          id={labelId}
          className={cn(
            'flex items-center gap-1.5 text-xs font-normal text-foreground/80 shrink-0 select-none',
            labelWidth || 'w-16',
          )}
          title={typeof label === 'string' ? label : undefined}
        >
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <span className="truncate">{label}</span>
        </div>

        {/* 🛡️ بلا dir ثابت: يرث RTL كـ Progress (origin يمين) وكمفاتيح
            الأسهم لبقية عناصر RTL — الشارة الرقمية وحدها تبقى ltr */}
        <Slider
          aria-labelledby={labelId}
          value={[localValue]}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onValueChange={handleChange}
          onValueCommit={handleValueCommit}
          onPointerDown={handlePointerDown}
          className="py-1 flex-1"
        />

        <span
          dir="ltr"
          className="font-mono text-mini tabular-nums bg-muted/60 dark:bg-muted/40 px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground select-none shrink-0 min-w-10 text-center"
        >
          {displayVal}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-1.5 select-none',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      <div className="flex justify-between items-center text-xs">
        <div id={labelId} className="flex items-center gap-1.5 font-normal text-foreground/85">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <span>{label}</span>
        </div>
        <span
          dir="ltr"
          className="font-mono text-mini tabular-nums bg-muted/60 dark:bg-muted/40 px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground select-none"
        >
          {displayVal}
        </span>
      </div>

      {/* 🛡️ نفس إرث RTL أعلاه — الشارة الرقمية وحدها ltr */}
      <Slider
        aria-labelledby={labelId}
        value={[localValue]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={handleChange}
        onValueCommit={handleValueCommit}
        onPointerDown={handlePointerDown}
        className="py-1"
      />
    </div>
  );
});

FluentSliderField.displayName = 'FluentSliderField';
