import React from 'react';

import { ArrowClockwise, LockSimple, LockSimpleOpen } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { FreeformToolButton } from './freeform-top-action-bar';
import { PHOTO_PRESET_DIMENSIONS_MM, PHOTO_PRESET_LABELS } from '../lib/freeform-math';
import { MIN_SIZE } from '../lib/slots/constants';
import { fitLockedDimensions } from '../lib/slots/slot-resize';

import type { FreeformSlot, PhotoPresetType } from '../types';

interface FreeformRightInspectorPanelProps {
  slot: FreeformSlot | undefined;
  /** عدد خلايا التحديد الكلي (الأساسية + المتعدد) */
  multiSelectedCount: number;
  paperWidthMM: number;
  paperHeightMM: number;
  onUpdateSlot: (updated: Partial<FreeformSlot>) => void;
  onBeginEdit?: () => void;
  onCommitEdit?: () => void;
  onCancelEdit?: () => void;
}

function MmField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onBeginEdit,
  onCommitEdit,
  onCancelEdit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: string) => void;
  onBeginEdit?: () => void;
  onCommitEdit?: () => void;
  onCancelEdit?: () => void;
}) {
  const inputId = React.useId();
  const [draft, setDraft] = React.useState<string | null>(null);
  const skipBlurRef = React.useRef(false);

  const commitDraft = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '' || !Number.isFinite(Number(trimmed))) return;
    onChange(trimmed);
  };

  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={inputId} className="flex items-center justify-between text-muted-foreground">
        <span>{label}</span>
        <span className="text-micro">مم</span>
      </label>
      <Input
        id={inputId}
        type="number"
        step={step}
        min={min}
        max={max}
        value={draft ?? value}
        onFocus={() => {
          skipBlurRef.current = false;
          setDraft(String(value));
          onBeginEdit?.();
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const num = Number(raw);
          if (raw.trim() !== '' && Number.isFinite(num)) {
            // Preview clamps geometry, not the visible typing buffer (3 can become 35).
            onChange(raw);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            skipBlurRef.current = true;
            if (e.key === 'Enter') {
              commitDraft(e.currentTarget.value);
              onCommitEdit?.();
            } else {
              onCancelEdit?.();
            }
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
        onBlur={() => {
          if (skipBlurRef.current) {
            skipBlurRef.current = false;
            setDraft(null);
            return;
          }
          if (draft !== null) {
            commitDraft(draft);
            onCommitEdit?.();
          }
          setDraft(null);
        }}
        className="h-8 min-w-0 rounded-md border-border/60 bg-background px-2 text-center text-xs tabular-nums shadow-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        dir="ltr"
        aria-label={label}
      />
    </div>
  );
}

export const FreeformRightInspectorPanel: React.FC<FreeformRightInspectorPanelProps> = React.memo(
  function FreeformRightInspectorPanel({
    slot,
    multiSelectedCount,
    paperWidthMM,
    paperHeightMM,
    onUpdateSlot,
    onBeginEdit,
    onCommitEdit,
    onCancelEdit,
  }) {
    const presetId = React.useId();
    const editCallbacks = { onBeginEdit, onCommitEdit, onCancelEdit };

    if (!slot) {
      return (
        <div
          className="h-full min-h-0 min-w-0 overflow-y-auto bg-card font-cairo text-xs text-muted-foreground"
          dir="rtl"
        >
          <p className="p-4 text-center">لا خلية محددة</p>
        </div>
      );
    }

    const xMM = Math.round(slot.x * paperWidthMM * 10) / 10;
    const yMM = Math.round(slot.y * paperHeightMM * 10) / 10;
    const wMM = Math.round(slot.w * paperWidthMM * 10) / 10;
    const hMM = Math.round(slot.h * paperHeightMM * 10) / 10;

    const handleDimensionChange = (axis: 'w' | 'h', valStr: string) => {
      if (valStr.trim() === '') return;
      const num = Number(valStr);
      if (
        ![num, paperWidthMM, paperHeightMM, slot.x, slot.y, slot.w, slot.h].every(
          Number.isFinite,
        ) ||
        num <= 0 ||
        paperWidthMM <= 0 ||
        paperHeightMM <= 0 ||
        slot.x < 0 ||
        slot.y < 0 ||
        slot.w <= 0 ||
        slot.h <= 0
      )
        return;
      // All fitting values are millimetres; normalization happens only afterwards.
      const minWMM = Math.max(5, MIN_SIZE * paperWidthMM);
      const minHMM = Math.max(5, MIN_SIZE * paperHeightMM);
      const maxWMM = (1 - slot.x) * paperWidthMM;
      const maxHMM = (1 - slot.y) * paperHeightMM;
      if (slot.lockAspect) {
        const physicalRatio = (slot.w * paperWidthMM) / (slot.h * paperHeightMM);
        const fitted = fitLockedDimensions(
          axis === 'w' ? num : num * physicalRatio,
          axis === 'h' ? num : num / physicalRatio,
          minWMM,
          minHMM,
          maxWMM,
          maxHMM,
        );
        if (!fitted) return;
        const w = fitted.w / paperWidthMM;
        const h = fitted.h / paperHeightMM;
        if (Math.abs(w - slot.w) > 1e-12 || Math.abs(h - slot.h) > 1e-12) {
          onUpdateSlot({ w, h });
        }
      } else {
        const maxMM = axis === 'w' ? maxWMM : maxHMM;
        const minMM = axis === 'w' ? minWMM : minHMM;
        if (maxMM < minMM) return;
        const next =
          Math.min(maxMM, Math.max(minMM, num)) / (axis === 'w' ? paperWidthMM : paperHeightMM);
        if (Math.abs(next - slot[axis]) > 1e-12) onUpdateSlot({ [axis]: next });
      }
    };
    const handleWidthChange = (raw: string) => handleDimensionChange('w', raw);
    const handleHeightChange = (raw: string) => handleDimensionChange('h', raw);

    const handlePositionChange = (axis: 'x' | 'y', raw: string) => {
      const num = Number(raw);
      const paperMM = axis === 'x' ? paperWidthMM : paperHeightMM;
      const size = axis === 'x' ? slot.w : slot.h;
      if (raw.trim() === '' || ![num, paperMM, size].every(Number.isFinite) || paperMM <= 0) return;
      const next = Math.min(Math.max(0, 1 - size), Math.max(0, num / paperMM));
      if (Math.abs(next - slot[axis]) > 1e-12) onUpdateSlot({ [axis]: next });
    };
    const handleXChange = (raw: string) => handlePositionChange('x', raw);
    const handleYChange = (raw: string) => handlePositionChange('y', raw);

    const handleSelectPreset = (presetKey: PhotoPresetType) => {
      const dims = PHOTO_PRESET_DIMENSIONS_MM[presetKey];
      if (!dims) return;
      const newWRel = Math.min(1 - slot.x, dims.w / paperWidthMM);
      const newHRel = Math.min(1 - slot.y, dims.h / paperHeightMM);
      onUpdateSlot({
        presetType: presetKey,
        label: PHOTO_PRESET_LABELS[presetKey],
        w: newWRel,
        h: newHRel,
      });
    };

    const toggleAspectLock = () => {
      onUpdateSlot({ lockAspect: !slot.lockAspect });
    };

    return (
      <div
        className="h-full min-h-0 min-w-0 overflow-y-auto bg-card font-cairo text-xs text-foreground"
        dir="rtl"
      >
        <div className="space-y-3 p-3">
          <h3 className="border-b border-border/40 pb-3 font-semibold">
            {multiSelectedCount > 1 ? 'خصائص الخلية الأساسية' : 'خصائص الخلية'}
          </h3>

          <div className="min-w-0 space-y-2">
            <label htmlFor={presetId} className="text-muted-foreground">
              المقاس
            </label>
            <div className="flex items-center gap-1 min-w-0">
              <Select
                dir="rtl"
                value={slot.presetType || 'custom'}
                onValueChange={(value) => handleSelectPreset(value as PhotoPresetType)}
              >
                <SelectTrigger
                  id={presetId}
                  aria-label="المقاس"
                  className="h-8 w-full min-w-0 rounded-md bg-background shadow-none [&_[data-slot=select-value]]:min-w-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-cairo text-xs">
                  {Object.keys(PHOTO_PRESET_DIMENSIONS_MM).map((key) => (
                    <SelectItem key={key} value={key} className="min-h-8">
                      {PHOTO_PRESET_LABELS[key as PhotoPresetType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FreeformToolButton
                title="استعادة المقاس"
                onClick={() => handleSelectPreset(slot.presetType || 'custom')}
              >
                <ArrowClockwise className="size-4" />
              </FreeformToolButton>
            </div>
          </div>

          <section className="space-y-2 border-t border-border/40 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">الأبعاد</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleAspectLock}
                    aria-label="قفل النسبة"
                    aria-pressed={Boolean(slot.lockAspect)}
                    className={cn(
                      'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 hover:bg-primary/10',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      slot.lockAspect ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {slot.lockAspect ? (
                      <LockSimple className="h-3.5 w-3.5" weight="fill" aria-hidden="true" />
                    ) : (
                      <LockSimpleOpen className="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{slot.lockAspect ? 'فك قفل النسبة' : 'قفل النسبة'}</TooltipContent>
              </Tooltip>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <MmField
                key={`${slot.id}:width`}
                {...editCallbacks}
                label="العرض"
                value={wMM}
                min={Math.max(5, MIN_SIZE * paperWidthMM)}
                max={paperWidthMM}
                step={0.5}
                onChange={handleWidthChange}
              />
              <MmField
                key={`${slot.id}:height`}
                {...editCallbacks}
                label="الارتفاع"
                value={hMM}
                min={Math.max(5, MIN_SIZE * paperHeightMM)}
                max={paperHeightMM}
                step={0.5}
                onChange={handleHeightChange}
              />
            </div>
          </section>

          <section className="space-y-2 border-t border-border/40 pt-3">
            <h3 className="font-semibold">الموقع</h3>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <MmField
                key={`${slot.id}:x`}
                {...editCallbacks}
                label="الموقع X"
                value={xMM}
                min={0}
                max={Math.max(0, paperWidthMM - wMM)}
                step={0.5}
                onChange={handleXChange}
              />
              <MmField
                key={`${slot.id}:y`}
                {...editCallbacks}
                label="الموقع Y"
                value={yMM}
                min={0}
                max={Math.max(0, paperHeightMM - hMM)}
                step={0.5}
                onChange={handleYChange}
              />
            </div>
          </section>
        </div>
      </div>
    );
  },
);
