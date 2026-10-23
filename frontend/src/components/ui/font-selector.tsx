import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

import { CaretDown, Check, MagnifyingGlass, Star, X } from '@/components/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ARABIC_FONTS, loadGoogleFont } from '@/lib/io/fonts';
import { readStoredList, writeStoredList } from '@/lib/local-prefs';
import { cn } from '@/lib/utils';

import type { FontOption } from '@/lib/io/fonts';

interface FontSelectorProps {
  value: string;
  onChange: (font: FontOption) => void;
  onOpen?: () => void;
  onPreview?: (font: FontOption) => void;
  onCancel?: () => void;
  className?: string;
}

const FAVORITES_KEY = 'grido_favorite_fonts';
const focusClassName =
  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';
const iconClassName =
  'size-8 shrink-0 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150 motion-reduce:transition-none cursor-pointer';

function findFont(value: string) {
  const name = value.split(',')[0].trim().replace(/['"]/g, '').toLowerCase();
  return ARABIC_FONTS.find(
    (font) =>
      font.family.split(',')[0].trim().replace(/['"]/g, '').toLowerCase() === name ||
      font.id === name ||
      font.arabicName === name,
  );
}

function fontLabel(font: FontOption) {
  return font.category === 'latin' ? font.englishName : font.arabicName;
}

export const FontSelector = React.memo(function FontSelector({
  value,
  onChange,
  onOpen,
  onPreview,
  onCancel,
  className,
}: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [committedValue, setCommittedValue] = useState(value);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const listId = useId();
  const currentFont = findFont(isOpen ? committedValue : value);

  const fonts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return ARABIC_FONTS.filter((font) =>
      [font.arabicName, font.englishName, font.name].some((name) =>
        name.toLowerCase().includes(search),
      ),
    );
  }, [query]);

  const activeIndex = fonts.findIndex((font) => font.id === activeId);
  const selectedIndex = currentFont ? fonts.indexOf(currentFont) : -1;
  const tabIndex = activeIndex >= 0 ? activeIndex : Math.max(0, selectedIndex);

  useEffect(() => {
    if (!isOpen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const font = ARABIC_FONTS.find(
            (item) => item.id === (entry.target as HTMLElement).dataset.fontId,
          );
          if (font) void loadGoogleFont(font.family, 400);
          observer.unobserve(entry.target);
        }
      },
      { root: listRef.current },
    );
    for (const button of rowRefs.current.values()) observer.observe(button);
    return () => observer.disconnect();
  }, [isOpen, fonts]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setCommittedValue(value);
      setQuery('');
      setActiveId(null);
      setFavorites(readStoredList(FAVORITES_KEY, ['cairo', 'tajawal', 'amiri']));
      onOpen?.();
    } else {
      onCancel?.();
    }
    setIsOpen(open);
  };

  const reveal = (font: FontOption) => {
    rowRefs.current.get(font.id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const preview = (font: FontOption) => {
    setActiveId(font.id);
    void loadGoogleFont(font.family, 400);
    onPreview?.(font);
  };

  const selectFont = (font: FontOption) => {
    void loadGoogleFont(font.family, 400);
    onChange(font);
    setIsOpen(false);
  };

  const toggleFavorite = (font: FontOption) => {
    const next = favorites.includes(font.id)
      ? favorites.filter((id) => id !== font.id)
      : [...favorites, font.id];
    writeStoredList(FAVORITES_KEY, next);
    setFavorites(next);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || fonts.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      const index =
        event.key === 'ArrowDown'
          ? (activeIndex + 1) % fonts.length
          : activeIndex <= 0
            ? fonts.length - 1
            : activeIndex - 1;
      preview(fonts[index]);
      reveal(fonts[index]);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      event.stopPropagation();
      selectFont(fonts[activeIndex]);
    }
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    favorite = false,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
      return;
    }
    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % fonts.length;
    else if (event.key === 'ArrowUp') nextIndex = (index + fonts.length - 1) % fonts.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = fonts.length - 1;
    else if (event.key === 'ArrowLeft') favorite = true;
    else if (event.key === 'ArrowRight') favorite = false;
    else return;
    event.preventDefault();
    event.stopPropagation();
    setActiveId(fonts[nextIndex].id);
    const button = rowRefs.current.get(fonts[nextIndex].id);
    const target = favorite
      ? button?.closest('[role="row"]')?.querySelector<HTMLButtonElement>('[data-font-favorite]')
      : button;
    target?.focus({ preventScroll: true });
    reveal(fonts[nextIndex]);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`الخط: ${currentFont ? fontLabel(currentFont) : value}`}
          className={cn(
            'flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground hover:bg-accent/45 transition-colors duration-150 motion-reduce:transition-none cursor-pointer',
            focusClassName,
            className,
          )}
        >
          <span className="truncate">{currentFont ? fontLabel(currentFont) : value}</span>
          <CaretDown
            aria-hidden="true"
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none',
              isOpen && 'rotate-180',
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="اختيار الخط"
        align="start"
        sideOffset={4}
        className="z-(--z-popover) flex w-72 max-w-[calc(100vw-24px)] flex-col overflow-hidden p-0 font-cairo"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
          if (currentFont) reveal(currentFont);
        }}
      >
        <div className="shrink-0 space-y-2 border-b border-border/55 p-2">
          <div className="relative">
            <MagnifyingGlass
              aria-hidden="true"
              className="pointer-events-none absolute start-2 top-2 size-4 text-muted-foreground"
            />
            <input
              ref={searchRef}
              role="combobox"
              aria-label="البحث في الخطوط"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-haspopup="grid"
              aria-controls={listId}
              aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeId}` : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveId(null);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="بحث في الخطوط..."
              className={cn(
                'h-8 w-full rounded-md border border-border/60 bg-background ps-8 pe-9 text-xs text-foreground placeholder:text-muted-foreground',
                focusClassName,
              )}
            />
            {query && (
              <button
                type="button"
                aria-label="مسح البحث"
                className={cn(iconClassName, focusClassName, 'absolute end-0 top-0')}
                onClick={() => {
                  setQuery('');
                  setActiveId(null);
                  searchRef.current?.focus();
                }}
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <div
          ref={listRef}
          id={listId}
          role="grid"
          aria-label="الخطوط"
          aria-colcount={2}
          className="min-h-0 max-h-64 overflow-y-auto overscroll-contain p-1 custom-scrollbar"
        >
          {fonts.map((font, index) => {
            const isFavorite = favorites.includes(font.id);
            const isSelected = currentFont?.id === font.id;
            return (
              <div
                key={font.id}
                role="row"
                aria-selected={isSelected}
                className={cn(
                  'flex h-8 items-center rounded-md text-foreground',
                  isSelected && 'bg-primary/10',
                  activeIndex === index && 'bg-accent/60',
                )}
              >
                <div id={`${listId}-${font.id}`} role="gridcell" className="min-w-0 flex-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        ref={(node) => {
                          if (node) rowRefs.current.set(font.id, node);
                          else rowRefs.current.delete(font.id);
                        }}
                        type="button"
                        data-font-id={font.id}
                        aria-label={
                          font.category === 'latin'
                            ? font.englishName
                            : `${fontLabel(font)} (${font.englishName})`
                        }
                        tabIndex={tabIndex === index ? 0 : -1}
                        onClick={() => selectFont(font)}
                        onMouseEnter={() => preview(font)}
                        onFocus={() => preview(font)}
                        onKeyDown={(event) => handleRowKeyDown(event, index)}
                        className={cn(
                          'flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-start text-xs hover:bg-accent/45 cursor-pointer',
                          focusClassName,
                        )}
                      >
                        <Check
                          aria-hidden="true"
                          className={cn(
                            'size-3.5 shrink-0 text-primary',
                            !isSelected && 'invisible',
                          )}
                        />
                        <span
                          dir="auto"
                          style={{ fontFamily: font.family }}
                          className="truncate font-normal"
                        >
                          {fontLabel(font)}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="z-(--z-popover)">
                      {font.englishName} · {font.isOffline ? 'مدمج' : 'سحابي — يتطلب اتصالاً'}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div role="gridcell" className="shrink-0 px-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-font-favorite
                        aria-label={`${isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}: ${fontLabel(font)}`}
                        aria-pressed={isFavorite}
                        tabIndex={tabIndex === index ? 0 : -1}
                        onFocus={() => setActiveId(font.id)}
                        onClick={() => toggleFavorite(font)}
                        onKeyDown={(event) => handleRowKeyDown(event, index, true)}
                        className={cn(
                          iconClassName,
                          focusClassName,
                          'size-7',
                          isFavorite && 'text-primary',
                        )}
                      >
                        <Star
                          aria-hidden="true"
                          className="size-3.5"
                          weight={isFavorite ? 'fill' : 'regular'}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="z-(--z-popover)">
                      {isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
        {fonts.length === 0 && (
          <p role="status" className="px-3 py-6 text-center text-xs text-muted-foreground">
            لا خط مطابق
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
});
