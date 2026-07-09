import { useEditorStore } from "@/lib/editor-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";
import { GeneralSettings } from "./properties/general-settings";
import { ElementProperties } from "./properties/element-properties";
import { SlotProperties } from "./properties/slot-properties";
import { CollageSettings } from "./properties/collage-settings";
import { LayersList } from "./properties/layers-list";

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

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-3 pb-8 space-y-4">
          {/* خصائص العنصر المحدد */}
          {selectedElement && (
            <ElementProperties 
              element={selectedElement} 
              onUpdate={(id, patch) => {
                const { selectedIds, updateElements } = useEditorStore.getState();
                if (selectedIds.length > 1 && selectedIds.includes(id)) {
                  const patches = selectedIds.map((sid) => ({
                    id: sid,
                    patch,
                  }));
                  updateElements(patches);
                } else {
                  updateElement(id, patch);
                }
              }} 
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

          {/* لوحة الطبقات (نشطة فقط في وضع التعديل الفردي) */}
          {mode === "single" && (
            <LayersList />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
