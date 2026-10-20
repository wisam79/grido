import { useMemo } from 'react';
import { toast } from 'sonner';
import {
  ArrowsDownUp,
  ArrowsClockwise,
  ArrowCounterClockwise,
  Shuffle,
  Rows,
  Columns,
  Repeat,
  ArrowsOutCardinal,
  FrameCorners,
} from '@/components/ui/icons';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  buildPhysicalGridCells,
  buildStretchGridCells,
  getPhotoDimensions,
  resolveEffectiveDpi,
} from './collage-grid-math';
import type { GridAlignment, PhotoGridType } from './collage-grid-math';
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
    setSlotImagesBatch,
    updateSlotsBatch,
    rotateSlotsBatch,
    canvasWidth,
    canvasHeight,
    printSettings,
    collageTemplate,
    setCollageTemplate,
    pushHistory,
  } = useEditorStore(
    useShallow((state) => ({
      slots: state.slots,
      setSlotImagesBatch: state.setSlotImagesBatch,
      updateSlotsBatch: state.updateSlotsBatch,
      rotateSlotsBatch: state.rotateSlotsBatch,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      printSettings: state.printSettings,
      collageTemplate: state.collageTemplate,
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

  const effectiveDpi = resolveEffectiveDpi(canvasWidth, canvasHeight, printSettings?.dpi || 300);
  const imageCount = slots.filter((slot) => slot.imageSrc).length;

  const currentSrcMatrix = (): SrcMatrix =>
    grid.matrix.map((row) =>
      row.map((slotId) => (slotId ? grid.srcBySlot.get(slotId) : undefined)),
    );

  /**
   * يطبّق ترتيباً جديداً للصور عبر مصفوفة الخانات.
   * تتخطّى الخطوات التي لا تغيّر شيئاً فلا يمتلئ سجل التراجع بنقلات فارغة.
   */
  const applyMatrix = (nextSrc: SrcMatrix, label: string) => {
    const current = currentSrcMatrix();
    if (srcMatricesEqual(current, nextSrc)) {
      return;
    }

    const assignments: { slotId: string; src: string }[] = [];
    for (let row = 0; row < grid.matrix.length; row++) {
      for (let col = 0; col < grid.matrix[row].length; col++) {
        const slotId = grid.matrix[row][col];
        const src = nextSrc[row]?.[col];
        if (slotId && src) assignments.push({ slotId, src });
      }
    }
    if (assignments.length === 0) {
      return;
    }
    setSlotImagesBatch(assignments, assignments[0].src);
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
    const unique = [
      ...new Set(
        slots
          .map((slot) => slot.imageSrc)
          .filter((src): src is string => typeof src === 'string' && src.length > 0),
      ),
    ];
    if (unique.length === 0) {
      toast.info('لا صور');
      return;
    }
    const nextSrc: SrcMatrix = grid.matrix.map((row, r) =>
      row.map((_, c) => unique[(r * grid.cols + c) % unique.length]),
    );
    applyMatrix(nextSrc, `وُزعت ${unique.length} صورة`);
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
    const imageMap = transposeIndexMap(rows, currentSrcMatrix());

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
    if (imageMap.size > 0) {
      const freshSlots = useEditorStore.getState().slots;
      const assignments = [...imageMap.entries()]
        .map(([index, src]) => ({ slotId: freshSlots[index]?.id, src }))
        .filter((a): a is { slotId: string; src: string } => Boolean(a.slotId));
      if (assignments.length > 0) setSlotImagesBatch(assignments, assignments[0].src);
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
      className="flex flex-col gap-2.5 font-cairo select-none animate-in fade-in duration-150"
      dir="rtl"
    >
      {/* 📐 المخطط الهيكلي التجريدي للشبكة — مخطط هندسي نظيف برقم الخانة بدون تكرار الصور المعروضة على الكانفاس */}
      <div className="bg-card/60 border border-border/80 rounded-md p-2.5 shadow-2xs space-y-2 select-none">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <FrameCorners className="w-3.5 h-3.5 text-primary shrink-0" weight="duotone" />
            <span className="text-xs font-bold text-foreground">مخطط الشبكة</span>
          </div>
          <span className="text-micro font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 shrink-0">
            {grid.rows}×{grid.cols} · {imageCount} صورة · {emptyCount} فارغة
          </span>
        </div>

        {/* خلايا مجردة أنيقة برقم الخانة فقط بدون تكرار الصور */}
        <div
          className="grid gap-1.5 p-1 rounded-lg bg-background/50 border border-border/40"
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
                    'h-7 rounded-md border text-xs font-mono font-bold flex items-center justify-center transition-colors select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                    isFilled
                      ? 'border-border/80 bg-card text-foreground shadow-2xs'
                      : 'border-dashed border-border/40 bg-muted/20 text-muted-foreground/40',
                  )}
                >
                  <span>{index}</span>
                </div>
              );
            }),
          )}
        </div>
      </div>

      {/* 🧭 عمليات فرز وترتيب الصور والتحويلات الجماعية */}
      <div className="bg-card/60 border border-border/80 rounded-md p-2.5 shadow-2xs space-y-3 select-none">
        {/* قسم ترتيب الصور */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-micro font-bold text-muted-foreground">ترتيب الصور</span>
            {!grid.isComplete && (
              <span className="text-3xs text-muted-foreground/70">العمليات على الممتلئة فقط</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {arrangeActions.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={action.disabled}
                title={action.hint}
                onClick={action.onClick}
                className={cn(
                  'h-8 px-2 rounded-lg border-border/70 bg-card/40 hover:bg-card hover:border-foreground/30 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-[0.98]',
                  action.fullWidth ? 'col-span-2 justify-center' : 'justify-start text-start',
                )}
              >
                <span className="text-muted-foreground shrink-0">{action.icon}</span>
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* قسم التحويلات الجماعية */}
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <div className="px-0.5">
            <span className="text-micro font-bold text-muted-foreground">تحويلات جماعية</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {transformActions.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={action.disabled}
                title={action.hint}
                onClick={action.onClick}
                className={cn(
                  'h-8 px-2 rounded-lg border-border/70 bg-card/40 hover:bg-card hover:border-foreground/30 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-[0.98]',
                  action.fullWidth
                    ? 'col-span-2 justify-center text-muted-foreground hover:text-foreground'
                    : 'justify-start text-start',
                )}
              >
                <span className="text-muted-foreground shrink-0">{action.icon}</span>
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
