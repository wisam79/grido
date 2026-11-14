import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';

import { FluentFilterChips } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { MagnifyingGlass, X, Check, SquaresFour, Star } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { assetFavoriteId, useAssetFavorites } from '@/lib/asset-favorites';
import { FOCUS_RING } from '@/lib/ui/ui-compliance';
import { cn, sanitizeSvgMarkupCached } from '@/lib/utils';

import { CATEGORY_ITEMS, SHAPE_ITEMS } from '../constants';
import { buildDefaultStickerParams, buildStickerSvg } from '../lib/sticker-design/build-svg';
import { ALL_STICKER_TEMPLATES, searchStickerTemplates } from '../templates';

import type {
  StickerCategory,
  StickerCategoryGroupId,
  StickerShape,
  StickerTemplate,
} from '../types';

export interface StickerCatalogProps {
  selectedCategory: StickerCategoryGroupId | StickerCategory | 'all';
  selectedShape: StickerShape | 'all';
  selectedTemplateId: string;
  onSelectTemplate: (template: StickerTemplate) => void;
  onSelectCategory: (category: StickerCategoryGroupId | StickerCategory | 'all') => void;
  onSelectShape: (shape: StickerShape | 'all') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  /** The dialog can retain this across gallery unmounts during customization. */
  discoveryState?: { favoritesOnly: boolean; scrollTop: number };
  onDiscoveryStateChange?: (state: { favoritesOnly: boolean; scrollTop: number }) => void;
}

const CATEGORY_COUNTS: Record<string, number> = {
  all: ALL_STICKER_TEMPLATES.length,
  ...Object.fromEntries(
    CATEGORY_ITEMS.filter((c) => c.id !== 'all').map((cat) => [
      cat.id,
      cat.categories
        ? ALL_STICKER_TEMPLATES.filter((t) => cat.categories!.includes(t.category)).length
        : ALL_STICKER_TEMPLATES.filter((t) => t.category === cat.id).length,
    ]),
  ),
};

const SHAPE_LABEL: Record<StickerShape, string> = {
  circle: 'دائري',
  rect: 'مستطيل',
  square: 'مربع',
};

const shapeLabel = (template: StickerTemplate): string =>
  template.shape
    ? SHAPE_LABEL[template.shape]
    : template.aspectRatio === 1
      ? SHAPE_LABEL.square
      : SHAPE_LABEL.rect;

