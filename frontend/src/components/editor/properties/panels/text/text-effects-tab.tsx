import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { Palette, Sparkle, ArrowCounterClockwise } from "@phosphor-icons/react";
import { PopoverColorPicker } from "../../shared-controls";
import { FluentSection, FluentSliderField } from "@/components/ui/blocks";
import type { TextTabProps } from "./text-tab-types";

const SHADOW_PRESETS = [
  { id: "none", label: "بدون", color: "#000000", blur: 0, ox: 0, oy: 0, opacity: 0 },
  { id: "soft", label: "ناعم", color: "#000000", blur: 10, ox: 0, oy: 3, opacity: 0.35 },
  { id: "drop", label: "ساقط", color: "#000000", blur: 14, ox: 4, oy: 4, opacity: 0.6 },
  { id: "neon", label: "توهج", color: "#38bdf8", blur: 22, ox: 0, oy: 0, opacity: 0.9 },
  { id: "3d", label: "3D", color: "#000000", blur: 2, ox: 3, oy: 3, opacity: 0.85 },
];

const CURVE_PRESETS = [
  { label: "0°", value: 0 },
  { label: "30°", value: 30 },
  { label: "60°", value: 60 },
  { label: "-60°", value: -60 },
  { label: "100°", value: 100 },
];

const toggleButtonClassName = (active: boolean) =>
  cn(
    "h-7 px-2.5 rounded-md border text-micro font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
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
        icon={<Palette className="w-4 h-4 text-primary" weight="duotone" />}
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
        icon={<Sparkle className="w-4 h-4 text-primary" weight="duotone" />}
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
        {/* أنماط سريعة */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-micro">
          {SHADOW_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onUpdate(element.id, {
                  shadowColor: p.color,
                  shadowBlur: p.blur,
                  shadowOffsetX: p.ox,
                  shadowOffsetY: p.oy,
                  shadowOpacity: p.opacity,
                });
                useEditorStore.getState().pushHistory();
              }}
              className="px-2 py-0.5 bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/50 rounded-md text-muted-foreground text-micro font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
            >
              {p.label}
            </button>
          ))}
        </div>

        {hasShadow && (
          <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
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
        icon={<ArrowCounterClockwise className="w-4 h-4 text-primary" weight="duotone" />}
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
            {/* زوايا جاهزة */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-micro">
              {CURVE_PRESETS.map((cp) => (
                <button
                  key={cp.label}
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { curve: cp.value });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md border text-micro font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                    (element.curve ?? 0) === cp.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-primary/10 text-muted-foreground border-border/50"
                  )}
                >
                  {cp.label}
                </button>
              ))}
            </div>

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
