import { Sparkles, Columns, Move, Square, Maximize2, Scissors, PaintBucket } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { SliderControl } from "./shared-controls";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

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
  } = useEditorStore();

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-4">
      <div className="font-semibold text-xs text-foreground/90 mb-1 flex items-center gap-1.5 border-b border-border/10 pb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>تنسيق الكولاج</span>
      </div>

      <SliderControl
        label="المسافة بين الصور"
        icon={<Columns className="w-3.5 h-3.5" />}
        value={collageGap}
        min={0}
        max={60}
        step={2}
        onChange={setCollageGap}
        unit="بكسل"
      />

      <SliderControl
        label="الهامش الخارجي"
        icon={<Move className="w-3.5 h-3.5" />}
        value={collageMargin}
        min={0}
        max={100}
        step={2}
        onChange={setCollageMargin}
        unit="بكسل"
      />

      <SliderControl
        label="استدارة الزوايا"
        icon={<Square className="w-3.5 h-3.5" />}
        value={collageRadius}
        min={0}
        max={50}
        step={2}
        onChange={setCollageRadius}
        unit="بكسل"
      />

      <div className="space-y-3">
        <SliderControl
          label="سمك إطار الصور"
          icon={<Maximize2 className="w-3.5 h-3.5" />}
          value={collageStrokeWidth}
          min={0}
          max={15}
          step={1}
          onChange={setCollageStrokeWidth}
          unit="بكسل"
        />

        {collageStrokeWidth > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16">لون الإطار:</span>
            <div className="flex-1 flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs">
              <PaintBucket className="w-3.5 h-3.5 text-muted-foreground/60 select-none" />
              <input
                type="text"
                value={collageStrokeColor}
                onChange={(e) => setCollageStrokeColor(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
              />
              <input
                type="color"
                value={collageStrokeColor}
                onChange={(e) => setCollageStrokeColor(e.target.value)}
                className="w-5 h-5 rounded border border-border/20 cursor-pointer p-0 bg-transparent shrink-0"
              />
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-border/20" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Scissors className="w-3.5 h-3.5 text-muted-foreground/75" />
          <span className="text-xs font-semibold">خطوط القص والمحاذاة</span>
        </div>
        <Switch
          checked={collageShowCutLines}
          onCheckedChange={setCollageShowCutLines}
        />
      </div>
    </div>
  );
}
