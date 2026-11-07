import {
  FluentSection,
  FluentSegmentedControl,
  FluentSliderField,
  FluentSettingRow,
} from '@/components/ui/blocks';
import { ArrowCounterClockwise } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { CURATED_PALETTES } from '../constants';
import { StickerFontSelector } from './sticker-font-selector';

import type { StickerFinish, StickerParams, StickerTemplate } from '../types';

const FINISH_OPTIONS: { id: StickerFinish; label: string }[] = [
  { id: 'standard', label: 'عادي' },
  { id: 'glossy', label: 'لامع' },
  { id: 'matte', label: 'مطفي' },
  { id: 'holographic', label: 'هولوغرام' },
];

interface ColorRoleButtonProps {
  label: string;
  color: string;
  disabled?: boolean;
  onChange: (color: string) => void;
}

function ColorRoleButton({ label, color, disabled, onChange }: ColorRoleButtonProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-md bg-card/60 border transition-colors',
        disabled
          ? 'opacity-35 pointer-events-none border-border/40'
          : 'border-border/40 hover:border-primary/60 cursor-pointer group',
      )}
      title={`${label}: ${color}`}
    >
      <div className="relative w-6 h-6 rounded-md border border-black/15 shadow-2xs overflow-hidden shrink-0">
        <span className="w-full h-full block" style={{ backgroundColor: color }} />
        <input
          type="color"
          value={color.startsWith('#') && color.length === 7 ? color : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title={label}
        />
      </div>
      <span className="text-micro font-semibold text-foreground/80">{label}</span>
    </div>
  );
}

export interface StickerDesignTabProps {
  template: StickerTemplate;
  params: StickerParams;
  onChangeParams: (updater: (prev: StickerParams) => StickerParams) => void;
  /** التزام صريح كخطوة تراجع مستقلة (لوحات جاهزة، تبديل الخط) */
  commit: (updater: (prev: StickerParams) => StickerParams) => void;
  fontWeights?: readonly number[];
  onPreviewFont?: (family: string) => void;
  onCancelFontPreview?: () => void;
  contrastWarning: string | null;
  onFieldChange: (fieldId: string, value: string) => void;
  onColorChange: (
    key: 'primaryColor' | 'secondaryColor' | 'backgroundColor',
    color: string,
  ) => void;
}

