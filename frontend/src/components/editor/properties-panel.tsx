import { useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GeneralSettings } from "./properties/general-settings";
import { ElementProperties } from "./properties/element-properties";
import { SlotProperties } from "./properties/slot-properties";
import { CollageSettings } from "./properties/collage-settings";
import { LayersList } from "./properties/layers-list";

import { useShallow } from "zustand/react/shallow";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings2, Layers } from "lucide-react";

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
  }, [updateElement]);

  return (
    <div className="flex flex-col h-full bg-card select-none">
      <Tabs defaultValue="properties" className="flex flex-col h-full gap-0">
        <div className="px-4 py-2 border-b">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="properties" className="text-xs gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              الخصائص
            </TabsTrigger>
            <TabsTrigger value="layers" className="text-xs gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              الطبقات
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="properties" className="flex-1 mt-0 h-0 outline-none data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1">
            <div className="p-3 pb-8 space-y-4">
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
        </TabsContent>

        <TabsContent value="layers" className="flex-1 mt-0 h-0 outline-none data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1">
            <div className="p-3 pb-8">
              <LayersList />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
