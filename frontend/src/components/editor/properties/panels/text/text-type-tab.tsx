import { FluentSection, FluentSettingRow } from '@/components/ui/blocks';
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextAlignRight,
  TextAlignCenter,
  TextAlignLeft,
  Stamp,
  Tag,
} from '@/components/ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEditorStore, type TextElement } from '@/lib/editor-store';
import { loadGoogleFont } from '@/lib/io/fonts';
import { TEXT_PRESETS } from '@/lib/templates';
import { cn } from '@/lib/utils';

import { TextFontSelector } from './text-font-selector';
import { WEIGHT_OPTIONS } from './text-tab-types';
import { ColorField, ColorPanel } from '../../color-panel';

import type { TextTabProps } from './text-tab-types';

const MODULAR_FONT_SIZES = [
  10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 144, 180, 200,
];

const LINE_HEIGHT_OPTIONS = [
  { value: 0.9, label: '0.9x' },
  { value: 1.0, label: '1.0x' },
  { value: 1.1, label: '1.1x' },
  { value: 1.2, label: '1.2x — الافتراضي' },
  { value: 1.3, label: '1.3x' },
  { value: 1.4, label: '1.4x' },
  { value: 1.5, label: '1.5x' },
  { value: 1.8, label: '1.8x' },
  { value: 2.0, label: '2.0x' },
];

const LETTER_SPACING_OPTIONS = [
  { value: -2, label: '-2px' },
  { value: -1, label: '-1px' },
  { value: 0, label: '0px — الافتراضي' },
  { value: 1, label: '+1px' },
  { value: 2, label: '+2px' },
  { value: 4, label: '+4px' },
  { value: 6, label: '+6px' },
  { value: 8, label: '+8px' },
  { value: 12, label: '+12px' },
  { value: 16, label: '+16px' },
];

const CASE_OPTIONS = [
  { id: 'none', label: 'Aa', title: 'كما هو' },
  { id: 'uppercase', label: 'AA', title: 'أحرف كبيرة' },
  { id: 'lowercase', label: 'aa', title: 'أحرف صغيرة' },
  { id: 'capitalize', label: 'Abc', title: 'بداية كل كلمة كبيرة' },
] as const;

/** أنماط زخرفية (decorative) لا تدخل كتالوج الإدراج — تُطبَّق على النص المحدد */
const DECORATIVE_PRESETS = [
  { id: 'badge', icon: Tag },
  { id: 'stamp-circle', icon: Stamp },
] as const;

const selectClassName =
  'w-full min-w-0 h-8 bg-background hover:bg-accent/45 border-border/60 px-2 text-xs font-normal text-foreground shadow-none';
const selectContentClassName =
  'z-(--z-popover) max-h-[min(16rem,var(--radix-select-content-available-height))] font-cairo';

