import React, { useState, useMemo } from 'react';
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
} from '@/components/ui/icons';
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
  onDeleteTemplate?: (id: string, event: React.MouseEvent) => void;
  onImportClick?: () => void;
  onExportAllClick?: () => void;
}

export function CollagePresetsTab({
  activeTemplateId,
  onSelect,
  savedTemplates = [],
  onDeleteTemplate,
  onImportClick,
  onExportAllClick,
}: CollagePresetsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<CollageTemplate | null>(null);

  const query = searchQuery.trim().toLowerCase();
  const filteredTemplates = useMemo(
    () =>
      query
        ? savedTemplates.filter(
            (template) =>
              template.name.toLowerCase().includes(query) || `${template.slots}`.includes(query),
          )
        : savedTemplates,
    [query, savedTemplates],
  );

  const renderSaved = (template: CollageTemplate) => {
    const active = activeTemplateId === template.id;
    return (
      <div
        key={template.id}
        className={cn(
          'flex items-center rounded-md border transition-colors',
          active ? 'border-primary/60 bg-primary/5' : 'border-border/50 hover:border-border',
        )}
      >
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onSelect(template)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 text-start hover:bg-muted/30 cursor-pointer',
            FOCUS_RING,
          )}
        >
          <span className="flex h-16 w-14 shrink-0 justify-center rounded-md bg-muted/60 p-1.5">
            <StudioPaperThumbnail cells={template.cells} active={active} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-control font-semibold" title={template.name}>
              {template.name}
            </span>
            <span className="text-mini text-muted-foreground">{template.slots} صور</span>
          </span>
          {active && <Check className="size-3.5 shrink-0 text-primary" />}
        </button>
        {onDeleteTemplate && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="me-1 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => setPendingDelete(template)}
            title="حذف القالب"
            aria-label={`حذف القالب ${template.name}`}
          >
            <Trash className="size-3.5" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div
      className="space-y-4 font-cairo motion-safe:animate-in motion-safe:fade-in duration-150"
      dir="rtl"
    >
      <div className="space-y-2">
        <div className="relative">
          <MagnifyingGlass className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="بحث في قوالبي المحفوظة…"
            aria-label="بحث في قوالبي المحفوظة"
            className={cn(
              'h-8 w-full rounded-md border border-border/50 bg-muted/20 ps-9 pe-9 text-xs placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none',
              FOCUS_RING,
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={cn(
                'absolute end-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted cursor-pointer',
                FOCUS_RING,
              )}
              title="مسح البحث"
              aria-label="مسح البحث"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {savedTemplates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border/60 px-4 py-8 text-center">
            <p className="text-sm font-semibold">لا توجد قوالب محفوظة</p>
            <p className="text-xs text-muted-foreground">
              خصّص شبكتك في تبويب «مخصص» ثم اختر «حفظ كقالب» لتظهر هنا.
            </p>
            {onImportClick && (
              <Button variant="outline" onClick={onImportClick}>
                <UploadSimple className="size-4" />
                <span>استيراد قالب JSON</span>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {onImportClick && (
                <Button variant="outline" className="flex-1" onClick={onImportClick}>
                  <UploadSimple className="size-3.5" />
                  استيراد
                </Button>
              )}
              {onExportAllClick && (
                <Button variant="outline" className="flex-1" onClick={onExportAllClick}>
                  <DownloadSimple className="size-3.5" />
                  تصدير الكل
                </Button>
              )}
            </div>
            {filteredTemplates.length === 0 ? (
              <FluentEmptyState
                icon={<MagnifyingGlass className="size-6" />}
                title="لا توجد نتائج"
                description="لم يتم العثور على قالب بهذا الاسم"
              />
            ) : (
              <div className="space-y-2">{filteredTemplates.map(renderSaved)}</div>
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
                if (pendingDelete) onDeleteTemplate?.(pendingDelete.id, event);
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
