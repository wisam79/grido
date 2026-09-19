import { useMemo, useState } from "react";
import { toast } from "sonner";
import { GridNine, PaintBucket, SquaresFour, ArrowLineDown } from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FluentFilterChips,
  FluentSection,
  FluentSegmentedControl,
  FluentSettingRow,
} from "@/components/ui/blocks";
import { PopoverColorPicker } from "@/components/editor/properties/shared-controls";
import {
  GRADIENT_PRESETS,
  formatGradientCss,
  gradientPointsFromAngle,
  type GradientPreset,
} from "@/components/editor/properties/gradient-utils";

/* ═══════════════════════════════════════════════════════════════
   الخلفيات والأنماط — لون ورقة الكانفاس، وإضافة خلفية متدرجة
   كاملة كعنصر في الخلفية، أو تطبيق التدرج على عنصر محدد.
   ═══════════════════════════════════════════════════════════════ */

type GradientTarget = "element" | "backdrop";

const PAPER_COLORS: { label: string; color: string }[] = [
  { label: "أبيض نقي", color: "#ffffff" },
  { label: "عاجي", color: "#faf7f0" },
  { label: "رمادي فاتح", color: "#f1f5f9" },
  { label: "أزرق باهت", color: "#eff6ff" },
  { label: "أخضر باهت", color: "#f0fdf4" },
  { label: "بيج استوديو", color: "#f5efe6" },
  { label: "رمادي متوسط", color: "#94a3b8" },
  { label: "كحلي داكن", color: "#0f172a" },
];

const GRADIENT_CATEGORIES = [
  { id: "luxury" as const, label: "ملكي فاخر" },
  { id: "aurora" as const, label: "شفق وطبيعة" },
  { id: "neon" as const, label: "نيون عصري" },
  { id: "pastel" as const, label: "باستيل هادئ" },
];

