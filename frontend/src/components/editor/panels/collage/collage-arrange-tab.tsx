import { useMemo } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { FluentSection } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import {
  ArrowsDownUp,
  ArrowsClockwise,
  ArrowCounterClockwise,
  Shuffle,
  Rows,
  Columns,
  Repeat,
  ArrowsOutCardinal,
} from '@/components/ui/icons';
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
  transposeIndexMap,
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
    setCollageTemplate,
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
      setCollageTemplate: state.setCollageTemplate,
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
    if (!template) return;
    const rows = template.physicalLayout?.rows ?? grid.rows;
    const cols = template.physicalLayout?.cols ?? grid.cols;
    if (!rows || !cols) return;

    // خريطة الصور المطلوبة تُحسب **قبل** إعادة البناء (المعرّفات تتغير بعده)
    const contentMap = transposeIndexMap(rows, currentSrcMatrix());

    const nextRows = cols;
    const nextCols = rows;

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
      setCollageTemplate({
        ...template,
        name: `كولاج ${label} (${nextRows}×${nextCols})`,
        slots: cells.length,
        cells,
        physicalLayout: { ...template.physicalLayout, rows: nextRows, cols: nextCols },
      });
    } else {
      const cells = buildStretchGridCells(nextRows, nextCols);
      setCollageTemplate({
        ...template,
        name: `كولاج مخصص (${nextRows}×${nextCols})`,
        slots: cells.length,
        cells,
      });
    }

    // الخلايا الجديدة تُرتَّب صفاً صفاً بعرض nextCols ⇒ المفهرس = c*nextCols + r
    if (contentMap.size > 0) {
      const freshSlots = useEditorStore.getState().slots;
      const assignments = [...contentMap.entries()]
        .map(([index, sourceSlotId]) => ({ slotId: freshSlots[index]?.id, sourceSlotId }))
        .filter((a): a is { slotId: string; sourceSlotId: string } => Boolean(a.slotId));
      if (assignments.length > 0) moveSlotContentsBatch(assignments);
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
      icon: <Rows className="w-3.5 h-3.5" weight="bold" />,
      onClick: reverseRows,
      disabled: imageCount < 2,
      fullWidth: false,
    },
    {
      id: 'reverse-columns',
      label: 'عكس الأعمدة',
      hint: 'داخل كل عمود',
      icon: <Columns className="w-3.5 h-3.5" weight="bold" />,
      onClick: reverseColumns,
      disabled: imageCount < 2,
      fullWidth: false,
    },
    {
      id: 'transpose',
      label: 'تبديل المحاور',
      hint: 'قلب الصفوف والأعمدة',
      icon: <ArrowsDownUp className="w-3.5 h-3.5" weight="bold" />,
      onClick: transposeGrid,
      disabled: !collageTemplate,
      fullWidth: false,
    },
    {
      id: 'shuffle',
      label: 'خلط عشوائي',
      hint: 'خلط مواضع الصور',
      icon: <Shuffle className="w-3.5 h-3.5" weight="bold" />,
      onClick: shuffleImages,
      disabled: imageCount < 2,
      fullWidth: false,
    },
    {
      id: 'repeat',
      label: 'تكرار الكل',
      hint: 'ملء الخانات دورياً',
      icon: <Repeat className="w-3.5 h-3.5" weight="bold" />,
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
      icon: <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />,
      onClick: () => rotateAll(90),
      disabled: imageCount === 0,
      fullWidth: false,
    },
    {
      id: 'rotate-ccw',
      label: 'لفّ يساراً',
      hint: 'تدوير 90° يساراً',
      icon: <ArrowCounterClockwise className="w-3.5 h-3.5" weight="bold" />,
      onClick: () => rotateAll(-90),
      disabled: imageCount === 0,
      fullWidth: false,
    },
    {
      id: 'reset',
      label: 'تصفير التعديلات',
      hint: 'إرجاع كل التعديلات',
      icon: <ArrowsOutCardinal className="w-3.5 h-3.5" weight="bold" />,
      onClick: resetAllAdjustments,
      disabled: imageCount === 0,
      fullWidth: true,
    },
  ];

  const emptyCount = slots.length - imageCount;

  return (
    <div
      className="flex min-w-0 flex-col font-cairo select-none motion-safe:animate-in motion-safe:fade-in duration-150"
      dir="rtl"
    >
      <FluentSection
        title="مخطط الشبكة"
        subtitle={`${grid.rows}×${grid.cols} · ${imageCount} صورة · ${emptyCount} فارغة`}
      >
        <div
          dir="ltr"
          className="grid max-h-52 gap-1 overflow-y-auto rounded-md bg-muted/20 p-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, grid.cols)}, minmax(0, 1fr))` }}
          data-testid="collage-grid-preview"
        >
          {grid.matrix.flatMap((row, r) =>
            row.map((slotId, c) => {
              const src = slotId ? grid.srcBySlot.get(slotId) : undefined;
              const index = r * grid.cols + c + 1;
              const isFilled = isSrc(src);
              return (
                <div
                  key={`cell-${r}-${c}`}
                  role="img"
                  aria-label={isFilled ? `خانة ${index} ممتلئة` : `خانة ${index} فارغة`}
                  className={cn(
                    'flex h-7 min-w-0 items-center justify-center rounded-sm border text-mini tabular-nums transition-colors',
                    isFilled
                      ? 'border-primary/30 bg-primary/10 text-foreground'
                      : 'border-dashed border-border/60 text-muted-foreground',
                  )}
                >
                  <span>{index}</span>
                </div>
              );
            }),
          )}
        </div>
      </FluentSection>

      <FluentSection title="ترتيب الصور">
        {!grid.isComplete && (
          <p className="text-mini text-muted-foreground">العمليات على الممتلئة فقط</p>
        )}
        <div className="grid grid-cols-2 gap-2">
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
                'h-8 min-w-0 justify-start gap-2 rounded-md px-2 text-start text-xs font-normal shadow-none',
                action.fullWidth && 'col-span-2',
              )}
            >
              <span className="shrink-0 text-muted-foreground">{action.icon}</span>
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </FluentSection>

      <FluentSection title="تحويلات جماعية">
        <div className="grid grid-cols-2 gap-2">
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
                'h-8 min-w-0 justify-start gap-2 rounded-md px-2 text-start text-xs font-normal shadow-none',
                action.fullWidth && 'col-span-2 text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="shrink-0 text-muted-foreground">{action.icon}</span>
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </FluentSection>
    </div>
  );
}
