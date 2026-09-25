import { useMemo } from "react";
import { toast } from "sonner";
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
} from "@/components/ui/icons";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { FluentSection } from "@/components/ui/blocks";
import { cn } from "@/lib/utils";
import {
  buildPhysicalGridCells,
  buildStretchGridCells,
  getPhotoDimensions,
  resolveEffectiveDpi,
} from "./collage-grid-math";
import type { GridAlignment, PhotoGridType } from "./collage-grid-math";
import {
  collectFilled,
  isSrc,
  reverseColumnsWithinFilled,
  reverseRowsWithinFilled,
  shuffleWithinFilled,
  srcMatricesEqual,
  transposeIndexMap,
  type SrcMatrix,
} from "./collage-arrange-ops";

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
    }))
  );

  /** بناء مصفوفة الشبكة من الإحداثيات الطبيعية (تعمل لأي تخطيط منتظم) */
  const grid = useMemo<GridMatrix>(() => {
    const round = (value: number) => Math.round(value * 1000) / 1000;
    const xValues = [...new Set(slots.map((slot) => round(slot.x)))].sort((a, b) => a - b);
    const yValues = [...new Set(slots.map((slot) => round(slot.y)))].sort((a, b) => a - b);
    const rows = yValues.length;
    const cols = xValues.length;

    const matrix: (string | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null)
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
      isComplete: rows > 0 && cols > 0 && filledCells === slots.length && filledCells === rows * cols,
    };
  }, [slots]);

  const effectiveDpi = resolveEffectiveDpi(canvasWidth, canvasHeight, printSettings?.dpi || 300);
  const imageCount = slots.filter((slot) => slot.imageSrc).length;

  const currentSrcMatrix = (): SrcMatrix =>
    grid.matrix.map((row) => row.map((slotId) => (slotId ? grid.srcBySlot.get(slotId) : undefined)));

  /**
   * يطبّق ترتيباً جديداً للصور عبر مصفوفة الخانات.
   * تتخطّى الخطوات التي لا تغيّر شيئاً فلا يمتلئ سجل التراجع بنقلات فارغة.
   */
  const applyMatrix = (nextSrc: SrcMatrix, label: string) => {
    const current = currentSrcMatrix();
    if (srcMatricesEqual(current, nextSrc)) {
      toast.info("لا تغيير في الترتيب");
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
      toast.info("لا توجد صور لإعادة ترتيبها");
      return;
    }
    setSlotImagesBatch(assignments, assignments[0].src);
    toast.success(label);
  };

  const reverseRows = () =>
    applyMatrix(reverseRowsWithinFilled(currentSrcMatrix()), "تم عكس ترتيب الصور في كل صف");

  const reverseColumns = () =>
    applyMatrix(reverseColumnsWithinFilled(currentSrcMatrix()), "تم عكس ترتيب الصور في كل عمود");

  const shuffleImages = () => {
    const matrix = currentSrcMatrix();
    if (collectFilled(matrix).sources.length < 2) {
      toast.info("تحتاج صورتين على الأقل للخلط");
      return;
    }
    applyMatrix(shuffleWithinFilled(matrix), "تم خلط الصور عشوائياً");
  };

  /** تكرار الصور الحالية على كل الخانات بالتساوي (دورياً) */
  const repeatEverywhere = () => {
    const unique = [
      ...new Set(
        slots
          .map((slot) => slot.imageSrc)
          .filter((src): src is string => typeof src === "string" && src.length > 0)
      ),
    ];
    if (unique.length === 0) {
      toast.info("لا توجد صور لتكرارها");
      return;
    }
    const nextSrc: SrcMatrix = grid.matrix.map((row, r) =>
      row.map((_, c) => unique[(r * grid.cols + c) % unique.length])
    );
    applyMatrix(nextSrc, `تم تكرار ${unique.length} صورة على ${slots.length} خانة`);
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
      const align = (template.physicalLayout.align ?? "top-left") as GridAlignment;
      const { label } = getPhotoDimensions(type);
      const cells = buildPhysicalGridCells(
        type,
        nextRows,
        nextCols,
        align,
        canvasWidth,
        canvasHeight,
        effectiveDpi
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

    toast.success(`تم تبديل الصفوف بالأعمدة (${nextRows}×${nextCols})`);
  };

  const rotateAll = (angle: 90 | -90) => {
    if (imageCount === 0) return;
    rotateSlotsBatch(
      slots.map((slot) => slot.id),
      angle
    );
    toast.success(angle > 0 ? "تم لفّ كل الصور 90° يميناً" : "تم لفّ كل الصور 90° يساراً");
  };

  const resetAllAdjustments = () => {
    updateSlotsBatch(
      slots.map((slot) => slot.id),
      { zoom: 1, dragX: 0, dragY: 0, flipX: false, flipY: false, rotation: 0 }
    );
    // updateSlotsBatch لا يسجّل تراجعاً (يُستدعى من مسارات معاينة كثيرة)
    pushHistory();
    toast.success("تم تصفير تعديلات كل الصور");
  };

  const arrangeActions = [
    {
      id: "reverse-rows",
      label: "عكس الصفوف",
      hint: "يعكس ترتيب الصور داخل كل صف (الخانات الفارغة لا تتحرك)",
      icon: <Rows className="w-4 h-4" weight="bold" />,
      onClick: reverseRows,
      disabled: imageCount < 2,
    },
    {
      id: "reverse-columns",
      label: "عكس الأعمدة",
      hint: "يعكس ترتيب الصور داخل كل عمود (الخانات الفارغة لا تتحرك)",
      icon: <Columns className="w-4 h-4" weight="bold" />,
      onClick: reverseColumns,
      disabled: imageCount < 2,
    },
    {
      id: "transpose",
      label: "تبديل الصفوف بالأعمدة",
      hint: "ينقل كل صورة من (صف، عمود) إلى (عمود، صف)",
      icon: <ArrowsDownUp className="w-4 h-4" weight="bold" />,
      onClick: transposeGrid,
      disabled: !collageTemplate,
    },
    {
      id: "shuffle",
      label: "خلط عشوائي",
      hint: "تبديل عشوائي لمواضع الصور الحالية بلا تكرار",
      icon: <Shuffle className="w-4 h-4" weight="bold" />,
      onClick: shuffleImages,
      disabled: imageCount < 2,
    },
    {
      id: "repeat",
      label: "تكرار على الكل",
      hint: "يكرّر الصور الحالية دورياً حتى تمتلئ كل الخانات",
      icon: <Repeat className="w-4 h-4" weight="bold" />,
      onClick: repeatEverywhere,
      disabled: imageCount === 0,
    },
  ];

  const transformActions = [
    {
      id: "rotate-cw",
      label: "لفّ 90° يميناً",
      hint: "يضيف 90 درجة لكل صورة (قابل للتراجع)",
      icon: <ArrowsClockwise className="w-4 h-4" weight="bold" />,
      onClick: () => rotateAll(90),
      disabled: imageCount === 0,
    },
    {
      id: "rotate-ccw",
      label: "لفّ 90° يساراً",
      hint: "يخصم 90 درجة من كل صورة (قابل للتراجع)",
      icon: <ArrowCounterClockwise className="w-4 h-4" weight="bold" />,
      onClick: () => rotateAll(-90),
      disabled: imageCount === 0,
    },
    {
      id: "reset",
      label: "تصفير التعديلات",
      hint: "إرجاع اللفّ والقلب والتكبير والإزاحات لكل الصور",
      icon: <ArrowsOutCardinal className="w-4 h-4" weight="bold" />,
      onClick: resetAllAdjustments,
      disabled: imageCount === 0,
    },
  ];

  const renderActions = (items: typeof arrangeActions) => (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((action) => (
        <Button
          key={action.id}
          type="button"
          variant="outline"
          size="sm"
          disabled={action.disabled}
          title={action.hint}
          onClick={action.onClick}
          className="justify-start text-right"
        >
          <span className="text-primary shrink-0">{action.icon}</span>
          <span className="truncate">{action.label}</span>
        </Button>
      ))}
    </div>
  );

  const emptyCount = slots.length - imageCount;

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      <FluentSection
        icon={<FrameCorners className="w-3.5 h-3.5" weight="duotone" />}
        title="مخطط الشبكة"
        subtitle={`${grid.rows}×${grid.cols} · ${imageCount} صورة · ${emptyCount} فارغة`}
        collapsible
      >
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, grid.cols)}, minmax(0, 1fr))` }}
          data-testid="collage-grid-preview"
        >
          {grid.matrix.flatMap((row, r) =>
            row.map((slotId, c) => {
              const src = slotId ? grid.srcBySlot.get(slotId) : undefined;
              const index = r * grid.cols + c + 1;
              return (
                <div
                  key={`cell-${r}-${c}`}
                  title={isSrc(src) ? `خانة ${index}` : `خانة ${index} — فارغة`}
                  className={cn(
                    "relative aspect-[4/3] rounded-md border overflow-hidden",
                    isSrc(src)
                      ? "border-border/60 bg-muted"
                      : "border-dashed border-border/50 bg-muted/20"
                  )}
                  style={
                    isSrc(src)
                      ? {
                          backgroundImage: `url(${src})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  <span className="absolute top-0.5 start-0.5 min-w-[16px] h-4 px-1 rounded bg-background/85 text-3xs font-mono font-bold flex items-center justify-center border border-border/50">
                    {index}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </FluentSection>

      <FluentSection
        icon={<ArrowsDownUp className="w-3.5 h-3.5" weight="duotone" />}
        title="فرز وترتيب الخانات"
        subtitle="إعادة ترتيب الصور دون تغيير التخطيط"
        collapsible
      >
        {!grid.isComplete && (
          <p className="text-micro text-muted-foreground leading-relaxed">
            التخطيط الحالي غير شبكي منتظم — عمليات الصفوف والأعمدة تعمل على الخانات الممتلئة فقط،
            والتبديل يعيد بناء الشبكة.
          </p>
        )}

        <p className="text-micro font-bold text-muted-foreground/90">ترتيب الصور</p>
        {renderActions(arrangeActions)}

        <p className="text-micro font-bold text-muted-foreground/90 mt-1">تحويلات جماعية</p>
        {renderActions(transformActions)}
      </FluentSection>
    </div>
  );
}