export function FreeformBackdropsTab() {
  const {
    elements,
    selectedIds,
    updateElement,
    updateElements,
    setBackgroundColor,
    backgroundColor,
    addShapeElement,
    sendToBack,
  } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedIds: state.selectedIds,
      updateElement: state.updateElement,
      updateElements: state.updateElements,
      setBackgroundColor: state.setBackgroundColor,
      backgroundColor: state.backgroundColor,
      addShapeElement: state.addShapeElement,
      sendToBack: state.sendToBack,
    }))
  );

  const [gradientTarget, setGradientTarget] = useState<GradientTarget>("element");
  const [category, setCategory] = useState<GradientPreset["category"]>("luxury");

  const selectableElements = useMemo(
    () => elements.filter((element) => selectedIds.includes(element.id)),
    [elements, selectedIds]
  );

  const gradients = useMemo(
    () => GRADIENT_PRESETS.filter((preset) => preset.category === category),
    [category]
  );

  /** خصائص التعبئة المتدرجة — نفس صيغة نقاط التدرج المستخدمة في بقية التطبيق */
  const gradientPatch = (stops: Array<number | string>) => {
    const { start, end } = gradientPointsFromAngle(135);
    return {
      fillType: "linear" as const,
      fillLinearGradientStartPoint: start,
      fillLinearGradientEndPoint: end,
      fillLinearGradientColorStops: stops,
    };
  };

  const applyGradient = (preset: GradientPreset, forceBackdrop = false) => {
    if (forceBackdrop || gradientTarget === "backdrop") {
      addShapeElement("rect");
      const newId = useEditorStore.getState().selectedId;
      if (!newId) return;
      updateElement(newId, {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        radius: 0,
        opacity: 1,
        ...gradientPatch(preset.stops),
      });
      sendToBack(newId);
      toast.success(`أُضيفت خلفية «${preset.name}» خلف كل العناصر`);
      return;
    }

    if (selectableElements.length === 0) {
      toast.info("اختر عنصراً على الكانفاس، أو اختر «خلفية كاملة» لإضافتها كعنصر");
      return;
    }

    updateElements(
      selectableElements.map((element) => ({ id: element.id, patch: gradientPatch(preset.stops) }))
    );
    toast.success(
      selectableElements.length === 1
        ? `تم تطبيق تدرج «${preset.name}»`
        : `تم تطبيق تدرج «${preset.name}» على ${selectableElements.length} عناصر`
    );
  };

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      <FluentSection
        icon={<PaintBucket className="w-3.5 h-3.5" weight="duotone" />}
        title="خلفية الورقة"
        subtitle={`الحالي: ${backgroundColor}`}
      >
        <div className="grid grid-cols-8 gap-1.5">
          {PAPER_COLORS.map((item) => {
            const isCurrent = backgroundColor?.toLowerCase() === item.color.toLowerCase();
            return (
              <button
                key={item.color}
                type="button"
                onClick={() => setBackgroundColor(item.color)}
                aria-label={item.label}
                aria-pressed={isCurrent}
                title={item.label}
                className={cn(
                  "aspect-square rounded-md border transition-colors cursor-pointer shadow-2xs",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                  isCurrent
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary"
                    : "border-black/10 dark:border-white/15 hover:border-primary/60"
                )}
                style={{ backgroundColor: item.color }}
              />
            );
          })}
        </div>

        <div className="mt-2">
          <FluentSettingRow
            label="لون مخصص"
            description="اختيار حر لخلفية الورقة"
            control={
              <PopoverColorPicker
                color={backgroundColor || "#ffffff"}
                label={backgroundColor?.toUpperCase()}
                onChange={(hex) => setBackgroundColor(hex)}
              />
            }
          />
        </div>
      </FluentSection>

      <FluentSection
        icon={<GridNine className="w-3.5 h-3.5" weight="duotone" />}
        title="تدرجات جاهزة"
        subtitle={
          gradientTarget === "backdrop"
            ? "ستُضاف كخلفية كاملة خلف العناصر"
            : selectableElements.length > 0
              ? `سيُطبَّق على ${selectableElements.length} عنصر محدد`
              : "لا عنصر محدد"
        }
        badge={gradients.length}
      >
        <FluentSegmentedControl<GradientTarget>
          value={gradientTarget}
          onChange={setGradientTarget}
          layoutId="gradient-target"
          options={[
            { id: "element", label: "العنصر المحدد" },
            { id: "backdrop", label: "خلفية كاملة" },
          ]}
        />

        <FluentFilterChips<GradientPreset["category"]>
          value={category}
          onChange={setCategory}
          layoutId="gradient-category-chips"
          className="mt-2"
          options={GRADIENT_CATEGORIES.map((item) => ({ id: item.id, label: item.label }))}
        />

        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {gradients.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyGradient(preset)}
              title={`تطبيق تدرج ${preset.name}`}
              className="group rounded-xl border border-border/80 bg-card overflow-hidden text-start transition-colors cursor-pointer hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <span
                className="block h-9 w-full"
                style={{ background: formatGradientCss(preset.stops, "linear", 135) }}
              />
              <span className="flex items-center gap-1 px-2 h-7">
                {gradientTarget === "backdrop" && (
                  <ArrowLineDown className="w-3 h-3 text-muted-foreground shrink-0" weight="bold" />
                )}
                <span className="text-micro font-semibold text-foreground truncate">
                  {preset.name}
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="text-mini text-muted-foreground mt-2 leading-relaxed">
          الخلفية الكاملة تُضاف كعنصر مستطيل يغطي الورقة ويُرسَل خلف كل العناصر، فيمكن تعديله
          أو حذفه لاحقاً من لوحة الطبقات.
        </p>
      </FluentSection>

      <FluentSection
        icon={<SquaresFour className="w-3.5 h-3.5" weight="duotone" />}
        title="قوالب خلفية سريعة"
        subtitle="خلفية متدرجة بضغطة واحدة"
      >
        <div className="flex flex-wrap gap-1.5">
          {GRADIENT_PRESETS.slice(0, 6).map((preset) => (
            <Button
              key={`quick-${preset.id}`}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setGradientTarget("backdrop");
                applyGradient(preset, true);
              }}
              className="justify-start"
            >
              <span
                className="w-4 h-4 rounded-sm border border-black/10 dark:border-white/15 shrink-0"
                style={{ background: formatGradientCss(preset.stops, "linear", 135) }}
              />
              <span className="truncate">{preset.name}</span>
            </Button>
          ))}
        </div>
      </FluentSection>
    </div>
  );
}
