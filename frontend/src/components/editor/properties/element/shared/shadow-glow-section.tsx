import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { Sparkle, Eye, Drop, ArrowsLeftRight, ArrowsDownUp } from "@/components/ui/icons";
import { FluentSection, FluentSliderField } from "@/components/ui/blocks";
import { PopoverColorPicker } from "../../shared-controls";

export interface ShadowGlowSectionProps {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

export function ShadowGlowSection({ element, onUpdate }: ShadowGlowSectionProps) {
  return (
    <FluentSection
      icon={<Sparkle className="w-4 h-4 text-primary" weight="duotone" />}
      title="الظل والوهج"
      collapsible
      defaultOpen={true}
    >
      <div className="flex items-center justify-between gap-4" title="لون الظل">
        <span className="text-xs font-semibold text-muted-foreground">لون الظل</span>
        <PopoverColorPicker
          color={element.shadowColor || "#000000"}
          onChange={(val) => onUpdate(element.id, { shadowColor: val })}
          swatchOnly
          className="w-8 h-8"
        />
      </div>

      <FluentSliderField
        label="شدة الظل"
        icon={<Eye className="w-3.5 h-3.5" weight="regular" />}
        value={Math.round((element.shadowOpacity ?? 0) * 100)}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => onUpdate(element.id, { shadowOpacity: v / 100 })}
        onCommit={() => useEditorStore.getState().pushHistory()}
      />

      <FluentSliderField
        label="التمويه"
        icon={<Drop className="w-3.5 h-3.5" weight="regular" />}
        value={element.shadowBlur || 0}
        min={0}
        max={50}
        step={1}
        unit="px"
        onChange={(v) => onUpdate(element.id, { shadowBlur: v })}
        onCommit={() => useEditorStore.getState().pushHistory()}
      />

      <FluentSliderField
        label="إزاحة أفقية"
        icon={<ArrowsLeftRight className="w-3.5 h-3.5" weight="regular" />}
        value={element.shadowOffsetX || 0}
        min={-50}
        max={50}
        step={1}
        unit="px"
        onChange={(v) => onUpdate(element.id, { shadowOffsetX: v })}
        onCommit={() => useEditorStore.getState().pushHistory()}
      />

      <FluentSliderField
        label="إزاحة عمودية"
        icon={<ArrowsDownUp className="w-3.5 h-3.5" weight="regular" />}
        value={element.shadowOffsetY || 0}
        min={-50}
        max={50}
        step={1}
        unit="px"
        onChange={(v) => onUpdate(element.id, { shadowOffsetY: v })}
        onCommit={() => useEditorStore.getState().pushHistory()}
      />
    </FluentSection>
  );
}
