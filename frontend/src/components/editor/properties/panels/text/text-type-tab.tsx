import { FluentSection, FluentSettingRow, FluentSliderField } from '@/components/ui/blocks';
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextAlignRight,
  TextAlignCenter,
  TextAlignLeft,
} from '@/components/ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { isArabicText } from '@/lib/canvas/text-helpers';
import { useEditorStore, type TextElement } from '@/lib/editor-store';
import { loadGoogleFont } from '@/lib/io/fonts';

import { FontSizeField } from './font-size-field';
import { ControlRow, ToggleGroup, ToggleItem } from './text-controls';
import { TextFontSelector } from './text-font-selector';
import { WEIGHT_OPTIONS } from './text-tab-types';
import { ColorField, ColorPanel } from '../../color-panel';

import type { TextTabProps } from './text-tab-types';

const CASE_OPTIONS = [
  { id: 'none', label: 'Aa', title: 'كما هو' },
  { id: 'uppercase', label: 'AA', title: 'أحرف كبيرة' },
  { id: 'lowercase', label: 'aa', title: 'أحرف صغيرة' },
  { id: 'capitalize', label: 'Abc', title: 'بداية كل كلمة كبيرة' },
] as const;

const ALIGN_OPTIONS = [
  { id: 'right', label: 'محاذاة يمين', icon: TextAlignRight },
  { id: 'center', label: 'توسيط أفقي', icon: TextAlignCenter },
  { id: 'left', label: 'محاذاة يسار', icon: TextAlignLeft },
] as const;

const WRAP_OPTIONS = [
  { id: 'word', label: 'كلمات' },
  { id: 'char', label: 'أحرف' },
  { id: 'none', label: 'بلا' },
] as const;

const DIGITS_RE = /[0-9\u0660-\u0669\u06F0-\u06F9]/;

const selectContentClassName =
  'z-(--z-popover) max-h-[min(16rem,var(--radix-select-content-available-height))] font-cairo';

