import { useMemo } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { FluentEmptyState, FluentSection } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  ArrowsDownUp,
  ArrowsClockwise,
  ArrowCounterClockwise,
  GridFour,
  Shuffle,
  Rows,
  Columns,
  Repeat,
  ArrowsOutCardinal,
} from '@/components/ui/icons';
import { getThumbnailSrc } from '@/lib/canvas/thumbnail-src';
import { useEditorStore } from '@/lib/editor-store';
import { getEffectiveDpi } from '@/lib/templates';
import { cn } from '@/lib/utils';

import {
  collectFilled,
  isSrc,
  reverseColumnsWithinFilled,
  reverseRowsWithinFilled,
  shuffleWithinFilled,
  srcMatricesEqual,
  type SrcMatrix,
} from './collage-arrange-ops';
import {
  buildPhysicalGridCells,
  buildStretchGridCells,
  getPhotoDimensions,
} from './collage-grid-math';

import type { GridAlignment, PhotoGridType } from './collage-grid-math';

/* ═══════════════════════════════════════════════════════════════
   فرز وترتيب الخانات — إعادة ترتيب الصور داخل الشبكة القائمة
   دون المساس بالتخطيط، مع تحويلات جماعية (لفّ/تصفير).

   العمليات الحسابية كلها في collage-arrange-ops (دوال نقية مختبَرة)،
   وهذا الملف للعرض وربط المتجر فقط.

   إصلاحات الجولة:
   1. «لفّ كل الصور» كان يفرض 90 مطلقاً عبر updateSlotsBatch — فالضغط
      مرتين لا يفعل شيئاً، وكان يمحو أي تدوير سابق. صار تزايدياً
      (rotateSlotsBatch) مع نقلة تراجع واحدة، وأُضيف لفّ عكسي.
   2. «عكس» و«خلط» كانا يوزّعان الصور على كل الخانات، فعند شبكة غير
      ممتلئة تُتخطّى الخانات الفارغة وتبقى صورها القديمة = تكرار صورة.
      الآن التبادل بين الخانات الممتلئة فقط.
   3. «تبديل الصفوف بالأعمدة» كان يربط الصور بالفهرس، وهو ليس تبديلاً
      هندسياً — صار (row,col) → (col,row).
   4. rotate/reset لم يكونا يُسجّلان في سجل التراجع أصلاً (toast يوهم
      بالعكس) — صارا نقلة واحدة قابلة للتراجع.
   ═══════════════════════════════════════════════════════════════ */

interface GridMatrix {
  rows: number;
  cols: number;
  /** matrix[row][col] = slotId */
  matrix: (string | null)[][];
  /** srcBySlot: معرّف الخانة → مصدر الصورة الحالي */
  srcBySlot: Map<string, string | undefined>;
  isComplete: boolean;
}

