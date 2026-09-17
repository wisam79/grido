import React, { useState, useMemo, useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { FluentSegmentedControl, FluentFilterChips } from "@/components/ui/blocks";
import { toast } from "sonner";
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
} from "@phosphor-icons/react";
import {
  QUICK_SHAPES,
  QUICK_TEXT_PRESETS,
  QuickShapeItem,
  QuickTextItem,
} from "./freeform-panel-constants";
import {
  BADGE_TEMPLATES,
  FRAME_TEMPLATES,
  RETAIL_TEMPLATES,
  GREETING_TEMPLATES,
  SEASONAL_TEMPLATES,
} from "@/features/stickers/templates";
import { StickerTemplate } from "@/features/stickers/types";
import { renderSvgToPngDataUrl } from "@/features/stickers/lib/svg-rasterizer";
import { sanitizeSvgMarkupCached } from "@/lib/utils";

// كاش محلي للـ SVG لتسريع العرض الفوري
const SVG_PREVIEW_CACHE = new Map<string, string>();

function getStickerSvgPreview(t: StickerTemplate): string {
  const cached = SVG_PREVIEW_CACHE.get(t.id);
  if (cached) return cached;
  try {
    const fields = Object.fromEntries(t.fields.map((f) => [f.id, f.defaultValue]));
    const svg = t.generateSvg({
      fields,
      primaryColor: t.defaultColors.primary,
      secondaryColor: t.defaultColors.secondary,
      backgroundColor: t.defaultColors.background,
      isTransparent: false,
      fontFamily: "Cairo",
    });
    SVG_PREVIEW_CACHE.set(t.id, svg);
    return svg;
  } catch {
    return "";
  }
}

export interface FreeformElementsTabProps {
  category?: "badges" | "shapes" | "text";
}