export function TextTypeTab({ element, onUpdate }: TextTabProps) {
  const isBold = (element.fontWeight || 400) >= 700;
  const isItalic = element.fontStyle === 'italic';
  const isUnderline = element.textDecoration === 'underline';
  const isLineThrough = element.textDecoration === 'line-through';
  const textAlign = element.textAlign || 'center';
  const textTransform = element.textTransform || 'none';
  const isArabicNumerals = element.arabicNumerals === true;
  const isArabic = isArabicText(element.text);
  const isAuto = element.textSizing === 'auto';
  const wrapMode = element.wrap || 'word';
  const isSolidFill = !element.fillType || element.fillType === 'solid';

  // إظهار سياقي: حالة الأحرف لا معنى لها في نص عربي، والأرقام المشرقية
  // لا معنى لها في نص بلا أرقام — إلا إن كان الخيار مفعّلاً فيبقى قابلاً للإلغاء.
  const showCase = !isArabic || textTransform !== 'none';
  const showNumerals = DIGITS_RE.test(element.text || '') || isArabicNumerals;

  const currentFontSize = element.fontSize ?? 32;
  const currentLineHeight = element.lineHeight ?? 1.2;
  const currentSpacing = element.letterSpacing ?? 0;

  const commit = (patch: Partial<TextElement>) => {
    // تعديل مقاييس الخط من لوحة الخصائص يبدأ تخطيطاً متمركزاً جديداً ولا يرث ركن تحجيم زاوية قديم
    const resetsAnchor =
      'fontSize' in patch ||
      'fontWeight' in patch ||
      'fontStyle' in patch ||
      'lineHeight' in patch ||
      'letterSpacing' in patch ||
      'textTransform' in patch;
    onUpdate(element.id, resetsAnchor ? { ...patch, textResizeAnchor: undefined } : patch);
    useEditorStore.getState().pushHistory();
  };

  /** تحديث حي أثناء السحب بلا لقطة تراجع — اللقطة عند الإفلات (onCommit). */
  const preview = (patch: Partial<TextElement>) =>
    onUpdate(element.id, { ...patch, textResizeAnchor: undefined });
  const pushHistory = () => useEditorStore.getState().pushHistory();

  const handleSizingChange = (next: 'auto' | 'fixed') => {
    if (next === 'auto') {
      // الملاءمة الفعلية تحدث في المتجر: auto + قياس العرض/الارتفاع والموضع
      useEditorStore.getState().fitTextToContent(element.id);
      return;
    }
    commit({ textSizing: 'fixed' });
  };

  const setWeight = (weight: number) => {
    void loadGoogleFont(element.fontFamily || 'Cairo', weight, element.fontStyle);
    commit({ fontWeight: weight });
  };

  return (
    <ColorPanel wheelPosition="top">
      <div className="space-y-2.5 animate-in fade-in duration-150 font-cairo">
        <FluentSection title="الخط" collapsible defaultOpen={true}>
          <TextFontSelector element={element} />

          <div className="flex items-center gap-1.5">
            <Select
              dir="rtl"
              value={String(element.fontWeight ?? 400)}
              onValueChange={(value) => setWeight(Number(value))}
            >
              <SelectTrigger
                aria-label="وزن الخط"
                className="h-8 min-w-0 flex-1 border-border/60 bg-background px-2 text-xs font-normal text-foreground shadow-none hover:bg-accent/45"
              >
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

            <FontSizeField
              value={currentFontSize}
              onCommit={(size) => commit({ fontSize: size })}
              className="w-27 shrink-0"
            />
          </div>

          <div className="grid grid-cols-[4fr_3fr] gap-1.5">
            <ToggleGroup label="نمط الخط">
              <ToggleItem
                active={isBold}
                onClick={() => setWeight(isBold ? 400 : 700)}
                label="خط عريض"
                title="عريض"
              >
                <TextB className="w-4 h-4" weight={isBold ? 'bold' : 'regular'} />
              </ToggleItem>
              <ToggleItem
                active={isItalic}
                onClick={() => commit({ fontStyle: isItalic ? 'normal' : 'italic' })}
                label="خط مائل"
                title="مائل"
              >
                <TextItalic className="w-4 h-4" weight={isItalic ? 'bold' : 'regular'} />
              </ToggleItem>
              <ToggleItem
                active={isUnderline}
                onClick={() => commit({ textDecoration: isUnderline ? 'none' : 'underline' })}
                label="تسطير النص"
                title="تسطير"
              >
                <TextUnderline className="w-4 h-4" weight={isUnderline ? 'bold' : 'regular'} />
              </ToggleItem>
              <ToggleItem
                active={isLineThrough}
                onClick={() => commit({ textDecoration: isLineThrough ? 'none' : 'line-through' })}
                label="شطب النص"
                title="شطب"
              >
                <TextStrikethrough
                  className="w-4 h-4"
                  weight={isLineThrough ? 'bold' : 'regular'}
                />
              </ToggleItem>
            </ToggleGroup>

            <ToggleGroup label="محاذاة النص">
              {ALIGN_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = textAlign === opt.id;
                return (
                  <ToggleItem
                    key={opt.id}
                    active={active}
                    onClick={() => commit({ textAlign: opt.id })}
                    label={opt.label}
                  >
                    <Icon className="w-4 h-4" weight={active ? 'bold' : 'regular'} />
                  </ToggleItem>
                );
              })}
            </ToggleGroup>
          </div>

          {showCase && (
            <ToggleGroup label="حالة الأحرف">
              {CASE_OPTIONS.map((opt) => (
                <ToggleItem
                  key={opt.id}
                  active={textTransform === opt.id}
                  onClick={() => commit({ textTransform: opt.id })}
                  label={opt.title}
                >
                  <span dir="ltr">{opt.label}</span>
                </ToggleItem>
              ))}
            </ToggleGroup>
          )}

          {/* مبرر بقاء اللون هنا رغم تبويب الألوان: تغيير اللون المصمت أكثر عملية
              على النص؛ ويظهر للتعبئة المصمتة فقط — التدرج والصورة حصراً في تبويب الألوان. */}
          {isSolidFill && (
            <FluentSettingRow label="اللون">
              <ColorField
                color={element.color || '#000000'}
                onChange={(col) => onUpdate(element.id, { color: col })}
                onCommit={pushHistory}
                swatchOnly
                ariaLabel="لون النص"
              />
            </FluentSettingRow>
          )}

          {showNumerals && (
            <FluentSettingRow label="أرقام مشرقية" tooltip="عرض الأرقام بالصيغة ١٢٣ داخل النص">
              <Switch
                checked={isArabicNumerals}
                onCheckedChange={(checked) => commit({ arabicNumerals: checked })}
                aria-label="أرقام مشرقية"
              />
            </FluentSettingRow>
          )}
        </FluentSection>

        <FluentSection title="التباعد" collapsible defaultOpen={true}>
          <FluentSliderField
            layout="inline"
            label="ارتفاع السطر"
            value={currentLineHeight}
            min={0.8}
            max={3}
            step={0.05}
            defaultValue={1.2}
            onChange={(v) => preview({ lineHeight: v })}
            onCommit={pushHistory}
          />
          <FluentSliderField
            layout="inline"
            label={isArabic ? 'تباعد الكلمات' : 'تباعد الحروف'}
            value={currentSpacing}
            min={isArabic ? 0 : -5}
            max={40}
            step={0.5}
            unit="px"
            defaultValue={0}
            onChange={(v) => preview({ letterSpacing: v })}
            onCommit={pushHistory}
          />
        </FluentSection>

        <FluentSection title="الملاءمة" collapsible defaultOpen={true}>
          <ControlRow label="الصندوق">
            <ToggleGroup label="مقاس صندوق النص" className="w-full">
              <ToggleItem
                active={isAuto}
                onClick={() => handleSizingChange('auto')}
                label="تلقائي"
                title="يلتصق الصندوق بالنص: العرض بأطول سطر والارتفاع بحجم الكتلة"
              >
                تلقائي
              </ToggleItem>
              <ToggleItem
                active={!isAuto}
                onClick={() => handleSizingChange('fixed')}
                label="ثابت"
                title="عرض ثابت يلتف حوله النص، والارتفاع يتبع المحتوى"
              >
                ثابت
              </ToggleItem>
            </ToggleGroup>
          </ControlRow>

          {!isAuto && (
            <ControlRow label="الالتفاف">
              <ToggleGroup label="التفاف النص" className="w-full">
                {WRAP_OPTIONS.map((mode) => (
                  <ToggleItem
                    key={mode.id}
                    active={wrapMode === mode.id}
                    onClick={() => commit({ wrap: mode.id })}
                    label={`التفاف النص: ${mode.label}`}
                    title={`التفاف: ${mode.label}`}
                  >
                    {mode.label}
                  </ToggleItem>
                ))}
              </ToggleGroup>
            </ControlRow>
          )}
        </FluentSection>
      </div>
    </ColorPanel>
  );
}
