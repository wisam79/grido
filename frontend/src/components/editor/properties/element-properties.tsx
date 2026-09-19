import { useState } from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { PaintBrush, Palette, Sparkle, ArrowsOutCardinal } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FluentSegmentedControl } from "@/components/ui/blocks";
import { ImageStyleProperties, ImageAdjustProperties } from "./panels/image-properties";
import { TextStyleProperties, TextColorProperties, TextEffectsProperties } from "./panels/text-properties";
import { ShapeStyleProperties, ShapeColorProperties } from "./panels/shape-properties";
import { ElementHeaderBadge } from "./element/element-header-badge";
import { ElementArrangeTab } from "./element/tabs/arrange-tab";
import { ShadowGlowSection } from "./element/shared/shadow-glow-section";

export interface ElementPropertiesProps {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

export function ElementProperties({ element, onUpdate }: ElementPropertiesProps) {
  const [activeTab, setActiveTab] = useState<string>("style");
  const selectedIds = useEditorStore((state) => state.selectedIds);

  const handleUnlock = () => {
    onUpdate(element.id, { locked: false });
    useEditorStore.getState().pushHistory();
  };

  return (
    <div className="space-y-2.5 font-cairo select-none">
      {/* شارات الهوية والقفل والتحديد المتعدد */}
      <ElementHeaderBadge
        element={element}
        selectedIds={selectedIds}
        onUnlock={handleUnlock}
      />

      {/* لوحة التبويبات القياسية الأربعة الموحدة لجميع العناصر (Zero Dead Tabs) */}
      <div className={cn("overflow-hidden", element.locked && "pointer-events-none opacity-50 select-none")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <FluentSegmentedControl<string>
            layoutId="element-properties-tabs"
            value={activeTab}
            onChange={setActiveTab}
            size="sm"
            options={[
              {
                id: "style",
                label: "التنسيق",
                icon: (
                  <PaintBrush
                    className="w-3.5 h-3.5 shrink-0 transition-transform"
                    weight={activeTab === "style" ? "duotone" : "regular"}
                  />
                ),
                tooltip: "التنسيق والقياسات",
                className: "px-1.5 gap-1",
              },
              {
                id: "adjust",
                label: "الألوان",
                icon: (
                  <Palette
                    className="w-3.5 h-3.5 shrink-0 transition-transform"
                    weight={activeTab === "adjust" ? "duotone" : "regular"}
                  />
                ),
                tooltip:
                  element.type === "image"
                    ? "ألوان وفلاتر الصورة"
                    : "الألوان والتعبئة والتدرجات",
                className: "px-1.5 gap-1",
              },
              {
                id: "effects",
                label: "التأثيرات",
                icon: (
                  <Sparkle
                    className="w-3.5 h-3.5 shrink-0 transition-transform"
                    weight={activeTab === "effects" ? "duotone" : "regular"}
                  />
                ),
                tooltip: "التأثيرات والظلال",
                className: "px-1.5 gap-1",
              },
              {
                id: "arrange",
                label: "الترتيب",
                icon: (
                  <ArrowsOutCardinal
                    className="w-3.5 h-3.5 shrink-0 transition-transform"
                    weight={activeTab === "arrange" ? "duotone" : "regular"}
                  />
                ),
                tooltip: "الموضع والمحاذاة والتدوير",
                className: "px-1.5 gap-1",
              },
            ]}
          />

          {/* 1. تبويب التنسيق (Style) */}
          <TabsContent
            value="style"
            className={cn("mt-3 space-y-3", element.locked && "pointer-events-none opacity-50 select-none")}
          >
            {element.type === "image" && (
              <ImageStyleProperties element={element} onUpdate={onUpdate} />
            )}
            {element.type === "text" && (
              <TextStyleProperties element={element} onUpdate={onUpdate} onNavigateTab={setActiveTab} />
            )}
            {element.type === "shape" && (
              <ShapeStyleProperties element={element} onUpdate={onUpdate} onNavigateTab={setActiveTab} />
            )}
          </TabsContent>

          {/* 2. تبويب الألوان (Colors) */}
          <TabsContent
            value="adjust"
            className={cn("mt-3 space-y-3", element.locked && "pointer-events-none opacity-50 select-none")}
          >
            {element.type === "image" && (
              <ImageAdjustProperties element={element} onUpdate={onUpdate} showReset={true} />
            )}
            {element.type === "text" && (
              <TextColorProperties element={element} onUpdate={onUpdate} onNavigateTab={setActiveTab} />
            )}
            {element.type === "shape" && (
              <ShapeColorProperties element={element} onUpdate={onUpdate} onNavigateTab={setActiveTab} />
            )}
          </TabsContent>

          {/* 3. تبويب التأثيرات (Effects) */}
          <TabsContent
            value="effects"
            className={cn("mt-3 space-y-3", element.locked && "pointer-events-none opacity-50 select-none")}
          >
            {element.type === "text" ? (
              <TextEffectsProperties element={element} onUpdate={onUpdate} onNavigateTab={setActiveTab} />
            ) : (
              <ShadowGlowSection element={element} onUpdate={onUpdate} />
            )}
          </TabsContent>

          {/* 4. تبويب الترتيب (Arrange) */}
          <TabsContent
            value="arrange"
            className={cn("mt-3 space-y-3", element.locked && "pointer-events-none opacity-50 select-none")}
          >
            <ElementArrangeTab element={element} onUpdate={onUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
