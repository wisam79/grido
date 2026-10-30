import React, { useEffect, useState, useRef, useCallback } from 'react';

import { ArrowCounterClockwise } from '@/components/ui/icons';
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
  /** عند تمريره يظهر زر إعادة تعيين كلما ابتعدت القيمة عنه */
  defaultValue?: number;
}

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** يقبل الأرقام العربية-الهندية والفارسية والفاصلة العشرية العربية */
function normalizeNumericInput(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EXTENDED_ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/٫/g, '.')
    .replace(/[^\d.-]/g, '');
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isFinite(rounded) ? String(rounded) : '0';
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
  defaultValue,
}: FluentSliderFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const latestValRef = useRef(value);
  const isDraggingRef = useRef(false);
  const pendingRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const keyCommitTimerRef = useRef<number | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const skipCommitRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editable = !valueFormatter;
  const canReset =
    editable &&
    !disabled &&
    defaultValue !== undefined &&
    Math.abs(localValue - defaultValue) > 1e-9;

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

  // 🛡️ القيمة المكتوبة تُقيَّد بالمدى وتُقرَّب لخانتين، ولا تُدفع أثناء الكتابة
  // (الدفع عند Enter/الخروج من الحقل فقط) منعاً لإعادة رسم الكانفس لكل حرف.
  const applyValue = useCallback(
    (next: number) => {
      const bounded = Math.min(max, Math.max(min, Math.round(next * 100) / 100));
      if (Math.abs(bounded - latestValRef.current) < 1e-9) return bounded;
      setLocalValue(bounded);
      latestValRef.current = bounded;
      onChangeRef.current(bounded);
      onCommitRef.current?.(bounded);
      return bounded;
    },
    [min, max],
  );

  const beginEditing = useCallback(() => {
    skipCommitRef.current = false;
    if (!editable || disabled) return;
    setDraft(formatNumber(latestValRef.current));
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [editable, disabled]);

  const commitEditing = useCallback(() => {
    setIsEditing(false);
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      return;
    }
    const parsed = Number.parseFloat(normalizeNumericInput(draft));
    if (!Number.isFinite(parsed)) return;
    applyValue(parsed);
  }, [draft, applyValue]);

  const handleNumericKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitEditing();
        // تجاهل blur التالي بعد تثبيت القيمة (منع دفعة ثانية لا معنى لها)
        skipCommitRef.current = true;
        inputRef.current?.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setIsEditing(false);
        skipCommitRef.current = true;
        inputRef.current?.blur();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const direction = event.key === 'ArrowUp' ? 1 : -1;
        const next = applyValue(latestValRef.current + direction * step);
        setDraft(formatNumber(next));
      }
    },
    [applyValue, commitEditing, step],
  );

  const resetToDefault = useCallback(() => {
    if (defaultValue === undefined) return;
    const next = applyValue(defaultValue);
    setDraft(formatNumber(next));
  }, [applyValue, defaultValue]);

  const displayVal = valueFormatter ? valueFormatter(localValue) : formatNumber(localValue);

  const valueControl = (
    <div dir="ltr" className="flex items-center gap-0.5 shrink-0">
      {defaultValue !== undefined && (
        <span className="inline-flex h-6 w-6 items-center justify-center shrink-0">
          {canReset && (
            <button
              type="button"
              onClick={resetToDefault}
              aria-label="إعادة تعيين إلى القيمة الافتراضية"
              title="إعادة تعيين"
              className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              <ArrowCounterClockwise className="w-3 h-3" weight="bold" />
            </button>
          )}
        </span>
      )}
      <span
        dir="ltr"
        title={editable ? `من ${min} إلى ${max}${unit ? ` ${unit}` : ''}` : undefined}
        className="flex min-w-14 items-center justify-between gap-1 font-mono text-mini tabular-nums bg-muted/60 dark:bg-muted/40 ps-1.5 pe-1 py-0.5 rounded border border-border/40 text-muted-foreground select-none shrink-0 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40"
      >
        {editable ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={typeof label === 'string' ? `قيمة ${label}` : 'قيمة الإعداد'}
            value={isEditing ? draft : formatNumber(localValue)}
            onFocus={beginEditing}
            onBlur={commitEditing}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleNumericKeyDown}
            disabled={disabled}
            className="w-9 bg-transparent text-center outline-none font-mono text-mini tabular-nums text-inherit"
          />
        ) : (
          <span className="text-center px-0.5">{displayVal}</span>
        )}
        {editable && unit && <span className="text-muted-foreground/80">{unit}</span>}
      </span>
    </div>
  );

  if (layout === 'inline') {
    return (
      <div
        className={cn(
          'flex min-w-0 items-center gap-2 select-none min-h-8',
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
      >
        <div
          id={labelId}
          className={cn(
            'flex items-center gap-1.5 text-xs font-normal text-foreground/80 shrink-0 select-none',
            // 80px بدل 64px: تسعة أحرف عربية كاملة بلا بتر في عمود 296px،
            // بعد حذف أيقونة الصف التي كانت تلتهم 18px من العرض.
            labelWidth || 'w-20',
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
          className="py-2 min-w-0 flex-1"
        />

        {valueControl}
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
        {valueControl}
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
