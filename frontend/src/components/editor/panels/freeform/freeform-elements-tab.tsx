import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

import { ShapeGlyph } from '@/components/editor/shapes/shape-glyph';
import { FluentFilterChips } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { Plus, Stamp, CaretRight } from '@/components/ui/icons';
import { ensureBarcodeLibsReady } from '@/features/stickers/lib/barcode-svg';
import {
  buildDefaultStickerParams,
  buildStickerSvg,
} from '@/features/stickers/lib/sticker-design/build-svg';
import { stickerRasterSize } from '@/features/stickers/lib/sticker-text';
import { renderSvgToPngBlob } from '@/features/stickers/lib/svg-rasterizer';
import { blobToDataUrl } from '@/lib/canvas/canvas-blob';
import { useEditorStore } from '@/lib/editor-store';
import { uploadMediaBlob } from '@/lib/io/media-upload';
import { SHAPE_CATEGORIES, shapesInCategory } from '@/lib/io/shape-catalog';
import { createLogger } from '@/lib/logger';
import { sanitizeSvgMarkupCached } from '@/lib/utils';
import { wailsIsDesktop } from '@/lib/wails-env';
import { toErrorMessage } from '@/lib/wails-error';

import { FreeformTextTab } from './freeform-text-tab';

import type { StickerParams, StickerTemplate } from '@/features/stickers/types';
import type { ShapeCatalogItem } from '@/lib/io/shape-catalog';

const logger = createLogger('freeform-elements-tab');

// كاش محلي للـ SVG لتسريع العرض الفوري
const SVG_PREVIEW_CACHE = new Map<string, string>();

function buildQuickStickerParams(t: StickerTemplate): StickerParams {
  return {
    ...buildDefaultStickerParams(t),
    isTransparent: t.category === 'frames',
  };
}

