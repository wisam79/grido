import React from "react";
import { FreeformLayersTab } from "./freeform-layers-tab";
import { FreeformElementsTab } from "./freeform-elements-tab";
import { FreeformPresetsTab } from "./freeform-presets-tab";
import type { FreeformTab } from "./freeform-panel-constants";

export interface FreeformStudioPanelProps {
  activeTab?: FreeformTab;
}

export const FreeformStudioPanel = React.memo(function FreeformStudioPanel({
  activeTab = "layers",
}: FreeformStudioPanelProps = {}) {
  return (
    <div className="flex-1 min-w-0 font-cairo" dir="rtl">
      {activeTab === "layers" && <FreeformLayersTab />}
      {activeTab === "stickers" && <FreeformElementsTab category="badges" />}
      {activeTab === "shapes" && <FreeformElementsTab category="shapes" />}
      {activeTab === "text" && <FreeformElementsTab category="text" />}
      {activeTab === "elements" && <FreeformElementsTab />}
      {activeTab === "presets" && <FreeformPresetsTab />}
    </div>
  );
});
