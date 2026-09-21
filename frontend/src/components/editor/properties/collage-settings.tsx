import {
  ArrowsOutCardinal,
  Square,
  BoundingBox,
  Scissors,
  Rows,
  GridFour,
} from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { Switch } from "@/components/ui/switch";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { useRef, useCallback, useEffect } from "react";
import { FluentSection, FluentSettingRow, FluentSliderField } from "@/components/ui/blocks";
import { PopoverColorPicker } from "./shared-controls";

export function CollageSettings() {
  const {
    collageGap,
    collageMargin,
    collageRadius,
    collageShowCutLines,
    collageShowEndCutLine,
    collageStrokeWidth,
    collageStrokeColor,
    setCollageGap,
    setCollageMargin,
    setCollageRadius,
    setCollageShowCutLines,
    setCollageShowEndCutLine,
    setCollageStrokeWidth,
    setCollageStrokeColor,
  } = useEditorStore(useShallow((state) => ({
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageRadius: state.collageRadius,
    collageShowCutLines: state.collageShowCutLines,
    collageShowEndCutLine: state.collageShowEndCutLine,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
    setCollageGap: state.setCollageGap,
    setCollageMargin: state.setCollageMargin,
    setCollageRadius: state.setCollageRadius,
    setCollageShowCutLines: state.setCollageShowCutLines,
    setCollageShowEndCutLine: state.setCollageShowEndCutLine,
    setCollageStrokeWidth: state.setCollageStrokeWidth,
    setCollageStrokeColor: state.setCollageStrokeColor,
  })));

  // لون الإطار يُدخل باستمرار (نص/عجلة) — ندفع سطر تراجع واحد بعد توقف الكتابة (إصلاح Bug#2)
  const colorCommitTimerRef = useRef<number | null>(null);
  const commitColorLater = useCallback(() => {
    if (colorCommitTimerRef.current !== null) window.clearTimeout(colorCommitTimerRef.current);
    colorCommitTimerRef.current = window.setTimeout(() => {
      colorCommitTimerRef.current = null;
      useEditorStore.getState().pushHistory();
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (colorCommitTimerRef.current !== null) window.clearTimeout(colorCommitTimerRef.current);
    };
  }, []);


  return (
    <div className="flex flex-col gap-3 font-cairo" dir="rtl">
      {/* 🎴 بطاقة 1: المسافات والاستدارة */}
      <FluentSection
        icon={<GridFour className="w-4 h-4" weight="duotone" />}
        title="المسافات والاستدارة"
        collapsible
        defaultOpen={true}
      >
        <div className="flex flex-col gap-2.5">
          <FluentSliderField
            label="التباعد الداخلي"
            icon={<Rows className="w-4 h-4" weight="regular" />}
            value={collageGap}
            min={0}
            max={30}
            step={2}
            unit="px"
            onChange={setCollageGap}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
          <FluentSliderField
            label="الهوامش الخارجية"
            icon={<ArrowsOutCardinal className="w-4 h-4" weight="regular" />}
            value={collageMargin}
            min={0}
            max={100}
            step={2}
            unit="px"
            onChange={setCollageMargin}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
          <FluentSliderField
            label="استدارة الزوايا"
            icon={<Square className="w-4 h-4" weight="regular" />}
            value={collageRadius}
            min={0}
            max={50}
            step={2}
            unit="px"
            onChange={setCollageRadius}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 2: إطار وحدود الخلايا */}
      <FluentSection
        icon={<BoundingBox className="w-4 h-4" weight="duotone" />}
        title="إطار الصور"
        collapsible
        defaultOpen={true}
      >
        <div className="space-y-2.5">
          <FluentSliderField
            label="سُمك الإطار"
            icon={<BoundingBox className="w-4 h-4" weight="regular" />}
            value={collageStrokeWidth}
            min={0}
            max={15}
            step={1}
            unit="px"
            onChange={setCollageStrokeWidth}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />

          {/* Frame Color Row — shown only when stroke is active */}
          {collageStrokeWidth > 0 && (
            <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2.5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-1.5">
                {[
                  { hex: "#e10e0e", label: "أحمر" },
                  { hex: "#000000", label: "أسود" },
                  { hex: "#9ca3af", label: "رمادي" },
                  { hex: "#2563eb", label: "أزرق" },
                  { hex: "#ffffff", label: "أبيض" },
                ].map(({ hex, label }) => {
                  const isSelected = collageStrokeColor.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      aria-label={label}
                      aria-pressed={isSelected}
                      onClick={() => { setCollageStrokeColor(hex); commitColorLater(); }}
                      title={label}
                      className={cn(
                        "w-7 h-7 rounded-full border border-black/20 dark:border-white/25 transition-all cursor-pointer hover:scale-110 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-xs"
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>

              <PopoverColorPicker
                color={collageStrokeColor}
                onChange={(hex) => {
                  setCollageStrokeColor(hex);
                  commitColorLater();
                }}
                className="w-32 h-8"
              />
            </div>
          )}
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 3: خطوط القص */}
      <FluentSection
        icon={<Scissors className="w-4 h-4" weight="duotone" />}
        title="خطوط القص"
        collapsible
        defaultOpen={true}
      >
        <div className="space-y-2">
          <FluentSettingRow
            label="خطوط القص"
            description="خطوط القص بين الصور"
            control={
              <Switch
                checked={collageShowCutLines}
                onCheckedChange={setCollageShowCutLines}
              />
            }
          />

          {collageShowCutLines && (
            <div className="pt-2 border-t border-border/20 animate-in fade-in-50 duration-150 pr-2">
              <FluentSettingRow
                label={
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/30 shrink-0 shadow-xs" />
                    <span>خط نهاية الطباعة</span>
                  </div>
                }
                description="نهاية الطباعة على الورقة"
                control={
                  <Switch
                    checked={collageShowEndCutLine}
                    onCheckedChange={setCollageShowEndCutLine}
                    className="scale-90"
                  />
                }
              />
            </div>
          )}
        </div>
      </FluentSection>
    </div>
  );
}
