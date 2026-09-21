import React from "react";
import { PaintBucket, Check } from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FluentSection,
  FluentSettingRow,
  FluentSliderField,
} from "@/components/ui/blocks";
import { PopoverColorPicker, StudioCanvasColorDeck } from "@/components/editor/properties/shared-controls";

/* ═══════════════════════════════════════════════════════════════
   خلفية وحدود الشبكة — لون ورقة الطباعة، المسافات بين الخانات،
   استدارة الزوايا، ولون الخلفية داخل كل خانة (يظهر مع الصور الشفافة).
   ═══════════════════════════════════════════════════════════════ */

/** ألوان ورق جاهزة — بيضاء/عاجية/رمادية + هوية الاستوديو */
const PAPER_SWATCHES: { color: string; label: string }[] = [
  { color: "#FFFFFF", label: "أبيض" },
  { color: "#F8FAFC", label: "أبيض مائل للرمادي" },
  { color: "#FDF6EC", label: "عاجي" },
  { color: "#EFF6FF", label: "أزرق فاتح" },
  { color: "#F1F5F9", label: "رمادي فاتح" },
  { color: "#0B1220", label: "كحلي داكن" },
  { color: "#000000", label: "أسود" },
  { color: "#2563EB", label: "أزرق الهوية" },
];

const SLOT_SWATCHES: { color: string; label: string }[] = [
  { color: "#FFFFFF", label: "أبيض" },
  { color: "#E2E8F0", label: "رمادي" },
  { color: "#DBEAFE", label: "أزرق فاتح" },
  { color: "#FEE2E2", label: "أحمر فاتح" },
  { color: "#DCFCE7", label: "أخضر فاتح" },
  { color: "#1E293B", label: "داكن" },
];

