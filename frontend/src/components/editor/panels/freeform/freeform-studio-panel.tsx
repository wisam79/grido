import React from "react";
import { FreeformLayersTab } from "./freeform-layers-tab";
import { FreeformElementsTab } from "./freeform-elements-tab";
import { FreeformPresetsTab } from "./freeform-presets-tab";
import { FreeformFontsTab } from "./freeform-fonts-tab";
import { FreeformPaletteTab } from "./freeform-palette-tab";
import { FreeformBackdropsTab } from "./freeform-backdrops-tab";
import { FreeformLibraryTab } from "./freeform-library-tab";
import type { FreeformTab } from "./freeform-panel-constants";

/* ═══════════════════════════════════════════════════════════════
   لوحات وضع التعديل الحر — التبويب النشط يحدّد اللوحة المعروضة.
   التسميات والأيقونات تأتي من سجل الأدوات في workspace-tools،
   فإضافة أداة جديدة تحتاج مدخلاً في السجل + سطراً هنا فقط.
   ═══════════════════════════════════════════════════════════════ */

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
      {activeTab === "fonts" && <FreeformFontsTab />}
      {activeTab === "palette" && <FreeformPaletteTab />}
      {activeTab === "backdrops" && <FreeformBackdropsTab />}
      {activeTab === "library" && <FreeformLibraryTab />}
    </div>
  );
});
