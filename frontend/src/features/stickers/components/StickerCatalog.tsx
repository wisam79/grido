import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MagnifyingGlass, X, Check, SquaresFour } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StickerCategory, StickerCategoryGroupId, StickerShape, StickerTemplate } from "../types";
import { ALL_STICKER_TEMPLATES, searchStickerTemplates } from "../templates";
import { CATEGORY_ITEMS, SHAPE_ITEMS } from "../constants";

export interface StickerCatalogProps {
  selectedCategory: StickerCategoryGroupId | StickerCategory | "all";
  selectedShape: StickerShape | "all";
  selectedTemplateId: string;
  onSelectTemplate: (template: StickerTemplate) => void;
  onSelectCategory: (category: StickerCategoryGroupId | StickerCategory | "all") => void;
  onSelectShape: (shape: StickerShape | "all") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const CATEGORY_COUNTS: Record<string, number> = {
  all: ALL_STICKER_TEMPLATES.length,
  ...Object.fromEntries(
    CATEGORY_ITEMS.filter((c) => c.id !== "all").map((cat) => [
      cat.id,
      cat.categories
        ? ALL_STICKER_TEMPLATES.filter((t) => cat.categories!.includes(t.category)).length
        : ALL_STICKER_TEMPLATES.filter((t) => t.category === cat.id).length,
    ])
  ),
};

const SHAPE_LABEL: Record<StickerShape, string> = {
  circle: "دائري",
  rect: "مستطيل",
  square: "مربع",
};

const shapeLabel = (template: StickerTemplate): string =>
  template.shape ? SHAPE_LABEL[template.shape] : template.aspectRatio === 1 ? SHAPE_LABEL.square : SHAPE_LABEL.rect;

interface TemplateCardProps {
  template: StickerTemplate;
  isSelected: boolean;
  onSelect: (template: StickerTemplate) => void;
}

/* كاش عام على مستوى الموديول — يتفادى تكرار توليد SVG لنفس القوالب عبر دورات فتح النافذة */
const PREVIEW_CACHE = new Map<string, string>();

function getTemplatePreview(template: StickerTemplate): string {
  const cached = PREVIEW_CACHE.get(template.id);
  if (cached !== undefined) return cached;
  try {
    const defaultFields = Object.fromEntries(template.fields.map((f) => [f.id, f.defaultValue]));
    const svg = template.generateSvg({
      fields: defaultFields,
      primaryColor: template.defaultColors.primary,
      secondaryColor: template.defaultColors.secondary,
      backgroundColor: template.defaultColors.background,
      isTransparent: false,
    });
    PREVIEW_CACHE.set(template.id, svg);
    return svg;
  } catch {
    PREVIEW_CACHE.set(template.id, "");
    return "";
  }
}

/* بطاقة قالب المعرض — مريحة بصرياً، خفيفة مع كاش فوري */
const GalleryCard = React.memo(function GalleryCard({
  template,
  isSelected,
  onSelect,
}: TemplateCardProps) {
  const miniSvg = useMemo(() => getTemplatePreview(template), [template]);
  const mm = template.defaultMm || {
    width: 50,
    height: Math.round(50 / template.aspectRatio),
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      aria-pressed={isSelected}
      aria-label={`قالب ${template.name} — ${mm.width}×${mm.height} مم`}
      className={cn(
        "group relative flex flex-col p-2.5 rounded-xl transition-all cursor-pointer text-start overflow-hidden border [content-visibility:auto] [contain-intrinsic-size:0_145px]",
        isSelected
          ? "bg-primary/10 border-primary shadow-fluent-4 ring-1 ring-primary/50"
          : "bg-card/60 hover:bg-card border-border/40 hover:border-primary/50 hover:shadow-fluent-2 hover:-translate-y-0.5"
      )}
    >
      {/* Selection Check Badge */}
      {isSelected && (
        <div className="absolute top-2 end-2 z-10 w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
          <Check className="w-3 h-3 font-bold" />
        </div>
      )}

      {/* SVG Preview Stage */}
      <div className="w-full h-26 rounded-lg bg-background/60 border border-border/25 flex items-center justify-center p-2 overflow-hidden transition-all duration-150 group-hover:bg-background group-hover:scale-[1.01]">
        {miniSvg ? (
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none drop-shadow-2xs [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: miniSvg }}
          />
        ) : (
          <span className="w-7 h-7 rounded-full" style={{ backgroundColor: template.defaultColors.primary }} />
        )}
      </div>

      {/* Card Metadata */}
      <div className="mt-2 px-0.5 flex flex-col flex-1 justify-between gap-1 w-full">
        <span
          className={cn(
            "text-xs font-bold truncate leading-snug transition-colors",
            isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
          )}
          title={template.name}
        >
          {template.name}
        </span>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-mono pt-1 border-t border-border/20">
          <span>{mm.width}×{mm.height} مم</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-sans">
            {shapeLabel(template)}
          </span>
        </div>
      </div>
    </button>
  );
});

