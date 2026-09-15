import React, { useState, useMemo, useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { FluentSegmentedControl } from "@/components/ui/blocks";
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
import { ALL_STICKER_TEMPLATES } from "@/features/stickers/templates";
import { StickerTemplate } from "@/features/stickers/types";
import { renderSvgToPngDataUrl } from "@/features/stickers/lib/svg-rasterizer";

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

export const FreeformElementsTab = React.memo(function FreeformElementsTab() {
  const [activeCategory, setActiveCategory] = useState<"badges" | "shapes" | "text">("badges");
  const [isInserting, setIsInserting] = useState<string | null>(null);

  const addShapeElement = useEditorStore((state) => state.addShapeElement);
  const addTextPreset = useEditorStore((state) => state.addTextPreset);
  const addImageElement = useEditorStore((state) => state.addImageElement);

  // اختيار أشهر 12 قالباً من الملصقات والأختام الرسمية للعرض السريع
  const topStickers = useMemo(() => {
    return ALL_STICKER_TEMPLATES.slice(0, 12);
  }, []);

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
      {/* 🏷️ شريط تصنيفات العناصر */}
      <FluentSegmentedControl<"badges" | "shapes" | "text">
        layoutId="freeform-element-categories-pill"
        value={activeCategory}
        onChange={setActiveCategory}
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

      {/* 🌟 1. استعراض الشارات والأختام الرسمية */}
      {activeCategory === "badges" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-foreground/80">شارات وأختام سريعة</span>
            <button
              type="button"
              onClick={handleOpenFullStickerStudio}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <Sparkle className="w-3 h-3" weight="fill" />
              <span>الاستوديو الكامل</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-0.5">
            {topStickers.map((tmpl) => {
              const svg = getStickerSvgPreview(tmpl);
              const isBusy = isInserting === tmpl.id;

              return (
                <button
                  key={tmpl.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleInsertSticker(tmpl)}
                  className="group relative bg-card hover:bg-accent/40 border border-border/60 hover:border-primary/50 p-2.5 rounded-xl shadow-2xs transition-all duration-150 flex flex-col items-center justify-between text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-50"
                >
                  <div className="w-full aspect-square flex items-center justify-center p-1 relative overflow-hidden">
                    {svg ? (
                      <div
                        className="w-full h-full flex items-center justify-center transition-transform group-hover:scale-105 duration-200 pointer-events-none"
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                    ) : (
                      <Stamp className="w-8 h-8 text-muted-foreground/50" />
                    )}

                    {isBusy && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center rounded-lg">
                        <span className="text-[10px] font-bold text-primary animate-pulse">جاري الإدراج ...</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] font-bold text-foreground/90 mt-1.5 truncate w-full group-hover:text-primary transition-colors">
                    {tmpl.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* زر الاستوديو الكامل */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenFullStickerStudio}
            className="w-full h-8 text-xs font-bold border-dashed border-border/80 hover:border-primary/60 hover:bg-primary/5 text-primary gap-1.5 rounded-md cursor-pointer"
          >
            <Sparkle className="w-3.5 h-3.5" weight="fill" />
            <span>تصفح وتخصيص استوديو الملصقات بالكامل</span>
          </Button>
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
                  <span className="text-[10px] text-muted-foreground/80 truncate">إدراج فوري</span>
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
                    <span className="text-[10px] text-muted-foreground/80 truncate">{preset.description}</span>
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
