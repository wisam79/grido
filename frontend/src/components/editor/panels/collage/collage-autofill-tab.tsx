import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Images,
  FolderOpen,
  Shuffle,
  Trash,
  GridFour,
  Rows,
  Columns,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import {
  FluentSection,
  FluentSettingRow,
  FluentSegmentedControl,
  FluentEmptyState,
} from "@/components/ui/blocks";
import { Switch } from "@/components/ui/switch";
import { openImageFileDialog, openDirectoryImageDialog } from "@/lib/io/file-dialog-utils";

/* ═══════════════════════════════════════════════════════════════
   معالج التعبئة التلقائية — يوزّع صوراً مختارة (أو مجلداً كاملاً)
   على خانات الشبكة بترتيب مضبوط، بنداء واحد يُسجّل في التراجع مرة واحدة.
   ═══════════════════════════════════════════════════════════════ */

type FillMode = "empty" | "all";
type FillOrder = "row" | "column";

export function CollageAutofillTab() {
  const { slots, setSlotImagesBatch, clearSlots, canvasWidth, canvasHeight } = useEditorStore(
    useShallow((state) => ({
      slots: state.slots,
      setSlotImagesBatch: state.setSlotImagesBatch,
      clearSlots: state.clearSlots,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    }))
  );

  const [images, setImages] = useState<string[]>([]);
  const [mode, setMode] = useState<FillMode>("empty");
  const [order, setOrder] = useState<FillOrder>("row");
  const [repeat, setRepeat] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const emptyCount = useMemo(() => slots.filter((slot) => !slot.imageSrc).length, [slots]);
  const filledCount = slots.length - emptyCount;

  /** ترتيب الخانات: صف بصف (يمين→يسار) أو عمود بعمود (أعلى→أسفل) */
  const orderedSlots = useMemo(() => {
    const byCell = [...slots].sort((a, b) => a.cellIndex - b.cellIndex);
    if (order === "row") return byCell;
    return [...byCell].sort((a, b) => {
      const columnDelta = a.x - b.x;
      return Math.abs(columnDelta) > 0.001 ? columnDelta : a.y - b.y;
    });
  }, [slots, order]);

  const targets = useMemo(
    () => (mode === "empty" ? orderedSlots.filter((slot) => !slot.imageSrc) : orderedSlots),
    [orderedSlots, mode]
  );

  const pickImages = async (fromFolder: boolean) => {
    setIsPicking(true);
    try {
      const picked = fromFolder ? await openDirectoryImageDialog() : await openImageFileDialog(true);
      if (picked.length === 0) return;
      setImages((prev) => [...prev, ...picked]);
      toast.success(`تم إضافة ${picked.length} صورة`);
    } catch (error) {
      console.error(error);
      toast.error("فشل اختيار الصور");
    } finally {
      setIsPicking(false);
    }
  };

  const distribute = () => {
    if (images.length === 0) {
      toast.error("اختر صوراً أولاً");
      return;
    }
    if (targets.length === 0) {
      toast.info("لا توجد خانات فارغة — بدّل الوضع إلى «كل الخانات»");
      return;
    }

    const pool = shuffle ? [...images].sort(() => Math.random() - 0.5) : [...images];
    const assignments = targets
      .map((slot, index) => {
        const src = pool[index % pool.length];
        if (!src) return null;
        // عند عدم التكرار: نتوقف عن التعبئة بعد نفاد الصور
        if (!repeat && index >= pool.length) return null;
        return { slotId: slot.id, src };
      })
      .filter((item): item is { slotId: string; src: string } => item !== null);

    if (assignments.length === 0) return;

    setSlotImagesBatch(assignments, assignments[assignments.length - 1].src);
    toast.success(
      `تم توزيع ${assignments.length} صورة${repeat && images.length < targets.length ? " (مع تكرار)" : ""}`
    );
  };

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* مصدر الصور */}
      <FluentSection
        icon={<Images className="w-3.5 h-3.5" weight="duotone" />}
        title="مصدر الصور"
        subtitle={images.length > 0 ? `${images.length} صورة جاهزة` : "لم تُختَر صور بعد"}
        collapsible
      >
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="default"
            onClick={() => pickImages(false)}
            disabled={isPicking}
            title="اختيار صور متعددة"
          >
            <Images className="w-4 h-4" weight="bold" />
            <span>اختيار صور</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => pickImages(true)}
            disabled={isPicking}
            title="استيراد كل صور مجلد"
          >
            <FolderOpen className="w-4 h-4 text-primary" weight="bold" />
            <span>مجلد كامل</span>
          </Button>
        </div>

        {images.length > 0 && (
          <div className="flex items-center gap-2">
            {/* شريط مصغّرات لأول 8 صور ليتأكد المستخدم من الترتيب */}
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden" dir="ltr">
              {images.slice(0, 8).map((src, index) => (
                <span
                  key={`${index}-${src.slice(-16)}`}
                  className="w-7 h-7 rounded-md border border-border/70 bg-muted/60 overflow-hidden shrink-0"
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </span>
              ))}
              {images.length > 8 && (
                <span className="text-2xs font-mono text-muted-foreground shrink-0">
                  +{images.length - 8}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setImages([])}
              title="إفراغ قائمة الصور"
              aria-label="إفراغ قائمة الصور"
            >
              <Trash className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </FluentSection>

      {/* طريقة التوزيع */}
      <FluentSection
        icon={<GridFour className="w-3.5 h-3.5" weight="duotone" />}
        title="طريقة التوزيع"
        subtitle={`${filledCount} ممتلئة · ${emptyCount} فارغة`}
        collapsible
      >
        <FluentSettingRow
          layout="vertical"
          label="الخانات المستهدفة"
          control={
            <FluentSegmentedControl<FillMode>
              layoutId="autofill-mode"
              value={mode}
              onChange={setMode}
              size="sm"
              className="p-0.5 border-0 h-8"
              options={[
                { id: "empty", label: "الفارغة فقط" },
                { id: "all", label: "كل الخانات" },
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
              value={order}
              onChange={setOrder}
              size="sm"
              className="p-0.5 border-0 h-8"
              options={[
                {
                  id: "row",
                  label: "صفوف",
                  icon: <Rows className="w-4 h-4" weight="duotone" />,
                  tooltip: "صف بصف من الأعلى",
                },
                {
                  id: "column",
                  label: "أعمدة",
                  icon: <Columns className="w-4 h-4" weight="duotone" />,
                  tooltip: "عمود بعمود من اليمين",
                },
              ]}
            />
          }
        />

        <FluentSettingRow
          label="تكرار الصور"
          description="إن قلت الصور عن الخانات"
          control={
            <Switch checked={repeat} onCheckedChange={setRepeat} aria-label="تكرار الصور" />
          }
        />

        <FluentSettingRow
          label="خلط عشوائي"
          description="ترتيب مختلف في كل مرة"
          control={
            <Switch checked={shuffle} onCheckedChange={setShuffle} aria-label="خلط عشوائي" />
          }
        />

        <div className="flex items-center gap-2 pt-0.5">
          <Button type="button" className="flex-1" onClick={distribute} disabled={images.length === 0}>
            {shuffle ? (
              <Shuffle className="w-4 h-4" weight="bold" />
            ) : (
              <GridFour className="w-4 h-4" weight="bold" />
            )}
            <span>توزيع على {targets.length} خانة</span>
          </Button>
          {filledCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                clearSlots();
                toast.success("تم إفراغ الخانات");
              }}
              title="إفراغ كل الخانات"
              aria-label="إفراغ كل الخانات"
            >
              <ArrowsClockwise className="w-4 h-4" />
            </Button>
          )}
        </div>
      </FluentSection>

      {slots.length === 0 && (
        <FluentEmptyState
          icon={<GridFour className="w-8 h-8 text-muted-foreground/60" weight="duotone" />}
          title="لا توجد شبكة"
          description="حدّد تخطيط الشبكة أولاً من أداة «شبكة الكولاج»."
        />
      )}
    </div>
  );
}
