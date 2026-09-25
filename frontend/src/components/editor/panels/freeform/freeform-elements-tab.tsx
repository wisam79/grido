import React, { useState, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { FluentSegmentedControl, FluentFilterChips } from '@/components/ui/blocks';
import { toast } from 'sonner';
import {
  Sparkle,
  Plus,
  Stamp,
  Shapes,
  TextT,
  Star,
  Circle,
  Square,
  Heart,
  Shield,
  Diamond,
  ArrowRight,
  Calendar,
  Camera,
} from '@/components/ui/icons';
import {
  QUICK_SHAPES,
  QUICK_TEXT_PRESETS,
  TEXT_FILTER_OPTIONS,
  QuickShapeItem,
  QuickTextItem,
} from './freeform-panel-constants';
import {
  BADGE_TEMPLATES,
  FRAME_TEMPLATES,
  RETAIL_TEMPLATES,
  GREETING_TEMPLATES,
  SEASONAL_TEMPLATES,
} from '@/features/stickers/templates';
import { StickerTemplate } from '@/features/stickers/types';
import { renderSvgToPngDataUrl } from '@/features/stickers/lib/svg-rasterizer';
import { sanitizeSvgMarkupCached } from '@/lib/utils';

// كاش محلي للـ SVG لتسريع العرض الفوري
const SVG_PREVIEW_CACHE = new Map<string, string>();

function getStickerSvgPreview(t: StickerTemplate): string {
  const cached = SVG_PREVIEW_CACHE.get(t.id);
  if (cached) return cached;
  try {
    const fields = Object.fromEntries(t.fields.map((f) => [f.id, f.defaultValue]));
    const isFrame = t.category === 'frames';
    const svg = t.generateSvg({
      fields,
      primaryColor: t.defaultColors.primary,
      secondaryColor: t.defaultColors.secondary,
      backgroundColor: t.defaultColors.background,
      isTransparent: isFrame,
      fontFamily: 'Cairo',
    });
    SVG_PREVIEW_CACHE.set(t.id, svg);
    return svg;
  } catch {
    return '';
  }
}

function getCategoryBadgeLabel(category: string): string {
  switch (category) {
    case 'badges':
      return 'ختم رسمي';
    case 'frames':
      return 'إطار تزييني';
    case 'retail':
      return 'عروض وتخفيض';
    case 'greeting':
      return 'بطاقة تهنئة';
    case 'seasonal':
      return 'موسمي احتفالي';
    case 'cafe':
      return 'طعام ومشروبات';
    default:
      return 'ملصق فكتور';
  }
}

function getTextCategoryBadgeLabel(category: string): string {
  switch (category) {
    case 'effects':
      return 'تأثير فني';
    case 'badges':
      return 'شارة توثيق';
    case 'phrases':
      return 'عبارة جاهزة';
    case 'titles':
      return 'عنوان';
    default:
      return 'نمط مسبق';
  }
}

function renderTextPresetPreview(preset: QuickTextItem) {
  switch (preset.id) {
    case 'gold-luxury':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-950/30 border border-amber-500/30 flex items-center justify-center text-center overflow-hidden">
          {/* token-exception: خلفية معاينة "ذهبي فاخر" — ألوان محتوى التصميم تُعرض كما ستُطبع وليست ألوان واجهة */}
          <span
            className="text-xs font-black font-cairo tracking-wide truncate"
            style={{
              background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #b45309 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(180, 83, 9, 0.4))',
            }}
          >
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'neon-glow':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-slate-950 border border-sky-500/40 flex items-center justify-center text-center overflow-hidden">
          {/* token-exception: خلفية معاينة "توهج نيون" — ألوان محتوى التصميم تُعرض كما ستُطبع وليست ألوان واجهة */}
          <span
            className="text-xs font-black tracking-wider truncate text-sky-400 font-sans"
            style={{
              fontFamily: 'Alexandria, sans-serif',
              textShadow: '0 0 6px rgba(56, 189, 248, 0.8), 0 0 12px rgba(2, 132, 199, 0.6)',
            }}
          >
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case '3d-title':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-center text-center overflow-hidden">
          <span
            className="text-xs font-black truncate text-indigo-500"
            style={{
              fontFamily: 'Changa, sans-serif',
              textShadow: '1.5px 1.5px 0px #312e81, 2.5px 2.5px 0px #1e1b4b',
            }}
          >
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'outline-modern':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center text-center overflow-hidden">
          <span
            className="text-xs font-black truncate tracking-widest text-transparent"
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
        <div className="w-full h-full px-1.5 rounded-lg bg-rose-500/5 border border-rose-500/20 flex items-center justify-center text-center overflow-hidden">
          <div className="inline-flex items-center px-2 py-0.5 rounded-full border border-dashed border-rose-600/70 text-rose-600 dark:text-rose-400 font-bold text-micro truncate -rotate-1">
            <span>{preset.sampleText || preset.label}</span>
          </div>
        </div>
      );

    case 'badge':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center text-center overflow-hidden">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-micro shadow-2xs truncate font-tajawal">
            {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'studio-date':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center text-center overflow-hidden">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card text-foreground border border-border/60 text-micro font-semibold truncate shadow-2xs font-cairo">
            <Calendar className="w-3 h-3 text-primary shrink-0" weight="bold" />
            <span className="truncate">تاريخ اليوم</span>
          </div>
        </div>
      );

    case 'photographer-tag':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center text-center overflow-hidden">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card text-muted-foreground border border-border/50 text-micro font-medium truncate shadow-2xs">
            <Camera className="w-3 h-3 text-foreground/80 shrink-0" weight="bold" />
            <span className="truncate">بصمة المصور</span>
          </div>
        </div>
      );

    case 'watermark':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center text-center overflow-hidden relative">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:6px_6px] dark:bg-[radial-gradient(#fff_1px,transparent_1px)]" />
          <span
            className="text-micro font-black text-foreground/35 -rotate-12 tracking-widest truncate z-10"
            style={{ fontFamily: 'Alexandria, sans-serif' }}
          >
            GRIDO مسودة
          </span>
        </div>
      );

    case 'caption-card':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center text-center overflow-hidden">
          <div className="px-2 py-0.5 rounded border border-border/80 bg-background/90 text-foreground text-micro font-medium shadow-2xs truncate font-tajawal">
            {preset.sampleText || preset.label}
          </div>
        </div>
      );

    case 'congrats':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-center overflow-hidden">
          <span className="text-xs font-extrabold font-cairo text-emerald-700 dark:text-emerald-300 truncate drop-shadow-2xs">
            🎉 {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'sale-offer':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center text-center overflow-hidden">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-micro tracking-wide shadow-2xs truncate"
            style={{ fontFamily: 'Changa, sans-serif' }}
          >
            🔥 {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'certificate':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-blue-950/10 dark:bg-blue-950/30 border border-blue-500/30 flex items-center justify-center text-center overflow-hidden">
          <span
            className="text-xs font-bold text-blue-900 dark:text-blue-200 tracking-wide truncate border-b border-blue-500/40 pb-0.5"
            style={{ fontFamily: "'Reem Kufi', sans-serif" }}
          >
            📜 {preset.sampleText || preset.label}
          </span>
        </div>
      );

    case 'special-price':
      return (
        <div className="w-full h-full px-2 rounded-lg bg-card border border-border/60 flex items-center justify-center text-center overflow-hidden">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-600 text-white font-bold text-micro shadow-2xs truncate font-tajawal">
            🏷️ {preset.sampleText || preset.label}
          </span>
        </div>
      );

    default:
      return (
        <div className="w-full h-full px-2 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center text-center overflow-hidden">
          <span className="text-xs font-bold text-foreground truncate">
            {preset.sampleText || preset.label}
          </span>
        </div>
      );
  }
}

