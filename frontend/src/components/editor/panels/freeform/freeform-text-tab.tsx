import React, { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

import { FluentFilterChips } from '@/components/ui/blocks';
import {
  Calendar,
  Camera,
  Check,
  Plus,
  Sparkle,
  Stamp,
  Tag,
  TextHOne,
  TextHTwo,
  TextT,
  Article,
  X,
} from '@/components/ui/icons';
import { useEditorStore } from '@/lib/editor-store';
import { TEXT_PRESETS, type TextPresetType } from '@/lib/templates';
import { cn } from '@/lib/utils';

import { QUICK_TEXT_PRESETS, TEXT_FILTER_OPTIONS } from './freeform-panel-constants';

import type { QuickTextItem } from './freeform-panel-constants';

/**
 * معاينة حية واقعية وأنيقة لكل نمط نصي بهوية استوديو احترافية وخالية تماماً من الرموز التعبيرية غير الملائمة.
 */
function renderStudioTextPreview(preset: QuickTextItem) {
  switch (preset.id) {
    case 'gold-luxury':
      return (
        <div className="w-full h-full px-2.5 rounded-md bg-gradient-to-br from-amber-950/60 via-slate-950 to-amber-900/40 border border-amber-500/30 flex items-center justify-center text-center overflow-hidden relative shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.15),transparent_70%)]" />
          <span
            className="relative z-10 max-w-full text-center text-xs font-black font-cairo tracking-wide leading-tight break-words select-none"
            style={{
              background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #b45309 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 6px rgba(180, 83, 9, 0.5))',
            }}
          >
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'neon-glow':
      return (
        <div className="w-full h-full px-2 rounded-md bg-slate-950 border border-sky-500/40 flex items-center justify-center text-center overflow-hidden relative shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12),transparent_70%)]" />
          <span
            className="relative z-10 max-w-full text-center text-xs font-black tracking-wider leading-tight break-words text-sky-400 select-none"
            style={{
              fontFamily: 'Alexandria, sans-serif',
              textShadow: '0 0 6px rgba(56, 189, 248, 0.9), 0 0 14px rgba(2, 132, 199, 0.6)',
            }}
          >
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case '3d-title':
      return (
        <div className="w-full h-full px-2 rounded-md bg-indigo-950/25 border border-indigo-500/30 flex items-center justify-center text-center overflow-hidden">
          <span
            className="max-w-full text-center text-xs font-black leading-tight break-words text-indigo-400 select-none"
            style={{
              fontFamily: 'Changa, sans-serif',
              textShadow: '1.5px 1.5px 0px #312e81, 3px 3px 0px #1e1b4b',
            }}
          >
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'outline-modern':
      return (
        <div className="w-full h-full px-2 rounded-md bg-muted/40 border border-border/60 flex items-center justify-center text-center overflow-hidden">
          <span
            className="max-w-full text-center text-xs font-black tracking-widest leading-tight break-words text-transparent select-none"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              WebkitTextStroke: '1.2px currentColor',
              color: 'transparent',
            }}
          >
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'stamp-circle':
      return (
        <div className="w-full h-full px-2 rounded-md bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-center overflow-hidden">
          <div className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full border border-dashed border-rose-500/70 text-rose-600 dark:text-rose-400 font-bold text-mini text-center leading-tight break-words select-none -rotate-1">
            <Stamp className="w-3 h-3 shrink-0" weight="bold" />
            <span style={{ fontFamily: 'Reem Kufi, sans-serif' }}>
              {preset.sampleText || preset.label}
            </span>
          </div>
        </div>
      );

    case 'badge':
      return (
        <div className="w-full h-full px-2 rounded-md bg-muted/30 border border-border/50 flex items-center justify-center text-center overflow-hidden">
          <span className="inline-flex items-center max-w-full px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-mini text-center leading-tight break-words shadow-2xs font-tajawal select-none">
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'studio-date':
      return (
        <div className="w-full h-full px-2 rounded-md bg-muted/30 border border-border/50 flex items-center justify-center text-center overflow-hidden">
          <div className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md bg-card text-foreground border border-border/60 text-mini font-semibold shadow-2xs font-cairo select-none">
            <Calendar className="w-3 h-3 text-muted-foreground shrink-0" weight="bold" />
            <span className="truncate">تاريخ الجلسة</span>
          </div>
        </div>
      );

    case 'photographer-tag':
      return (
        <div className="w-full h-full px-2 rounded-md bg-muted/30 border border-border/50 flex items-center justify-center text-center overflow-hidden">
          <div className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md bg-card text-muted-foreground border border-border/60 text-mini font-medium shadow-2xs select-none">
            <Camera className="w-3 h-3 text-foreground/80 shrink-0" weight="bold" />
            <span className="truncate">بصمة وتوقيع المصور</span>
          </div>
        </div>
      );

    case 'watermark':
      return (
        <div className="w-full h-full px-2 rounded-md bg-muted/40 border border-border/50 flex items-center justify-center text-center overflow-hidden relative">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:6px_6px] dark:bg-[radial-gradient(#fff_1px,transparent_1px)]" />
          <span
            className="max-w-full text-center text-mini font-black text-foreground/35 -rotate-12 tracking-widest leading-tight break-words z-10 select-none"
            style={{ fontFamily: 'Alexandria, sans-serif' }}
          >
            GRIDO مسودة
          </span>
        </div>
      );

    case 'caption-card':
      return (
        <div className="w-full h-full px-2 rounded-md bg-muted/30 border border-border/50 flex items-center justify-center text-center overflow-hidden">
          <div className="max-w-full px-2.5 py-0.5 rounded border border-border/80 bg-background/90 text-foreground text-mini font-medium text-center leading-tight break-words shadow-2xs font-tajawal select-none">
            {preset.sampleText || preset.label}
          </div>
        </div>
      );

    case 'congrats':
      return (
        <div className="w-full h-full px-2 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-center overflow-hidden">
          <div className="inline-flex items-center gap-1 text-xs font-extrabold font-cairo text-emerald-700 dark:text-emerald-300 leading-tight break-words select-none">
            <Sparkle
              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
              weight="bold"
            />
            <span>{preset.sampleText || preset.label}</span>
          </div>
        </div>
      );

    case 'sale-offer':
      return (
        <div className="w-full h-full px-2 rounded-md bg-red-500/10 border border-red-500/25 flex items-center justify-center text-center overflow-hidden">
          <div
            className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-mini text-center leading-tight break-words tracking-wide shadow-2xs select-none"
            style={{ fontFamily: 'Changa, sans-serif' }}
          >
            <Tag className="w-3 h-3 shrink-0" weight="bold" />
            <span>{preset.sampleText || preset.label}</span>
          </div>
        </div>
      );

    case 'certificate':
      return (
        <div className="w-full h-full px-2 rounded-md bg-blue-950/10 dark:bg-blue-950/30 border border-blue-500/30 flex items-center justify-center text-center overflow-hidden">
          <span
            className="max-w-full text-center text-xs font-bold text-blue-900 dark:text-blue-200 tracking-wide leading-tight break-words border-b border-blue-500/40 pb-0.5 select-none"
            style={{ fontFamily: "'Reem Kufi', sans-serif" }}
          >
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'special-price':
      return (
        <div className="w-full h-full px-2 rounded-md bg-card border border-border/60 flex items-center justify-center text-center overflow-hidden">
          <div className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md bg-sky-600 text-white font-bold text-mini text-center leading-tight break-words shadow-2xs font-tajawal select-none">
            <Tag className="w-3 h-3 shrink-0" weight="bold" />
            <span>{preset.sampleText || preset.label}</span>
          </div>
        </div>
      );

    case 'heading':
      return (
        <div className="w-full h-full px-2 rounded-md bg-card border border-border/60 flex items-center justify-center text-center overflow-hidden">
          <span className="text-sm font-extrabold font-cairo text-foreground truncate select-none">
            عنوان رئيسي
          </span>
        </div>
      );

    case 'subheading':
      return (
        <div className="w-full h-full px-2 rounded-md bg-card border border-border/60 flex items-center justify-center text-center overflow-hidden">
          <span className="text-xs font-semibold text-foreground/80 truncate select-none">
            عنوان فرعي
          </span>
        </div>
      );

    case 'body':
      return (
        <div className="w-full h-full px-2 rounded-md bg-card border border-border/60 flex items-center justify-center text-center overflow-hidden">
          <span className="text-mini font-normal text-muted-foreground truncate select-none">
            فقرة تفصيلية مريحة
          </span>
        </div>
      );

    default:
      return (
        <div className="w-full h-full px-2 rounded-md bg-muted/60 border border-border/60 flex items-center justify-center text-center overflow-hidden">
          <span className="max-w-full text-center text-xs font-bold text-foreground leading-tight break-words select-none">
            {preset.sampleText || preset.label}
          </span>
        </div>
      );
  }
}

export const FreeformTextTab = React.memo(function FreeformTextTab() {
  const [selectedTextFilter, setSelectedTextFilter] = useState<string>('all');
  const [composerText, setComposerText] = useState<string>('');

  const addTextPreset = useEditorStore((state) => state.addTextPreset);
  const applyTextPreset = useEditorStore((state) => state.applyTextPreset);

  // الكشف عما إذا كان هناك عنصر نصي محدد حالياً على الكانفاس لتطبيق النمط عليه بذكاء
  const selectedTextElement = useEditorStore((state) => {
    const id = state.selectedId;
    if (!id) return null;
    const el = state.elements.find((x) => x.id === id);
    return el && el.type === 'text' ? el : null;
  });

  const displayedTextPresets = useMemo(() => {
    if (selectedTextFilter === 'all') {
      return QUICK_TEXT_PRESETS.filter((p) => p.category !== 'titles');
    }
    return QUICK_TEXT_PRESETS.filter((p) => p.category === selectedTextFilter);
  }, [selectedTextFilter]);

  // إدراج أو تطبيق النمط
  const handlePresetAction = useCallback(
    (presetId: TextPresetType, forceNew = false) => {
      if (selectedTextElement && !forceNew) {
        if (applyTextPreset) {
          applyTextPreset(selectedTextElement.id, presetId);
          toast.success(`تم تطبيق نمط ${TEXT_PRESETS[presetId].label} على النص المحدد`);
        }
      } else {
        const textToInsert = composerText.trim().length > 0 ? composerText.trim() : undefined;
        addTextPreset(presetId, textToInsert);
        toast.success(`أُضيف ${TEXT_PRESETS[presetId].label}`);
      }
    },
    [selectedTextElement, applyTextPreset, composerText, addTextPreset],
  );

  return (
    <div
      data-testid="studio-elements-text"
      className="space-y-3 font-cairo animate-in fade-in duration-150"
      dir="rtl"
    >
      {/* ✍️ 1. محرر النص السريع (Composer) — حقل اختياري يسبق الإدراج */}
      <div className="relative">
        <div className="relative flex items-center">
          <TextT
            className="w-3.5 h-3.5 absolute right-2.5 text-muted-foreground pointer-events-none"
            weight="bold"
          />
          <input
            type="text"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            placeholder="اكتب نصاً للإدراج السريع... (اختياري)"
            className="w-full h-8 pr-8 pl-8 rounded-lg bg-card hover:bg-accent/40 focus:bg-background border border-border/70 focus:border-primary focus:ring-1 focus:ring-primary text-xs font-medium text-foreground placeholder:text-muted-foreground/60 transition-colors outline-hidden shadow-2xs"
          />
          {composerText.length > 0 && (
            <button
              type="button"
              onClick={() => setComposerText('')}
              className="absolute left-2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              title="مسح النص"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* 🎯 2. شريط الوعي بالسياق: يوضح فورياً حالة التحديد دون تعقيد */}
      {selectedTextElement ? (
        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-200 text-mini animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 min-w-0">
            <Check
              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
              weight="bold"
            />
            <span className="truncate font-semibold">
              نص محدد: &ldquo;{selectedTextElement.text.slice(0, 18)}
              {selectedTextElement.text.length > 18 ? '...' : ''}&rdquo;
            </span>
          </div>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 shrink-0 font-medium">
            النقر يطبّق النمط
          </span>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground px-1 select-none">
          انقر على أي نمط للإدراج المباشر في منتصف الكانفاس
        </div>
      )}

      {/* 🏛️ 3. هرمية العناوين الأساسية (Core Typography Hierarchy) */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* H1 رئيسي */}
        <button
          type="button"
          data-testid="element-add-text-heading"
          onClick={() => handlePresetAction('heading')}
          title="عنوان رئيسي بارز (48px)"
          className="group flex flex-col items-center justify-center gap-0.5 h-11 px-1 rounded-lg bg-card hover:bg-accent border border-border/70 hover:border-foreground/30 transition-all duration-150 cursor-pointer shadow-2xs select-none"
        >
          <div className="flex items-center gap-1">
            <TextHOne className="w-3.5 h-3.5 text-foreground shrink-0" weight="bold" />
            <span className="text-xs font-bold text-foreground">رئيسي</span>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">48px</span>
        </button>

        {/* H2 فرعي */}
        <button
          type="button"
          data-testid="element-add-text-subheading"
          onClick={() => handlePresetAction('subheading')}
          title="عنوان فرعي متناسق (28px)"
          className="group flex flex-col items-center justify-center gap-0.5 h-11 px-1 rounded-lg bg-card hover:bg-accent border border-border/70 hover:border-foreground/30 transition-all duration-150 cursor-pointer shadow-2xs select-none"
        >
          <div className="flex items-center gap-1">
            <TextHTwo className="w-3.5 h-3.5 text-foreground/80 shrink-0" weight="bold" />
            <span className="text-xs font-semibold text-foreground">فرعي</span>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">28px</span>
        </button>

        {/* P فقرة */}
        <button
          type="button"
          data-testid="element-add-text-body"
          onClick={() => handlePresetAction('body')}
          title="نص فقرة مريح (18px)"
          className="group flex flex-col items-center justify-center gap-0.5 h-11 px-1 rounded-lg bg-card hover:bg-accent border border-border/70 hover:border-foreground/30 transition-all duration-150 cursor-pointer shadow-2xs select-none"
        >
          <div className="flex items-center gap-1">
            <Article className="w-3.5 h-3.5 text-muted-foreground shrink-0" weight="bold" />
            <span className="text-xs font-normal text-foreground">فقرة</span>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">18px</span>
        </button>

        {/* Caption توثيق */}
        <button
          type="button"
          data-testid="element-add-text-caption"
          onClick={() => handlePresetAction('caption-card')}
          title="توثيق وهامش مؤطر (16px)"
          className="group flex flex-col items-center justify-center gap-0.5 h-11 px-1 rounded-lg bg-card hover:bg-accent border border-border/70 hover:border-foreground/30 transition-all duration-150 cursor-pointer shadow-2xs select-none"
        >
          <div className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" weight="bold" />
            <span className="text-xs font-medium text-foreground">توثيق</span>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">16px</span>
        </button>
      </div>

      {/* 🏷️ 4. شريط الكبسولات الذكية لتصفية الأنماط */}
      <FluentFilterChips
        layoutId="freeform-text-filter-chips"
        value={selectedTextFilter}
        onChange={setSelectedTextFilter}
        size="sm"
        className="w-full justify-between"
        options={TEXT_FILTER_OPTIONS}
      />

      {/* 🎴 5. شبكة بطاقات الأنماط والتأثيرات الجاهزة مع معاينة حية واقعية WYSIWYG */}
      <div className="grid grid-cols-2 gap-2">
        {displayedTextPresets.map((preset) => (
          <div
            key={preset.id}
            data-testid={`element-add-preset-${preset.id}`}
            onClick={() => handlePresetAction(preset.id)}
            title={
              selectedTextElement
                ? `تطبيق نمط ${preset.label} على النص المحدد`
                : `إدراج ${preset.label}`
            }
            className={cn(
              'group relative w-full bg-card/80 hover:bg-card border border-border/70 hover:border-foreground/40 rounded-lg p-2 transition-all duration-150 flex flex-col items-center justify-between cursor-pointer shadow-2xs hover:shadow-fluent-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none overflow-hidden text-start select-none',
            )}
          >
            {/* صندوق المعاينة الحية الواقعية */}
            <div className="w-full aspect-[16/9] flex items-center justify-center mb-1.5 overflow-hidden rounded-md">
              {renderStudioTextPreview(preset)}
            </div>

            {/* تذييل البطاقة: التسمية + زر إدراج جديد كعنصر مستقل */}
            <div className="w-full flex items-center justify-between gap-1 pt-1">
              <span className="min-w-0 text-xs font-semibold text-foreground leading-tight truncate">
                {preset.label}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePresetAction(preset.id, true);
                }}
                title="إدراج كعنصر جديد دائماً"
                className="w-5 h-5 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" weight="bold" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