interface TemplateCardProps {
  template: StickerTemplate;
  isSelected: boolean;
  onSelect: (template: StickerTemplate) => void;
  isFavorite: boolean;
  onToggleFavorite: (template: StickerTemplate) => void;
  isFocused?: boolean;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

/* Cache previews across gallery mounts; never duplicate the template catalog. */
const PREVIEW_CACHE = new Map<string, string>();

function getTemplatePreview(template: StickerTemplate): string {
  const cached = PREVIEW_CACHE.get(template.id);
  if (cached !== undefined) return cached;
  try {
    const svg = buildStickerSvg(template, buildDefaultStickerParams(template), {
      namespace: `tpl-${template.id}`,
    });
    PREVIEW_CACHE.set(template.id, svg);
    return svg;
  } catch {
    PREVIEW_CACHE.set(template.id, '');
    return '';
  }
}

const GalleryCard = React.memo(function GalleryCard({
  template,
  isSelected,
  onSelect,
  isFavorite,
  onToggleFavorite,
  isFocused = false,
  onFocus,
  onKeyDown,
}: TemplateCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(() => PREVIEW_CACHE.has(template.id));

  useEffect(() => {
    if (inView) return;
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  // Arrow navigation should not steal focus from search or a favorite button.
  const previousFocused = useRef(isFocused);
  useEffect(() => {
    if (isFocused && !previousFocused.current && cardRef.current) {
      cardRef.current.focus({ preventScroll: false });
    }
    previousFocused.current = isFocused;
  }, [isFocused]);

  const miniSvg = useMemo(() => {
    if (!inView) return '';
    return getTemplatePreview(template);
  }, [inView, template]);

  const mm = template.defaultMm || {
    width: 50,
    height: Math.round(50 / template.aspectRatio),
  };

  return (
    <div
      className={cn(
        'group relative flex min-w-0 flex-col rounded-md border p-2 text-start transition-colors [content-visibility:auto] [contain-intrinsic-size:0_205px]',
        isSelected
          ? 'bg-primary/5 border-primary/60'
          : 'bg-card/60 hover:bg-card border-border/50 hover:border-border',
      )}
    >
      <button
        ref={cardRef}
        type="button"
        tabIndex={isFocused ? 0 : -1}
        onClick={() => onSelect(template)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        aria-pressed={isSelected}
        aria-label={`${template.name} — ${mm.width}×${mm.height} مم`}
        aria-describedby={!miniSvg ? `sticker-preview-${template.id}` : undefined}
        className={cn(
          'coarse-touch-target flex min-w-0 flex-1 flex-col rounded-md cursor-pointer text-start',
          FOCUS_RING,
        )}
      >
        <div className="relative flex h-30 w-full items-center justify-center overflow-hidden rounded-md bg-preview-surface p-2">
          {miniSvg ? (
            <div
              className="w-full h-full flex items-center justify-center pointer-events-none [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkupCached(miniSvg) }}
            />
          ) : (
            <span
              id={`sticker-preview-${template.id}`}
              className="px-2 text-center text-control text-muted-foreground"
            >
              {inView ? 'تعذرت المعاينة' : 'جارٍ تجهيز المعاينة…'}
            </span>
          )}
          {isSelected && (
            <span
              className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-md bg-primary-action text-primary-foreground"
              aria-hidden="true"
            >
              <Check className="size-3" />
            </span>
          )}
        </div>
        <span
          className={cn(
            'mt-2 min-h-9 w-full line-clamp-2 px-0.5 text-control font-semibold transition-colors',
            isSelected ? 'text-primary' : 'text-foreground',
          )}
          title={template.name}
        >
          {template.name}
        </span>
      </button>
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/40 pt-1 text-mini text-muted-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span dir="ltr" className="whitespace-nowrap font-mono tabular-nums">
            {mm.width}×{mm.height} مم
          </span>
          <span className="whitespace-nowrap">{shapeLabel(template)}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!assetFavoriteId('sticker:builtin', template.id)}
          aria-pressed={isFavorite}
          aria-label={`${isFavorite ? 'إزالة من' : 'إضافة إلى'} المفضلة: ${template.name}`}
          className={cn(
            'coarse-touch-target shrink-0',
            isFavorite ? 'text-primary' : 'text-muted-foreground',
          )}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(template);
          }}
        >
          <Star className="size-3.5" weight={isFavorite ? 'fill' : 'regular'} aria-hidden="true" />
        </Button>
      </div>
    </div>
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
  discoveryState,
  onDiscoveryStateChange,
}: StickerCatalogProps) {
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [localFavoritesOnly, setLocalFavoritesOnly] = useState(false);
  const favoritesOnly = discoveryState?.favoritesOnly ?? localFavoritesOnly;
  const [announcement, setAnnouncement] = useState('');
  const { favorites, toggleFavorite } = useAssetFavorites();
  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);
  const hasFavorites = useMemo(
    () =>
      ALL_STICKER_TEMPLATES.some((template) =>
        favoriteIds.has(assetFavoriteId('sticker:builtin', template.id)!),
      ),
    [favoriteIds],
  );
  const debounceRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // تتبع آخر إزاحة أُبلغ بها الأب لمنع حلقة إعادة الكتابة في scrollTop عند استجابة الأب لـ onScroll.
  const lastReportedScrollTopRef = useRef<number | null>(null);

  const filteredTemplates = useMemo(() => {
    const matches = searchStickerTemplates(searchQuery, selectedCategory, selectedShape);
    return favoritesOnly
      ? matches.filter((template) =>
          favoriteIds.has(assetFavoriteId('sticker:builtin', template.id)!),
        )
      : matches;
  }, [searchQuery, selectedCategory, selectedShape, favoritesOnly, favoriteIds]);

  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const previousFilters = useRef({ selectedCategory, selectedShape, searchQuery, favoritesOnly });
  useEffect(() => {
    const previous = previousFilters.current;
    if (
      previous.selectedCategory !== selectedCategory ||
      previous.selectedShape !== selectedShape ||
      previous.searchQuery !== searchQuery ||
      previous.favoritesOnly !== favoritesOnly
    ) {
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      lastReportedScrollTopRef.current = 0;
      onDiscoveryStateChange?.({ favoritesOnly, scrollTop: 0 });
      setFocusedIndex(0);
    }
    previousFilters.current = { selectedCategory, selectedShape, searchQuery, favoritesOnly };
  }, [selectedCategory, selectedShape, searchQuery, favoritesOnly, onDiscoveryStateChange]);

  useEffect(() => {
    const targetTop = discoveryState?.scrollTop;
    if (
      !scrollContainerRef.current ||
      typeof targetTop !== 'number' ||
      !Number.isFinite(targetTop)
    ) {
      return;
    }
    const clampedTop = Math.max(0, targetTop);
    if (lastReportedScrollTopRef.current === clampedTop) {
      return;
    }
    lastReportedScrollTopRef.current = clampedTop;
    if (Math.abs(scrollContainerRef.current.scrollTop - clampedTop) > 0.5) {
      scrollContainerRef.current.scrollTop = clampedTop;
    }
  }, [discoveryState?.scrollTop]);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);
  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    },
    [],
  );

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        onSearchChange(value);
      }, 120);
    },
    [onSearchChange],
  );

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = null;
    setSearchInput('');
    onSearchChange('');
    searchInputRef.current?.focus();
  }, [onSearchChange]);

  const handleToggleFavorite = useCallback(
    (template: StickerTemplate) => {
      if (!ALL_STICKER_TEMPLATES.some((item) => item.id === template.id)) return;
      const added = toggleFavorite('sticker:builtin', template.id);
      if (added !== undefined)
        setAnnouncement(`${added ? 'أضيف إلى' : 'أزيل من'} المفضلة: ${template.name}`);
    },
    [toggleFavorite],
  );

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      // Defend the event target as well as activeElement; never steal a foreign editor/dialog.
      const target = e.target instanceof Element ? e.target : null;
      if (
        target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
      )
        return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)))
        return;
      const ownDialog =
        searchInputRef.current?.closest('[role="dialog"], [role="alertdialog"]') ?? null;
      const targetDialog = target?.closest('[role="dialog"], [role="alertdialog"]') ?? null;
      const activeDialog = ae?.closest('[role="dialog"], [role="alertdialog"]') ?? null;
      if (
        (targetDialog && targetDialog !== ownDialog) ||
        (activeDialog && activeDialog !== ownDialog)
      )
        return;
      if (
        !searchInputRef.current ||
        searchInputRef.current.closest('[hidden], [inert], [aria-hidden="true"]')
      )
        return;
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const count = filteredTemplates.length;
      if (count === 0) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex(Math.min(count - 1, index + 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex(Math.max(0, index - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const cols = window.innerWidth >= 768 ? 4 : window.innerWidth >= 640 ? 3 : 2;
        setFocusedIndex(Math.min(count - 1, index + cols));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const cols = window.innerWidth >= 768 ? 4 : window.innerWidth >= 640 ? 3 : 2;
        setFocusedIndex(Math.max(0, index - cols));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(count - 1);
      }
    },
    [filteredTemplates.length],
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/20 select-none">
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <div className="px-4 pt-3 pb-2 border-b border-border/30 bg-muted/10 shrink-0">
        <FluentFilterChips
          layoutId="sticker-catalog-filter-chips"
          value={selectedCategory}
          onChange={(val) =>
            onSelectCategory(val as StickerCategoryGroupId | StickerCategory | 'all')
          }
          size="md"
          options={CATEGORY_ITEMS.map((cat) => ({
            id: cat.id,
            label: cat.title,
            icon: cat.icon,
            count: CATEGORY_COUNTS[cat.id] || 0,
          }))}
        />
        <div className="mt-2.5 space-y-2">
          <div className="relative w-full">
            <MagnifyingGlass
              className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              ref={searchInputRef}
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && searchInput) {
                  e.stopPropagation();
                  handleClearSearch();
                }
              }}
              placeholder="بحث (/) ..."
              aria-label="بحث في الملصقات"
              className="coarse-touch-target h-8 w-full ps-8 pe-12 text-control rounded-md bg-card/80 border-border/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none text-foreground placeholder:text-muted-foreground/60 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="مسح البحث"
                title="مسح البحث"
                className={cn(
                  'coarse-touch-target absolute end-0 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground rounded-md cursor-pointer',
                  FOCUS_RING,
                )}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn('coarse-touch-target', favoritesOnly && 'bg-primary/5 text-primary')}
              aria-label="المفضلة"
              title="المفضلة"
              aria-pressed={favoritesOnly}
              onClick={() => {
                const next = !favoritesOnly;
                setLocalFavoritesOnly(next);
                lastReportedScrollTopRef.current = 0;
                onDiscoveryStateChange?.({ favoritesOnly: next, scrollTop: 0 });
              }}
            >
              <Star
                className="size-3.5"
                weight={favoritesOnly ? 'fill' : 'regular'}
                aria-hidden="true"
              />
              المفضلة
            </Button>
            <div
              role="radiogroup"
              aria-label="تصفية الشكل"
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
                          'coarse-touch-target w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer',
                          FOCUS_RING,
                          isActive
                            ? 'bg-background text-foreground font-bold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
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
              className="text-mini font-mono tabular-nums text-muted-foreground"
              aria-live="polite"
              aria-label="عدد النتائج"
            >
              {filteredTemplates.length}
            </span>
          </div>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-none p-4"
        role="group"
        aria-label="القوالب"
        onScroll={(event) => {
          const nextTop = event.currentTarget.scrollTop;
          if (lastReportedScrollTopRef.current === nextTop) return;
          lastReportedScrollTopRef.current = nextTop;
          onDiscoveryStateChange?.({ favoritesOnly, scrollTop: nextTop });
        }}
      >
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4 text-muted-foreground space-y-2">
            <SquaresFour className="w-8 h-8 opacity-40 mb-1" aria-hidden="true" />
            <p className="text-xs font-semibold text-foreground/80">
              {ALL_STICKER_TEMPLATES.length === 0
                ? 'لا توجد ملصقات'
                : favoritesOnly && !hasFavorites
                  ? 'لا توجد مفضلة'
                  : 'لا توجد نتائج'}
            </p>
            <p className="text-mini text-muted-foreground">
              {favoritesOnly && !hasFavorites
                ? 'أضف ملصقاً إلى المفضلة باستخدام النجمة.'
                : 'جرّب كلمات أو تصنيفاً آخر'}
            </p>
            {searchInput && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSearch}
                className="coarse-touch-target"
              >
                مسح البحث
              </Button>
            )}
            {favoritesOnly && !hasFavorites && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="coarse-touch-target"
                onClick={() => {
                  setLocalFavoritesOnly(false);
                  onDiscoveryStateChange?.({ favoritesOnly: false, scrollTop: 0 });
                }}
              >
                عرض المكتبة
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredTemplates.map((template, idx) => (
              <GalleryCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={onSelectTemplate}
                isFavorite={favoriteIds.has(assetFavoriteId('sticker:builtin', template.id)!)}
                onToggleFavorite={handleToggleFavorite}
                isFocused={Math.min(focusedIndex, filteredTemplates.length - 1) === idx}
                onFocus={() => setFocusedIndex(idx)}
                onKeyDown={(e) => handleCardKeyDown(e, idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

StickerCatalog.displayName = 'StickerCatalog';