export interface FreeformElementsTabProps {
  category?: 'badges' | 'shapes' | 'text';
}

export const FreeformElementsTab = React.memo(function FreeformElementsTab({
  category: controlledCategory,
}: FreeformElementsTabProps = {}) {
  const [internalCategory, setInternalCategory] = useState<'badges' | 'shapes' | 'text'>('badges');
  const activeCategory = controlledCategory ?? internalCategory;
  const [isInserting, setIsInserting] = useState<string | null>(null);

  const addShapeElement = useEditorStore((state) => state.addShapeElement);
  const addTextPreset = useEditorStore((state) => state.addTextPreset);
  const addImageElement = useEditorStore((state) => state.addImageElement);

  // تصفية الملصقات سريعة العرض
  const [selectedStickerFilter, setSelectedStickerFilter] = useState<string>('all');

  const displayedStickers = useMemo(() => {
    if (selectedStickerFilter === 'badges') {
      return BADGE_TEMPLATES;
    }
    if (selectedStickerFilter === 'frames') {
      return FRAME_TEMPLATES;
    }
    if (selectedStickerFilter === 'retail') {
      return [...RETAIL_TEMPLATES, ...GREETING_TEMPLATES, ...SEASONAL_TEMPLATES];
    }
    // "all": تشكيلة منوعة ومتوازنة وجذابة بصرياً تبدأ بالأختام الملونة ثم العروض ثم الإطارات
    return [
      ...BADGE_TEMPLATES.slice(0, 8),
      ...RETAIL_TEMPLATES.slice(0, 4),
      ...GREETING_TEMPLATES.slice(0, 4),
      ...FRAME_TEMPLATES.slice(0, 4),
    ];
  }, [selectedStickerFilter]);

  // تصفية النصوص الجاهزة سريعة العرض
  const [selectedTextFilter, setSelectedTextFilter] = useState<string>('all');

  const displayedTextPresets = useMemo(() => {
    if (selectedTextFilter === 'all') {
      return QUICK_TEXT_PRESETS.filter((p) => p.category !== 'titles');
    }
    return QUICK_TEXT_PRESETS.filter((p) => p.category === selectedTextFilter);
  }, [selectedTextFilter]);

  // إضافة شكل هندسي بنقرة واحدة
  const handleAddShape = useCallback(
    (item: QuickShapeItem) => {
      addShapeElement(item.shape, item.svgPath);
      toast.success(`أُضيف ${item.label}`);
    },
    [addShapeElement],
  );

  // إضافة نص جاهز بنقرة واحدة
  const handleAddText = useCallback(
    (item: QuickTextItem) => {
      addTextPreset(item.id);
      toast.success(`أُضيف ${item.label}`);
    },
    [addTextPreset],
  );

  // إدراج ملصق / ختم بنقرة واحدة
  const handleInsertSticker = useCallback(
    async (template: StickerTemplate) => {
      try {
        setIsInserting(template.id);
        const svg = getStickerSvgPreview(template);
        if (!svg) {
          toast.error('تعذرت المعاينة');
          return;
        }

        const pngUrl = await renderSvgToPngDataUrl(svg, 1000, 1000 / (template.aspectRatio || 1), [
          'Cairo',
        ]);

        addImageElement(pngUrl, template.aspectRatio || 1);
        toast.success(`أُضيف ${template.name}`);
      } catch (err) {
        console.error('Failed to insert quick sticker', err);
        toast.error('فشل الإدراج');
      } finally {
        setIsInserting(null);
      }
    },
    [addImageElement],
  );

  // فتح استوديو الملصقات المتقدم
  const handleOpenFullStickerStudio = () => {
    window.dispatchEvent(new CustomEvent('grido:open-stickers-dialog'));
  };

  return (
    <div className="space-y-3 font-cairo animate-in fade-in duration-150" dir="rtl">
      {/* 🏷️ شريط تصنيفات العناصر (يظهر فقط كـ fallback إذا لم يتم تحديد التصنيف مباشرة من الشريط) */}
      {!controlledCategory && (
        <FluentSegmentedControl<'badges' | 'shapes' | 'text'>
          layoutId="freeform-element-categories-pill"
          value={activeCategory}
          onChange={setInternalCategory}
          size="sm"
          options={[
            {
              id: 'badges',
              label: 'شارات',
              icon: (
                <Stamp
                  className="w-3.5 h-3.5 shrink-0"
                  weight={activeCategory === 'badges' ? 'fill' : 'regular'}
                />
              ),
              tooltip: 'شارات وأختام',
            },
            {
              id: 'shapes',
              label: 'أشكال',
              icon: (
                <Shapes
                  className="w-3.5 h-3.5 shrink-0"
                  weight={activeCategory === 'shapes' ? 'fill' : 'regular'}
                />
              ),
              tooltip: 'أشكال وتصاميم',
            },
            {
              id: 'text',
              label: 'نصوص',
              icon: (
                <TextT
                  className="w-3.5 h-3.5 shrink-0"
                  weight={activeCategory === 'text' ? 'fill' : 'regular'}
                />
              ),
              tooltip: 'نصوص جاهزة',
            },
          ]}
        />
      )}

      {/* 🌟 1. استعراض الشارات والأختام الرسمية بتصميم Fluent 2 المتطور */}
      {activeCategory === 'badges' && (
        <div className="space-y-3">
          {/* زر الاستوديو الكامل المدمج (32px) وفق معايير Fluent 2 النظيفة */}
          <Button
            type="button"
            onClick={handleOpenFullStickerStudio}
            className="w-full h-8 px-2.5 rounded-md text-xs font-semibold bg-card hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all flex items-center justify-between shadow-2xs cursor-pointer select-none active:scale-[0.98]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Stamp className="w-3.5 h-3.5 text-primary shrink-0" weight="bold" />
              <span className="truncate">استوديو الملصقات</span>
            </div>
            <span className="text-micro font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              +80 قالب
            </span>
          </Button>

          {/* شريط الكبسولات الذكية للتنقل السريع بين أنواع الملصقات */}
          <FluentFilterChips
            layoutId="freeform-sticker-filter-chips"
            value={selectedStickerFilter}
            onChange={setSelectedStickerFilter}
            size="sm"
            className="w-full justify-between"
            options={[
              { id: 'all', label: 'الكل' },
              { id: 'badges', label: 'أختام' },
              { id: 'retail', label: 'عروض' },
              { id: 'frames', label: 'إطارات' },
            ]}
          />

          {/* شبكة بطاقات الملصقات المتجاوبة بنسب أبعاد مضبوطة وتفاصيل واضحة */}
          <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-270px)] overflow-y-auto px-1 custom-scrollbar">
            {displayedStickers.map((tmpl) => {
              const svg = getStickerSvgPreview(tmpl);
              const isBusy = isInserting === tmpl.id;

              return (
                <button
                  key={tmpl.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleInsertSticker(tmpl)}
                  title={tmpl.name}
                  className="group relative bg-card/70 hover:bg-card border border-border/60 hover:border-primary/50 rounded-xl p-2 transition-all duration-150 flex flex-col items-center cursor-pointer shadow-2xs hover:shadow-fluent-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-50 overflow-hidden"
                >
                  {/* حاوية المعاينة مع خلفية أكريليك ناعمة تُظهر تفاصيل التصميم بوضوح */}
                  <div className="w-full h-24 rounded-lg bg-background/80 dark:bg-muted/30 border border-border/30 group-hover:border-primary/30 flex items-center justify-center p-2 relative overflow-hidden transition-all">
                    {svg ? (
                      <div
                        className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto transition-transform group-hover:scale-105 duration-200 pointer-events-none drop-shadow-2xs"
                        dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkupCached(svg) }}
                      />
                    ) : (
                      <Stamp className="w-8 h-8 text-muted-foreground/40" />
                    )}

                    {/* زر + صغير يظهر عند التحويم لإعطاء إيحاء فوري بالإدراج السريع */}
                    <span className="absolute bottom-1.5 end-1.5 w-5 h-5 rounded-md bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center shadow-xs scale-90 group-hover:scale-100">
                      <Plus className="w-3 h-3" weight="bold" />
                    </span>

                    {/* حالة التحميل والمعالجة */}
                    {isBusy && (
                      <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex items-center justify-center rounded-lg">
                        <span className="text-micro font-bold text-primary animate-pulse">
                          جاري الإدراج...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* اسم القالب بسطر واحد مقتضب لمنع الانكسار المشوه */}
                  <span
                    className="text-xs font-semibold text-foreground/90 mt-1.5 truncate w-full text-center group-hover:text-primary transition-colors"
                    title={tmpl.name}
                  >
                    {tmpl.name}
                  </span>

                  {/* شارة التصنيف الدلالية المجهرية */}
                  <span className="text-micro text-muted-foreground/75 mt-0.5 truncate w-full text-center">
                    {getCategoryBadgeLabel(tmpl.category)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔷 2. استعراض الأشكال الهندسية والتزيينية */}
      {activeCategory === 'shapes' && (
        <div className="space-y-3">
          <div className="px-1">
            <span className="text-xs font-bold text-foreground/80">أشكال هندسية وتصاميم</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_SHAPES.map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => handleAddShape(shape)}
                className="group flex items-center gap-2.5 p-2 bg-card hover:bg-accent/40 border border-border/60 hover:border-primary/50 rounded-xl transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: `${shape.color}15`, color: shape.color }}
                >
                  {shape.shape === 'rect' && <Square className="w-4 h-4" weight="bold" />}
                  {shape.shape === 'ellipse' && <Circle className="w-4 h-4" weight="bold" />}
                  {shape.shape === 'star' && <Star className="w-4 h-4" weight="fill" />}
                  {shape.id === 'triangle' && <span className="font-bold text-xs">▲</span>}
                  {shape.id === 'heart' && <Heart className="w-4 h-4" weight="fill" />}
                  {shape.id === 'shield' && <Shield className="w-4 h-4" weight="fill" />}
                  {shape.id === 'diamond' && <Diamond className="w-4 h-4" weight="fill" />}
                  {shape.id === 'line' && <div className="w-4 h-0.5 bg-current rounded-full" />}
                  {shape.id === 'hexagon' && <span className="font-bold text-xs">⬡</span>}
                  {shape.id === 'arrow' && <ArrowRight className="w-4 h-4" weight="bold" />}
                </div>

                <div className="flex flex-col text-right min-w-0">
                  <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {shape.label}
                  </span>
                  <span className="text-micro text-muted-foreground/80 truncate">فوري</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ✍️ 3. استعراض النصوص والتنسيقات الجاهزة بتصميم متطور */}
      {activeCategory === 'text' && (
        <div className="space-y-3">
          {/* 🌟 هرمية العناوين الأساسية السريعة (Hero Typographic 3-Pack) بتصميم مدمج Fluent 2 */}
          <div className="space-y-1.5 rounded-xl border border-border/60 bg-card/60 p-2 shadow-2xs fluent-specular">
            <div className="flex items-center justify-between px-0.5 mb-0.5">
              <span className="text-micro font-bold text-muted-foreground uppercase tracking-wider">
                العناوين
              </span>
              <span className="text-micro text-primary font-semibold flex items-center gap-1">
                <Sparkle className="w-3 h-3" weight="bold" />
                <span>فوري</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {/* 1. عنوان رئيسي H1 */}
              <button
                type="button"
                onClick={() => {
                  addTextPreset('heading');
                  toast.success('أُضيف عنوان رئيسي');
                }}
                title="عنوان رئيسي عريض"
                className="group flex items-center justify-center gap-1.5 h-8 px-2 rounded-lg bg-card hover:bg-accent border border-border/60 hover:border-primary/50 transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none shadow-2xs select-none active:scale-[0.97]"
              >
                <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-micro border border-primary/20 font-mono">
                  H1
                </span>
                <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  رئيسي
                </span>
              </button>

              {/* 2. عنوان فرعي H2 */}
              <button
                type="button"
                onClick={() => {
                  addTextPreset('subheading');
                  toast.success('أُضيف عنوان فرعي');
                }}
                title="عنوان فرعي (28px)"
                className="group flex items-center justify-center gap-1.5 h-8 px-2 rounded-lg bg-card hover:bg-accent border border-border/60 hover:border-primary/50 transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none shadow-2xs select-none active:scale-[0.97]"
              >
                <span className="w-5 h-5 rounded-md bg-muted text-foreground/80 flex items-center justify-center shrink-0 font-bold text-micro border border-border/60 font-mono">
                  H2
                </span>
                <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  فرعي
                </span>
              </button>

              {/* 3. نص فقرة P */}
              <button
                type="button"
                onClick={() => {
                  addTextPreset('body');
                  toast.success('أُضيف نص فقرة');
                }}
                title="نص فقرة (18px)"
                className="group flex items-center justify-center gap-1.5 h-8 px-2 rounded-lg bg-card hover:bg-accent border border-border/60 hover:border-primary/50 transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none shadow-2xs select-none active:scale-[0.97]"
              >
                <span className="w-5 h-5 rounded-md bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 font-medium text-micro border border-border/40 font-mono">
                  P
                </span>
                <span className="text-xs font-normal text-muted-foreground truncate group-hover:text-foreground transition-colors">
                  فقرة
                </span>
              </button>
            </div>
          </div>

          {/* شريط الكبسولات الذكية لتصفية الأنماط والتأثيرات */}
          <FluentFilterChips
            layoutId="freeform-text-filter-chips"
            value={selectedTextFilter}
            onChange={setSelectedTextFilter}
            size="sm"
            className="w-full justify-between"
            options={TEXT_FILTER_OPTIONS}
          />

          {/* شبكة بطاقات الأنماط والتأثيرات الجاهزة مع معاينة حية واقعية WYSIWYG */}
          <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-270px)] overflow-y-auto px-1 custom-scrollbar">
            {displayedTextPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleAddText(preset)}
                title={preset.label}
                className="group relative w-full bg-card/70 hover:bg-card border border-border/60 hover:border-primary/50 rounded-xl p-2 transition-all duration-150 flex flex-col items-center justify-between cursor-pointer shadow-2xs hover:shadow-fluent-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none overflow-hidden text-right"
              >
                {/* صندوق المعاينة الحية الواقعية */}
                <div className="w-full aspect-[16/9] flex items-center justify-center mb-1.5 overflow-hidden rounded-lg">
                  {renderTextPresetPreview(preset)}
                </div>

                {/* تذييل البطاقة: الاسم والتصنيف وأيقونة الإدراج */}
                <div className="w-full flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                  <div className="flex flex-col min-w-0 text-right">
                    <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {preset.label}
                    </span>
                    <span className="text-micro text-muted-foreground/80 truncate">
                      {getTextCategoryBadgeLabel(preset.category)}
                    </span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-muted/80 group-hover:bg-primary group-hover:text-primary-foreground text-muted-foreground flex items-center justify-center shrink-0 transition-all">
                    <Plus className="w-3 h-3" weight="bold" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
