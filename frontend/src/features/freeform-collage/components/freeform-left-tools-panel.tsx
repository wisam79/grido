import React from 'react';

import { Button } from '@/components/ui/button';
import { Lightning, Plus, Ruler, FilePlus } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

import { PHOTO_PRESET_DIMENSIONS_MM, PHOTO_PRESET_LABELS } from '../lib/freeform-math';

import type { AutoPackStrategy, PhotoPresetType } from '../types';

interface FreeformLeftToolsPanelProps {
  packGapMM: number;
  packMarginMM: number;
  onAddSlot: () => void;
  onAddPresetSlot: (presetType: PhotoPresetType) => void;
  onAutoPack: (strategy: AutoPackStrategy) => void;
  onPackGapChange: (mm: number) => void;
  onPackMarginChange: (mm: number) => void;
}

const AUTO_PACK_ITEMS: Array<{ strategy: AutoPackStrategy; label: string; badge?: string }> = [
  { strategy: 'id-max', label: 'بطاقات هوية', badge: 'ID' },
  { strategy: 'passport-max', label: 'جوازات سفر', badge: 'PP' },
  { strategy: 'transactions-max', label: 'معاملات رسمية', badge: 'TR' },
  { strategy: 'wallet-max', label: 'محفظة وبطاقات', badge: 'WL' },
  { strategy: 'combo-standard', label: 'مزيج جوازات + بطاقات' },
  { strategy: 'combo-family', label: 'مزيج عائلي (بورتريه + بطاقات)' },
];

/** زر عدّاد مدمج −/+ (28px) */
const Stepper: React.FC<{
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}> = ({ value, min, max, onChange }) => (
  <div className="flex items-center gap-0.5" dir="ltr">
    <button
      type="button"
      aria-label="تقليل"
      onClick={() => onChange(Math.max(min, value - 1))}
      className="h-7 w-7 rounded-md text-mini font-black bg-background border border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      −
    </button>
    <span className="w-10 text-center text-micro font-bold" dir="ltr">
      <span className="font-mono">{value}</span> <span className="font-cairo">مم</span>
    </span>
    <button
      type="button"
      aria-label="زيادة"
      onClick={() => onChange(Math.min(max, value + 1))}
      className="h-7 w-7 rounded-md text-mini font-black bg-background border border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      +
    </button>
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <span className="flex items-center gap-1.5 text-micro font-bold text-muted-foreground">
    {icon}
    {children}
  </span>
);

export const FreeformLeftToolsPanel: React.FC<FreeformLeftToolsPanelProps> = React.memo(
  function FreeformLeftToolsPanel({
    packGapMM,
    packMarginMM,
    onAddSlot,
    onAddPresetSlot,
    onAutoPack,
    onPackGapChange,
    onPackMarginChange,
  }) {
    return (
      <aside
        className="w-[248px] shrink-0 border-e border-border/40 bg-card/60 backdrop-blur-sm h-full min-h-0 overflow-y-auto font-cairo text-xs select-none"
        dir="rtl"
      >
        <div className="p-3 space-y-3">
          {/* الإضافة */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 justify-start gap-1.5 rounded-md border-border/60 hover:bg-muted font-semibold cursor-pointer"
            onClick={onAddSlot}
          >
            <Plus className="w-3.5 h-3.5 text-primary" weight="bold" />
            <span>إضافة خلية فارغة</span>
          </Button>

          {/* المقاسات الجاهزة — من المصدر الواحد PHOTO_PRESET_DIMENSIONS_MM */}
          <section className="space-y-1">
            <SectionTitle icon={<FilePlus className="w-3 h-3 text-primary/70" weight="bold" />}>
              مقاس جاهز
            </SectionTitle>
            {Object.entries(PHOTO_PRESET_DIMENSIONS_MM).map(([key, dims]) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                className="w-full h-7 justify-between rounded-md text-mini font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => onAddPresetSlot(key as PhotoPresetType)}
              >
                <span className="truncate">{PHOTO_PRESET_LABELS[key as PhotoPresetType]}</span>
                <span className="font-mono text-micro text-muted-foreground/70" dir="ltr">
                  {dims.w}×{dims.h}
                </span>
              </Button>
            ))}
          </section>

          <div className="border-t border-border/40" />

          {/* التعبئة الذكية */}
          <section className="space-y-1">
            <SectionTitle icon={<Lightning className="w-3 h-3 text-primary/70" weight="fill" />}>
              تعبئة ذكية
            </SectionTitle>
            {AUTO_PACK_ITEMS.map(({ strategy, label, badge }) => (
              <Button
                key={strategy}
                variant={badge ? 'outline' : 'ghost'}
                size="sm"
                className={cn(
                  'w-full h-7 justify-between rounded-md text-mini font-semibold cursor-pointer',
                  badge
                    ? 'border-border/60 hover:bg-muted'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => onAutoPack(strategy)}
              >
                <span className="truncate">{label}</span>
                {badge && (
                  <span className="text-micro text-muted-foreground font-mono shrink-0">
                    {badge}
                  </span>
                )}
              </Button>
            ))}
          </section>

          <div className="border-t border-border/40" />

          {/* الفجوة والهامش */}
          <section className="space-y-2">
            <SectionTitle icon={<Ruler className="w-3 h-3 text-primary/70" weight="bold" />}>
              الفجوة والهامش
            </SectionTitle>
            <div className="flex items-center justify-between gap-2">
              <span className="text-micro text-muted-foreground shrink-0">الفجوة</span>
              <Stepper value={packGapMM} min={0} max={10} onChange={onPackGapChange} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-micro text-muted-foreground shrink-0">الهامش</span>
              <Stepper value={packMarginMM} min={0} max={15} onChange={onPackMarginChange} />
            </div>
          </section>
        </div>
      </aside>
    );
  },
);
