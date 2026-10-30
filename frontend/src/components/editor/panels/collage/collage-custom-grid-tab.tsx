import React, { useState } from 'react';
import { toast } from 'sonner';
import { FluentSection } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { Plus, Minus, X, BookmarkSimple, CornersOut, ArrowClockwise } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { pxToMm } from '@/lib/canvas/units';
import { DEFAULT_COLLAGE_GAP_PX, DEFAULT_COLLAGE_MARGIN_PX } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { getGridLimits, getPhotoDimensions } from './collage-grid-math';
import type { PhotoGridType, GridAlignment } from './collage-grid-math';
import type { DerivedCollageGrid } from '@/lib/canvas/collage-grid';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';
type CollapseKey = 'dims' | 'photoSize' | 'align';
const COLLAPSE_PREF_KEY = 'grido-collage-grid-collapse';

const loadCollapsePrefs = (): Partial<Record<CollapseKey, boolean>> => {
  try {
    const raw = localStorage.getItem(COLLAPSE_PREF_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<CollapseKey, boolean>>) : {};
  } catch {
    return {};
  }
};

const COUNTER_BTN = cn(
  'size-8 shrink-0 rounded-md text-muted-foreground flex items-center justify-center cursor-pointer transition-colors duration-150',
  'hover:bg-primary/10 hover:text-primary disabled:opacity-35 disabled:cursor-not-allowed',
  FOCUS_RING,
);
const SECTION_CLASS = 'border-border/40 py-2.5';
const ALIGNMENT_ORDER: GridAlignment[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];
const ALIGNMENT_LABELS: Record<GridAlignment, string> = {
  'top-left': 'أعلى اليسار',
  'top-center': 'أعلى الوسط',
  'top-right': 'أعلى اليمين',
  'center-left': 'منتصف اليسار',
  center: 'توسيط',
  'center-right': 'منتصف اليمين',
  'bottom-left': 'أسفل اليسار',
  'bottom-center': 'أسفل الوسط',
  'bottom-right': 'أسفل اليمين',
};
const PHOTO_TYPE_OPTIONS = [
  { value: 'iq-national-id', label: 'وطنية' },
  { value: 'iq-civil-id', label: 'أحوال' },
  { value: 'visa', label: 'فيزا' },
  { value: 'iq-general-id', label: 'عامة' },
  { value: 'iq-transactions', label: 'معاملات' },
  { value: 'stretch', label: 'تمدد حر' },
] as const;

export interface CollageCustomGridTabProps {
  rows: number;
  cols: number;
  photoType: PhotoGridType;
  gridAlign: GridAlignment;
  isCustomActive: boolean;
  appliedGrid?: DerivedCollageGrid | null;
  canvasWidth: number;
  canvasHeight: number;
  storedDpi: number;
  /** المسافات الحالية بالبكسل — تُحسب ضمن السعة حتى يطابق الوعد ما يُطبَّق */
  gapPx?: number;
  marginPx?: number;
  onRowsChange: (rows: number) => void;
  onColsChange: (cols: number) => void;
  onApply: (rows: number, cols: number, photoType?: PhotoGridType, align?: GridAlignment) => void;
  onPhotoTypeChange: (photoType: PhotoGridType) => void;
  onGridAlignChange: (align: GridAlignment) => void;
  onSaveCurrentAsTemplate: (name: string) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (hex: string) => void;
}

