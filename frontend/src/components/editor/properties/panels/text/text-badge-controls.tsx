import React from "react";
import { Label } from "@/components/ui/label";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { PopoverColorPicker, SliderControl } from "../../shared-controls";
import { PaintBucket } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextBadgeControlsProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export const TextBadgeControls = React.memo(function TextBadgeControls({
  element,
  onUpdate,
}: TextBadgeControlsProps) {
  const hasBg = !!element.textBgColor && element.textBgColor !== "transparent";

  return (
    <div className="space-y-2.5 pt-2 border-t border-border/20 font-cairo">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
          <PaintBucket className="w-3.5 h-3.5 text-primary/70" />
          <span>شارة وخلفية النص (Badge)</span>
        </span>
        <button
          type="button"
          onClick={() => {
            if (hasBg) {
              onUpdate(element.id, { textBgColor: "transparent" });
            } else {
              onUpdate(element.id, {
                textBgColor: "#2563eb",
                textBgRadius: element.textBgRadius ?? 8,
                textBgPadding: element.textBgPadding ?? 8,
              });
            }
            useEditorStore.getState().pushHistory();
          }}
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer",
            hasBg
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
          )}
        >
          {hasBg ? "مفعّلة" : "إضافة شارة"}
        </button>
      </div>

      {hasBg && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[10px] text-muted-foreground font-semibold">لون الخلفية</Label>
            <PopoverColorPicker
              color={element.textBgColor || "#2563eb"}
              onChange={(val: string) => {
                onUpdate(element.id, { textBgColor: val });
                useEditorStore.getState().pushHistory();
              }}
              className="w-36 h-8"
            />
          </div>

          <SliderControl
            label="استدارة حواف الشارة"
            value={element.textBgRadius ?? 8}
            min={0}
            max={60}
            step={1}
            unit="px"
            onChange={(val: number) => onUpdate(element.id, { textBgRadius: val })}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />

          <SliderControl
            label="حشوة الهامش الداخلي"
            value={element.textBgPadding ?? 8}
            min={0}
            max={40}
            step={1}
            unit="px"
            onChange={(val: number) => onUpdate(element.id, { textBgPadding: val })}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        </div>
      )}
    </div>
  );
});
