import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

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
import {
  FluentSection,
  FluentSettingRow,
  FluentSegmentedControl,
  FluentEmptyState,
} from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/huge-icon';
import {
  ArrowsClockwise,
  Check,
  Columns,
  FolderOpen,
  GridFour,
  Images,
  Minus,
  Rows,
  Shuffle,
  Trash,
  X,
} from '@/components/ui/icons';
import { Switch } from '@/components/ui/switch';
import { getThumbnailSrc } from '@/lib/canvas/thumbnail-src';
import { useEditorStore } from '@/lib/editor-store';
import { openImageFileDialog, openDirectoryImageDialog } from '@/lib/io/file-dialog-utils';
import { createLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { toErrorMessage } from '@/lib/wails-error';

import {
  AUTOFILL_IMAGE_LIMIT,
  buildFillPlan,
  mergeUniqueImages,
  moveListItem,
} from './collage-autofill-plan';

import type { FillMode, FillOrder } from './collage-autofill-plan';

const logger = createLogger('collage-autofill-tab');

/* ═══════════════════════════════════════════════════════════════
   معالج التعبئة التلقائية — يوزّع صوراً مختارة (أو مجلداً كاملاً)
   على خانات الشبكة بترتيب مضبوط، بنداء واحد يُسجّل في التراجع مرة واحدة.

   إصلاحات الجولة:
   1. الترتيب كان يتبع `cellIndex` لا الهندسة — يتعطّل بعد تبديل
      المحاور أو تغيير القالب. صار يُستنبط من x/y (collage-autofill-plan).
   2. الخلط كان `sort(() => Math.random()-0.5)` منحازاً وغير قابل
      للمعاينة؛ صار Fisher–Yates ببذرة مع «خلط جديد» صريح.
   3. «وزّع على N» لم تكن تخبر أين ستذهب كل صورة — أُضيفت خريطة نتيجة
      حيّة برقم التعبئة والصورة، تلغي التطبيق الأعمى.
   4. مصدر الصور كان شريط 8 مصغّرات بلا حذف أو ترتيب ويضيع عند تبديل
      التبويب؛ صار قائمة جلسة كاملة (حتى 500) قابلة للسحب والحذف.
   ═══════════════════════════════════════════════════════════════ */

const VISIBLE_IMAGES = 24;
/** فوق هذا العدد تُعرض الأرقام فقط — تفادي فكّ مئات الصور في مخطط صغير */
const MAP_THUMBNAIL_LIMIT = 48;

/** عربية سليمة للأعداد: 1 صورة، صورتان، 3 صور، 11 صورة */
function imageCountLabel(count: number): string {
  if (count === 0) return 'لا صور';
  if (count === 1) return 'صورة واحدة';
  if (count === 2) return 'صورتان';
  if (count <= 10) return `${count} صور`;
  return `${count} صورة`;
}

function slotCountLabel(count: number): string {
  if (count === 0) return 'لا خانات';
  if (count === 1) return 'خانة واحدة';
  if (count === 2) return 'خانتان';
  if (count <= 10) return `${count} خانات`;
  return `${count} خانة`;
}

export function CollageAutofillTab() {
  const { slots, autofillImages, setAutofillImages, setSlotImagesBatch, clearSlots } =
    useEditorStore(
      useShallow((state) => ({
        slots: state.slots,
        autofillImages: state.autofillImages,
        setAutofillImages: state.setAutofillImages,
        setSlotImagesBatch: state.setSlotImagesBatch,
        clearSlots: state.clearSlots,
      })),
    );

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [mode, setMode] = useState<FillMode>('empty');
  const [order, setOrder] = useState<FillOrder>('row');
  const [repeat, setRepeat] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const [isPicking, setIsPicking] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const plan = useMemo(
    () =>
      buildFillPlan({
        slots,
        mode,
        order,
        images: autofillImages,
        repeat,
        shuffle,
        seed: shuffleSeed,
      }),
    [slots, mode, order, autofillImages, repeat, shuffle, shuffleSeed],
  );

  const {
    grid,
    stats: { fillCount, preservedCount, overwriteCount, skippedCount, repeats },
  } = plan;

  const filledCount = useMemo(() => slots.filter((slot) => !!slot.imageSrc).length, [slots]);
  const emptyCount = slots.length - filledCount;
  const atLimit = autofillImages.length >= AUTOFILL_IMAGE_LIMIT;

  /** عند الخلط تُعرض القائمة بترتيب الاستخدام الفعلي بدل الترتيب اليدوي */
  const displayedImages = shuffle ? plan.pool : autofillImages;
  const usedPoolCount = repeat ? Math.min(fillCount, plan.pool.length) : fillCount;
  const visibleImages = showAllImages ? displayedImages : displayedImages.slice(0, VISIBLE_IMAGES);
  const hiddenCount = displayedImages.length - visibleImages.length;

  const assignmentBySlot = useMemo(
    () => new Map(plan.assignments.map((assignment) => [assignment.slotId, assignment])),
    [plan.assignments],
  );
  const currentSrcBySlot = useMemo(
    () => new Map(slots.map((slot) => [slot.id, slot.imageSrc] as const)),
    [slots],
  );

  const canApply = autofillImages.length > 0 && plan.assignments.length > 0;
  const applyBlockedReason =
    autofillImages.length === 0
      ? 'اختر صوراً أولاً'
      : plan.targets.length === 0
        ? mode === 'empty'
          ? 'لا خانات فارغة — بدّل إلى «كل الخانات»'
          : 'لا خانات في الشبكة'
        : plan.assignments.length === 0
          ? 'لا صور للتوزيع'
          : undefined;
  const applyHint = canApply ? preserveHint(skippedCount, overwriteCount) : null;

  const pickImages = async (fromFolder: boolean) => {
    if (isPicking) return;
    setIsPicking(true);
    try {
      const picked = fromFolder
        ? await openDirectoryImageDialog()
        : await openImageFileDialog(true);
      if (picked.length === 0) return;

      const result = mergeUniqueImages(autofillImages, picked, AUTOFILL_IMAGE_LIMIT);
      if (result.added > 0) {
        setAutofillImages(result.images);
        setShowAllImages(false);
      }

      if (result.added > 0) {
        const notes = [`أُضيفت ${imageCountLabel(result.added)}`];
        if (result.duplicates > 0) notes.push(`تجاهل ${result.duplicates} مكررة`);
        if (result.overflow > 0) notes.push(`تجاوز الحد ${result.overflow}`);
        toast.success(notes.join(' · '));
        return;
      }
      if (result.overflow > 0) {
        toast.info(`الحد الأقصى ${AUTOFILL_IMAGE_LIMIT} صورة`);
        return;
      }
      if (result.duplicates > 0) {
        toast.info(`كل الصور المختارة مكررة (${result.duplicates})`);
        return;
      }
      toast.info('لم تُختر صور');
    } catch (error) {
      logger.error(error);
      toast.error(toErrorMessage(error, 'فشل اختيار الصور'));
    } finally {
      setIsPicking(false);
    }
  };

  const removeImage = useCallback(
    (src: string) => {
      setAutofillImages(autofillImages.filter((item) => item !== src));
    },
    [autofillImages, setAutofillImages],
  );

  const moveImage = useCallback(
    (from: number, to: number) => {
      if (from === to || to < 0 || to >= autofillImages.length) return;
      setAutofillImages(moveListItem(autofillImages, from, to));
    },
    [autofillImages, setAutofillImages],
  );

  const reshuffle = () => setShuffleSeed((seed) => seed + 1);

  const distribute = () => {
    if (!canApply) {
      if (applyBlockedReason) toast.info(applyBlockedReason);
      return;
    }
    // إعادة تطبيق نفس التوزيع = لا شيء: لا نملأ سجل التراجع ولا نصفّر
    // فلاتر خانات لم تتغيّر صورها.
    const unchanged = plan.assignments.every(
      (assignment) => currentSrcBySlot.get(assignment.slotId) === assignment.src,
    );
    if (unchanged) {
      toast.info('التوزيع مطابق للحالة الحالية');
      return;
    }

    const assignments = plan.assignments.map(({ slotId, src }) => ({ slotId, src }));
    setSlotImagesBatch(assignments, assignments[assignments.length - 1].src);

    const notes: string[] = [];
    if (repeats > 0) notes.push(`تكررت ${repeats}`);
    if (skippedCount > 0) notes.push(`بلا صورة ${skippedCount}`);
    toast.success(
      `تم توزيع ${imageCountLabel(fillCount)}${notes.length > 0 ? ` — ${notes.join(' · ')}` : ''}`,
    );
  };

  const renderMapCell = (cell: (typeof grid.matrix)[number][number], row: number, col: number) => {
    const cellNumber = row * grid.cols + col + 1;
    const assignment = cell ? assignmentBySlot.get(cell.slotId) : undefined;
    const isPreserved = !!cell && !assignment && !!cell.imageSrc;
    const isSkipped = !!cell && !assignment && !cell.imageSrc && autofillImages.length > 0;
    const src = assignment?.src ?? cell?.imageSrc;
    const thumbSrc = src && slots.length <= MAP_THUMBNAIL_LIMIT ? getThumbnailSrc(src, 128) : null;

    const label = assignment
      ? `خانة ${cellNumber} — تُملأ بالصورة رقم ${assignment.order}`
      : isPreserved
        ? `خانة ${cellNumber} — تبقى كما هي`
        : isSkipped
          ? `خانة ${cellNumber} — بلا صورة`
          : `خانة ${cellNumber} — فارغة`;

    return (
      <div
        key={cell?.slotId ?? `empty-${row}-${col}`}
        data-testid={cell ? `autofill-cell-${cell.slotId}` : undefined}
        data-order={assignment?.order}
        role="img"
        aria-label={label}
        title={label}
        className={cn(
          'relative h-9 rounded-md border flex items-center justify-center overflow-hidden transition-colors select-none',
          assignment
            ? 'border-primary/50 bg-card text-foreground shadow-2xs'
            : isPreserved
              ? 'border-border/60 bg-muted/25 text-muted-foreground/70'
              : isSkipped
                ? 'border-dashed border-border/50 bg-muted/10 text-muted-foreground/45'
                : 'border-dashed border-border/40 bg-muted/10 text-muted-foreground/40',
        )}
      >
        {thumbSrc && (
          <img
            src={thumbSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            draggable={false}
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              isPreserved && 'opacity-45 grayscale',
            )}
            onError={(event) => {
              const image = event.currentTarget;
              image.onerror = null;
              if (src) image.src = src;
            }}
          />
        )}

        {assignment ? (
          thumbSrc ? (
            <span className="absolute start-0.5 top-0.5 min-w-4 h-4 px-1 rounded-sm bg-primary text-primary-foreground text-2xs font-mono font-bold flex items-center justify-center shadow-xs">
              {assignment.order}
            </span>
          ) : (
            <span className="text-mini font-mono font-bold">{assignment.order}</span>
          )
        ) : isPreserved ? (
          <Check className="w-3 h-3" weight="bold" />
        ) : isSkipped ? (
          <Minus className="w-3 h-3" weight="bold" />
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* مصدر الصور */}
      <FluentSection
        title="مصدر الصور"
        subtitle={
          autofillImages.length > 0
            ? `${imageCountLabel(autofillImages.length)} في القائمة`
            : 'لم تُختَر صور بعد'
        }
        collapsible
        action={
          autofillImages.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setAutofillImages([])}
              title="إفراغ قائمة الصور"
              aria-label="إفراغ قائمة الصور"
            >
              <Trash className="w-3.5 h-3.5" />
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="default"
            onClick={() => pickImages(false)}
            disabled={isPicking || atLimit}
            title={atLimit ? `الحد الأقصى ${AUTOFILL_IMAGE_LIMIT} صورة` : 'اختيار صور متعددة'}
          >
            {isPicking ? <Spinner size={14} /> : <Images className="w-4 h-4" weight="bold" />}
            <span>
              {isPicking
                ? 'جارٍ الاستيراد…'
                : autofillImages.length > 0
                  ? 'إضافة صور'
                  : 'اختيار صور'}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => pickImages(true)}
            disabled={isPicking || atLimit}
            title={atLimit ? `الحد الأقصى ${AUTOFILL_IMAGE_LIMIT} صورة` : 'استيراد مجلد صور'}
          >
            <FolderOpen className="w-4 h-4" weight="bold" />
            <span>مجلد كامل</span>
          </Button>
        </div>

        {autofillImages.length > 0 && (
          <div className="space-y-1.5">
            {/* ترتيب الصور = ترتيب التعبئة: يُسحب أفقياً ويُحذف من نفس الشريط */}
            <div
              dir="ltr"
              role="list"
              aria-label="ترتيب صور التوزيع"
              className="flex items-center gap-1.5 overflow-x-auto pb-1"
            >
              {visibleImages.map((src, index) => {
                const isUnused = usedPoolCount > 0 && index >= usedPoolCount;
                const sourceNumber = index + 1;
                return (
                  <div
                    key={`${index}-${src.slice(-24)}`}
                    role="listitem"
                    className="group relative w-9 h-9 shrink-0"
                  >
                    <button
                      type="button"
                      data-testid={`autofill-image-${index}`}
                      aria-label={`صورة ${sourceNumber}${isUnused ? ' — لن تُستخدم' : ''} — Alt+الأسهم لإعادة الترتيب، Delete للحذف`}
                      title={`صورة ${sourceNumber}${isUnused ? ' — لن تُستخدم: الخانات أقل من الصور' : ''}`}
                      draggable={!shuffle}
                      onDragStart={(event) => {
                        if (shuffle) return;
                        setDragIndex(index);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(index));
                      }}
                      onDragOver={(event) => {
                        if (shuffle) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        if (dragOverIndex !== index) setDragOverIndex(index);
                      }}
                      onDragLeave={() => setDragOverIndex((prev) => (prev === index ? null : prev))}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!shuffle) {
                          const from =
                            dragIndex ?? Number(event.dataTransfer.getData('text/plain'));
                          if (Number.isFinite(from)) moveImage(from, index);
                        }
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      onKeyDown={(event) => {
                        if (!shuffle && event.altKey && event.key === 'ArrowLeft') {
                          event.preventDefault();
                          moveImage(index, index - 1);
                        } else if (!shuffle && event.altKey && event.key === 'ArrowRight') {
                          event.preventDefault();
                          moveImage(index, index + 1);
                        } else if (event.key === 'Delete' || event.key === 'Backspace') {
                          event.preventDefault();
                          removeImage(src);
                        }
                      }}
                      className={cn(
                        'relative block w-full h-full rounded-md border overflow-hidden bg-muted/40 outline-none transition-all',
                        'border-border/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                        !shuffle && 'cursor-grab active:cursor-grabbing',
                        dragOverIndex === index &&
                          dragIndex !== index &&
                          'border-primary ring-2 ring-primary/40',
                        isUnused && 'opacity-35 grayscale',
                      )}
                    >
                      <img
                        src={getThumbnailSrc(src, 128)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="w-full h-full object-cover"
                        onError={(event) => {
                          const image = event.currentTarget;
                          image.onerror = null;
                          image.src = src;
                        }}
                      />
                      <span className="absolute left-0 top-0 h-3.5 min-w-3.5 px-0.5 rounded-br-sm bg-background/90 border-r border-b border-border/60 text-2xs font-mono font-bold text-foreground flex items-center justify-center">
                        {sourceNumber}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(src)}
                      title={`حذف صورة ${sourceNumber}`}
                      aria-label={`حذف صورة ${sourceNumber}`}
                      className="absolute right-0 top-0 w-4 h-4 rounded-bl-sm bg-background/90 border-l border-b border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" weight="bold" />
                    </button>
                  </div>
                );
              })}
              {hiddenCount > 0 && (
                <span className="shrink-0 text-2xs font-mono text-muted-foreground px-1">
                  +{hiddenCount}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-micro text-muted-foreground/85 leading-tight">
                {shuffle
                  ? 'الترتيب من الخلط — أوقف «خلط عشوائي» لإعادة الترتيب'
                  : 'اسحب لإعادة الترتيب · Alt+الأسهم للنقل · Delete للحذف'}
              </span>
              {displayedImages.length > VISIBLE_IMAGES && (
                <button
                  type="button"
                  onClick={() => setShowAllImages((value) => !value)}
                  className="shrink-0 text-mini font-bold text-primary hover:underline cursor-pointer"
                >
                  {showAllImages ? 'عرض أقل' : `عرض الكل (${displayedImages.length})`}
                </button>
              )}
            </div>
          </div>
        )}
      </FluentSection>

      {slots.length > 0 && (
        <FluentSection
          title="طريقة التوزيع"
          subtitle={`ممتلئة ${filledCount} · فارغة ${emptyCount}`}
          collapsible
        >
          <FluentSettingRow
            layout="vertical"
            label="الخانات المستهدفة"
            control={
              <FluentSegmentedControl<FillMode>
                layoutId="autofill-mode"
                variant="field"
                value={mode}
                onChange={setMode}
                size="sm"
                className="p-0.5 border-0 h-8"
                options={[
                  { id: 'empty', label: 'الفارغة فقط' },
                  { id: 'all', label: 'كل الخانات' },
                ]}
              />
            }
          />

          <FluentSettingRow
            layout="vertical"
            label="ترتيب التعبئة"
            control={
              <FluentSegmentedControl<FillOrder>
                layoutId="autofill-order"
                variant="field"
                iconInline
                value={order}
                onChange={setOrder}
                size="sm"
                className="p-0.5 border-0 h-8"
                options={[
                  {
                    id: 'row',
                    label: 'صفوف',
                    icon: <Rows className="w-4 h-4" weight="duotone" />,
                    tooltip: 'صف بصف',
                  },
                  {
                    id: 'column',
                    label: 'أعمدة',
                    icon: <Columns className="w-4 h-4" weight="duotone" />,
                    tooltip: 'عمود بعمود',
                  },
                ]}
              />
            }
          />

          <FluentSettingRow
            label="تكرار الصور"
            description="عند نقص الصور"
            control={
              <Switch checked={repeat} onCheckedChange={setRepeat} aria-label="تكرار الصور" />
            }
          />

          <FluentSettingRow
            label="خلط عشوائي"
            description="ترتيب مختلف كل مرة"
            control={
              <div className="flex items-center gap-1">
                {shuffle && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={reshuffle}
                    title="خلط جديد"
                    aria-label="إعادة الخلط"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Switch
                  checked={shuffle}
                  onCheckedChange={(checked) => {
                    setShuffle(checked);
                    if (checked) setShuffleSeed((seed) => seed + 1);
                  }}
                  aria-label="خلط عشوائي"
                />
              </div>
            }
          />

          {/* خريطة النتيجة الحيّة — ترقيم التعبئة + الصور الفعلية قبل التطبيق */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <span className="text-mini font-bold text-muted-foreground">خريطة النتيجة</span>
              <span className="text-mini font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 shrink-0">
                {grid.rows}×{grid.cols} · تُملأ {fillCount}
                {preservedCount > 0 ? ` · تبقى ${preservedCount}` : ''}
                {skippedCount > 0 ? ` · بلا صورة ${skippedCount}` : ''}
              </span>
            </div>

            <div
              className={cn(
                'rounded-lg bg-background/50 border border-border/40 p-1.5',
                slots.length > 24 && 'max-h-44 overflow-y-auto',
              )}
            >
              <div
                dir="ltr"
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${Math.max(1, grid.cols)}, minmax(0, 1fr))` }}
                data-testid="autofill-grid-preview"
              >
                {grid.matrix.flatMap((row, rowIndex) =>
                  row.map((cell, colIndex) => renderMapCell(cell, rowIndex, colIndex)),
                )}
              </div>
            </div>

            <p className="text-micro text-muted-foreground/80 leading-tight px-0.5">
              الرقم = ترتيب التعبئة · الباهت = يبقى · المتقطع = بلا صورة
            </p>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <Button
              type="button"
              className="flex-1"
              onClick={distribute}
              disabled={!canApply}
              title={applyBlockedReason}
              aria-label="توزيع الصور على الخانات"
            >
              {shuffle ? (
                <Shuffle className="w-4 h-4" weight="bold" />
              ) : (
                <GridFour className="w-4 h-4" weight="bold" />
              )}
              <span>{canApply ? `وزّع ${imageCountLabel(fillCount)}` : 'وزّع الصور'}</span>
            </Button>
            {filledCount > 0 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmClearOpen(true)}
                  title="إفراغ الخانات"
                  aria-label="إفراغ كل الخانات"
                >
                  <ArrowsClockwise className="w-4 h-4" />
                </Button>
                {/* 🛡️ إجراء مدمّر بتأكيد — مطابقة لحوار «مسح مساحة العمل» */}
                <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>إفراغ كل الخانات؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        ستُزال كل الصور من شبكة الكولاج. يمكن التراجع بـ Ctrl+Z.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>تراجع</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          clearSlots();
                        }}
                      >
                        إفراغ
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>

          {applyHint && (
            <p className="text-micro text-amber-600 dark:text-amber-500 leading-tight px-0.5">
              {applyHint}
            </p>
          )}
          {!canApply && applyBlockedReason && (
            <p className="text-micro text-muted-foreground/80 leading-tight px-0.5">
              {applyBlockedReason}
            </p>
          )}
        </FluentSection>
      )}

      {slots.length === 0 && (
        <FluentEmptyState
          icon={<GridFour className="w-8 h-8 text-muted-foreground/60" weight="duotone" />}
          title="لا توجد شبكة"
          description="حدّد تخطيط الشبكة أولاً"
        />
      )}
    </div>
  );
}

/** تحذير صريح قبل التطبيق بدل إسقاط صور أو استبدال خانات بصمت */
function preserveHint(skippedCount: number, overwriteCount: number): string | null {
  if (skippedCount > 0) {
    return `ستبقى ${slotCountLabel(skippedCount)} بلا صورة — فعّل «تكرار الصور» أو أضف صوراً`;
  }
  if (overwriteCount > 0) {
    return `سيُستبدل محتوى الخانات الممتلئة (${overwriteCount}) — يمكن التراجع بـ Ctrl+Z`;
  }
  return null;
}