export function CollageArrangeTab() {
  const {
    slots,
    moveSlotContentsBatch,
    updateSlotsBatch,
    rotateSlotsBatch,
    canvasWidth,
    canvasHeight,
    printSettings,
    collageTemplate,
    collageGap,
    collageMargin,
    commitCollageLayout,
    pushHistory,
  } = useEditorStore(
    useShallow((state) => ({
      slots: state.slots,
      moveSlotContentsBatch: state.moveSlotContentsBatch,
      updateSlotsBatch: state.updateSlotsBatch,
      rotateSlotsBatch: state.rotateSlotsBatch,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      printSettings: state.printSettings,
      collageTemplate: state.collageTemplate,
      collageGap: state.collageGap,
      collageMargin: state.collageMargin,
      commitCollageLayout: state.commitCollageLayout,
      pushHistory: state.pushHistory,
    })),
  );

  /** بناء مصفوفة الشبكة من الإحداثيات الطبيعية (تعمل لأي تخطيط منتظم) */
  const grid = useMemo<GridMatrix>(() => {
    const round = (value: number) => Math.round(value * 1000) / 1000;
    const xValues = [...new Set(slots.map((slot) => round(slot.x)))].sort((a, b) => a - b);
    const yValues = [...new Set(slots.map((slot) => round(slot.y)))].sort((a, b) => a - b);
    const rows = yValues.length;
    const cols = xValues.length;

    const matrix: (string | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null),
    );
    const srcBySlot = new Map<string, string | undefined>();

    for (const slot of slots) {
      const rowIndex = yValues.indexOf(round(slot.y));
      const colIndex = xValues.indexOf(round(slot.x));
      if (rowIndex >= 0 && colIndex >= 0) {
        matrix[rowIndex][colIndex] = slot.id;
      }
      srcBySlot.set(slot.id, slot.imageSrc);
    }

    const filledCells = matrix.flat().filter((id) => id !== null).length;
    return {
      rows,
      cols,
      matrix,
      srcBySlot,
      isComplete:
        rows > 0 && cols > 0 && filledCells === slots.length && filledCells === rows * cols,
    };
  }, [slots]);

  const effectiveDpi = getEffectiveDpi(canvasWidth, canvasHeight, printSettings?.dpi || 300);
  const imageCount = slots.filter((slot) => slot.imageSrc).length;

  /** يبني مصفوفة معرفات الخانات الممتلئة كي تنتقل حزمة تعديل الصورة كاملة. */
  const currentSrcMatrix = (): SrcMatrix =>
    grid.matrix.map((row) =>
      row.map((slotId) => (slotId && grid.srcBySlot.get(slotId) ? slotId : undefined)),
    );

  /**
   * يطبّق ترتيباً جديداً للصور عبر مصفوفة الخانات.
   * تتخطّى الخطوات التي لا تغيّر شيئاً فلا يمتلئ سجل التراجع بنقلات فارغة.
   */
  const applyMatrix = (nextSrc: SrcMatrix, _label: string) => {
    const current = currentSrcMatrix();
    if (srcMatricesEqual(current, nextSrc)) {
      return;
    }

    const assignments: { slotId: string; sourceSlotId: string }[] = [];
    for (let row = 0; row < grid.matrix.length; row++) {
      for (let col = 0; col < grid.matrix[row].length; col++) {
        const slotId = grid.matrix[row][col];
        const sourceSlotId = nextSrc[row]?.[col];
        if (slotId && sourceSlotId) assignments.push({ slotId, sourceSlotId });
      }
    }
    if (assignments.length === 0) return;
    moveSlotContentsBatch(assignments);
  };

  const reverseRows = () =>
    applyMatrix(reverseRowsWithinFilled(currentSrcMatrix()), 'عُكس الترتيب');

  const reverseColumns = () =>
    applyMatrix(reverseColumnsWithinFilled(currentSrcMatrix()), 'عُكس الترتيب');

  const shuffleImages = () => {
    const matrix = currentSrcMatrix();
    if (collectFilled(matrix).sources.length < 2) {
      toast.info('صورتان للخلط');
      return;
    }
    applyMatrix(shuffleWithinFilled(matrix), 'خُلطت الصور');
  };

  /** تكرار الصور الحالية على كل الخانات بالتساوي (دورياً) */
  const repeatEverywhere = () => {
    const sourceSlotIds = slots.filter((slot) => slot.imageSrc).map((slot) => slot.id);
    if (sourceSlotIds.length === 0) {
      toast.info('لا صور');
      return;
    }
    const nextSrc: SrcMatrix = grid.matrix.map((row, r) =>
      row.map((_, c) => sourceSlotIds[(r * grid.cols + c) % sourceSlotIds.length]),
    );
    applyMatrix(nextSrc, `وُزعت ${sourceSlotIds.length} صورة`);
  };

  /**
   * تبديل الصفوف بالأعمدة — يعيد بناء الخلايا ثم يعيد توزيع الصور بالخريطة
   * الهندسية (row,col) → (col,row)، لا بالفهرس.
   */
  const transposeGrid = () => {
    const template = collageTemplate;
    if (!template || !grid.isComplete) return;
    const rows = grid.rows;
    const cols = grid.cols;
    if (!rows || !cols) return;

    const nextRows = cols;
    const nextCols = rows;

    // الخريطة الهندسية (row, col) → (col, row) تُمرَّر ذرياً إلى commitCollageLayout
    // لتحديث القالب ومواضع الصور في خطوة تراجع واحدة بدل خطوتين متتابعتين
    const sourceSlotIds: Array<string | undefined> = Array.from(
      { length: nextRows * nextCols },
      () => undefined,
    );
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        sourceSlotIds[c * nextCols + r] = grid.matrix[r]?.[c] ?? undefined;
      }
    }

    if (template.physicalLayout) {
      const type = template.physicalLayout.type as PhotoGridType;
      const align = (template.physicalLayout.align ?? 'top-left') as GridAlignment;
      const { label } = getPhotoDimensions(type);
      const cells = buildPhysicalGridCells(
        type,
        nextRows,
        nextCols,
        align,
        canvasWidth,
        canvasHeight,
        effectiveDpi,
        collageGap,
        collageMargin,
      );
      commitCollageLayout(
        {
          ...template,
          name: `كولاج ${label} (${nextRows}×${nextCols})`,
          slots: cells.length,
          cells,
          physicalLayout: { ...template.physicalLayout, rows: nextRows, cols: nextCols },
        },
        { sourceSlotIds },
      );
    } else {
      const cells = buildStretchGridCells(nextRows, nextCols);
      commitCollageLayout(
        {
          ...template,
          name: `كولاج مخصص (${nextRows}×${nextCols})`,
          slots: cells.length,
          cells,
        },
        { sourceSlotIds },
      );
    }
  };

  const rotateAll = (angle: 90 | -90) => {
    if (imageCount === 0) return;
    rotateSlotsBatch(
      slots.map((slot) => slot.id),
      angle,
    );
  };

  const resetAllAdjustments = () => {
    updateSlotsBatch(
      slots.map((slot) => slot.id),
      { zoom: 1, dragX: 0, dragY: 0, flipX: false, flipY: false, rotation: 0 },
    );
    // updateSlotsBatch لا يسجّل تراجعاً (يُستدعى من مسارات معاينة كثيرة)
    pushHistory();
  };

  const arrangeActions = [
    {
      id: 'reverse-rows',
      label: 'عكس الصفوف',
      hint: 'داخل كل صف',
      icon: <Rows className="w-3.5 h-3.5" weight="duotone" />,
      onClick: reverseRows,
      disabled: imageCount < 2,
      fullWidth: false,
    },
    {
      id: 'reverse-columns',
      label: 'عكس الأعمدة',
      hint: 'داخل كل عمود',
      icon: <Columns className="w-3.5 h-3.5" weight="duotone" />,
      onClick: reverseColumns,
      disabled: imageCount < 2,
      fullWidth: false,
    },
    {
      id: 'transpose',
      label: 'تبديل المحاور',
      hint: 'قلب الصفوف والأعمدة',
      icon: <ArrowsDownUp className="w-3.5 h-3.5" weight="duotone" />,
      onClick: transposeGrid,
      disabled: !collageTemplate || !grid.isComplete,
      fullWidth: false,
    },
    {
      id: 'shuffle',
      label: 'خلط عشوائي',
      hint: 'خلط مواضع الصور',
      icon: <Shuffle className="w-3.5 h-3.5" weight="duotone" />,
      onClick: shuffleImages,
      disabled: imageCount < 2,
      fullWidth: false,
    },
    {
      id: 'repeat',
      label: 'تكرار الكل',
      hint: 'ملء الخانات دورياً',
      icon: <Repeat className="w-3.5 h-3.5" weight="duotone" />,
      onClick: repeatEverywhere,
      disabled: imageCount === 0,
      fullWidth: true,
    },
  ];

  const transformActions = [
    {
      id: 'rotate-cw',
      label: 'لفّ يميناً',
      hint: 'تدوير 90° يميناً',
      icon: <ArrowsClockwise className="w-3.5 h-3.5" weight="duotone" />,
      onClick: () => rotateAll(90),
      disabled: imageCount === 0,
      fullWidth: false,
    },
    {
      id: 'rotate-ccw',
      label: 'لفّ يساراً',
      hint: 'تدوير 90° يساراً',
      icon: <ArrowCounterClockwise className="w-3.5 h-3.5" weight="duotone" />,
      onClick: () => rotateAll(-90),
      disabled: imageCount === 0,
      fullWidth: false,
    },
    {
      id: 'reset',
      label: 'تصفير التعديلات',
      hint: 'إرجاع كل التعديلات',
      icon: <ArrowsOutCardinal className="w-3.5 h-3.5" weight="duotone" />,
      onClick: resetAllAdjustments,
      disabled: imageCount === 0,
      fullWidth: true,
    },
  ];

  const emptyCount = slots.length - imageCount;

  if (slots.length === 0) {
    return (
      <div
        className="flex min-w-0 flex-col font-cairo select-none motion-safe:animate-in motion-safe:fade-in duration-150"
        dir="rtl"
      >
        <FluentEmptyState
          icon={<GridFour className="w-8 h-8 text-muted-foreground/60" weight="duotone" />}
          title="لا توجد شبكة"
          description="حدّد تخطيط الشبكة أولاً"
        />
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 flex-col font-cairo select-none motion-safe:animate-in motion-safe:fade-in duration-150"
      dir="rtl"
    >
      <FluentSection
        title="مخطط الشبكة"
        className="border-border/40 py-2.5"
        subtitle={`${grid.rows}×${grid.cols} · ${imageCount} صورة · ${emptyCount} فارغة`}
      >
        <div className="rounded-lg border border-border/70 bg-muted p-2">
          <div
            dir="ltr"
            className="grid max-h-52 gap-1.5 overflow-y-auto"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, grid.cols)}, minmax(0, 1fr))` }}
            data-testid="collage-grid-preview"
          >
            {grid.matrix.flatMap((row, r) =>
              row.map((slotId, c) => {
                const src = slotId ? grid.srcBySlot.get(slotId) : undefined;
                const index = r * grid.cols + c + 1;
                const isFilled = isSrc(src);
                const thumbSrc =
                  isFilled && src && slots.length <= 24 ? getThumbnailSrc(src, 128) : null;
                return (
                  <div
                    key={`cell-${r}-${c}`}
                    role="img"
                    aria-label={isFilled ? `خانة ${index} ممتلئة` : `خانة ${index} فارغة`}
                    className={cn(
                      'relative flex h-9 min-w-0 items-center justify-center overflow-hidden rounded-md border text-mini font-mono tabular-nums transition-colors',
                      isFilled
                        ? 'border-border/80 bg-card text-foreground shadow-2xs dark:border-white/10'
                        : 'border-dashed border-border/70 bg-background/50 text-muted-foreground/70',
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
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(event) => {
                          const image = event.currentTarget;
                          image.onerror = null;
                          if (src) image.src = src;
                        }}
                      />
                    )}
                    <span
                      className={cn(
                        thumbSrc
                          ? 'relative z-10 inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-border/70 bg-background/85 px-1 text-2xs font-bold text-foreground shadow-2xs backdrop-blur-xs'
                          : 'font-semibold',
                      )}
                    >
                      {index}
                    </span>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </FluentSection>

      <FluentSection title="ترتيب الصور" className="border-border/40 py-2.5">
        {!grid.isComplete && (
          <p className="rounded-md border border-border/50 bg-muted/60 px-2 py-1 text-mini text-muted-foreground">
            العمليات على الممتلئة فقط
          </p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {arrangeActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="secondary"
              size="sm"
              disabled={action.disabled}
              title={action.hint}
              onClick={action.onClick}
              className={cn(
                'h-8 min-w-0 justify-start gap-2 rounded-md border border-border/80 bg-card px-2.5 text-start text-xs font-medium text-foreground shadow-2xs transition-colors hover:bg-accent dark:border-white/10',
                action.fullWidth && 'col-span-2 justify-center',
              )}
            >
              <span className="shrink-0 text-muted-foreground">{action.icon}</span>
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </FluentSection>

      <FluentSection title="تحويلات جماعية" className="border-border/40 py-2.5">
        <div className="grid grid-cols-2 gap-1.5">
          {transformActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.fullWidth ? 'ghost' : 'secondary'}
              size="sm"
              disabled={action.disabled}
              title={action.hint}
              onClick={action.onClick}
              className={cn(
                'h-8 min-w-0 justify-start gap-2 rounded-md px-2.5 text-start text-xs font-medium transition-colors',
                action.fullWidth
                  ? 'col-span-2 justify-center border border-border/60 bg-muted/60 text-muted-foreground shadow-none hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
                  : 'border border-border/80 bg-card text-foreground shadow-2xs hover:bg-accent dark:border-white/10',
              )}
            >
              <span
                className={cn(
                  'shrink-0',
                  action.fullWidth ? 'text-current opacity-80' : 'text-muted-foreground',
                )}
              >
                {action.icon}
              </span>
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </FluentSection>
    </div>
  );
}