export const FreeformElementsTab = React.memo(function FreeformElementsTab({
  category: controlledCategory,
}: FreeformElementsTabProps = {}) {
  const [internalCategory, setInternalCategory] = useState<"badges" | "shapes" | "text">("badges");
  const activeCategory = controlledCategory ?? internalCategory;
  const [isInserting, setIsInserting] = useState<string | null>(null);

  const addShapeElement = useEditorStore((state) => state.addShapeElement);
  const addTextPreset = useEditorStore((state) => state.addTextPreset);
  const addImageElement = useEditorStore((state) => state.addImageElement);

  // تصفية الملصقات سريعة العرض
  const [selectedStickerFilter, setSelectedStickerFilter] = useState<string>("all");

  const displayedStickers = useMemo(() => {
    if (selectedStickerFilter === "badges") {
      return BADGE_TEMPLATES;
    }
    if (selectedStickerFilter === "frames") {
      return FRAME_TEMPLATES;
    }
    if (selectedStickerFilter === "retail") {
      return RETAIL_TEMPLATES;
    }
    if (selectedStickerFilter === "greeting") {
      return [...GREETING_TEMPLATES, ...SEASONAL_TEMPLATES];
    }
    // "all": تشكيلة منوعة ومتوازنة من أفضل القوالب
    return [
      ...BADGE_TEMPLATES.slice(0, 6),
      ...FRAME_TEMPLATES.slice(0, 6),
      ...RETAIL_TEMPLATES.slice(0, 4),
      ...GREETING_TEMPLATES.slice(0, 4),
    ];
  }, [selectedStickerFilter]);

  // إضافة شكل هندسي بنقرة واحدة
  const handleAddShape = useCallback(
    (item: QuickShapeItem) => {
      addShapeElement(item.shape, item.svgPath);
      toast.success(`تمت إضافة ${item.label}`);
    },
    [addShapeElement]
  );

  // إضافة نص جاهز بنقرة واحدة
  const handleAddText = useCallback(
    (item: QuickTextItem) => {
      addTextPreset(item.id);
      toast.success(`تمت إضافة ${item.label}`);
    },
    [addTextPreset]
  );

  // إدراج ملصق / ختم بنقرة واحدة
  const handleInsertSticker = useCallback(
    async (template: StickerTemplate) => {
      try {
        setIsInserting(template.id);
        const svg = getStickerSvgPreview(template);
        if (!svg) {
          toast.error("تعذر تجهيز معاينة الملصق");
          return;
        }

        const pngUrl = await renderSvgToPngDataUrl(
          svg,
          1000,
          1000 / (template.aspectRatio || 1),
          ["Cairo"]
        );

        addImageElement(pngUrl, template.aspectRatio || 1);
        toast.success(`تمت إضافة ${template.name}`);
      } catch (err) {
        console.error("Failed to insert quick sticker", err);
        toast.error("فشل إدراج الملصق في الكانفاس");
      } finally {
        setIsInserting(null);
      }
    },
    [addImageElement]
  );

  // فتح استوديو الملصقات المتقدم
  const handleOpenFullStickerStudio = () => {
    window.dispatchEvent(new CustomEvent("grido:open-stickers-dialog"));
  };

  return (
    <div className="space-y-3 font-cairo animate-in fade-in duration-150" dir="rtl">
      {/* 🏷️ شريط تصنيفات العناصر (يظهر فقط كـ fallback إذا لم يتم تحديد التصنيف مباشرة من الشريط) */}
      {!controlledCategory && (
        <FluentSegmentedControl<"badges" | "shapes" | "text">
          layoutId="freeform-element-categories-pill"
          value={activeCategory}
          onChange={setInternalCategory}
          size="sm"
          options={[
            {
              id: "badges",
              label: "شارات",
              icon: <Stamp className="w-3.5 h-3.5 shrink-0" weight={activeCategory === "badges" ? "fill" : "regular"} />,
              tooltip: "شارات وأختام رسمية",
            },
            {
              id: "shapes",
              label: "أشكال",
              icon: <Shapes className="w-3.5 h-3.5 shrink-0" weight={activeCategory === "shapes" ? "fill" : "regular"} />,
              tooltip: "أشكال وتصاميم هندسية",
            },
            {
              id: "text",
              label: "نصوص",
              icon: <TextT className="w-3.5 h-3.5 shrink-0" weight={activeCategory === "text" ? "fill" : "regular"} />,
              tooltip: "نصوص مصممة جاهزة",
            },
          ]}
        />
      )}

      {/* 🌟 1. استعراض الشارات والأختام الرسمية بتصميم Fluent 2 المتطور */}
      {activeCategory === "badges" && (
        <div className="space-y-3">
          {/* كرت Hero أنيق للوصول المباشر إلى استوديو الملصقات الكامل والتخصيص */}
          <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-3 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkle className="w-4 h-4 text-primary shrink-0" weight="fill" />
                  <span className="text-xs font-bold text-foreground truncate">استوديو الملصقات الذكي</span>
                </div>
                <span className="text-micro text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                  تخصيص كامل للألوان والنصوص مع أكثر من 80 قالباً جاهزاً
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenFullStickerStudio}
                className="h-7 px-2.5 text-mini font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shrink-0 cursor-pointer shadow-xs gap-1 active:scale-95 transition-all"
              >
                <span>الاستوديو الكامل</span>
              </Button>
            </div>
          </div>

          {/* شريط الكبسولات الذكية للتنقل السريع بين أنواع الملصقات */}
          <FluentFilterChips
            value={selectedStickerFilter}
            onChange={setSelectedStickerFilter}
            variant="tint"
            size="sm"
            options={[
              { id: "all", label: "الكل" },
              { id: "badges", label: "أختام" },
              { id: "frames", label: "إطارات" },
              { id: "retail", label: "عروض" },
              { id: "greeting", label: "تهنئة" },
            ]}
          />


          {/* شبكة بطاقات الملصقات المتجاوبة بنسب أبعاد مضبوطة وتفاصيل واضحة */}
          <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-270px)] overflow-y-auto pr-0.5 scrollbar-thin">
            {displayedStickers.map((tmpl) => {
              const svg = getStickerSvgPreview(tmpl);
              const isBusy = isInserting === tmpl.id;

              return (
                <button
                  key={tmpl.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleInsertSticker(tmpl)}
                  title={`${tmpl.name} (انقر للإدراج)`}
                  className="group relative bg-card/60 hover:bg-accent/50 border border-border/70 hover:border-primary/50 rounded-xl p-2 transition-all duration-150 flex flex-col items-center justify-between text-center cursor-pointer shadow-2xs hover:shadow-fluent-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-50"
                >
                  {/* حاوية المعاينة مع خلفية أكريليك ناعمة تُظهر تفاصيل التصميم بوضوح */}
                  <div className="w-full h-24 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/40 flex items-center justify-center p-1.5 relative overflow-hidden">
                    {svg ? (
                      <div
                        className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto transition-transform group-hover:scale-105 duration-200 pointer-events-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkupCached(svg) }}
                      />
                    ) : (
                      <Stamp className="w-8 h-8 text-muted-foreground/40" />
                    )}

                    {/* زر + صغير يظهر عند التحويم لإعطاء إيحاء فوري بالإدراج السريع */}
                    <span className="absolute bottom-1 end-1 w-5 h-5 rounded-md bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center shadow-xs">
                      <Plus className="w-3 h-3" weight="bold" />
                    </span>

                    {/* حالة التحميل والمعالجة */}
                    {isBusy && (
                      <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex items-center justify-center rounded-lg">
                        <span className="text-micro font-bold text-primary animate-pulse">جاري الإدراج ...</span>
                      </div>
                    )}
                  </div>

                  {/* اسم القالب بسطرين لضمان قراءة كامل العنوان بدون نقاط حذف مقطوعة */}
                  <span className="text-mini font-semibold text-foreground/85 mt-1.5 line-clamp-2 leading-tight w-full group-hover:text-primary transition-colors min-h-[26px] flex items-center justify-center">
                    {tmpl.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔷 2. استعراض الأشكال الهندسية والتزيينية */}
      {activeCategory === "shapes" && (
        <div className="space-y-3">
          <div className="px-1">
            <span className="text-xs font-bold text-foreground/80">أشكال هندسية وتصاميم للكانفاس</span>
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
                  {shape.shape === "rect" && <Square className="w-4 h-4" weight="bold" />}
                  {shape.shape === "ellipse" && <Circle className="w-4 h-4" weight="bold" />}
                  {shape.shape === "star" && <Star className="w-4 h-4" weight="fill" />}
                  {shape.id === "triangle" && <span className="font-bold text-xs">▲</span>}
                  {shape.id === "heart" && <Heart className="w-4 h-4" weight="fill" />}
                  {shape.id === "shield" && <Shield className="w-4 h-4" weight="fill" />}
                  {shape.id === "diamond" && <Diamond className="w-4 h-4" weight="fill" />}
                  {shape.id === "line" && <div className="w-4 h-0.5 bg-current rounded-full" />}
                  {shape.id === "hexagon" && <span className="font-bold text-xs">⬡</span>}
                  {shape.id === "arrow" && <ArrowRight className="w-4 h-4" weight="bold" />}
                </div>

                <div className="flex flex-col text-right min-w-0">
                  <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {shape.label}
                  </span>
                  <span className="text-micro text-muted-foreground/80 truncate">إدراج فوري</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ✍️ 3. استعراض النصوص والتنسيقات الجاهزة */}
      {activeCategory === "text" && (
        <div className="space-y-3">
          <div className="px-1">
            <span className="text-xs font-bold text-foreground/80">نصوص جاهزة مع أنماط مسبقة</span>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
            {QUICK_TEXT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleAddText(preset)}
                className="group w-full flex items-center justify-between p-2.5 bg-card hover:bg-accent/40 border border-border/60 hover:border-primary/50 rounded-xl transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs font-black text-xs group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: `${preset.previewColor}18`, color: preset.previewColor }}
                  >
                    Aa
                  </div>
                  <div className="flex flex-col text-right min-w-0">
                    <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {preset.label}
                    </span>
                    <span className="text-micro text-muted-foreground/80 truncate">{preset.description}</span>
                  </div>
                </div>

                <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" weight="bold" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
