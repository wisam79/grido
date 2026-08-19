import React from "react";
import { Label } from "@/components/ui/label";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { PopoverColorPicker, SliderControl } from "../../shared-controls";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextShadowControlsProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export const TextShadowControls = React.memo(function TextShadowControls({
  element,
  onUpdate,
}: TextShadowControlsProps) {
  const hasShadow = (element.shadowBlur ?? 0) > 0 || (element.shadowOpacity ?? 0) > 0;

  return (
    <div className="space-y-2.5 pt-2 border-t border-border/20 font-cairo">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary/70" />
          <span>ظل النص (Text Shadow)</span>
        </span>
        <button
          type="button"
          onClick={() => {
            if (hasShadow) {
              onUpdate(element.id, {
                shadowBlur: 0,
                shadowOpacity: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
              });
            } else {
              onUpdate(element.id, {
                shadowColor: element.shadowColor || "#000000",
                shadowBlur: 8,
                shadowOpacity: 0.6,
                shadowOffsetX: 2,
                shadowOffsetY: 3,
              });
            }
            useEditorStore.getState().pushHistory();
          }}
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer",
            hasShadow
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
          )}
        >
          {hasShadow ? "مفعّل" : "إضافة ظل"}
        </button>
      </div>

      {hasShadow && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[10px] text-muted-foreground font-semibold">لون الظل</Label>
            <PopoverColorPicker
              color={element.shadowColor || "#000000"}
              onChange={(val: string) => {
                onUpdate(element.id, { shadowColor: val });
                useEditorStore.getState().pushHistory();
              }}
              className="w-36 h-8"
            />
          </div>

          <SliderControl
            label="ضبابية الظل"
            value={element.shadowBlur ?? 8}
            min={0}
            max={40}
            step={1}
            unit="px"
            onChange={(val: number) => onUpdate(element.id, { shadowBlur: val })}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />

          <div className="grid grid-cols-2 gap-2">
            <SliderControl
              label="إزاحة أفقية"
              value={element.shadowOffsetX ?? 2}
              min={-30}
              max={30}
              step={1}
              unit="px"
              onChange={(val: number) => onUpdate(element.id, { shadowOffsetX: val })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
            <SliderControl
              label="إزاحة عمودية"
              value={element.shadowOffsetY ?? 3}
              min={-30}
              max={30}
              step={1}
              unit="px"
              onChange={(val: number) => onUpdate(element.id, { shadowOffsetY: val })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />
          </div>
        </div>
      )}
    </div>
  );
});
