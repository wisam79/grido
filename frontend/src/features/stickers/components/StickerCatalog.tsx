import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MagnifyingGlass, X, Check, SquaresFour, ListBullets } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StickerCategory, StickerShape, StickerTemplate } from "../types";
import { ALL_STICKER_TEMPLATES, searchStickerTemplates } from "../templates";
import { CATEGORY_ITEMS, SHAPE_ITEMS } from "../constants";

export interface StickerCatalogProps {
  selectedCategory: StickerCategory | "all";
  selectedShape: StickerShape | "all";
  selectedTemplateId: string;
  onSelectTemplate: (template: StickerTemplate) => void;
  onSelectCategory: (category: StickerCategory | "all") => void;
  onSelectShape: (shape: StickerShape | "all") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const ALL_CATEGORY_IDS = CATEGORY_ITEMS.map((c) => c.id) as StickerCategory[];

const CATEGORY_COUNTS: Record<string, number> = {
  all: ALL_STICKER_TEMPLATES.length,
  ...Object.fromEntries(
    ALL_CATEGORY_IDS.map((id) => [
      id,
      ALL_STICKER_TEMPLATES.filter((t) => t.category === id).length,
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

/* بطاقة قالب معزولة — memo مع كاش فوري و content-visibility تمنع بطء فتح النافذة */
const TemplateGridCard = React.memo(function TemplateGridCard({
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
      aria-label={`قالب ${template.name} — ${mm.width} مم في ${mm.height} مم`}
      className={cn(
        "group relative flex flex-col p-2 rounded-xl transition-all cursor-pointer text-start overflow-hidden border [content-visibility:auto] [contain-intrinsic-size:0_130px]",
        isSelected
          ? "bg-primary/10 border-primary shadow-fluent-4 ring-1 ring-primary/40"
          : "bg-card/50 hover:bg-card border-border/30 hover:border-border/70 hover:shadow-2xs"
      )}
    >
      {isSelected && (
        <div className="absolute top-2 end-2 z-10 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
          <Check className="w-2.5 h-2.5 font-bold" />
        </div>
      )}

      <div className="w-full h-22 rounded-lg bg-background/50 border border-border/20 flex items-center justify-center p-1.5 overflow-hidden transition-transform duration-150 group-hover:scale-[1.02]">
        {miniSvg ? (
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none drop-shadow-2xs [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: miniSvg }}
          />
        ) : (
          <span className="w-6 h-6 rounded-full" style={{ backgroundColor: template.defaultColors.primary }} />
        )}
      </div>

      <div className="mt-1.5 px-0.5 flex flex-col flex-1 justify-between gap-1 w-full">
        <span
          className={cn(
            "text-xs font-bold line-clamp-2 leading-snug min-h-[2.1rem] transition-colors",
            isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
          )}
          title={template.name}
        >
          {template.name}
        </span>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-mono pt-0.5 border-t border-border/15">
          <span>{mm.width}×{mm.height} مم</span>
          <span className="text-[9px] px-1 py-0.5 rounded bg-muted/40 text-muted-foreground">
            {shapeLabel(template)}
          </span>
        </div>
      </div>
    </button>
  );
});

const TemplateListCard = React.memo(function TemplateListCard({
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
      className={cn(
        "group relative flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer text-start border [content-visibility:auto] [contain-intrinsic-size:0_70px]",
        isSelected
          ? "bg-primary/10 border-primary shadow-fluent-2 ring-1 ring-primary/40"
          : "bg-card/50 hover:bg-card border-border/30 hover:border-border/70 hover:shadow-2xs"
      )}
    >
      <div className="w-13 h-13 rounded-lg bg-background/50 border border-border/20 flex items-center justify-center p-1 shrink-0 overflow-hidden">
        {miniSvg ? (
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none drop-shadow-2xs [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: miniSvg }}
          />
        ) : (
          <span className="w-5 h-5 rounded-full" style={{ backgroundColor: template.defaultColors.primary }} />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              "text-xs font-bold truncate transition-colors",
              isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
            )}
            title={template.name}
          >
            {template.name}
          </span>
          {isSelected && (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 font-bold" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
          <span>{mm.width} × {mm.height} مم</span>
          <span className="text-border/60">•</span>
          <span>{shapeLabel(template)}</span>
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // البحث المُدخل محلياً بـ debounce خفيف — يمنع فلترة 55 قالباً عند كل حرف
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
      debounceRef.current = window.setTimeout(() => onSearchChange(value), 150);
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
    <div className="flex-1 flex flex-row h-full overflow-hidden bg-background/20 select-none">
      {/* ── Rail: Icon Grid Categories (Single Source of Navigation) ── */}
      <nav
        aria-label="تصنيفات الملصقات"
        className="shrink-0 w-[54px] flex flex-col items-center gap-1.5 py-2 border-e border-border/40 bg-muted/20 overflow-y-auto scrollbar-none"
      >
        {CATEGORY_ITEMS.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <Tooltip key={cat.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  aria-label={cat.title}
                  aria-pressed={isActive}
                  className={cn(
                    "relative w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/40 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent"
                  )}
                >
                  {isActive && (
                    <span className="absolute -start-2 top-1/2 -translate-y-1/2 h-3.5 w-[2.5px] rounded-full bg-primary" />
                  )}
                  {cat.icon}
                  <span className="absolute bottom-0 end-0 min-w-3 h-3 px-0.5 rounded-full bg-muted border border-border/60 text-[7.5px] font-mono font-bold text-muted-foreground flex items-center justify-center pointer-events-none">
                    {CATEGORY_COUNTS[cat.id] || 0}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-cairo font-medium">
                {cat.title}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* ── Library Column: Search + Shape Filter + Templates ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Search + View Toggle */}
        <div className="p-2.5 border-b border-border/30 shrink-0 bg-muted/10 space-y-2">
          <div className="relative">
            <MagnifyingGlass className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="بحث ..."
              aria-label="بحث في القوالب"
              className="h-8 ps-8 pe-7 text-xs rounded-md bg-muted/30 border-border/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-foreground placeholder:text-muted-foreground/60"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="مسح البحث"
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md cursor-pointer"
                title="مسح"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Shape Filter (segmented) + Result Count + View Toggle */}
          <div className="flex items-center justify-between gap-2">
            <div
              role="radiogroup"
              aria-label="تصفية حسب الشكل"
              className="flex items-center gap-0.5 p-0.5 bg-muted/30 rounded-md border border-border/40"
            >
              {SHAPE_ITEMS.map((shape) => {
                const isActive = selectedShape === shape.id;
                return (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => onSelectShape(shape.id)}
                    role="radio"
                    aria-checked={isActive}
                    aria-label={shape.label}
                    className={cn(
                      "h-6 px-2 rounded-[4px] text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer",
                      isActive
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                    title={shape.label}
                  >
                    {shape.icon}
                  </button>
                );
              })}
            </div>

            <span
              className="text-[10px] font-mono text-muted-foreground/80 flex-1 text-center truncate"
              aria-live="polite"
              title={`${filteredTemplates.length} قالب`}
            >
              {filteredTemplates.length}
            </span>

            <div className="flex items-center bg-muted/30 p-0.5 rounded-md border border-border/40 shrink-0 gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                aria-label="عرض شبكي"
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors",
                  viewMode === "grid" && "bg-background text-foreground shadow-2xs font-bold"
                )}
                title="عرض شبكي"
              >
                <SquaresFour className="w-3.5 h-3.5" weight={viewMode === "grid" ? "bold" : "regular"} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                aria-label="عرض قائمة"
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground cursor-pointer transition-colors",
                  viewMode === "list" && "bg-background text-foreground shadow-2xs font-bold"
                )}
                title="عرض قائمة"
              >
                <ListBullets className="w-3.5 h-3.5" weight={viewMode === "list" ? "bold" : "regular"} />
              </button>
            </div>
          </div>
        </div>

        {/* Templates Grid / List */}
        <div
          className="flex-1 overflow-y-auto scrollbar-none p-2.5"
          role="listbox"
          aria-label="قوالب الملصقات"
        >
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-muted-foreground">
              <p className="text-xs font-semibold">لا توجد قوالب مطابقة</p>
              <p className="text-[11px] opacity-70 mt-0.5">جرّب تغيير كلمة البحث أو الشكل</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-2">
              {filteredTemplates.map((template) => (
                <TemplateGridCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplateId === template.id}
                  onSelect={onSelectTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredTemplates.map((template) => (
                <TemplateListCard
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
    </div>
  );
});

StickerCatalog.displayName = "StickerCatalog";
