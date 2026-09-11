import { CanvasDimensionsPanel } from "./general/canvas-dimensions-panel";
import { GridColumnsPanel } from "./general/grid-columns-panel";
import { StudioCanvasColorDeck } from "./shared-controls";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { FluentSection } from "@/components/ui/blocks";
import { PaintBrush } from "@phosphor-icons/react";

export function GeneralSettings() {
  const { backgroundColor, setBackgroundColor } = useEditorStore(
    useShallow((state) => ({
      backgroundColor: state.backgroundColor,
      setBackgroundColor: state.setBackgroundColor,
    }))
  );

  return (
    <div className="space-y-3 font-cairo" dir="rtl">
      <CanvasDimensionsPanel />

      <FluentSection
        icon={<PaintBrush className="w-3.5 h-3.5 text-primary" weight="duotone" />}
        title="خلفية الورقة"
        collapsible
        defaultOpen={true}
      >
        <StudioCanvasColorDeck
          color={backgroundColor}
          onChange={setBackgroundColor}
        />
      </FluentSection>

      <GridColumnsPanel />
    </div>
  );
}
