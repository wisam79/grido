import { useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GeneralSettings } from "./properties/general-settings";
import { ElementProperties } from "./properties/element-properties";
import { SlotProperties } from "./properties/slot-properties";
import { CollageSettings } from "./properties/collage-settings";
import { useShallow } from "zustand/react/shallow";

export function PropertiesPanel() {
  const {
    mode,
    elements,
    slots,
    selectedId,
    updateElement,
    updateSlot,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    elements: state.elements,
    slots: state.slots,
    selectedId: state.selectedId,
    updateElement: state.updateElement,
    updateSlot: state.updateSlot,
  })));

  const selectedElement = elements.find((e) => e.id === selectedId);
  const selectedSlot = slots.find((s) => s.id === selectedId);

  const handleUpdateElement = useCallback((id: string, patch: any) => {
    const { selectedIds, updateElements, updateElement } = useEditorStore.getState();
    const isMulti = selectedIds.length > 1 && selectedIds.includes(id);
    if (!isMulti) {
      updateElement(id, patch);
      return;
    }

    // التحديد المتعدد: الخيارات الأسلوبية تُبثّ لجميع المحددين (لون، خط، مرشحات، استدارة...)،
    // أما الإحداثيات والقفل فتُطبَّق على العنصر المعروض وحده — وإلا تتداخل العناصر بعضها فوق بعض
    const styleExcluded = new Set(["x", "y", "locked"]);
    const stylePatch: any = {};
    const positionalPatch: any = {};
    for (const key of Object.keys(patch)) {
      (styleExcluded.has(key) ? positionalPatch : stylePatch)[key] = patch[key];
    }
    if (Object.keys(stylePatch).length > 0) {
      updateElements(selectedIds.map((sid) => ({ id: sid, patch: stylePatch })));
    }
    if (Object.keys(positionalPatch).length > 0) {
      updateElement(id, positionalPatch);
    }
  }, [updateElement]);

  return (
    <div className="flex flex-col h-full bg-card select-none">
      <ScrollArea className="flex-1">
        <div className="p-3 pb-8 space-y-4 font-cairo">
          {/* خصائص العنصر المحدد */}
          {selectedElement && (
            <ElementProperties 
              element={selectedElement} 
              onUpdate={handleUpdateElement} 
            />
          )}

          {/* خصائص الخلية المحددة (كولاج) */}
          {selectedSlot && !selectedElement && (
            <SlotProperties slot={selectedSlot} onUpdate={updateSlot} />
          )}

          {/* إعدادات عامة */}
          {!selectedElement && !selectedSlot && (
            <>
              <GeneralSettings />
              {mode === "collage" && (
                <CollageSettings />
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
