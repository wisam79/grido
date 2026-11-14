import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FluentEmptyState } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  Check,
  UploadSimple,
  DownloadSimple,
  Trash,
  MagnifyingGlass,
  X,
  Star,
} from '@/components/ui/icons';
import { normalizeArabicQuery } from '@/features/stickers/lib/sticker-text';
import { assetFavoriteId, useAssetFavorites } from '@/lib/asset-favorites';
import { cn } from '@/lib/utils';
import type { CollagePresetCategory } from './collage-preset-data';
import type { CollageTemplate } from '@/lib/templates';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';

const StudioPaperThumbnail = React.memo(function StudioPaperThumbnail({
  cells,
  active,
}: {
  cells: CollageTemplate['cells'];
  active: boolean;
}) {
  return (
    <svg viewBox="0 0 100 142" className="h-full max-w-full" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="99"
        height="141"
        rx="2"
        className="fill-background stroke-muted-foreground/60"
      />
      {cells.map((cell, index) => {
        const x = 5 + cell.x * 90;
        const y = 5 + cell.y * 132;
        const w = cell.w * 90;
        const h = cell.h * 132;
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={w}
            height={h}
            rx="1"
            className={cn(
              'transition-colors duration-150',
              active
                ? 'fill-primary/25 stroke-primary'
                : 'fill-muted-foreground/25 stroke-muted-foreground',
            )}
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
});

export interface CollagePresetsTabProps {
  presetCategory?: CollagePresetCategory;
  onPresetCategoryChange?: (category: CollagePresetCategory) => void;
  activeTemplateId: string | undefined;
  onSelect: (template: CollageTemplate) => void;
  savedTemplates?: CollageTemplate[];
  /** Omit until the owner can verify loading; an initial [] is not a loaded library. */
  savedTemplatesStatus?: 'loading' | 'loaded' | 'error';
  onRetryLoad?: () => void;
  onCustomizeClick?: () => void;
  onDeleteTemplate?: (id: string, event: React.MouseEvent) => void;
  onImportClick?: () => void;
  onExportAllClick?: () => void;
}

export function CollagePresetsTab({
  activeTemplateId,
  onSelect,
  savedTemplates = [],
  savedTemplatesStatus,
  onRetryLoad,
  onCustomizeClick,
  onDeleteTemplate,
  onImportClick,
  onExportAllClick,
}: CollagePresetsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [pendingDelete, setPendingDelete] = useState<CollageTemplate | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { favorites, toggleFavorite, pruneFavorites } = useAssetFavorites();
  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);

  useEffect(() => {
    if (savedTemplatesStatus === 'loaded') {
      pruneFavorites(
        'collage:saved',
        savedTemplates.map((template) => template.id),
      );
    }
  }, [savedTemplatesStatus, savedTemplates, pruneFavorites]);

  const query = normalizeArabicQuery(searchQuery);
  const favoriteTemplates = useMemo(
    () =>
      savedTemplates.filter((template) =>
        favoriteIds.has(assetFavoriteId('collage:saved', template.id)!),
      ),
    [savedTemplates, favoriteIds],
  );
  const filteredTemplates = useMemo(
    () =>
      (favoritesOnly ? favoriteTemplates : savedTemplates).filter(
        (template) =>
          !query ||
          normalizeArabicQuery(template.name).includes(query) ||
          `${template.slots}`.includes(query),
      ),
    [query, savedTemplates, favoriteTemplates, favoritesOnly],
  );

  const clearSearch = () => {
    setSearchQuery('');
    searchRef.current?.focus();
  };

  const renderSaved = (template: CollageTemplate) => {
    const active = activeTemplateId === template.id;
    const favorite = favoriteIds.has(assetFavoriteId('collage:saved', template.id)!);
    return (
      <div
        key={template.id}
        className={cn(
          'group flex min-w-0 flex-col rounded-md border bg-card/60 transition-colors',
          active ? 'border-primary/60 bg-primary/5' : 'border-border/50 hover:border-border',
        )}
      >
        <button
          type="button"
          aria-pressed={active}
          aria-label={`${template.name} ${template.slots} صور`}
          onClick={() => onSelect(template)}
          className={cn(
            'coarse-touch-target flex min-w-0 flex-1 flex-col gap-2 rounded-md p-2 text-start hover:bg-muted/20 cursor-pointer',
            FOCUS_RING,
          )}
        >
          <span className="relative flex h-30 w-full items-center justify-center rounded-md bg-preview-surface p-2.5">
            <StudioPaperThumbnail cells={template.cells} active={active} />
            {active && (
              <span
                className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-md bg-primary-action text-primary-foreground"
                aria-hidden="true"
              >
                <Check className="size-3" />
              </span>
            )}
          </span>
          <span
            className="min-h-9 w-full line-clamp-2 text-control font-semibold"
            title={template.name}
          >
            {template.name}
          </span>
        </button>
        <div className="mx-2 flex flex-wrap items-center justify-between gap-1 border-t border-border/40 py-1">
          <span className="text-mini text-muted-foreground">{template.slots} صور</span>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!assetFavoriteId('collage:saved', template.id)}
              aria-pressed={favorite}
              aria-label={`${favorite ? 'إزالة من' : 'إضافة إلى'} المفضلة: ${template.name}`}
              className={cn(
                'coarse-touch-target shrink-0',
                favorite ? 'text-primary' : 'text-muted-foreground',
              )}
              onClick={(event) => {
                event.stopPropagation();
                const added = toggleFavorite('collage:saved', template.id);
                if (added !== undefined)
                  setAnnouncement(`${added ? 'أضيف إلى' : 'أزيل من'} المفضلة: ${template.name}`);
              }}
            >
              <Star
                className="size-3.5"
                weight={favorite ? 'fill' : 'regular'}
                aria-hidden="true"
              />
            </Button>
            {onDeleteTemplate && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="coarse-touch-target shrink-0 text-muted-foreground hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  setPendingDelete(template);
                }}
                title="حذف القالب"
                aria-label={`حذف القالب ${template.name}`}
              >
                <Trash className="size-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="space-y-4 font-cairo motion-safe:animate-in motion-safe:fade-in duration-150"
      dir="rtl"
    >
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <div className="space-y-2">
        <div className="relative">
          <MagnifyingGlass
            className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="بحث في قوالبي المحفوظة…"
            aria-label="بحث في قوالبي المحفوظة"
            className={cn(
              'coarse-touch-target h-8 w-full rounded-md border border-border/50 bg-muted/20 ps-9 pe-12 text-control placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none',
              FOCUS_RING,
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className={cn(
                'coarse-touch-target absolute end-0 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted cursor-pointer',
                FOCUS_RING,
              )}
              title="مسح البحث"
              aria-label="مسح البحث"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('coarse-touch-target', favoritesOnly && 'bg-primary/5 text-primary')}
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((value) => !value)}
          >
            <Star
              className="size-3.5"
              weight={favoritesOnly ? 'fill' : 'regular'}
              aria-hidden="true"
            />
            المفضلة
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {savedTemplatesStatus === 'error' && (
          <div role="alert" className="space-y-2 text-sm">
            <p>تعذر تحميل القوالب المحفوظة</p>
            {onRetryLoad && (
              <Button
                type="button"
                variant="outline"
                className="coarse-touch-target"
                onClick={onRetryLoad}
              >
                إعادة المحاولة
              </Button>
            )}
          </div>
        )}
        {savedTemplates.length === 0 ? (
          savedTemplatesStatus === 'loaded' ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border/60 px-4 py-8 text-center">
              <p className="text-sm font-semibold">لا توجد قوالب محفوظة</p>
              <p className="text-xs text-muted-foreground">
                خصّص شبكتك في تبويب «مخصص» ثم اختر «حفظ كقالب» لتظهر هنا.
              </p>
              {onCustomizeClick && (
                <Button
                  type="button"
                  variant="outline"
                  className="coarse-touch-target"
                  onClick={onCustomizeClick}
                >
                  تخصيص الشبكة
                </Button>
              )}
              {onImportClick && (
                <Button
                  type="button"
                  variant="outline"
                  className="coarse-touch-target"
                  onClick={onImportClick}
                >
                  <UploadSimple className="size-4" aria-hidden="true" />
                  <span>استيراد قالب JSON</span>
                </Button>
              )}
            </div>
          ) : savedTemplatesStatus !== 'error' ? (
            <p role="status" className="text-xs text-muted-foreground">
              {savedTemplatesStatus === 'loading'
                ? 'جارٍ تحميل القوالب المحفوظة…'
                : 'لم يتم التحقق من القوالب المحفوظة بعد'}
            </p>
          ) : null
        ) : (
          <>
            <div className="flex gap-2">
              {onImportClick && (
                <Button type="button" variant="outline" className="flex-1" onClick={onImportClick}>
                  <UploadSimple className="size-3.5" aria-hidden="true" />
                  استيراد
                </Button>
              )}
              {onExportAllClick && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onExportAllClick}
                >
                  <DownloadSimple className="size-3.5" aria-hidden="true" />
                  تصدير الكل
                </Button>
              )}
            </div>
            {favoritesOnly && favoriteTemplates.length === 0 ? (
              <FluentEmptyState
                icon={<Star className="size-6" aria-hidden="true" />}
                title="لا توجد مفضلة"
                description="أضف قالباً إلى المفضلة باستخدام النجمة."
              />
            ) : filteredTemplates.length === 0 ? (
              <div className="space-y-2 text-center">
                <FluentEmptyState
                  icon={<MagnifyingGlass className="size-6" aria-hidden="true" />}
                  title="لا توجد نتائج"
                  description="لا توجد قوالب تطابق البحث والفلاتر الحالية."
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="outline"
                    className="coarse-touch-target"
                    onClick={clearSearch}
                  >
                    مسح البحث
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">{filteredTemplates.map(renderSaved)}</div>
            )}
          </>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent dir="rtl" className="font-cairo">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القالب؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُحذف «{pendingDelete?.name}» من القوالب المحفوظة. لا يمكن التراجع عن الحذف.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                if (
                  pendingDelete &&
                  savedTemplates.some((template) => template.id === pendingDelete.id)
                )
                  onDeleteTemplate?.(pendingDelete.id, event);
                setPendingDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
