import { Sparkles, Columns, Move, Square, Maximize2, Scissors, PaintBucket } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { SliderControl } from "./shared-controls";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import { useShallow } from "zustand/react/shallow";

export function CollageSettings() {
  const {
    collageGap,
    collageMargin,
    collageRadius,
    collageShowCutLines,
    collageStrokeWidth,
    collageStrokeColor,
    setCollageGap,
    setCollageMargin,
    setCollageRadius,
    setCollageShowCutLines,
    setCollageStrokeWidth,
    setCollageStrokeColor,
  } = useEditorStore(useShallow((state) => ({
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageRadius: state.collageRadius,
    collageShowCutLines: state.collageShowCutLines,
    collageStrokeWidth: state.collageStrokeWidth,
    collageStrokeColor: state.collageStrokeColor,
    setCollageGap: state.setCollageGap,
    setCollageMargin: state.setCollageMargin,
    setCollageRadius: state.setCollageRadius,
    setCollageShowCutLines: state.setCollageShowCutLines,
    setCollageStrokeWidth: state.setCollageStrokeWidth,
    setCollageStrokeColor: state.setCollageStrokeColor,
  })));

  return (
    <div className="rounded-xl border bg-muted/30 p-2.5 space-y-2.5">
      <div className="font-bold text-[11px] text-foreground/90 flex items-center gap-1.5 border-b border-border/10 pb-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>تنسيق الكولاج</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <SliderControl
          label="المسافات"
          icon={<Columns className="w-3 h-3" />}
          value={collageGap}
          min={0}
          max={60}
          step={2}
          onChange={setCollageGap}
          unit="px"
        />

        <SliderControl
          label="الهامش"
          icon={<Move className="w-3 h-3" />}
          value={collageMargin}
          min={0}
          max={100}
          step={2}
          onChange={setCollageMargin}
          unit="px"
        />

        <SliderControl
          label="الزوايا"
          icon={<Square className="w-3 h-3" />}
          value={collageRadius}
          min={0}
          max={50}
          step={2}
          onChange={setCollageRadius}
          unit="px"
        />

        <SliderControl
          label="الإطار"
          icon={<Maximize2 className="w-3 h-3" />}
          value={collageStrokeWidth}
          min={0}
          max={15}
          step={1}
          onChange={setCollageStrokeWidth}
          unit="px"
        />
      </div>

      {collageStrokeWidth > 0 && (
        <div className="flex items-center gap-2 border-t border-border/10 pt-2.5">
          <span className="text-[9px] text-muted-foreground w-14 font-bold">لون الإطار:</span>
          <div className="flex-1 flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-1.5 h-7 shadow-xs">
            <PaintBucket className="w-3 h-3 text-muted-foreground/60 select-none" />
            <input
              type="text"
              value={collageStrokeColor}
              onChange={(e) => setCollageStrokeColor(e.target.value)}
              className="w-full bg-transparent border-0 p-0 text-[10px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
            <input
              type="color"
              value={collageStrokeColor}
              onChange={(e) => setCollageStrokeColor(e.target.value)}
              className="w-4 h-4 rounded border border-border/20 cursor-pointer p-0 bg-transparent shrink-0"
            />
          </div>
        </div>
      )}

      <Separator className="bg-border/10 my-0.5" />

      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Scissors className="w-3 h-3 text-muted-foreground/75" />
          <span className="text-[10px] font-bold">خطوط القص والمحاذاة</span>
        </div>
        <Switch
          checked={collageShowCutLines}
          onCheckedChange={setCollageShowCutLines}
        />
      </div>
    </div>
  );
}
