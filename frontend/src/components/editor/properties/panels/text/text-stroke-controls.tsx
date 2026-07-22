import React from "react";
import { Label } from "@/components/ui/label";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { PopoverColorPicker, SliderControl } from "../../shared-controls";
import { Square, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextStrokeControlsProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export const TextStrokeControls = React.memo(function TextStrokeControls({
  element,
  onUpdate,
}: TextStrokeControlsProps) {
  const hasStroke = (element.strokeWidth ?? 0) > 0;

  return (
    <div className="space-y-2.5 pt-2 border-t border-border/20 font-cairo">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
          <Square className="w-3.5 h-3.5 text-primary/70" />
          <span>إطار وحدود النص (Stroke)</span>
        </span>
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
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer",
            hasStroke
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
          )}
        >
          {hasStroke ? "مفعّل" : "إضافة حد"}
        </button>
      </div>

      {hasStroke && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[10px] text-muted-foreground font-semibold">لون الحد</Label>
            <PopoverColorPicker
              color={element.stroke || "#000000"}
              onChange={(val: string) => {
                onUpdate(element.id, { stroke: val });
                useEditorStore.getState().pushHistory();
              }}
              className="w-36 h-8"
            />
          </div>

          <SliderControl
            label="سمك الحد"
            value={element.strokeWidth ?? 2}
            min={1}
            max={12}
            step={0.5}
            unit="px"
            onChange={(v: number) => onUpdate(element.id, { strokeWidth: v })}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        </div>
      )}
    </div>
  );
});
