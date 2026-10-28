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
import { FluentEmptyState, FluentSegmentedControl } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  Check,
  UploadSimple,
  DownloadSimple,
  Trash,
  SquaresFour,
  List,
  MagnifyingGlass,
  X,
} from '@/components/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { COLLAGE_TEMPLATES } from '@/lib/templates';
import { cn } from '@/lib/utils';
import {
  ALL_STUDIO_PRESETS,
  STUDIO_COMBO_PRESETS,
  STUDIO_KEEPSAKE_PRESETS,
} from './collage-preset-data';
import type { CollagePresetCategory, StudioPreset } from './collage-preset-data';
import type { CollageTemplate } from '@/lib/templates';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';
const SPEC_NUMBER_PATTERN = /(\d+(?:[.,]\d+)?(?:\s*×\s*\d+(?:[.,]\d+)?)?)/g;

function SpecText({ spec }: { spec: string }) {
  return (
    <span className="text-mini text-muted-foreground leading-relaxed" dir="rtl" title={spec}>
      {spec.split(SPEC_NUMBER_PATTERN).map((part, index) =>
        /^\d/.test(part) ? (
          <bdi key={index} dir="ltr">
            {part}
          </bdi>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      )}
    </span>
  );
}

const StudioPaperThumbnail = React.memo(function StudioPaperThumbnail({
  cells,
  active,
}: {
  cells: CollageTemplate['cells'];
  active: boolean;
}) {
  return (
    <svg viewBox="0 0 100 142" className="h-full max-w-full" aria-hidden="true">
      <rect x="0.5" y="0.5" width="99" height="141" rx="2" className="fill-card stroke-border" />
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
                ? 'fill-primary/20 stroke-primary/60'
                : 'fill-muted-foreground/10 stroke-muted-foreground/35',
            )}
            strokeWidth="0.7"
          />
        );
      })}
    </svg>
  );
});

export interface CollagePresetsTabProps {
  presetCategory: CollagePresetCategory;
  onPresetCategoryChange: (category: CollagePresetCategory) => void;
  activeTemplateId: string | undefined;
  onSelect: (template: CollageTemplate) => void;
  savedTemplates?: CollageTemplate[];
  onDeleteTemplate?: (id: string, event: React.MouseEvent) => void;
  onImportClick?: () => void;
  onExportAllClick?: () => void;
}

