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
  FolderOpen,
  GridFour,
  Images,
  Minus,
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

import { AUTOFILL_IMAGE_LIMIT, buildFillPlan, moveListItem } from './collage-autofill-plan';

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
  const {
    slots,
    autofillImages,
    collagePendingImages,
    setAutofillImages,
    absorbPendingCollageImages,
    autofillSettings,
    setAutofillSettings,
    setSlotImagesBatch,
    clearSlots,
  } = useEditorStore(
    useShallow((state) => ({
      slots: state.slots,
      autofillImages: state.autofillImages,
      collagePendingImages: state.collagePendingImages,
      setAutofillImages: state.setAutofillImages,
      absorbPendingCollageImages: state.absorbPendingCollageImages,
      autofillSettings: state.autofillSettings,
      setAutofillSettings: state.setAutofillSettings,
      setSlotImagesBatch: state.setSlotImagesBatch,
      clearSlots: state.clearSlots,
    })),
  );

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const mode = autofillSettings.mode;
  const order = autofillSettings.order;
  const repeat = autofillSettings.repeat;
  const shuffle = autofillSettings.shuffle;
  const shuffleSeed = autofillSettings.seed;
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
    const before = useEditorStore.getState();
    try {
      const picked = fromFolder
        ? await openDirectoryImageDialog()
        : await openImageFileDialog(true);
      if (picked.length === 0) return;

      const live = useEditorStore.getState();
      if (live.projectId !== before.projectId || live.history[0] !== before.history[0]) return;
      const added = Math.min(
        picked.length,
        Math.max(0, AUTOFILL_IMAGE_LIMIT - live.autofillImages.length),
      );
      // Preserve intentional copies and queue overflow in the same undo step.
      live.setAutofillImages([...live.autofillImages, ...picked]);
      setShowAllImages(false);
      const notes = [`أُضيفت ${imageCountLabel(added)}`];
      if (picked.length > added) notes.push(`معلقة ${picked.length - added}`);
      toast.success(notes.join(' · '));
    } catch (error) {
      logger.error(error);
      toast.error(toErrorMessage(error, 'فشل اختيار الصور'));
    } finally {
      setIsPicking(false);
    }
  };

  const removeImage = useCallback(
    (displayIndex: number) => {
      const sourceIndex = shuffle ? plan.poolIndices[displayIndex] : displayIndex;
      const live = useEditorStore.getState();
      live.setAutofillImages(live.autofillImages.filter((_, index) => index !== sourceIndex));
    },
    [shuffle, plan.poolIndices],
  );

  const moveImage = useCallback(
    (from: number, to: number) => {
      if (from === to || to < 0 || to >= autofillImages.length) return;
      setAutofillImages(moveListItem(autofillImages, from, to));
    },
    [autofillImages, setAutofillImages],
  );

  const reshuffle = () => setAutofillSettings({ seed: shuffleSeed + 1 });

  const distribute = async () => {
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
    await setSlotImagesBatch(assignments, assignments[assignments.length - 1].src);

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
            ? 'border-primary/50 bg-primary/10 text-foreground'
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
    <div
      className="flex min-w-0 flex-col font-cairo motion-safe:animate-in motion-safe:fade-in duration-150"
      dir="rtl"
    >
      {/* مصدر الصور */}
      <FluentSection
        title="الصور"
        className="border-border/40 py-2.5"
        badge={
          autofillImages.length > 0 ? (
            <span className="text-mini tabular-nums text-muted-foreground">
              {autofillImages.length}
            </span>
          ) : undefined
        }
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
        <div
          className={cn(
            'grid gap-2',
            autofillImages.length > 0
              ? 'grid-cols-2'
              : 'rounded-md border border-dashed border-primary/30 bg-primary/5 p-4',
          )}
        >
          {autofillImages.length === 0 && (
            <p className="pb-1 text-xs text-muted-foreground text-center leading-relaxed">
              اختر صورك، ثم عاين توزيعها قبل التطبيق.
            </p>
          )}
          <Button
            type="button"
            variant="default"
            className="h-9"
            onClick={() => pickImages(false)}
            disabled={isPicking || atLimit}
            title={atLimit ? `الحد الأقصى ${AUTOFILL_IMAGE_LIMIT} صورة` : 'اختيار صور متعددة'}
          >
            {isPicking ? <Spinner size={14} /> : <Images className="w-4 h-4" weight="bold" />}
            <span>
              {isPicking
                ? 'جاري الاستيراد ...'
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

        {collagePendingImages.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={absorbPendingCollageImages}
            disabled={atLimit}
            title={atLimit ? `الحد الأقصى ${AUTOFILL_IMAGE_LIMIT} صورة` : undefined}
            aria-label="استيعاب الصور المعلقة"
          >
            استيعاب الصور المعلقة ({collagePendingImages.length})
          </Button>
        )}

        {autofillImages.length > 0 && (
          <div className="space-y-1.5">
            {/* ترتيب الصور = ترتيب التعبئة: يُسحب أفقياً ويُحذف من نفس الشريط */}
            <div
              dir="ltr"
              role="list"
              aria-label="ترتيب صور التوزيع"
              className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-0.5"
            >
              {visibleImages.map((src, index) => {
                const isUnused = usedPoolCount > 0 && index >= usedPoolCount;
                const sourceNumber = index + 1;
                return (
                  <div
                    key={`${index}-${src.slice(-24)}`}
                    role="listitem"
                    className="group relative aspect-square min-w-0"
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
                          removeImage(index);
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
                      onClick={() => removeImage(index)}
                      title={`حذف صورة ${sourceNumber}`}
                      aria-label={`حذف صورة ${sourceNumber}`}
                      className="absolute right-0 top-0 size-7 rounded-md bg-card/95 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
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
        <>
          <FluentSection
            title="طريقة التوزيع"
            className="border-border/40 py-2.5"
            subtitle={`ممتلئة ${filledCount} · فارغة ${emptyCount}`}
          >
            <FluentSettingRow
              layout="vertical"
              label="الخانات المستهدفة"
              control={
                <FluentSegmentedControl<FillMode>
                  layoutId="autofill-mode"
                  variant="field"
                  value={mode}
                  onChange={(value) => setAutofillSettings({ mode: value })}
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
                  onChange={(value) => setAutofillSettings({ order: value })}
                  size="sm"
                  className="p-0.5 border-0 h-8"
                  options={[
                    {
                      id: 'row',
                      label: 'صفوف',
                      tooltip: 'صف بصف',
                    },
                    {
                      id: 'column',
                      label: 'أعمدة',
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
                <Switch
                  checked={repeat}
                  onCheckedChange={(checked) => setAutofillSettings({ repeat: checked })}
                  aria-label="تكرار الصور"
                />
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
                      setAutofillSettings({
                        shuffle: checked,
                        ...(checked ? { seed: shuffleSeed + 1 } : {}),
                      });
                    }}
                    aria-label="خلط عشوائي"
                  />
                </div>
              }
            />
          </FluentSection>
          <FluentSection title="معاينة التوزيع" className="border-border/40 py-2.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <span className="text-mini text-muted-foreground leading-relaxed">
                  {grid.rows}×{grid.cols} · تُملأ {fillCount}
                  {preservedCount > 0 ? ` · تبقى ${preservedCount}` : ''}
                  {skippedCount > 0 ? ` · بلا صورة ${skippedCount}` : ''}
                </span>
              </div>

              <div
                className={cn(
                  'rounded-md bg-muted/20 border border-border/40 p-1.5',
                  slots.length > 24 && 'max-h-44 overflow-y-auto',
                )}
              >
                <div
                  dir="ltr"
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(1, grid.cols)}, minmax(0, 1fr))`,
                  }}
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
          </FluentSection>
          <div className="sticky bottom-0 z-10 space-y-2 border-t border-border/50 bg-sidebar py-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="h-9 min-w-0 flex-1 shadow-none"
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
          </div>
        </>
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
