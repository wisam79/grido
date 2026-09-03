import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { Palette, Sparkle, Square, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Slider } from "@/components/ui/slider";
import { PopoverColorPicker } from "../../shared-controls";
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
    "h-7 px-2.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
    active
      ? "bg-primary text-primary-foreground border-primary font-bold"
      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
  );

export function TextEffectsTab({ element, onUpdate }: TextTabProps) {
  const hasStroke = (element.strokeWidth ?? 0) > 0;
  const hasShadow = (element.shadowBlur ?? 0) > 0 || (element.shadowOpacity ?? 0) > 0;
  const hasBadge = !!element.textBgColor && element.textBgColor !== "transparent";
  const hasCurve = typeof element.curve === "number" && element.curve !== 0;

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150">

      {/* 🎴 بطاقة 1: الخلفية والشارة */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary" weight="duotone" />
            <span>الخلفية والشارة</span>
          </span>

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
        </div>

        {hasBadge && (
          <div className="space-y-2.5 pt-2 border-t border-border/30 animate-in fade-in duration-150">
            {/* تباعد أفقي X */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground font-semibold">أفقي (X)</span>
                <span className="font-mono font-bold text-foreground">{element.textBgPaddingX ?? element.textBgPadding ?? 12}px</span>
              </div>
              <Slider
                value={[element.textBgPaddingX ?? element.textBgPadding ?? 12]}
                min={0}
                max={48}
                step={1}
                onValueChange={(val) => onUpdate(element.id, { textBgPaddingX: val[0] })}
                onPointerUp={() => useEditorStore.getState().pushHistory()}
                className="py-0.5"
              />
            </div>

            {/* تباعد عمودي Y */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground font-semibold">عمودي (Y)</span>
                <span className="font-mono font-bold text-foreground">{element.textBgPaddingY ?? element.textBgPadding ?? 6}px</span>
              </div>
              <Slider
                value={[element.textBgPaddingY ?? element.textBgPadding ?? 6]}
                min={0}
                max={36}
                step={1}
                onValueChange={(val) => onUpdate(element.id, { textBgPaddingY: val[0] })}
                onPointerUp={() => useEditorStore.getState().pushHistory()}
                className="py-0.5"
              />
            </div>

            {/* الاستدارة */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground font-semibold">الاستدارة</span>
                <span className="font-mono font-bold text-foreground">{element.textBgRadius ?? 8}px</span>
              </div>
              <Slider
                value={[element.textBgRadius ?? 8]}
                min={0}
                max={64}
                step={1}
                onValueChange={(val) => onUpdate(element.id, { textBgRadius: val[0] })}
                onPointerUp={() => useEditorStore.getState().pushHistory()}
                className="py-0.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* 🎴 بطاقة 2: الإطار والحدود */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
            <Square className="w-3.5 h-3.5 text-primary" weight="duotone" />
            <span>الإطار والحدود</span>
          </span>

          <div className="flex items-center gap-1.5">
            {hasStroke && (
              <PopoverColorPicker
                color={element.stroke || "#000000"}
                onChange={(val: string) => {
                  onUpdate(element.id, { stroke: val });
                  useEditorStore.getState().pushHistory();
                }}
                swatchOnly
              />
            )}

            <button
              type="button"
              onClick={() => {
                if (hasStroke) {
                  onUpdate(element.id, { strokeWidth: 0 });
                } else {
                  onUpdate(element.id, { stroke: element.stroke || "#000000", strokeWidth: 2 });
                }
                useEditorStore.getState().pushHistory();
              }}
              className={toggleButtonClassName(hasStroke)}
            >
              {hasStroke ? "مفعّل" : "إضافة"}
            </button>
          </div>
        </div>

        {hasStroke && (
          <div className="space-y-1 pt-2 border-t border-border/30 animate-in fade-in duration-150">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground font-semibold">السمك</span>
              <span className="font-mono font-bold text-foreground">{element.strokeWidth ?? 2}px</span>
            </div>
            <Slider
              value={[element.strokeWidth ?? 2]}
              min={0.5}
              max={20}
              step={0.5}
              onValueChange={(val) => onUpdate(element.id, { strokeWidth: val[0] })}
              onPointerUp={() => useEditorStore.getState().pushHistory()}
              className="py-0.5"
            />
          </div>
        )}
      </div>

      {/* 🎴 بطاقة 3: الظل والتوهج */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
            <Sparkle className="w-3.5 h-3.5 text-primary" weight="duotone" />
            <span>الظل والتوهج</span>
          </span>

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
        </div>

        {/* أنماط سريعة */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-[10px]">
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
              className="px-2 py-0.5 bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/50 rounded-md text-muted-foreground text-[9.5px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
            >
              {p.label}
            </button>
          ))}
        </div>

        {hasShadow && (
          <div className="space-y-1.5 pt-2 border-t border-border/30 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground font-semibold">التمويه</span>
              <span className="font-mono font-bold">{element.shadowBlur ?? 10}px</span>
            </div>
            <Slider
              value={[element.shadowBlur ?? 10]}
              min={0}
              max={40}
              step={2}
              onValueChange={(val) => onUpdate(element.id, { shadowBlur: val[0] })}
              onPointerUp={() => useEditorStore.getState().pushHistory()}
              className="py-0.5"
            />
          </div>
        )}
      </div>

      {/* 🎴 بطاقة 4: تقويس النص */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
            <ArrowCounterClockwise className="w-3.5 h-3.5 text-primary" weight="duotone" />
            <span>تقويس النص</span>
          </span>

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
        </div>

        {hasCurve && (
          <div className="space-y-2 pt-2 border-t border-border/30 animate-in fade-in duration-150">
            {/* زوايا جاهزة */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-[10px]">
              {CURVE_PRESETS.map((cp) => (
                <button
                  key={cp.label}
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { curve: cp.value });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md border text-[9px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                    (element.curve ?? 0) === cp.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-primary/10 text-muted-foreground border-border/50"
                  )}
                >
                  {cp.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                <span>-100°</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { curve: 0 });
                    useEditorStore.getState().pushHistory();
                  }}
                  className="px-1.5 py-0.5 bg-background border border-border/60 hover:border-primary/40 rounded-md text-[9px] text-foreground font-bold cursor-pointer flex items-center gap-1 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
                  title="استقامة"
                >
                  <ArrowCounterClockwise className="w-2.5 h-2.5" weight="bold" />
                  <span>تصفير</span>
                </button>
                <span>+100°</span>
              </div>
              <Slider
                value={[element.curve ?? 60]}
                min={-100}
                max={100}
                step={5}
                onValueChange={(val) => onUpdate(element.id, { curve: val[0] })}
                onPointerUp={() => useEditorStore.getState().pushHistory()}
                className="py-1"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
