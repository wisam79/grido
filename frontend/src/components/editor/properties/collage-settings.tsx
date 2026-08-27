import { HugeIcon } from "@/components/ui/huge-icon";
import {
  CursorMove01Icon,
  SquareIcon,
  BorderFullIcon,
  Scissor01Icon,
  TableRowsSplitIcon,
  Grid02Icon,
} from "@hugeicons/core-free-icons";
import { useEditorStore } from "@/lib/editor-store";
import { Switch } from "@/components/ui/switch";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { useRef, useCallback } from "react";
import { FluentSection, FluentSettingRow, FluentSliderField } from "@/components/ui/blocks";

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

  return (
    <div className="flex flex-col gap-3 font-cairo" dir="rtl">
      {/* 🎴 بطاقة 1: المسافات والاستدارة */}
      <FluentSection
        icon={<HugeIcon icon={Grid02Icon} size={14} />}
        title="المسافات والاستدارة"
        collapsible
        defaultOpen={true}
      >
        <div className="flex flex-col gap-2.5">
          <FluentSliderField
            label="المسافات بين الصور"
            icon={<HugeIcon icon={TableRowsSplitIcon} size={14} />}
            value={collageGap}
            min={0}
            max={60}
            step={2}
            unit="px"
            onChange={setCollageGap}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
          <FluentSliderField
            label="الهامش الخارجي"
            icon={<HugeIcon icon={CursorMove01Icon} size={14} />}
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
            icon={<HugeIcon icon={SquareIcon} size={14} />}
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
        icon={<HugeIcon icon={BorderFullIcon} size={14} />}
        title="إطار وحدود الصور"
        collapsible
        defaultOpen={true}
      >
        <div className="space-y-2.5">
          <FluentSliderField
            label="سُمك الإطار"
            icon={<HugeIcon icon={BorderFullIcon} size={14} />}
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
                        "w-5.5 h-5.5 rounded-full border border-black/20 dark:border-white/25 transition-all cursor-pointer hover:scale-115 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-xs"
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 bg-background border border-border/80 hover:border-primary/60 rounded-md px-2 w-28 h-8 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background shadow-2xs">
                <input
                  type="text"
                  value={collageStrokeColor}
                  onChange={(e) => { setCollageStrokeColor(e.target.value); commitColorLater(); }}
                  className="w-full bg-transparent border-0 p-0 text-[11px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-bold"
                />
                <label className="relative w-4 h-4 rounded-full border border-border cursor-pointer overflow-hidden shrink-0 shadow-2xs transition-transform hover:scale-110">
                  <input
                    type="color"
                    value={collageStrokeColor}
                    onChange={(e) => { setCollageStrokeColor(e.target.value); commitColorLater(); }}
                    className="absolute -inset-2 w-8 h-8 opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-full h-full rounded-full"
                    style={{ backgroundColor: collageStrokeColor }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 3: خطوط وعلامات القص */}
      <FluentSection
        icon={<HugeIcon icon={Scissor01Icon} size={14} />}
        title="خطوط القص والمحاذاة"
        collapsible
        defaultOpen={true}
      >
        <div className="space-y-2">
          <FluentSettingRow
            label="خطوط القص التلقائية"
            description="إظهار خطوط القص بين صور الكولاج"
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
                    <span>خط نهاية الطباعة (الأزرق)</span>
                  </div>
                }
                description="تحديد نهاية الطباعة على الورقة"
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
