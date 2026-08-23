import { useCallback, useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { GeneralSettings } from "../properties/general-settings";
import { ElementProperties } from "../properties/element-properties";
import { SlotProperties } from "../properties/slot-properties";
import { CollageSettings } from "../properties/collage-settings";
import { PanelShell } from "./panel-shell";
import { SlidersHorizontal, FileText } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { FluentSegmentedControl } from "@/components/ui/blocks";

export interface PropertiesPanelProps {
  /** يُمرر من App لإظهار زر الطي الداخلي — يُحذف في عرض Sheet الجوال */
  onCollapse?: () => void;
}

/** وصف نصي مختصر لنوع التحديد الحالي — يُغذي عنوان اللوحة (Progressive Disclosure) */
function describeSelection(
  element?: { type?: string },
  slot?: { imageSrc?: string },
  generalTab?: "collage" | "canvas"
): string {
  if (element) {
    switch (element.type) {
      case "text":
        return "تحرير النص المحدد";
      case "image":
        return "تعديل الصورة والفلاتر";
      case "shape":
        return "تنسيق الشكل المحدد";
      default:
        return "خصائص العنصر المحدد";
    }
  }
  if (slot) {
    return slot.imageSrc ? "تعديل صورة الخانة" : "خانة كولاج فارغة";
  }
  return generalTab === "canvas" ? "أبعاد الورقة والكانفس" : "المسافات والحدود والقص";
}

export function PropertiesPanel({ onCollapse }: PropertiesPanelProps) {
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

  const [generalTab, setGeneralTab] = useState<"collage" | "canvas">("collage");

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
      // العناصر المقفلة لا تُلمس في البث الجماعي — شارة القفل يجب أن تحترم
      // في كل أدوات التعديل (إصلاح Bug#19)
      const { elements: freshElements } = useEditorStore.getState();
      const broadcastIds = selectedIds.filter(
        (sid) => !freshElements.find((e) => e.id === sid)?.locked
      );
      if (broadcastIds.length > 0) {
        updateElements(broadcastIds.map((sid) => ({ id: sid, patch: stylePatch })));
      }
    }
    if (Object.keys(positionalPatch).length > 0) {
      updateElement(id, positionalPatch);
    }
  }, [updateElement]);

  return (
    <PanelShell
      icon={<SlidersHorizontal className="w-4 h-4" />}
      title="الخصائص"
      subtitle={describeSelection(selectedElement, selectedSlot, generalTab)}
      onCollapse={onCollapse}
      collapseTitle="إخفاء لوحة الخصائص (Ctrl+Shift+B)"
      className="bg-card select-none"
    >
      <div className="space-y-3">
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
          <div className="space-y-3">
            {mode === "collage" ? (
              <>
                <FluentSegmentedControl<"collage" | "canvas">
                  value={generalTab}
                  onChange={setGeneralTab}
                  size="sm"
                  options={[
                    { id: "collage", label: "تنسيق الكولاج", icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
                    { id: "canvas", label: "الورقة والكانفس", icon: <FileText className="w-3.5 h-3.5" /> },
                  ]}
                />
                {generalTab === "collage" ? (
                  <CollageSettings />
                ) : (
                  <GeneralSettings />
                )}
              </>
            ) : (
              <GeneralSettings />
            )}
          </div>
        )}
      </div>
    </PanelShell>
  );
}

