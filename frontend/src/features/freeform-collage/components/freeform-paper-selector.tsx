import React, { useState } from 'react';

import { ArrowClockwise } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { COMMON_PAPER_PRESETS } from './freeform-paper-presets';
import { FreeformToolButton } from './freeform-top-action-bar';

const clampPaperDim = (value: number): number => {
  if (!Number.isFinite(value)) return 20;
  return Math.min(1000, Math.max(20, Math.round(value)));
};

interface PaperDimInputProps {
  value: number;
  onCommit: (v: number) => void;
  ariaLabel: string;
}

/**
 * حقل إدخال بُعد الورقة المليمتري — متوافق مع Fluent 2
 */
export const PaperDimInput: React.FC<PaperDimInputProps> = ({ value, onCommit, ariaLabel }) => {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    if (!focused) setText(String(value));
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      dir="ltr"
      aria-label={ariaLabel}
      value={text}
      className="h-7 text-mini rounded-md w-[52px] font-mono font-black text-center bg-background border-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
      onBlur={() => {
        setFocused(false);
        const v = clampPaperDim(Number(text || '0'));
        setText(String(v));
        onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
      }}
    />
  );
};

interface FreeformPaperSelectorProps {
  paperWidthMM: number;
  paperHeightMM: number;
  onPaperDimensionsChange: (widthMM: number, heightMM: number) => void;
  className?: string;
}

export const FreeformPaperSelector: React.FC<FreeformPaperSelectorProps> = React.memo(
  function FreeformPaperSelector({
    paperWidthMM,
    paperHeightMM,
    onPaperDimensionsChange,
    className,
  }) {
    const currentPreset = COMMON_PAPER_PRESETS.find(
      (p) =>
        (p.w === paperWidthMM && p.h === paperHeightMM) ||
        (p.w === paperHeightMM && p.h === paperWidthMM),
    );
    const currentPresetId = currentPreset?.id || 'custom';

    return (
      <div className={cn('flex flex-wrap items-center gap-2 text-xs font-cairo', className)}>
        <Select
          value={currentPresetId}
          onValueChange={(val) => {
            const found = COMMON_PAPER_PRESETS.find((p) => p.id === val);
            if (found) {
              onPaperDimensionsChange(found.w, found.h);
            }
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label="مقاس الورق"
            className="h-7 text-mini font-bold rounded-md bg-background border-border/60 min-w-[110px] shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <SelectValue>{currentPreset?.name.replace(/\s*\(.*\)$/, '') || 'مخصص'}</SelectValue>
          </SelectTrigger>
          <SelectContent className="font-cairo z-(--z-print-toolbar) rounded-lg border-border/60 max-h-64">
            <SelectItem value="custom" className="text-mini font-bold rounded-md">
              مخصص
            </SelectItem>
            {COMMON_PAPER_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-mini font-bold rounded-md">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-3.5 bg-border/60 shrink-0" />

        <div className="flex items-center gap-0.5 font-mono shrink-0" dir="ltr">
          <PaperDimInput
            value={paperWidthMM}
            ariaLabel="عرض الورقة"
            onCommit={(w) => onPaperDimensionsChange(w, paperHeightMM)}
          />
          <span className="text-micro font-extrabold text-muted-foreground">×</span>
          <PaperDimInput
            value={paperHeightMM}
            ariaLabel="ارتفاع الورقة"
            onCommit={(h) => onPaperDimensionsChange(paperWidthMM, h)}
          />
          <span className="text-mini text-muted-foreground font-cairo">مم</span>
        </div>
        <FreeformToolButton
          title="تدوير الورقة"
          onClick={() => onPaperDimensionsChange(paperHeightMM, paperWidthMM)}
        >
          <ArrowClockwise className="size-4" />
        </FreeformToolButton>
      </div>
    );
  },
);