function getStickerSvgPreview(t: StickerTemplate): string {
  const cached = SVG_PREVIEW_CACHE.get(t.id);
  if (cached) return cached;
  try {
    const svg = buildStickerSvg(t, buildQuickStickerParams(t), {
      namespace: `quick-${t.id}`,
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

export interface FreeformElementsTabProps {
  category: 'stickers' | 'shapes' | 'text';
}

const FreeformElementsContent = React.memo(function FreeformElementsContent({
  category: activeCategory,
}: {
  category: 'stickers' | 'shapes';
}) {
  const [isInserting, setIsInserting] = useState<string | null>(null);

  const addShapeElement = useEditorStore((state) => state.addShapeElement);
  const addImageElement = useEditorStore((state) => state.addImageElement);

  // تصفية الملصقات سريعة العرض
  const [selectedStickerFilter, setSelectedStickerFilter] = useState<string>('all');

  // 📦 قوالب الملصقات (~149KB من تعريفات SVG) تُحمَّل كحزمة منفصلة عند فتح
  // تبويب العناصر، لا ضمن الحزمة الرئيسية. الواجهة تعرض هيكلاً مؤقتاً حتى وصولها.
  const [stickerGroups, setStickerGroups] = useState<{
    badges: StickerTemplate[];
    frames: StickerTemplate[];
    retail: StickerTemplate[];
    greeting: StickerTemplate[];
    seasonal: StickerTemplate[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/features/stickers/templates')
      .then((m) => {
        if (cancelled) return;
        setStickerGroups({
          badges: m.BADGE_TEMPLATES,
          frames: m.FRAME_TEMPLATES,
          retail: m.RETAIL_TEMPLATES,
          greeting: m.GREETING_TEMPLATES,
          seasonal: m.SEASONAL_TEMPLATES,
        });
      })
      .catch((err) => {
        logger.warn('Failed to load sticker templates', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayedStickers = useMemo(() => {
    if (!stickerGroups) return [];
    const { badges, frames, retail, greeting, seasonal } = stickerGroups;
    if (selectedStickerFilter === 'badges') {
      return badges;
    }
    if (selectedStickerFilter === 'frames') {
      return frames;
    }
    if (selectedStickerFilter === 'retail') {
      return [...retail, ...greeting, ...seasonal];
    }
    // "all": تشكيلة منوعة ومتوازنة وجذابة بصرياً تبدأ بالأختام الملونة ثم العروض ثم الإطارات
    return [
      ...badges.slice(0, 8),
      ...retail.slice(0, 4),
      ...greeting.slice(0, 4),
      ...frames.slice(0, 4),
    ];
  }, [selectedStickerFilter, stickerGroups]);

  // إضافة شكل هندسي بنقرة واحدة — من الكتالوج الموحّد مباشرة
  const handleAddShape = useCallback(
    (item: ShapeCatalogItem) => {
      addShapeElement(item.kind, item.path, { aspect: item.aspect, defaults: item.defaults });
    },
    [addShapeElement],
  );

  // إدراج ملصق / ختم بنقرة واحدة مع حفظ مصدر الملصق لإتاحة «تعديل الملصق» ونسخ SVG من قائمة السياق
  const handleInsertSticker = useCallback(
    async (template: StickerTemplate) => {
      try {
        setIsInserting(template.id);
        const params = buildQuickStickerParams(template);
        // ⏳ جاهزية مولدات الباركود/QR قبل توليد SVG نهائي يُخزَّن: المعاينة
        // قد تكون بُنيت قبل تحميل المكتبات الكسولة فتحمل عنصر «جارٍ التجهيز» —
        // نعيد البناء طازجاً بعد الانتظار كي لا يُخزَّن placeholder نهائياً،
        // والفشل يترك المولّد يرسم تحذيره الصريح المصمم (بلا كتم سلوكه).
        await ensureBarcodeLibsReady();
        let svg = '';
        try {
          svg = buildStickerSvg(template, params, { namespace: `quick-${template.id}` });
        } catch {
          svg = getStickerSvgPreview(template);
        }
        if (!svg) {
          toast.error('تعذرت المعاينة');
          return;
        }

        const { width, height } = stickerRasterSize(template.aspectRatio, template.defaultMm);
        const pngBlob = await renderSvgToPngBlob(
          svg,
          width,
          height,
          [params.fontFamily || 'Cairo'],
          { dpi: 300 },
        );
        let finalSrc: string;
        if (wailsIsDesktop()) {
          try {
            const uploaded = await uploadMediaBlob(pngBlob, `${template.id}.png`);
            finalSrc = uploaded.imageSrc;
          } catch {
            finalSrc = await blobToDataUrl(pngBlob);
          }
        } else {
          finalSrc = await blobToDataUrl(pngBlob);
        }
        const exportableSvg = sanitizeSvgMarkupCached(svg);

        addImageElement(finalSrc, template.aspectRatio || 1, {
          templateId: template.id,
          params,
          ...(exportableSvg ? { svg: exportableSvg } : {}),
        });
        toast.success(`أُضيف ${template.name}`);
      } catch (err) {
        logger.error('Failed to insert quick sticker', err);
        toast.error(toErrorMessage(err, 'فشل الإدراج'));
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
    <div
      data-testid={`studio-elements-${activeCategory}`}
      className="space-y-3 font-cairo animate-in fade-in duration-150"
      dir="rtl"
    >
      {/* 🌟 1. استعراض الشارات والأختام الرسمية بتصميم Fluent 2 المتطور */}
      {activeCategory === 'stickers' && (
        <div className="space-y-3">
          {/* زر الاستوديو الكامل المدمج (32px) وفق معايير Fluent 2 النظيفة */}{' '}
          <Button
            type="button"
            data-testid="element-open-sticker-studio"
            onClick={handleOpenFullStickerStudio}
            variant="outline"
            className="w-full h-8 px-2.5 rounded-md text-control font-semibold transition-colors flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Stamp className="w-3.5 h-3.5 text-muted-foreground shrink-0" weight="bold" />
              <span className="truncate">استوديو الملصقات</span>
            </div>
            <CaretRight
              className="w-3.5 h-3.5 text-muted-foreground shrink-0 rtl:rotate-180"
              weight="bold"
            />
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
          {/* شبكة بطاقات الملصقات المتجاوبة بنسب أبعاد مضبوطة وتفاصيل واضحة ورشيقة */}
          <div className="grid grid-cols-2 gap-1.5 px-0.5">
            {!stickerGroups && (
              <div className="col-span-2 flex items-center justify-center py-6 text-xs text-muted-foreground">
                جارٍ تحميل الملصقات…
              </div>
            )}
            {displayedStickers.map((tmpl) => {
              const svg = getStickerSvgPreview(tmpl);
              const isBusy = isInserting === tmpl.id;
              const stickerLabel = `${tmpl.name} — ${getCategoryBadgeLabel(tmpl.category)}`;

              return (
                <button
                  key={tmpl.id}
                  type="button"
                  disabled={isBusy}
                  aria-busy={isBusy}
                  aria-label={stickerLabel}
                  onClick={() => handleInsertSticker(tmpl)}
                  title={tmpl.name}
                  className="group relative bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-border focus-visible:border-border rounded-md p-1 transition-colors duration-150 flex flex-col items-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-50 overflow-hidden"
                >
                  {/* سطح محايد ومعاينة أكبر بلا إطار داخلي يزاحم تفاصيل الملصق */}
                  <div className="w-full h-28 rounded-md bg-preview-surface flex items-center justify-center p-1 relative overflow-hidden">
                    {svg ? (
                      <div
                        className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto duration-200 pointer-events-none drop-shadow-2xs"
                        dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkupCached(svg) }}
                      />
                    ) : (
                      <Stamp className="w-7 h-7 text-muted-foreground/40" />
                    )}

                    {/* زر + صغير يظهر عند التحويم لإعطاء إيحاء فوري بالإدراج السريع */}
                    <span className="absolute bottom-1 end-1 w-4.5 h-4.5 rounded-md bg-foreground text-background opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                      <Plus className="w-2.5 h-2.5" weight="bold" />
                    </span>

                    {/* حالة التحميل والمعالجة */}
                    {isBusy && (
                      <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex items-center justify-center rounded-md">
                        <span className="text-mini font-bold text-foreground/80 animate-pulse">
                          جاري الإدراج ...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* اسم القالب: سطران كحد أقصى — سطر واحد كان يقتطع أسماء
                      حقيقية مثل «صُنع في العراق (منتج وطني)» في شبكة عمودين */}
                  <span className="text-control font-semibold text-foreground mt-1 min-h-9 w-full text-center line-clamp-2">
                    {tmpl.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔷 2. كتالوج الأشكال الكامل بفئاته — بديل قائمة الشريط العلوي بعد حذفها */}
      {activeCategory === 'shapes' && (
        <div className="space-y-3">
          {SHAPE_CATEGORIES.map((group) => {
            const shapes = shapesInCategory(group.id);
            if (shapes.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1.5">
                <div className="px-1 flex items-center justify-between">
                  <span className="text-control font-semibold text-foreground">{group.label}</span>
                  <span className="text-mini font-mono text-muted-foreground font-semibold">
                    {shapes.length}
                  </span>
                </div>

                {/* رموز الأشكال وحدها: المستخدم يعرف المربع من الدائرة، فالاسم
                    تكرار بصري. ثلاثة أعمدة برموز كبيرة توازن الوضوح مع الكثافة،
                    والاسم يبقى تلميحاً ووصفاً وصولياً. */}
                <div className="grid grid-cols-3 gap-1.5">
                  {shapes.map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      data-testid={`element-add-shape-${shape.id}`}
                      onClick={() => handleAddShape(shape)}
                      title={shape.label}
                      aria-label={shape.label}
                      className="group flex items-center justify-center h-11 bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-border focus-visible:border-border rounded-md transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none select-none"
                    >
                      <ShapeGlyph
                        kind={shape.kind}
                        path={shape.path}
                        sides={shape.defaults?.sides}
                        starPoints={shape.defaults?.starPoints}
                        doubleArrow={shape.defaults?.pointerAtBeginning === true}
                        className="w-8 h-8 shrink-0 text-foreground/80 group-hover:text-foreground group-focus-visible:text-foreground"
                      />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export const FreeformElementsTab = React.memo(function FreeformElementsTab({
  category: activeCategory,
}: FreeformElementsTabProps) {
  if (activeCategory === 'text') {
    return <FreeformTextTab />;
  }
  return <FreeformElementsContent category={activeCategory} />;
});
