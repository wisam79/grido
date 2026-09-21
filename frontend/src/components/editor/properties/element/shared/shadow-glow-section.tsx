import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { Sparkle, Eye, Drop } from "@phosphor-icons/react";
import { FluentSection, FluentSliderField } from "@/components/ui/blocks";
import { PopoverColorPicker } from "../../shared-controls";

export interface ShadowGlowSectionProps {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

export function ShadowGlowSection({ element, onUpdate }: ShadowGlowSectionProps) {
  const currentOpacity = Math.round((element.shadowOpacity ?? 0) * 100);

  return (
    <FluentSection
      icon={<Sparkle className="w-5 h-5 text-primary" weight="duotone" />}
      title="الظل والوهج"
      collapsible
      defaultOpen={true}
    >
      {/* اللون والشفافية في صف مدمج */}
      <div className="flex items-center justify-between gap-2" title="لون الظل">
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
        icon={<Eye className="w-4 h-4" weight="regular" />}
        value={currentOpacity}
        min={0}
        max={100}
        step={1}
        unit="%"
        onChange={(v) => onUpdate(element.id, { shadowOpacity: v / 100 })}
        onCommit={() => useEditorStore.getState().pushHistory()}
      />

      <FluentSliderField
        label="التمويه"
        icon={<Drop className="w-4 h-4" weight="regular" />}
        value={element.shadowBlur || 0}
        min={0}
        max={50}
        step={1}
        unit="px"
        onChange={(v) => onUpdate(element.id, { shadowBlur: v })}
        onCommit={() => useEditorStore.getState().pushHistory()}
      />

      {/* إزاحة X و Y في صف واحد مدمج بدلاً من منزلقين عريضين منفصلين */}
      <div className="grid grid-cols-2 gap-2 text-mini pt-0.5">
        <div className="flex items-center gap-1.5 bg-input/60 border border-border/60 rounded-md px-2 h-8">
          <span className="text-muted-foreground font-mono text-micro font-bold shrink-0">إزاحة X</span>
          <input
            type="number"
            value={element.shadowOffsetX || 0}
            onChange={(e) => onUpdate(element.id, { shadowOffsetX: Number(e.target.value) || 0 })}
            onBlur={() => useEditorStore.getState().pushHistory()}
            className="w-full bg-transparent border-0 p-0 text-xs font-mono text-left focus:outline-none"
          />
          <span className="text-micro font-mono text-muted-foreground shrink-0">px</span>
        </div>
        <div className="flex items-center gap-1.5 bg-input/60 border border-border/60 rounded-md px-2 h-8">
          <span className="text-muted-foreground font-mono text-micro font-bold shrink-0">إزاحة Y</span>
          <input
            type="number"
            value={element.shadowOffsetY || 0}
            onChange={(e) => onUpdate(element.id, { shadowOffsetY: Number(e.target.value) || 0 })}
            onBlur={() => useEditorStore.getState().pushHistory()}
            className="w-full bg-transparent border-0 p-0 text-xs font-mono text-left focus:outline-none"
          />
          <span className="text-micro font-mono text-muted-foreground shrink-0">px</span>
        </div>
      </div>
    </FluentSection>
  );
}
