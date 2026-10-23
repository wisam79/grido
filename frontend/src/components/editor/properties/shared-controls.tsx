import React, { useEffect, useState, useRef, useCallback } from 'react';

import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { previewWhite } from '@/lib/canvas/canvas-colors';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { ColorField, ColorPanel } from './color-panel';
import { GradientPicker } from './gradient-picker';

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/10 last:border-b-0 text-xs">
      <span className="text-muted-foreground font-semibold">{label}</span>
      <span className="font-mono font-bold text-foreground/85 text-start" dir="auto">
        {value}
      </span>
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

  const handleChange = useCallback(
    (val: number[]) => {
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
    },
    [onChange],
  );

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
          {localValue}
          {unit === '°' || unit === '%' ? unit : ` ${unit}`}
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

/**
 * لوحة ألوان مساحة العمل المتقدمة للاستوديو
 * توفر عينات سريعة مباشرة + قطارة ألوان + منتقي مخصص
 */
/**
 * لوحة ألوان مساحة العمل المتقدمة للاستوديو
 * حقل هدف واحد + عجلة مضمّنة؛ العينات الجاهزة أُزيلت لصالح التخصيص الحر.
 */
export const StudioCanvasColorDeck = React.memo(function StudioCanvasColorDeck({
  color,
  onChange,
  className,
  compact = false,
  gradientColor2,
  onChangeGradientColor2,
  gradientAngle,
  onChangeGradientAngle,
}: {
  color: string;
  onChange: (hex: string) => void;
  className?: string;
  /** وضع مضغوط: ارتفاع أقل للحقل في الأدوات المدمجة */
  compact?: boolean;
  /** 🎨 تدرج الخلفية: لون النهاية — تفعيل التدرج يبدأ من اللون الأساسي الحالي */
  gradientColor2?: string | null;
  onChangeGradientColor2?: (c: string | null) => void;
  /** زاوية التدرج الخطي بالدرجات */
  gradientAngle?: number;
  onChangeGradientAngle?: (deg: number) => void;
}) {
  const hasGradientProps = typeof onChangeGradientColor2 === 'function';
  const isGradientActive = Boolean(gradientColor2);

  /** stops المكافئة للتدرج الحالي: بداية = اللون الأساسي، نهاية = اللون الثاني */
  const gradientStops: Array<number | string> = isGradientActive
    ? [0, color === 'transparent' ? previewWhite() : color, 1, gradientColor2 as string]
    : [0, color === 'transparent' ? previewWhite() : color, 1, '#2563EB'];

  /** استقبال stops من GradientPicker: اللون الأول = اللون الأساسي، الأخير = لون النهاية */
  const handleGradientStops = (stops: Array<number | string>) => {
    if (!hasGradientProps || stops.length < 4) return;
    const first = String(stops[1]);
    const last = String(stops[stops.length - 1]);
    onChange(first);
    onChangeGradientColor2(last);
  };

  /** تفعيل/إيقاف التدرج: التفعيل يبدأ التدرج من اللون الأساسي الحالي */
  const toggleGradient = () => {
    if (!hasGradientProps) return;
    onChangeGradientColor2(isGradientActive ? null : '#2563EB');
    useEditorStore.getState().pushHistory();
  };

  return (
    <ColorPanel
      wheelPosition="bottom"
      className={cn('w-full font-cairo', compact && 'space-y-1.5', className)}
    >
      <ColorField
        color={color}
        onChange={onChange}
        onCommit={() => useEditorStore.getState().pushHistory()}
        className={cn('w-full', compact && 'h-7')}
        ariaLabel="لون خلفية الورقة"
      />

      {/* تدرج خلفية الورقة — محرر اللونين والزاوية من GradientPicker الموحّد،
          بلا مبدّل نوع التعبئة (الورقة خطية دائماً) وبلا معرض التدرجات الجاهزة
          (المعرض الوحيد يعيش في تبويب الخلفيات) — فلا تتكرر أداة واحدة. */}
      {hasGradientProps && (
        <div className="pt-2 border-t border-border/30">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-foreground/90 font-semibold">تعبئة متدرجة</span>
            <Switch
              checked={isGradientActive}
              onCheckedChange={toggleGradient}
              aria-label="تعبئة متدرجة"
            />
          </div>

          {isGradientActive && (
            <GradientPicker
              fillType="linear"
              color={color === 'transparent' ? previewWhite() : color}
              colorStops={gradientStops}
              onChangeType={() => {}}
              onChangeSolidColor={onChange}
              onChangeColorStops={handleGradientStops}
              onCommitColor={() => useEditorStore.getState().pushHistory()}
              angle={gradientAngle ?? 135}
              onChangeAngle={(deg) => onChangeGradientAngle?.(deg)}
              onCommitAngle={() => useEditorStore.getState().pushHistory()}
              showFillType={false}
              showPresets={false}
            />
          )}
        </div>
      )}
    </ColorPanel>
  );
});