export function CollageBackdropTab() {
  const {
    backgroundColor,
    setBackgroundColor,
    backgroundGradientColor2,
    setBackgroundGradientColor2,
    backgroundGradientAngle,
    setBackgroundGradientAngle,
    collageGap,
    setCollageGap,
    collageMargin,
    setCollageMargin,
    collageRadius,
    setCollageRadius,
    collageStrokeColor,
    setCollageStrokeColor,
    slots,
    updateSlotsBatch,
  } = useEditorStore(
    useShallow((state) => ({
      backgroundColor: state.backgroundColor,
      setBackgroundColor: state.setBackgroundColor,
      backgroundGradientColor2: state.backgroundGradientColor2,
      setBackgroundGradientColor2: state.setBackgroundGradientColor2,
      backgroundGradientAngle: state.backgroundGradientAngle,
      setBackgroundGradientAngle: state.setBackgroundGradientAngle,
      collageGap: state.collageGap,
      setCollageGap: state.setCollageGap,
      collageMargin: state.collageMargin,
      setCollageMargin: state.setCollageMargin,
      collageRadius: state.collageRadius,
      setCollageRadius: state.setCollageRadius,
      collageStrokeColor: state.collageStrokeColor,
      setCollageStrokeColor: state.setCollageStrokeColor,
      slots: state.slots,
      updateSlotsBatch: state.updateSlotsBatch,
    }))
  );

  const applyToAllSlots = (color: string) => {
    const ids = slots.map((slot) => slot.id);
    if (ids.length === 0) return;
    updateSlotsBatch(ids, { bgColor: color });
  };

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* لون ورقة الطباعة */}
      <FluentSection
        icon={<PaintBucket className="w-3.5 h-3.5" weight="duotone" />}
        title="خلفية الورقة"
        subtitle={backgroundColor.toUpperCase()}
        collapsible
      >
        {/* 🎨 تدرج الخلفية: نفس لوحة الاستوديو مع قسم التدرج */}
        <StudioCanvasColorDeck
          color={backgroundColor}
          onChange={setBackgroundColor}
          gradientColor2={backgroundGradientColor2}
          onChangeGradientColor2={setBackgroundGradientColor2}
          gradientAngle={backgroundGradientAngle}
          onChangeGradientAngle={setBackgroundGradientAngle}
        />

        <div className="grid grid-cols-8 gap-1">
          {PAPER_SWATCHES.map((swatch) => {
            const isActive = backgroundColor.toLowerCase() === swatch.color.toLowerCase();
            return (
              <button
                key={swatch.color}
                type="button"
                title={swatch.label}
                aria-label={`خلفية الورقة ${swatch.label}`}
                aria-pressed={isActive}
                onClick={() => setBackgroundColor(swatch.color)}
                style={{ backgroundColor: swatch.color }}
                className={cn(
                  "h-7 w-full rounded-md border transition-colors cursor-pointer flex items-center justify-center",
                  isActive
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/70 hover:border-primary/50",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                )}
              >
                {isActive && (
                  <Check
                    className={cn(
                      "w-3.5 h-3.5",
                      swatch.color === "#000000" || swatch.color === "#0B1220"
                        ? "text-white"
                        : "text-foreground"
                    )}
                    weight="bold"
                  />
                )}
              </button>
            );
          })}
        </div>

        <FluentSettingRow
          label="لون مخصص"
          description="أي لون من لوحة الألوان"
          control={
            <PopoverColorPicker
              color={backgroundColor}
              onChange={setBackgroundColor}
              swatchOnly
              label="لون خلفية الورقة"
            />
          }
        />
      </FluentSection>

      {/* المسافات والزوايا */}
      <FluentSection
        title="المسافات والزوايا"
        subtitle="تخطيط الخانات"
        collapsible
      >
        <FluentSliderField
          label="المسافة بين الصور"
          value={collageGap}
          min={0}
          max={40}
          step={1}
          unit="px"
          onChange={setCollageGap}
        />
        <FluentSliderField
          label="هامش الورقة"
          value={collageMargin}
          min={0}
          max={80}
          step={1}
          unit="px"
          onChange={setCollageMargin}
        />
        <FluentSliderField
          label="استدارة زوايا الصور"
          value={collageRadius}
          min={0}
          max={60}
          step={1}
          unit="px"
          onChange={setCollageRadius}
        />
      </FluentSection>

      {/* خلفية الصور وحدودها */}
      <FluentSection
        title="خلفية الصورة والحدود"
        subtitle={collageStrokeColor.toUpperCase()}
        collapsible
      >
        <FluentSettingRow
          layout="vertical"
          label="لون خلفية كل صورة"
          description="يظهر مع الصور الشفافة (PNG)"
          control={
            <div className="grid grid-cols-6 gap-1">
              {SLOT_SWATCHES.map((swatch) => (
                <button
                  key={swatch.color}
                  type="button"
                  title={swatch.label}
                  aria-label={`خلفية الصورة ${swatch.label}`}
                  onClick={() => applyToAllSlots(swatch.color)}
                  style={{ backgroundColor: swatch.color }}
                  className="h-7 w-full rounded-md border border-border/70 hover:border-primary/60 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                />
              ))}
            </div>
          }
        />

        <div className="flex items-center gap-2">
          <span className="flex-1 text-xs font-semibold text-foreground/90">لون حدود الخانات</span>
          <PopoverColorPicker
            color={collageStrokeColor}
            onChange={setCollageStrokeColor}
            swatchOnly
            label="لون حدود الخانات"
          />
        </div>

        <FluentSettingRow
          label="تطبيق على كل الخانات"
          description={`${slots.length} خانة`}
          control={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={slots.length === 0}
              onClick={() => {
                updateSlotsBatch(
                  slots.map((slot) => slot.id),
                  { bgColor: backgroundColor }
                );
              }}
              title="تعبئة خلفية كل صورة بلون الورقة"
            >
              <PaintBucket className="w-3.5 h-3.5 text-primary" weight="bold" />
              <span>تطبيق</span>
            </Button>
          }
        />
      </FluentSection>
    </div>
  );
}
