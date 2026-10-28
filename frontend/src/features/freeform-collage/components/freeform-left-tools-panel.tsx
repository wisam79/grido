import React from 'react';

import { Button } from '@/components/ui/button';
import { Plus } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { PHOTO_PRESET_DIMENSIONS_MM, PHOTO_PRESET_LABELS } from '../lib/freeform-math';

import type { AutoPackStrategy, PhotoPresetType } from '../types';

interface FreeformLeftToolsPanelProps {
  mode?: 'insert' | 'pack';
  packGapMM: number;
  packMarginMM: number;
  onAddSlot: () => void;
  onAddPresetSlot: (presetType: PhotoPresetType) => void;
  onAutoPack: (strategy: AutoPackStrategy) => void;
  onPackGapChange: (mm: number) => void;
  onPackMarginChange: (mm: number) => void;
}

const AUTO_PACK_ITEMS: Array<{ strategy: AutoPackStrategy; label: string }> = [
  { strategy: 'id-max', label: 'بطاقات هوية' },
  { strategy: 'passport-max', label: 'جوازات سفر' },
  { strategy: 'transactions-max', label: 'معاملات رسمية' },
  { strategy: 'wallet-max', label: 'محفظة وبطاقات' },
  { strategy: 'combo-standard', label: 'مزيج جوازات + بطاقات' },
  { strategy: 'combo-family', label: 'مزيج عائلي (بورتريه + بطاقات)' },
];

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const inputId = React.useId();

  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <label htmlFor={inputId} className="text-muted-foreground">
        {label} <span className="text-micro">(مم)</span>
      </label>
      <div className="flex min-w-0 items-center gap-1" dir="ltr">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`تقليل ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-8 w-8 rounded-md p-0 shadow-none"
        >
          −
        </Button>
        <Input
          id={inputId}
          type="number"
          aria-label={label}
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => {
            const nextValue = event.target.valueAsNumber;
            if (Number.isFinite(nextValue)) onChange(Math.min(max, Math.max(min, nextValue)));
          }}
          className="h-8 w-14 min-w-0 rounded-md bg-background px-1 text-center text-xs tabular-nums shadow-none"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`زيادة ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-8 w-8 rounded-md p-0 shadow-none"
        >
          +
        </Button>
      </div>
    </div>
  );
}

export const FreeformLeftToolsPanel: React.FC<FreeformLeftToolsPanelProps> = React.memo(
  function FreeformLeftToolsPanel({
    mode = 'insert',
    packGapMM,
    packMarginMM,
    onAddSlot,
    onAddPresetSlot,
    onAutoPack,
    onPackGapChange,
    onPackMarginChange,
  }) {
    const [selectedStrategy, setSelectedStrategy] = React.useState<AutoPackStrategy>('id-max');
    const strategyGroupName = React.useId();

    return (
      <aside
        className="h-full min-h-0 min-w-0 overflow-y-auto bg-card font-cairo text-xs text-foreground"
        dir="rtl"
      >
        <div className="space-y-3 p-3">
          {mode === 'insert' ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="إضافة خلية فارغة"
                className="h-8 w-full gap-2 rounded-md shadow-none"
                onClick={onAddSlot}
              >
                <Plus className="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
                إضافة خلية
              </Button>
              <section className="space-y-2 border-t border-border/40 pt-3">
                <h3 className="flex items-center justify-between font-semibold">
                  <span>المقاسات الجاهزة</span>
                  <span className="font-normal text-muted-foreground">مم</span>
                </h3>
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  {Object.entries(PHOTO_PRESET_DIMENSIONS_MM).map(([key, dims]) => {
                    const label = PHOTO_PRESET_LABELS[key as PhotoPresetType];
                    const scale = 36 / Math.max(dims.w, dims.h);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-label={label}
                        onClick={() => onAddPresetSlot(key as PhotoPresetType)}
                        className="flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-md border border-border/60 bg-background p-2 text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span className="flex h-10 items-center justify-center" aria-hidden="true">
                          <span
                            className="block border border-muted-foreground/70"
                            style={{ width: dims.w * scale, height: dims.h * scale }}
                          />
                        </span>
                        <span className="w-full truncate font-semibold">
                          {label.replace(/\s*\([\d.]+\s*×\s*[\d.]+\)$/, '')}
                        </span>
                        <span className="text-micro tabular-nums text-muted-foreground" dir="ltr">
                          {dims.w} × {dims.h}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <>
              <fieldset className="min-w-0 space-y-1">
                <legend className="mb-2 font-semibold">نوع التعبئة</legend>
                {AUTO_PACK_ITEMS.map(({ strategy, label }) => (
                  <label
                    key={strategy}
                    className={cn(
                      'flex min-h-8 min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-primary/5',
                      selectedStrategy === strategy && 'bg-primary/10',
                    )}
                  >
                    <input
                      type="radio"
                      name={strategyGroupName}
                      value={strategy}
                      checked={selectedStrategy === strategy}
                      onChange={() => setSelectedStrategy(strategy)}
                      className="h-3.5 w-3.5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    />
                    <span className="min-w-0">{label}</span>
                  </label>
                ))}
              </fieldset>
              <section className="space-y-2 border-t border-border/40 pt-3">
                <Stepper
                  label="الفجوة"
                  value={packGapMM}
                  min={0}
                  max={10}
                  onChange={onPackGapChange}
                />
                <Stepper
                  label="الهامش"
                  value={packMarginMM}
                  min={0}
                  max={15}
                  onChange={onPackMarginChange}
                />
              </section>
              <div className="border-t border-border/40 pt-3">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full rounded-md shadow-none"
                  onClick={() => onAutoPack(selectedStrategy)}
                >
                  تعبئة الورقة
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    );
  },
);