export function TextTypeTab({ element, onUpdate }: TextTabProps) {
  const isBold = (element.fontWeight || 400) >= 700;
  const isItalic = element.fontStyle === 'italic';
  const isUnderline = element.textDecoration === 'underline';
  const isLineThrough = element.textDecoration === 'line-through';
  const textAlign = element.textAlign || 'center';
  const isArabicNumerals = element.arabicNumerals === true;
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    element.text || '',
  );
  const isAuto = element.textSizing === 'auto';
  const wrapMode = element.wrap || 'word';

  const currentFontSize = element.fontSize ?? 32;
  const currentLineHeight = element.lineHeight ?? 1.2;
  const currentSpacing = element.letterSpacing ?? 0;

  const commit = (patch: Partial<TextElement>) => {
    onUpdate(element.id, patch);
    useEditorStore.getState().pushHistory();
  };

  const handleSizingChange = (next: 'auto' | 'fixed') => {
    if (next === 'auto') {
      // الملاءمة الفعلية تحدث في المتجر: auto + قياس العرض/الارتفاع والموضع
      useEditorStore.getState().fitTextToContent(element.id);
      return;
    }
    commit({ textSizing: 'fixed' });
  };

  const choiceClassName = (active: boolean) =>
    cn(
      'h-8 rounded-md border text-xs transition-colors cursor-pointer select-none',
      'flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
      active
        ? 'bg-primary/10 border-primary/35 text-primary font-bold shadow-2xs'
        : 'bg-muted/20 border-border/50 text-muted-foreground font-semibold hover:bg-muted/50 hover:text-foreground',
    );

  const iconToggleClassName = (active: boolean) =>
    cn(
      'h-8 rounded-md border transition-colors cursor-pointer',
      'flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
      active
        ? 'bg-primary/10 border-primary/35 text-primary shadow-2xs'
        : 'bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
    );

  return (
    <ColorPanel wheelPosition="top">
      <div className="space-y-2.5 animate-in fade-in duration-150 font-cairo">
        <FluentSection title="الخط" collapsible defaultOpen={true}>
          <TextFontSelector element={element} />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-mini font-bold text-muted-foreground block">الوزن</span>
              <Select
                dir="rtl"
                value={String(element.fontWeight ?? 400)}
                onValueChange={(value) => {
                  const weight = Number(value);
                  void loadGoogleFont(element.fontFamily || 'Cairo', weight, element.fontStyle);
                  commit({ fontWeight: weight });
                }}
              >
                <SelectTrigger aria-label="وزن الخط" className={selectClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClassName}>
                  {WEIGHT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="h-8">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-mini font-bold text-muted-foreground block">الحجم</span>
              <Select
                dir="rtl"
                value={String(currentFontSize)}
                onValueChange={(value) => commit({ fontSize: Number(value) })}
              >
                <SelectTrigger aria-label="حجم الخط" className={selectClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClassName}>
                  {!MODULAR_FONT_SIZES.includes(currentFontSize) && (
                    <SelectItem value={String(currentFontSize)} className="h-8">
                      <span dir="ltr" className="tabular-nums">
                        {currentFontSize}px
                      </span>
                    </SelectItem>
                  )}
                  {MODULAR_FONT_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)} className="h-8">
                      <span dir="ltr" className="tabular-nums">
                        {size}px
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1" role="group" aria-label="نمط الخط">
            <button
              type="button"
              onClick={() => {
                const nextWeight = isBold ? 400 : 700;
                loadGoogleFont(element.fontFamily || 'Cairo', nextWeight, element.fontStyle);
                commit({ fontWeight: nextWeight });
              }}
              className={iconToggleClassName(isBold)}
              title="عريض"
              aria-label="خط عريض"
              aria-pressed={isBold}
            >
              <TextB className="w-4 h-4" weight={isBold ? 'bold' : 'regular'} />
            </button>

            <button
              type="button"
              onClick={() => commit({ fontStyle: isItalic ? 'normal' : 'italic' })}
              className={iconToggleClassName(isItalic)}
              title="مائل"
              aria-label="خط مائل"
              aria-pressed={isItalic}
            >
              <TextItalic className="w-4 h-4" weight={isItalic ? 'bold' : 'regular'} />
            </button>

            <button
              type="button"
              onClick={() => commit({ textDecoration: isUnderline ? 'none' : 'underline' })}
              className={iconToggleClassName(isUnderline)}
              title="تسطير"
              aria-label="تسطير النص"
              aria-pressed={isUnderline}
            >
              <TextUnderline className="w-4 h-4" weight={isUnderline ? 'bold' : 'regular'} />
            </button>

            <button
              type="button"
              onClick={() => commit({ textDecoration: isLineThrough ? 'none' : 'line-through' })}
              className={iconToggleClassName(isLineThrough)}
              title="شطب"
              aria-label="شطب النص"
              aria-pressed={isLineThrough}
            >
              <TextStrikethrough className="w-4 h-4" weight={isLineThrough ? 'bold' : 'regular'} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1" role="group" aria-label="حالة الأحرف">
            {CASE_OPTIONS.map((opt) => {
              const active = (element.textTransform || 'none') === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => commit({ textTransform: opt.id })}
                  className={cn(choiceClassName(active), 'text-mini')}
                  title={opt.title}
                  aria-label={opt.title}
                  aria-pressed={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </FluentSection>

        <FluentSection title="التنسيق" collapsible defaultOpen={true}>
          <div className="grid grid-cols-3 gap-1" role="group" aria-label="محاذاة النص">
            <button
              type="button"
              onClick={() => commit({ textAlign: 'right' })}
              className={iconToggleClassName(textAlign === 'right')}
              title="محاذاة يمين"
              aria-label="محاذاة يمين"
              aria-pressed={textAlign === 'right'}
            >
              <TextAlignRight
                className="w-4 h-4"
                weight={textAlign === 'right' ? 'bold' : 'regular'}
              />
            </button>
            <button
              type="button"
              onClick={() => commit({ textAlign: 'center' })}
              className={iconToggleClassName(textAlign === 'center')}
              title="توسيط أفقي"
              aria-label="توسيط أفقي"
              aria-pressed={textAlign === 'center'}
            >
              <TextAlignCenter
                className="w-4 h-4"
                weight={textAlign === 'center' ? 'bold' : 'regular'}
              />
            </button>
            <button
              type="button"
              onClick={() => commit({ textAlign: 'left' })}
              className={iconToggleClassName(textAlign === 'left')}
              title="محاذاة يسار"
              aria-label="محاذاة يسار"
              aria-pressed={textAlign === 'left'}
            >
              <TextAlignLeft
                className="w-4 h-4"
                weight={textAlign === 'left' ? 'bold' : 'regular'}
              />
            </button>
          </div>

          <FluentSettingRow label="لون النص">
            <ColorField
              color={element.color || '#000000'}
              onChange={(col) => commit({ color: col })}
              swatchOnly
              ariaLabel="لون النص"
            />
          </FluentSettingRow>

          <FluentSettingRow
            label="أرقام مشرقية"
            tooltip="عرض الأرقام بالصيغة العربية ١٢٣ داخل النص"
          >
            <Switch
              checked={isArabicNumerals}
              onCheckedChange={(checked) => commit({ arabicNumerals: checked })}
              aria-label="أرقام مشرقية"
            />
          </FluentSettingRow>
        </FluentSection>

        <FluentSection title="الملاءمة" collapsible defaultOpen={true}>
          <div className="grid grid-cols-2 gap-1" role="group" aria-label="مقاس صندوق النص">
            <button
              type="button"
              onClick={() => handleSizingChange('auto')}
              className={choiceClassName(isAuto)}
              title="يلتصق الصندوق بالنص: العرض بأطول سطر والارتفاع بحجم الكتلة"
              aria-pressed={isAuto}
            >
              تلقائي
            </button>
            <button
              type="button"
              onClick={() => handleSizingChange('fixed')}
              className={choiceClassName(!isAuto)}
              title="عرض ثابت يلتف حوله النص، والارتفاع يتبع المحتوى"
              aria-pressed={!isAuto}
            >
              ثابت
            </button>
          </div>

          {!isAuto && (
            <div className="grid grid-cols-3 gap-1" role="group" aria-label="التفاف النص">
              {(
                [
                  { id: 'word', label: 'كلمات' },
                  { id: 'char', label: 'أحرف' },
                  { id: 'none', label: 'بلا' },
                ] as const
              ).map((mode) => {
                const active = wrapMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => commit({ wrap: mode.id })}
                    className={choiceClassName(active)}
                    title={`التفاف: ${mode.label}`}
                    aria-label={`التفاف النص: ${mode.label}`}
                    aria-pressed={active}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          )}
        </FluentSection>

        <FluentSection title="أنماط زخرفية" collapsible defaultOpen={true}>
          <div className="grid grid-cols-2 gap-1" role="group" aria-label="أنماط زخرفية">
            {DECORATIVE_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const label = TEXT_PRESETS[preset.id].label;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => useEditorStore.getState().applyTextPreset(element.id, preset.id)}
                  className={cn(choiceClassName(false), 'gap-1.5')}
                  title={`تطبيق نمط ${label}`}
                  aria-label={`تطبيق نمط ${label}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" weight="bold" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </FluentSection>

        <FluentSection title="التباعد" collapsible defaultOpen={true}>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-mini font-bold text-muted-foreground block">ارتفاع السطر</span>
              <Select
                dir="rtl"
                value={String(currentLineHeight)}
                onValueChange={(value) => commit({ lineHeight: Number(value) })}
              >
                <SelectTrigger aria-label="ارتفاع السطر" className={selectClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClassName}>
                  {!LINE_HEIGHT_OPTIONS.some((option) => option.value === currentLineHeight) && (
                    <SelectItem value={String(currentLineHeight)} className="h-8">
                      <span dir="ltr" className="tabular-nums">
                        {currentLineHeight}x
                      </span>
                    </SelectItem>
                  )}
                  {LINE_HEIGHT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)} className="h-8">
                      <span dir="auto" className="tabular-nums">
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-mini font-bold text-muted-foreground block">
                {isArabic ? 'تباعد الكلمات' : 'تباعد الحروف'}
              </span>
              <Select
                dir="rtl"
                value={String(currentSpacing)}
                onValueChange={(value) => commit({ letterSpacing: Number(value) })}
              >
                <SelectTrigger
                  aria-label={isArabic ? 'تباعد الكلمات' : 'تباعد الحروف'}
                  className={selectClassName}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClassName}>
                  {!LETTER_SPACING_OPTIONS.some((option) => option.value === currentSpacing) && (
                    <SelectItem value={String(currentSpacing)} className="h-8">
                      <span dir="ltr" className="tabular-nums">
                        {currentSpacing}px
                      </span>
                    </SelectItem>
                  )}
                  {LETTER_SPACING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)} className="h-8">
                      <span dir="auto" className="tabular-nums">
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FluentSection>
      </div>
    </ColorPanel>
  );
}
