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

import type { FreeformSlot, PhotoPresetType } from '../types';

interface FreeformRightInspectorPanelProps {
  slot: FreeformSlot | undefined;
  /** عدد خلايا التحديد الكلي (الأساسية + المتعدد) */
  multiSelectedCount: number;
  paperWidthMM: number;
  paperHeightMM: number;
  onUpdateSlot: (updated: Partial<FreeformSlot>) => void;
}

function MmField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: string) => void;
}) {
  const inputId = React.useId();

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
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  }) {
    const presetId = React.useId();

    if (!slot) {
      return (
        <aside
          className="h-full min-h-0 min-w-0 overflow-y-auto bg-card font-cairo text-xs text-muted-foreground"
          dir="rtl"
        >
          <p className="p-4 text-center">لا خلية محددة</p>
        </aside>
      );
    }

    const xMM = Math.round(slot.x * paperWidthMM * 10) / 10;
    const yMM = Math.round(slot.y * paperHeightMM * 10) / 10;
    const wMM = Math.round(slot.w * paperWidthMM * 10) / 10;
    const hMM = Math.round(slot.h * paperHeightMM * 10) / 10;

    const handleWidthChange = (valStr: string) => {
      const num = parseFloat(valStr);
      if (isNaN(num) || num <= 0) return;
      const clampedMM = Math.min(paperWidthMM - xMM, Math.max(5, num));
      const newWRel = clampedMM / paperWidthMM;
      if (slot.lockAspect && slot.w > 0) {
        const aspect = (slot.w * paperWidthMM) / (slot.h * paperHeightMM);
        const newHRel = clampedMM / aspect / paperHeightMM;
        onUpdateSlot({ w: newWRel, h: Math.min(1 - slot.y, newHRel) });
      } else {
        onUpdateSlot({ w: newWRel });
      }
    };

    const handleHeightChange = (valStr: string) => {
      const num = parseFloat(valStr);
      if (isNaN(num) || num <= 0) return;
      const clampedMM = Math.min(paperHeightMM - yMM, Math.max(5, num));
      const newHRel = clampedMM / paperHeightMM;
      if (slot.lockAspect && slot.h > 0) {
        const aspect = (slot.w * paperWidthMM) / (slot.h * paperHeightMM);
        const newWRel = (clampedMM * aspect) / paperWidthMM;
        onUpdateSlot({ h: newHRel, w: Math.min(1 - slot.x, newWRel) });
      } else {
        onUpdateSlot({ h: newHRel });
      }
    };

    const handleXChange = (valStr: string) => {
      const num = parseFloat(valStr);
      if (isNaN(num)) return;
      const clampedMM = Math.min(paperWidthMM - wMM, Math.max(0, num));
      onUpdateSlot({ x: clampedMM / paperWidthMM });
    };

    const handleYChange = (valStr: string) => {
      const num = parseFloat(valStr);
      if (isNaN(num)) return;
      const clampedMM = Math.min(paperHeightMM - hMM, Math.max(0, num));
      onUpdateSlot({ y: clampedMM / paperHeightMM });
    };

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
      <aside
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
                <SelectContent className="z-(--z-print-toolbar) font-cairo text-xs">
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
                <TooltipContent className="z-(--z-print-toolbar)">
                  {slot.lockAspect ? 'فك قفل النسبة' : 'قفل النسبة'}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <MmField
                label="العرض"
                value={wMM}
                min={5}
                max={paperWidthMM}
                step={0.5}
                onChange={handleWidthChange}
              />
              <MmField
                label="الارتفاع"
                value={hMM}
                min={5}
                max={paperHeightMM}
                step={0.5}
                onChange={handleHeightChange}
              />
            </div>
          </section>

          <section className="space-y-2 border-t border-border/40 pt-3">
            <h3 className="font-semibold">الموقع</h3>
            <div className="grid min-w-0 grid-cols-2 gap-2" dir="ltr">
              <MmField
                label="الموقع X"
                value={xMM}
                min={0}
                max={paperWidthMM - wMM}
                step={0.5}
                onChange={handleXChange}
              />
              <MmField
                label="الموقع Y"
                value={yMM}
                min={0}
                max={paperHeightMM - hMM}
                step={0.5}
                onChange={handleYChange}
              />
            </div>
          </section>
        </div>
      </aside>
    );
  },
);
