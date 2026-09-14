import React, { useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Stack, Sparkle, FrameCorners } from "@phosphor-icons/react";
import { FluentSegmentedControl } from "@/components/ui/blocks";
import { FreeformLayersTab } from "./freeform-layers-tab";
import { FreeformElementsTab } from "./freeform-elements-tab";
import { FreeformPresetsTab } from "./freeform-presets-tab";
import type { FreeformTab } from "./freeform-panel-constants";

export const FreeformStudioPanel = React.memo(function FreeformStudioPanel() {
  const [activeTab, setActiveTab] = useState<FreeformTab>("layers");

  const elementsCount = useEditorStore(
    useShallow((state) => state.elements.length)
  );

  return (
    <div className="flex flex-col gap-3 font-cairo" dir="rtl">
      {/* 🧭 شريط التبويبات الرئيسي لاستوديو التعديل الحر */}
      <FluentSegmentedControl<FreeformTab>
        layoutId="freeform-studio-tabs"
        value={activeTab}
        onChange={setActiveTab}
        size="sm"
        options={[
          {
            id: "layers",
            label: "الطبقات",
            icon: <Stack className="w-4 h-4 text-primary" weight="duotone" />,
            badge: elementsCount > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-primary/20 text-primary border border-primary/30">
                {elementsCount}
              </span>
            ) : undefined,
          },
          {
            id: "elements",
            label: "العناصر",
            icon: <Sparkle className="w-4 h-4 text-primary" weight="duotone" />,
          },
          {
            id: "presets",
            label: "المقاسات",
            icon: <FrameCorners className="w-4 h-4 text-primary" weight="duotone" />,
          },
        ]}
      />

      {/* 📦 محتوى التبويب المختار */}
      <div className="flex-1 min-w-0">
        {activeTab === "layers" && <FreeformLayersTab />}
        {activeTab === "elements" && <FreeformElementsTab />}
        {activeTab === "presets" && <FreeformPresetsTab />}
      </div>
    </div>
  );
});
