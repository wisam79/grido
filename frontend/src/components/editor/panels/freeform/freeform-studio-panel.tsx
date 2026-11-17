import React from 'react';

import { FreeformElementsTab } from './freeform-elements-tab';
import { FreeformLayersTab } from './freeform-layers-tab';
import { FreeformTextTab } from './freeform-text-tab';

import type { FreeformTab } from '@/lib/workspace-tools';

/* ═══════════════════════════════════════════════════════════════
   لوحات وضع التعديل الحر — التبويب النشط يحدّد اللوحة المعروضة.
   الطبقات والأشكال والنصوص تُفتح في اللوح الجانبي، بينما تفتح أيقونة
   الملصقات في الشريط الجانبي «استوديو الملصقات» الكامل مباشرة.
   ═══════════════════════════════════════════════════════════════ */

export interface FreeformStudioPanelProps {
  activeTab?: FreeformTab;
}

export const FreeformStudioPanel = React.memo(function FreeformStudioPanel({
  activeTab = 'layers',
}: FreeformStudioPanelProps = {}) {
  return (
    <div className="flex-1 min-w-0 font-cairo" dir="rtl">
      {activeTab === 'shapes' && <FreeformElementsTab category="shapes" />}
      {activeTab === 'text' && <FreeformTextTab />}
      {activeTab === 'layers' && <FreeformLayersTab />}
    </div>
  );
});