export const CollageCustomGridTab = React.memo(function CollageCustomGridTab({
  rows,
  cols,
  photoType,
  gridAlign,
  isCustomActive,
  appliedGrid,
  canvasWidth,
  canvasHeight,
  storedDpi,
  gapPx = DEFAULT_COLLAGE_GAP_PX,
  marginPx = DEFAULT_COLLAGE_MARGIN_PX,
  onRowsChange,
  onColsChange,
  onApply,
  onPhotoTypeChange,
  onGridAlignChange,
  onSaveCurrentAsTemplate,
}: CollageCustomGridTabProps) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [collapsePrefs, setCollapsePrefs] =
    useState<Partial<Record<CollapseKey, boolean>>>(loadCollapsePrefs);

  const setCardOpen = (key: CollapseKey) => (open: boolean) => {
    setCollapsePrefs((prev) => {
      const next = { ...prev, [key]: open };
      try {
        localStorage.setItem(COLLAPSE_PREF_KEY, JSON.stringify(next));
      } catch {
        // Panel controls still work when browser storage is unavailable.
      }
      return next;
    });
  };

  const { maxRows, maxCols } = getGridLimits(
    photoType,
    canvasWidth,
    canvasHeight,
    storedDpi,
    gapPx,
    marginPx,
  );
  const isGridApplied =
    isCustomActive &&
    !showSaveForm &&
    appliedGrid != null &&
    appliedGrid.rows === rows &&
    appliedGrid.cols === cols &&
    (appliedGrid.source !== 'physical' ||
      (appliedGrid.photoType === photoType && appliedGrid.align === gridAlign));
  const coverage = (() => {
    if (photoType === 'stretch') return 100;
    const { wMM, hMM } = getPhotoDimensions(photoType);
    const paperWmm = pxToMm(canvasWidth, storedDpi);
    const paperHmm = pxToMm(canvasHeight, storedDpi);
    return Math.min(
      100,
      Math.round(rows * cols * Math.min(1, wMM / paperWmm) * Math.min(1, hMM / paperHmm) * 100),
    );
  })();

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!saveName.trim()) {
      toast.error('أدخل اسم القالب');
      return;
    }
    onSaveCurrentAsTemplate(saveName.trim());
    setShowSaveForm(false);
    setSaveName('');
  };

  const handleSaveKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setShowSaveForm(false);
    }
  };

  const handleAlignKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    align: GridAlignment,
  ) => {
    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
    };
    const delta = deltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const nextIndex = Math.max(0, Math.min(8, ALIGNMENT_ORDER.indexOf(align) + delta));
    onGridAlignChange(ALIGNMENT_ORDER[nextIndex]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      ?.[nextIndex]?.focus();
  };

  const quickLayouts = (
    <div className={cn('grid gap-2', photoType === 'stretch' ? 'grid-cols-2' : 'grid-cols-1')}>
      <Button
        type="button"
        variant="secondary"
        onClick={() => onApply(maxRows, maxCols, photoType, gridAlign)}
        title={`ملء الورقة فوراً — ${maxRows * maxCols} صورة`}
        aria-label="ملء الورقة فوراً"
        className="h-8 min-w-0 justify-between px-2 text-xs font-medium shadow-none"
      >
        <span>ملء الورقة</span>
        <span className="tabular-nums text-muted-foreground">{maxRows * maxCols}</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => onApply(1, Math.min(4, maxCols), photoType, 'top-left')}
        title={`صف بـ ${Math.min(4, maxCols)} صور`}
        className="h-8 min-w-0 justify-between px-2 text-xs font-medium shadow-none"
      >
        <span>شريط علوي</span>
        <span className="tabular-nums text-muted-foreground">{Math.min(4, maxCols)}</span>
      </Button>
    </div>
  );

  return (
    <div
      className="flex flex-col font-cairo motion-safe:animate-in motion-safe:fade-in duration-150"
      dir="rtl"
    >
      <FluentSection
        title="مقاس الصورة"
        className={SECTION_CLASS}
        collapsible
        open={collapsePrefs.photoSize ?? true}
        onOpenChange={setCardOpen('photoSize')}
      >
        <div className="grid grid-cols-3 gap-2">
          {PHOTO_TYPE_OPTIONS.map((option) => {
            const active = photoType === option.value;
            const dimensions = getPhotoDimensions(option.value);
            // الأبعاد تُشتق من جدول المقاسات نفسه — كانت مكتوبة يدوياً فتخالف
            // الوعد (فيزا 50×50 بينما الخلايا 35×45) وتضلّل عند أي تعديل.
            const dimLabel =
              option.value === 'stretch' ? 'ملء الحيز' : `${dimensions.wMM}×${dimensions.hMM}`;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                title={`${option.label} — ${dimLabel}${option.value === 'stretch' ? '' : ' مم'}`}
                onClick={() => onPhotoTypeChange(option.value)}
                className={cn(
                  'relative flex min-w-0 flex-col items-center gap-1 rounded-md border px-1 py-2 transition-colors duration-150 cursor-pointer',
                  active
                    ? 'border-primary/70 bg-primary/10 text-primary'
                    : 'border-border/50 bg-card/35 text-muted-foreground hover:border-border/80 hover:bg-muted/40',
                  FOCUS_RING,
                )}
              >
                <span className="flex h-6 items-center justify-center" aria-hidden="true">
                  {option.value === 'stretch' ? (
                    <CornersOut className="size-6" />
                  ) : (
                    <span
                      className={cn(
                        'relative block h-5 rounded-sm border overflow-hidden',
                        active
                          ? 'border-primary/70 bg-primary/15'
                          : 'border-muted-foreground/50 bg-muted/60',
                      )}
                      style={{ aspectRatio: `${dimensions.wMM} / ${dimensions.hMM}` }}
                    />
                  )}
                </span>
                <span className="text-xs font-medium text-foreground">{option.label}</span>
                <span
                  className="text-mini tabular-nums"
                  dir={option.value === 'stretch' ? 'rtl' : 'ltr'}
                >
                  {dimLabel}
                  {option.value !== 'stretch' && <span className="ms-1 font-cairo">مم</span>}
                </span>
              </button>
            );
          })}
        </div>
      </FluentSection>

      <FluentSection
        title="أبعاد الشبكة"
        className={SECTION_CLASS}
        collapsible
        open={collapsePrefs.dims ?? true}
        onOpenChange={setCardOpen('dims')}
        action={
          <span
            className="font-mono text-mini font-normal tabular-nums text-muted-foreground"
            title="نسبة تغطية الورقة"
            aria-label="نسبة تغطية الورقة"
          >
            تغطية {coverage}%
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'الصفوف', value: rows, max: maxRows, change: onRowsChange, single: 'صف' },
            { label: 'الأعمدة', value: cols, max: maxCols, change: onColsChange, single: 'عمود' },
          ].map((counter) => (
            <div key={counter.label} className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs text-foreground">{counter.label}</span>
              <div
                className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20"
                role="group"
                aria-label={`عدد ${counter.label}`}
                dir="ltr"
              >
                <button
                  type="button"
                  disabled={counter.value <= 1}
                  onClick={() => counter.change(Math.max(1, counter.value - 1))}
                  title={`تقليل ${counter.single}`}
                  aria-label={`تقليل عدد ${counter.label}`}
                  className={COUNTER_BTN}
                >
                  <Minus className="size-3.5" />
                </button>
                <span
                  aria-live="polite"
                  className="w-10 text-center text-sm font-semibold tabular-nums"
                >
                  {counter.value}
                </span>
                <button
                  type="button"
                  disabled={counter.value >= counter.max}
                  onClick={() => counter.change(Math.min(counter.max, counter.value + 1))}
                  title={`إضافة ${counter.single}`}
                  aria-label={`زيادة عدد ${counter.label}`}
                  className={COUNTER_BTN}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {photoType === 'stretch' && quickLayouts}
      </FluentSection>

      {photoType !== 'stretch' && (
        <FluentSection
          title="المحاذاة على الورقة"
          className={SECTION_CLASS}
          collapsible
          open={collapsePrefs.align ?? true}
          onOpenChange={setCardOpen('align')}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex-1 min-w-0">{quickLayouts}</div>
            <div className="relative size-[72px] shrink-0 rounded-md border border-border/50 bg-muted/20 p-1 select-none">
              <div
                role="radiogroup"
                aria-label="نقطة ارتكاز الصور على الورقة"
                className="grid grid-cols-3 grid-rows-3 gap-0.5 w-full h-full relative z-1"
                dir="ltr"
              >
                {ALIGNMENT_ORDER.map((align) => (
                  <button
                    key={align}
                    type="button"
                    role="radio"
                    aria-checked={gridAlign === align}
                    aria-label={ALIGNMENT_LABELS[align]}
                    tabIndex={gridAlign === align ? 0 : -1}
                    onClick={() => onGridAlignChange(align)}
                    onKeyDown={(event) => handleAlignKeyDown(event, align)}
                    title={ALIGNMENT_LABELS[align]}
                    className={cn(
                      'relative flex items-center justify-center rounded-sm transition-colors cursor-pointer hover:bg-muted/70',
                      FOCUS_RING,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'rounded-full transition-colors duration-150',
                        gridAlign === align
                          ? 'w-2.5 h-2.5 bg-primary ring-2 ring-primary/25'
                          : 'w-2 h-2 bg-muted-foreground/70 border border-border/40',
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FluentSection>
      )}

      <div className="sticky bottom-0 z-10 border-t border-border/50 bg-sidebar py-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isGridApplied ? 'ghost' : 'default'}
            className={cn(
              'h-8 min-w-0 flex-1 font-medium shadow-none',
              isGridApplied &&
                'border border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
            )}
            onClick={() => onApply(rows, cols, photoType, gridAlign)}
            title={isGridApplied ? 'إعادة تطبيق الشبكة على الكانفس' : 'تطبيق الشبكة على الكانفس'}
          >
            {isGridApplied && <ArrowClockwise className="size-3.5" />}
            <span>تطبيق الشبكة</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 font-medium text-muted-foreground"
            onClick={() => {
              setSaveName(
                `شبكة ${rows}×${cols} — ${getPhotoDimensions(photoType).label.split(' ')[0]}`,
              );
              setShowSaveForm(true);
            }}
            title="حفظ في المكتبة"
          >
            <BookmarkSimple className="size-4" />
            <span>حفظ كقالب</span>
          </Button>
        </div>
        {showSaveForm && (
          <form onSubmit={handleSave} className="mt-2 flex items-center gap-1.5">
            <Input
              type="text"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="اسم القالب"
              aria-label="اسم القالب"
              className="min-w-0 flex-1 text-start font-cairo"
              onKeyDown={handleSaveKeyDown}
            />
            <Button type="submit" onKeyDown={handleSaveKeyDown}>
              حفظ
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowSaveForm(false)}
              onKeyDown={handleSaveKeyDown}
              title="إلغاء"
              aria-label="إلغاء حفظ القالب"
            >
              <X className="size-3.5" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
});
