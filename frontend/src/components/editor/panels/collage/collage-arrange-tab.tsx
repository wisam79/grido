import { useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowsDownUp,
  ArrowsClockwise,
  Shuffle,
  Rows,
  Columns,
  Repeat,
  ArrowsOutCardinal,
} from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { FluentSection } from "@/components/ui/blocks";
import {
  buildPhysicalGridCells,
  buildStretchGridCells,
  getPhotoDimensions,
  resolveEffectiveDpi,
} from "./collage-grid-math";
import type { GridAlignment, PhotoGridType } from "./collage-grid-math";

/* ═══════════════════════════════════════════════════════════════
   فرز وترتيب الخانات — إعادة ترتيب الصور داخل الشبكة القائمة
   دون المساس بالتخطيط، مع أدوات تحويل جماعية (لف/قلب/تصفير).
   كل عملية تُطبَّق بنداء واحد فتسجّل في سجل التراجع مرة واحدة.
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
    canvasWidth,
    canvasHeight,
    printSettings,
    collageTemplate,
    setCollageTemplate,
  } = useEditorStore(
    useShallow((state) => ({
      slots: state.slots,
      setSlotImagesBatch: state.setSlotImagesBatch,
      updateSlotsBatch: state.updateSlotsBatch,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      printSettings: state.printSettings,
      collageTemplate: state.collageTemplate,
      setCollageTemplate: state.setCollageTemplate,
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

  /** يطبّق ترتيباً جديداً للصور عبر مصفوفة الخانات */
  const applyMatrix = (nextSrc: (string | undefined)[][], label: string) => {
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

  const currentSrcMatrix = () =>
    grid.matrix.map((row) => row.map((slotId) => (slotId ? grid.srcBySlot.get(slotId) : undefined)));

  const reverseRows = () =>
    applyMatrix(
      currentSrcMatrix().map((row) => [...row].reverse()),
      "تم عكس ترتيب الصور في كل صف"
    );

  const reverseColumns = () => {
    const matrix = currentSrcMatrix();
    const reversed = [...matrix].reverse();
    applyMatrix(reversed, "تم عكس ترتيب الصور في كل عمود");
  };

  const shuffleImages = () => {
    const matrix = currentSrcMatrix();
    const images = matrix
      .flat()
      .filter((src): src is string => typeof src === "string" && src.length > 0);
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }
    let cursor = 0;
    applyMatrix(
      matrix.map((row) => row.map(() => images[cursor++])),
      "تم خلط الصور عشوائياً"
    );
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
    const assignments = slots
      .slice()
      .sort((a, b) => a.cellIndex - b.cellIndex)
      .map((slot, index) => ({ slotId: slot.id, src: unique[index % unique.length] }));
    setSlotImagesBatch(assignments, unique[0]);
    toast.success(`تم تكرار ${unique.length} صورة على ${assignments.length} خانة`);
  };

  /** تبديل الصفوف بالأعمدة — يعيد بناء الخلايا بمقاسات ملموسة صحيحة */
  const transposeGrid = () => {
    const template = collageTemplate;
    if (!template) return;
    const rows = template.physicalLayout?.rows ?? grid.rows;
    const cols = template.physicalLayout?.cols ?? grid.cols;
    if (!rows || !cols) return;

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
    toast.success(`تم تبديل الصفوف بالأعمدة (${nextRows}×${nextCols})`);
  };

  const rotateAll = () =>
    updateSlotsBatch(
      slots.map((slot) => slot.id),
      { rotation: 90 }
    );

  const resetAllAdjustments = () => {
    updateSlotsBatch(
      slots.map((slot) => slot.id),
      { zoom: 1, dragX: 0, dragY: 0, flipX: false, flipY: false, rotation: 0 }
    );
    toast.success("تم تصفير تعديلات كل الصور");
  };

  const imageCount = slots.filter((slot) => slot.imageSrc).length;

  const actions = [
    {
      id: "reverse-rows",
      label: "عكس الصفوف",
      hint: "يعكس ترتيب الصور داخل كل صف",
      icon: <Rows className="w-5 h-5" weight="bold" />,
      onClick: reverseRows,
      disabled: imageCount < 2,
    },
    {
      id: "reverse-columns",
      label: "عكس الأعمدة",
      hint: "يعكس ترتيب الصور داخل كل عمود",
      icon: <Columns className="w-5 h-5" weight="bold" />,
      onClick: reverseColumns,
      disabled: imageCount < 2,
    },
    {
      id: "transpose",
      label: "تبديل الصفوف بالأعمدة",
      hint: "يقلب الشبكة رأسياً — قد يعيد توزيع الصور حسب المقاسات",
      icon: <ArrowsDownUp className="w-5 h-5" weight="bold" />,
      onClick: transposeGrid,
      disabled: !collageTemplate,
    },
    {
      id: "shuffle",
      label: "خلط عشوائي",
      hint: "ترتيب عشوائي لكل الصور الحالية",
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
    {
      id: "rotate",
      label: "لفّ كل الصور 90°",
      hint: "يضيف 90 درجة لكل صورة",
      icon: <ArrowsClockwise className="w-4 h-4" weight="bold" />,
      onClick: rotateAll,
      disabled: imageCount === 0,
    },
    {
      id: "reset",
      label: "تصفير التعديلات",
      hint: "إرجاع التقريب والتكبير والقلب لكل الصور",
      icon: <ArrowsOutCardinal className="w-4 h-4" weight="bold" />,
      onClick: resetAllAdjustments,
      disabled: imageCount === 0,
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 font-cairo animate-in fade-in duration-200" dir="rtl">
      <FluentSection
        icon={<ArrowsDownUp className="w-4 h-4" weight="duotone" />}
        title="فرز وترتيب الخانات"
        subtitle={`${grid.rows}×${grid.cols} · ${imageCount} من ${slots.length} صورة`}
        collapsible
      >
        {!grid.isComplete && (
          <p className="text-micro text-muted-foreground leading-relaxed">
            التخطيط الحالي غير شبكي منتظم — عمليات الصفوف والأعمدة قد تكون محدودة، والتبديل يعيد
            بناء الشبكة.
          </p>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={action.disabled}
              title={action.hint}
              onClick={action.onClick}
              className="h-8 justify-start text-right rounded-md"
            >
              <span className="text-primary shrink-0">{action.icon}</span>
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      </FluentSection>
    </div>
  );
}