/** تبويب «التصميم» في لوح خصائص الملصق — النصوص والألوان والمظهر */
export function StickerDesignTab({
  template,
  params,
  onChangeParams,
  commit,
  fontWeights,
  onPreviewFont,
  onCancelFontPreview,
  contrastWarning,
  onFieldChange,
  onColorChange,
}: StickerDesignTabProps) {
  return (
    <>
      {/* 1. النصوص */}
      {template.fields.length > 0 && (
        <FluentSection title="النصوص" collapsible defaultOpen>
          <div className="space-y-2">
            {template.fields.map((field) => {
              const val = params.fields[field.id] ?? field.defaultValue;
              const isModified = val !== field.defaultValue;
              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={`sticker-field-${field.id}`}
                      className="text-mini font-semibold text-foreground/85"
                    >
                      {field.label}
                    </Label>
                    {isModified && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onFieldChange(field.id, field.defaultValue)}
                            className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer rounded transition-colors"
                          >
                            <ArrowCounterClockwise className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs font-cairo">
                          استعادة
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Input
                    id={`sticker-field-${field.id}`}
                    value={val}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || field.label}
                    className="h-8 text-xs rounded-md bg-background border-border/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none text-foreground"
                  />
                </div>
              );
            })}
          </div>
        </FluentSection>
      )}

      {/* 2. الألوان */}
      <FluentSection title="الألوان" collapsible defaultOpen>
        <div className="grid grid-cols-4 gap-1.5">
          <ColorRoleButton
            label="الأساسي"
            color={params.primaryColor}
            onChange={(c) => onColorChange('primaryColor', c)}
          />
          <ColorRoleButton
            label="الثانوي"
            color={params.secondaryColor}
            onChange={(c) => onColorChange('secondaryColor', c)}
          />
          <ColorRoleButton
            label="الخلفية"
            color={params.backgroundColor}
            disabled={params.isTransparent}
            onChange={(c) => onColorChange('backgroundColor', c)}
          />
          <button
            type="button"
            onClick={() =>
              onChangeParams((prev) => ({ ...prev, isTransparent: !prev.isTransparent }))
            }
            className={cn(
              'relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-md border transition-colors cursor-pointer text-center',
              params.isTransparent
                ? 'bg-card text-foreground border border-border/80 dark:border-white/15 shadow-xs font-bold ring-1 ring-primary/40'
                : 'bg-card/60 border-border/40 text-muted-foreground hover:text-foreground hover:bg-card',
            )}
            title={params.isTransparent ? 'مفرغة (انقر للإلغاء)' : 'تفريغ'}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-md border flex items-center justify-center shrink-0 text-xs font-bold',
                params.isTransparent
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border/50 bg-muted/40 text-muted-foreground',
              )}
            >
              ∅
            </div>
            <span className="text-micro font-semibold">
              {params.isTransparent ? 'مفرغة' : 'شفافة'}
            </span>
          </button>
        </div>

        {/* تحذير التباين المنخفض للطباعة */}
        {contrastWarning && (
          <p
            role="note"
            className="text-micro leading-relaxed px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300"
          >
            تباين منخفض قد يُطبع باهتاً: {contrastWarning} — جرّب لوحة أغمق أو خلفية أفتح.
          </p>
        )}

        {/* Curated Quick Palettes */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {CURATED_PALETTES.map((palette) => {
            const isActive =
              params.primaryColor.toLowerCase() === palette.primary.toLowerCase() &&
              params.secondaryColor.toLowerCase() === palette.secondary.toLowerCase() &&
              params.backgroundColor.toLowerCase() === palette.background.toLowerCase() &&
              !params.isTransparent;

            return (
              <Tooltip key={palette.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() =>
                      commit((prev) => ({
                        ...prev,
                        primaryColor: palette.primary,
                        secondaryColor: palette.secondary,
                        backgroundColor: palette.background,
                        isTransparent: false,
                      }))
                    }
                    className={cn(
                      'h-7 px-2 rounded-md border flex items-center gap-1 shrink-0 transition-colors cursor-pointer',
                      isActive
                        ? 'bg-primary/15 border-primary shadow-2xs ring-1 ring-primary/40'
                        : 'bg-background/60 hover:bg-background border-border/40 hover:border-border/70',
                    )}
                    aria-label={palette.name}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: palette.primary }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: palette.secondary }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: palette.background }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-cairo font-medium">
                  {palette.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </FluentSection>

      {/* 3. المظهر */}
      <FluentSection title="المظهر" collapsible defaultOpen>
        {/* Font Selector */}
        <StickerFontSelector
          key={template.id}
          value={params.fontFamily || 'Cairo'}
          fontWeights={fontWeights}
          onPreview={onPreviewFont}
          onCancel={onCancelFontPreview}
          onChange={(family) => {
            commit((prev) => ({ ...prev, fontFamily: family }));
          }}
        />

        {/* Font Scale Slider */}
        <FluentSliderField
          label="حجم الخط"
          value={params.fontScale ?? 1}
          min={0.8}
          max={1.3}
          step={0.05}
          unit="x"
          valueFormatter={(v) => `${v.toFixed(2)}x`}
          onChange={(val) => onChangeParams((prev) => ({ ...prev, fontScale: val }))}
        />

        {/* Finish Options */}
        <div className="pt-1 border-t border-border/30 space-y-1.5">
          <span className="text-mini font-bold text-muted-foreground block">اللمسة</span>
          <FluentSegmentedControl
            layoutId="sticker-finish-tabs"
            value={params.finish || 'standard'}
            onChange={(finish) =>
              onChangeParams((prev) => ({ ...prev, finish: finish as StickerFinish }))
            }
            options={FINISH_OPTIONS.map((f) => ({ id: f.id, label: f.label }))}
            ariaLabel="لمسة الملصق"
            className="w-full"
          />
        </div>

        {/* Die-cut Cutline Toggle */}
        <FluentSettingRow
          label="إطار القص"
          tooltip="خط القص حول الملصق لقصه آلياً في المطابع"
          control={
            <Switch
              id="diecut-toggle"
              checked={params.dieCutBorder ?? true}
              onCheckedChange={(checked) =>
                onChangeParams((prev) => ({ ...prev, dieCutBorder: checked }))
              }
            />
          }
        />
      </FluentSection>
    </>
  );
}
