import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowsOut,
  CaretDown,
  Cursor,
  LockSimple,
  LockSimpleOpen,
  Ruler,
  SlidersHorizontal,
} from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

/** حقل رقم ملمي مصمم — ملصق أيقوني مدمج + وحدة مم + تقييد داخل حدود الورقة */
function MmField({
  icon,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
        title={label}
      >
        {icon}
      </span>
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pr-7 pl-7 text-center font-mono text-mini font-bold rounded-md bg-input/40 border-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        dir="ltr"
        aria-label={label}
      />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-2xs font-bold text-muted-foreground pointer-events-none font-mono">
        مم
      </span>
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
    if (!slot) {
      return (
        <aside
          className="w-[248px] shrink-0 border-s border-border/40 bg-card/60 backdrop-blur-sm h-full min-h-0 overflow-y-auto font-cairo select-none"
          dir="rtl"
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[160px] p-4 text-center gap-1.5 text-muted-foreground">
            <SlidersHorizontal className="w-6 h-6 opacity-30 text-primary" weight="duotone" />
            <span className="text-xs font-bold text-foreground">لا خلية محددة</span>
            <span className="text-micro leading-relaxed">انقر خلية لضبط المقاس والموقع</span>
          </div>
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
        className="w-[248px] shrink-0 border-s border-border/40 bg-card/60 backdrop-blur-sm h-full min-h-0 overflow-y-auto font-cairo text-xs select-none"
        dir="rtl"
      >
        <div className="space-y-2.5 p-3">
          {/* الرأس: التسمية + التحديد الجماعي */}
          <div className="flex items-center justify-between gap-1.5 border-b border-border/40 pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="font-bold text-foreground truncate">
                {slot.label || 'خلية مخصصة'}
              </span>
            </div>
            {multiSelectedCount > 1 && (
              <span
                className="font-mono text-micro font-black text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 shrink-0"
                dir="ltr"
              >
                ×{multiSelectedCount}
              </span>
            )}
          </div>

          {/* قائمة المقاسات */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full justify-between px-2 text-mini gap-1 rounded-md border-border/70 hover:border-primary/40 cursor-pointer shrink-0 font-bold"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <ArrowsOut className="w-3 h-3 text-primary/70" weight="bold" />
                  <span className="truncate">
                    {PHOTO_PRESET_LABELS[slot.presetType || 'custom']}
                  </span>
                </span>
                <CaretDown className="w-2.5 h-2.5 opacity-60" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 font-cairo text-xs z-(--z-print-toolbar)"
            >
              {Object.entries(PHOTO_PRESET_DIMENSIONS_MM).map(([key, dims]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleSelectPreset(key as PhotoPresetType)}
                  className="flex items-center justify-between cursor-pointer py-1.5"
                >
                  <span>{PHOTO_PRESET_LABELS[key as PhotoPresetType]}</span>
                  <span className="font-mono text-micro text-muted-foreground" dir="ltr">
                    {dims.w}×{dims.h}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* الأبعاد مع قفل النسبة */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-micro text-muted-foreground font-bold">
              <span>الأبعاد</span>
              <button
                type="button"
                onClick={toggleAspectLock}
                aria-label={slot.lockAspect ? 'فك القفل' : 'قفل النسبة'}
                className={cn(
                  'cursor-pointer p-0.5 rounded transition-colors duration-150',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                  slot.lockAspect
                    ? 'text-primary'
                    : 'text-muted-foreground/60 hover:text-foreground',
                )}
              >
                {slot.lockAspect ? (
                  <LockSimple className="w-3 h-3 text-primary" weight="fill" />
                ) : (
                  <LockSimpleOpen className="w-3 h-3" weight="bold" />
                )}
              </button>
            </div>
            <div className="grid grid-cols-[1fr_20px_1fr] items-center gap-1.5" dir="ltr">
              <MmField
                icon={<Ruler className="w-3 h-3" weight="bold" />}
                label="العرض"
                value={wMM}
                min={5}
                max={paperWidthMM}
                step={0.5}
                onChange={handleWidthChange}
              />
              <span className="text-micro font-bold text-muted-foreground/60 text-center">×</span>
              <MmField
                icon={<Ruler className="w-3 h-3 rotate-90" weight="bold" />}
                label="الارتفاع"
                value={hMM}
                min={5}
                max={paperHeightMM}
                step={0.5}
                onChange={handleHeightChange}
              />
            </div>
          </div>

          {/* الموقع: X , Y */}
          <div className="space-y-1.5">
            <span className="text-micro text-muted-foreground font-bold">الموقع (0,0)</span>
            <div className="grid grid-cols-[1fr_20px_1fr] items-center gap-1.5" dir="ltr">
              <MmField
                icon={<Cursor className="w-3 h-3" weight="bold" />}
                label="الموقع X"
                value={xMM}
                min={0}
                max={paperWidthMM - wMM}
                step={0.5}
                onChange={handleXChange}
              />
              <span className="text-micro font-bold text-muted-foreground/60 text-center">,</span>
              <MmField
                icon={<Cursor className="w-3 h-3 rotate-90" weight="bold" />}
                label="الموقع Y"
                value={yMM}
                min={0}
                max={paperHeightMM - hMM}
                step={0.5}
                onChange={handleYChange}
              />
            </div>
          </div>
        </div>
      </aside>
    );
  },
);
