import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { Palette, Sparkle, ArrowCounterClockwise } from "@phosphor-icons/react";
import { PopoverColorPicker } from "../../shared-controls";
import { FluentSection, FluentSliderField } from "@/components/ui/blocks";
import type { TextTabProps } from "./text-tab-types";


const toggleButtonClassName = (active: boolean) =>
  cn(
    "h-7 px-2.5 rounded-md border text-micro font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
    active
      ? "bg-primary text-primary-foreground border-primary font-bold"
      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
  );

export function TextEffectsTab({ element, onUpdate }: TextTabProps) {
  const hasShadow = (element.shadowBlur ?? 0) > 0 || (element.shadowOpacity ?? 0) > 0;
  const hasBadge = !!element.textBgColor && element.textBgColor !== "transparent";
  const hasCurve = typeof element.curve === "number" && element.curve !== 0;

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150 font-cairo">
      {/* 🎴 بطاقة 1: الخلفية والشارة */}
      <FluentSection
        icon={<Palette className="w-5 h-5 text-primary" weight="duotone" />}
        title="الخلفية والشارة"
        open={hasBadge}
        action={
          <div className="flex items-center gap-1.5">
            {hasBadge && (
              <PopoverColorPicker
                color={element.textBgColor || "#2563eb"}
                onChange={(val: string) => {
                  onUpdate(element.id, { textBgColor: val });
                  useEditorStore.getState().pushHistory();
                }}
                swatchOnly
              />
            )}

            <button
              type="button"
              onClick={() => {
                if (hasBadge) {
                  onUpdate(element.id, { textBgColor: "transparent", textBgBorderWidth: 0 });
                } else {
                  onUpdate(element.id, {
                    textBgColor: "#2563eb",
                    textBgRadius: element.textBgRadius ?? 8,
                    textBgPadding: element.textBgPadding ?? 8,
                    textBgPaddingX: element.textBgPaddingX ?? 12,
                    textBgPaddingY: element.textBgPaddingY ?? 6,
                  });
                }
                useEditorStore.getState().pushHistory();
              }}
              className={toggleButtonClassName(hasBadge)}
            >
              {hasBadge ? "مفعّلة" : "إضافة"}
            </button>
          </div>
        }
      >
        {hasBadge && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            <FluentSliderField
              label="أفقي (X)"
              value={element.textBgPaddingX ?? element.textBgPadding ?? 12}
              min={0}
              max={48}
              step={1}
              unit="px"
              onChange={(val) => onUpdate(element.id, { textBgPaddingX: val })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />

            <FluentSliderField
              label="عمودي (Y)"
              value={element.textBgPaddingY ?? element.textBgPadding ?? 6}
              min={0}
              max={36}
              step={1}
              unit="px"
              onChange={(val) => onUpdate(element.id, { textBgPaddingY: val })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />

            <FluentSliderField
              label="الاستدارة"
              value={element.textBgRadius ?? 8}
              min={0}
              max={64}
              step={1}
              unit="px"
              onChange={(val) => onUpdate(element.id, { textBgRadius: val })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
          </div>
        )}
      </FluentSection>

      {/* 🎴 بطاقة 2: الظل والتوهج */}
      <FluentSection
        icon={<Sparkle className="w-5 h-5 text-primary" weight="duotone" />}
        title="الظل والتوهج"
        open={hasShadow}
        action={
          <div className="flex items-center gap-1.5">
            {hasShadow && (
              <PopoverColorPicker
                color={element.shadowColor || "#000000"}
                onChange={(val: string) => {
                  onUpdate(element.id, { shadowColor: val });
                  useEditorStore.getState().pushHistory();
                }}
                swatchOnly
              />
            )}

            <button
              type="button"
              onClick={() => {
                if (hasShadow) {
                  onUpdate(element.id, { shadowBlur: 0, shadowOpacity: 0 });
                } else {
                  onUpdate(element.id, {
                    shadowColor: element.shadowColor || "#000000",
                    shadowBlur: 10,
                    shadowOpacity: 0.5,
                    shadowOffsetX: 2,
                    shadowOffsetY: 2,
                  });
                }
                useEditorStore.getState().pushHistory();
              }}
              className={toggleButtonClassName(hasShadow)}
            >
              {hasShadow ? "مفعّل" : "إضافة"}
            </button>
          </div>
        }
      >
        {hasShadow && (
          <div className="space-y-1.5 animate-in fade-in duration-150">
            <FluentSliderField
              label="التمويه"
              value={element.shadowBlur ?? 10}
              min={0}
              max={40}
              step={2}
              unit="px"
              onChange={(val) => onUpdate(element.id, { shadowBlur: val })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
          </div>
        )}
      </FluentSection>

      {/* 🎴 بطاقة 3: تقويس النص */}
      <FluentSection
        icon={<ArrowCounterClockwise className="w-5 h-5 text-primary" weight="duotone" />}
        title="تقويس النص"
        open={hasCurve}
        action={
          <button
            type="button"
            onClick={() => {
              if (hasCurve) {
                onUpdate(element.id, { curve: 0 });
              } else {
                onUpdate(element.id, { curve: 60 });
              }
              useEditorStore.getState().pushHistory();
            }}
            className={toggleButtonClassName(hasCurve)}
          >
            {hasCurve ? "مفعّل" : "إضافة"}
          </button>
        }
      >
        {hasCurve && (
          <div className="space-y-2 animate-in fade-in duration-150">
            <FluentSliderField
              label="زاوية التقويس"
              value={element.curve ?? 60}
              min={-100}
              max={100}
              step={5}
              unit="°"
              onChange={(val) => onUpdate(element.id, { curve: val })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
          </div>
        )}
      </FluentSection>
    </div>
  );
}
