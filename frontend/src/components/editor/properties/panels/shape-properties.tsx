import { Label } from "@/components/ui/label";
import { ShapeElement, useEditorStore } from "@/lib/editor-store";
import { PaintBucket, Square, Maximize2 } from "lucide-react";
import { SliderControl, PopoverColorPicker } from "../shared-controls";
import { GradientPicker, gradientAngleFromPoints, gradientPointsFromAngle } from "../gradient-picker";

interface ShapePropertiesProps {
  element: ShapeElement;
  onUpdate: (id: string, patch: Partial<ShapeElement>) => void;
}

export function ShapeProperties({ element, onUpdate }: ShapePropertiesProps) {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* بطاقة 1: اللون والتعبئة */}
      <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3">
        <Label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1.5">
          <PaintBucket className="w-3.5 h-3.5 text-primary" />
          <span>اللون والتعبئة</span>
        </Label>
        
        <GradientPicker
          fillType={element.fillType || "solid"}
          color={element.fill || "#6366f1"}
          colorStops={element.fillLinearGradientColorStops || element.fillRadialGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"]}
          onChangeType={(type) => {
            onUpdate(element.id, { fillType: type });
            useEditorStore.getState().pushHistory();
          }}
          onChangeSolidColor={(col) => {
            onUpdate(element.id, { 
              fill: col, 
              stroke: element.shape === "line" ? col : (element.stroke || col) 
            });
            useEditorStore.getState().pushHistory();
          }}
          onChangeColorStops={(stops) => {
            onUpdate(element.id, {
              fillLinearGradientColorStops: stops,
              fillRadialGradientColorStops: stops,
            });
            useEditorStore.getState().pushHistory();
          }}
          angle={gradientAngleFromPoints(
            element.fillLinearGradientStartPoint,
            element.fillLinearGradientEndPoint
          )}
          onChangeAngle={(deg) => {
            const { start, end } = gradientPointsFromAngle(deg);
            onUpdate(element.id, {
              fillLinearGradientStartPoint: start,
              fillLinearGradientEndPoint: end,
            });
          }}
          onCommitAngle={() => useEditorStore.getState().pushHistory()}
        />
      </div>

      {/* بطاقة 2: الحدود والاستدارة */}
      <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3">
        <Label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1.5">
          <Square className="w-3.5 h-3.5 text-primary" />
          <span>الحدود والاستدارة</span>
        </Label>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] font-semibold text-foreground/80">لون الحد</span>
          <PopoverColorPicker
            color={element.stroke || element.fill || "#3b82f6"}
            onChange={(val) => onUpdate(element.id, { stroke: val })}
            swatchOnly
          />
        </div>

        <SliderControl
          label={element.shape === "line" ? "سمك الخط" : "سماكة الحد"}
          icon={<Maximize2 className="w-3.5 h-3.5 text-muted-foreground/75" />}
          value={element.shape === "line" ? (element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : 4) : (element.strokeWidth ?? 0)}
          min={element.shape === "line" ? 1 : 0}
          max={50}
          step={0.5}
          unit="px"
          onChange={(v) => onUpdate(element.id, { strokeWidth: v })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />

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
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        )}
      </div>
    </div>
  );
}