export function CollagePresetsTab({
  presetCategory,
  onPresetCategoryChange,
  activeTemplateId,
  onSelect,
  savedTemplates = [],
  onDeleteTemplate,
  onImportClick,
  onExportAllClick,
}: CollagePresetsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [pendingDelete, setPendingDelete] = useState<CollageTemplate | null>(null);
  const categories: { id: CollagePresetCategory; label: string }[] = [
    { id: 'all', label: 'كل القوالب' },
    { id: 'combo', label: 'أطقم رسمية' },
    { id: 'keepsake', label: 'تذكار وكروت' },
    { id: 'saved', label: 'قوالب محفوظة' },
  ];
  const query = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(
    () =>
      query
        ? {
            official: ALL_STUDIO_PRESETS.filter((preset) =>
              [preset.title, preset.spec, preset.tag, preset.badge].some((text) =>
                text?.toLowerCase().includes(query),
              ),
            ),
            saved: savedTemplates.filter(
              (template) =>
                template.name.toLowerCase().includes(query) || `${template.slots}`.includes(query),
            ),
          }
        : null,
    [query, savedTemplates],
  );
  const groups =
    presetCategory === 'combo'
      ? [{ title: '', presets: STUDIO_COMBO_PRESETS }]
      : presetCategory === 'keepsake'
        ? [{ title: '', presets: STUDIO_KEEPSAKE_PRESETS }]
        : [
            { title: 'أطقم رسمية', presets: STUDIO_COMBO_PRESETS },
            { title: 'تذكار وكروت', presets: STUDIO_KEEPSAKE_PRESETS },
          ];
  const cardLayout = viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2';

  const renderPreset = (preset: StudioPreset) => {
    const template = COLLAGE_TEMPLATES.find((item) => item.id === preset.id);
    if (!template) return null;
    const active = activeTemplateId === preset.id;
    return (
      <button
        key={preset.id}
        type="button"
        aria-pressed={active}
        aria-label={`${preset.title} - ${preset.spec}`}
        onClick={() => onSelect(template)}
        className={cn(
          'group relative flex min-w-0 rounded-md border p-2 text-start transition-colors duration-150 cursor-pointer',
          viewMode === 'grid' ? 'flex-col gap-2' : 'items-center gap-3',
          active
            ? 'border-primary/60 bg-primary/5'
            : 'border-border/40 hover:border-border/70 hover:bg-muted/30',
          FOCUS_RING,
        )}
      >
        <span
          className={cn(
            'flex items-center justify-center rounded-sm bg-muted/30',
            viewMode === 'grid' ? 'h-24 w-full py-2' : 'h-16 w-12 shrink-0 p-1',
          )}
        >
          <StudioPaperThumbnail cells={template.cells} active={active} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold leading-relaxed">{preset.title}</span>
          <SpecText spec={preset.spec} />
        </span>
        {active && (
          <span className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" weight="bold" />
          </span>
        )}
      </button>
    );
  };

  const renderSaved = (template: CollageTemplate) => {
    const active = activeTemplateId === template.id;
    return (
      <div
        key={template.id}
        className={cn(
          'flex items-center rounded-md border',
          active ? 'border-primary/60 bg-primary/5' : 'border-border/50',
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
          <span className="flex h-16 w-12 shrink-0 justify-center rounded-sm bg-muted/30 p-1">
            <StudioPaperThumbnail cells={template.cells} active={active} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-xs font-semibold">{template.name}</span>
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
            placeholder="بحث في القوالب…"
            aria-label="بحث في القوالب"
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
        <div className="flex items-center gap-2">
          <Select
            value={presetCategory}
            onValueChange={(value) => {
              onPresetCategoryChange(value as CollagePresetCategory);
              setSearchQuery('');
            }}
          >
            <SelectTrigger
              aria-label="فئة قوالب الكولاج"
              className="min-w-0 flex-1 bg-transparent text-xs"
            >
              {categories.find((category) => category.id === presetCategory)?.label}
            </SelectTrigger>
            <SelectContent align="start" className="font-cairo">
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id} className="text-xs">
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FluentSegmentedControl<'list' | 'grid'>
            layoutId="presets-view-mode-pill"
            variant="field"
            value={viewMode}
            onChange={setViewMode}
            size="sm"
            fullWidth={false}
            className="shrink-0"
            options={[
              { id: 'grid', icon: <SquaresFour className="size-4" />, tooltip: 'عرض شبكي' },
              { id: 'list', icon: <List className="size-4" />, tooltip: 'قائمة مفصلة' },
            ]}
          />
        </div>
      </div>

      {searchResults ? (
        <div className="space-y-3">
          <p className="text-mini text-muted-foreground" aria-live="polite">
            نتائج البحث: {searchResults.official.length + searchResults.saved.length}
          </p>
          {searchResults.official.length + searchResults.saved.length === 0 ? (
            <FluentEmptyState
              icon={<MagnifyingGlass className="size-6" />}
              title="لا توجد نتائج"
              description="جرّب جواز أو وطنية"
            />
          ) : (
            <>
              <div className={cardLayout}>{searchResults.official.map(renderPreset)}</div>
              {searchResults.saved.length > 0 && (
                <div className="space-y-2">{searchResults.saved.map(renderSaved)}</div>
              )}
            </>
          )}
        </div>
      ) : presetCategory === 'saved' ? (
        <div className="space-y-3">
          {savedTemplates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border/60 px-4 py-8 text-center">
              <p className="text-sm font-semibold">لا قوالب محفوظة</p>
              <p className="text-xs text-muted-foreground">خصّص شبكتك ثم اختر «حفظ كقالب».</p>
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
              <div className="space-y-2">{savedTemplates.map(renderSaved)}</div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, index) => (
            <section key={group.title || index} className="space-y-2">
              {group.title && (
                <h3 className="text-xs font-semibold text-muted-foreground">{group.title}</h3>
              )}
              <div className={cardLayout}>{group.presets.map(renderPreset)}</div>
            </section>
          ))}
        </div>
      )}

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
