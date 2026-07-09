import { Label } from "@/components/ui/label";
import { ShapeElement, useEditorStore } from "@/lib/editor-store";
import { PaintBucket, Square, Maximize2 } from "lucide-react";
import { SliderControl, PopoverColorPicker } from "../shared-controls";
import { GradientPicker } from "../gradient-picker";

interface ShapePropertiesProps {
  element: ShapeElement;
  onUpdate: (id: string, patch: Partial<ShapeElement>) => void;
}

export function ShapeProperties({ element, onUpdate }: ShapePropertiesProps) {
  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
        <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-2">المظهر واللون</Label>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <PaintBucket className="w-3 h-3 text-primary/70" />
              <span>تعبئة الشكل</span>
            </span>
            <GradientPicker
              fillType={element.fillType || "solid"}
              color={element.fill || "#6366f1"}
              colorStops={element.fillLinearGradientColorStops || element.fillRadialGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"]}
              onChangeType={(type) => {
                onUpdate(element.id, { fillType: type });
                useEditorStore.getState().pushHistory();
              }}
              onChangeSolidColor={(col) => {
                onUpdate(element.id, { fill: col });
                useEditorStore.getState().pushHistory();
              }}
              onChangeColorStops={(stops) => {
                onUpdate(element.id, {
                  fillLinearGradientColorStops: stops,
                  fillRadialGradientColorStops: stops,
                });
                useEditorStore.getState().pushHistory();
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-[3px] border-2 border-primary/70" />
              <span>لون الحدود</span>
            </span>
            <PopoverColorPicker
              color={element.stroke || "#000000"}
              onChange={(val) => onUpdate(element.id, { stroke: val })}
              className="w-32 h-8"
            />
          </div>
        </div>

        {element.shape === "rect" && (
          <SliderControl
            label="استدارة الزوايا"
            icon={<Square className="w-3.5 h-3.5 text-muted-foreground/75" />}
            value={element.radius ?? 0}
            min={0}
            max={50}
            step={1}
            unit=""
            onChange={(v) => onUpdate(element.id, { radius: v })}
          />
        )}
        <SliderControl
          label="سماكة الحد"
          icon={<Maximize2 className="w-3.5 h-3.5 text-muted-foreground/75" />}
          value={element.strokeWidth ?? 0}
          min={0}
          max={20}
          step={0.5}
          unit="px"
          onChange={(v) => onUpdate(element.id, { strokeWidth: v })}
        />
      </div>
    </div>
  );
}