export const StickerCatalog = React.memo(function StickerCatalog({
  selectedCategory,
  selectedShape,
  selectedTemplateId,
  onSelectTemplate,
  onSelectCategory,
  onSelectShape,
  searchQuery,
  onSearchChange,
}: StickerCatalogProps) {
  // البحث المحلي مع Throttling لمنع التهنيج
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => onSearchChange(value), 120);
    },
    [onSearchChange]
  );

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    setSearchInput("");
    onSearchChange("");
  }, [onSearchChange]);

  const filteredTemplates = useMemo(() => {
    return searchStickerTemplates(searchQuery, selectedCategory, selectedShape);
  }, [searchQuery, selectedCategory, selectedShape]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/20 select-none">
      {/* ── Top Navigation: Categories Capsule Bar ── */}
      <div className="px-4 pt-3 pb-2 border-b border-border/30 bg-muted/10 shrink-0">
        <nav
          aria-label="تصنيفات الملصقات"
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5"
        >
          {CATEGORY_ITEMS.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                aria-pressed={isActive}
                className={cn(
                  "h-7.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
                )}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  {cat.icon}
                </span>
                <span>{cat.title}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                    isActive ? "bg-black/15 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {CATEGORY_COUNTS[cat.id] || 0}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ── Sub-bar: Search Input & Shape Filter ── */}
        <div className="flex items-center justify-between gap-3 mt-2.5">
          {/* Search Field */}
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="بحث ..."
              aria-label="بحث"
              className="h-8 ps-8 pe-7 text-xs rounded-md bg-card/80 border-border/50 focus-visible:ring-1 focus-visible:ring-primary text-foreground placeholder:text-muted-foreground/60"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="مسح"
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Shape Filter (Icon-driven with Tooltips) & Counter */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              role="radiogroup"
              aria-label="تصفية حسب الشكل"
              className="flex items-center gap-0.5 p-0.5 bg-muted/40 rounded-md border border-border/40"
            >
              {SHAPE_ITEMS.map((shape) => {
                const isActive = selectedShape === shape.id;
                return (
                  <Tooltip key={shape.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSelectShape(shape.id)}
                        role="radio"
                        aria-checked={isActive}
                        aria-label={shape.label}
                        className={cn(
                          "w-7 h-6.5 rounded-[4px] flex items-center justify-center transition-all cursor-pointer",
                          isActive
                            ? "bg-background text-foreground shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                        )}
                      >
                        {shape.icon}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs font-cairo">
                      {shape.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            <span
              className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-muted/30 border border-border/30 text-muted-foreground"
              aria-live="polite"
            >
              {filteredTemplates.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Gallery Grid ── */}
      <div
        className="flex-1 overflow-y-auto scrollbar-none p-4"
        role="listbox"
        aria-label="قوالب الملصقات"
      >
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4 text-muted-foreground">
            <SquaresFour className="w-8 h-8 opacity-40 mb-1.5" />
            <p className="text-xs font-semibold">لا توجد نتائج</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredTemplates.map((template) => (
              <GalleryCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={onSelectTemplate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

StickerCatalog.displayName = "StickerCatalog";
