import React from 'react';

import { FreeformElementsTab } from './freeform-elements-tab';
import { FreeformLayersTab } from './freeform-layers-tab';
import { FreeformTextTab } from './freeform-text-tab';

import type { FreeformTab } from '@/lib/workspace-tools';

/* ═══════════════════════════════════════════════════════════════
   لوحات وضع التعديل الحر — التبويب النشط يحدّد اللوحة المعروضة.
   كل أداة وجهة مستقلة في شريط الأيقونات (ملصقات/أشكال/نصوص/طبقات)،
   فلا شريط تبويبات داخلي فوق اللوح. إضافة أداة جديدة تحتاج مدخلاً في
   السجل + سطراً هنا فقط.
   ═══════════════════════════════════════════════════════════════ */

export interface FreeformStudioPanelProps {
  activeTab?: FreeformTab;
}

export const FreeformStudioPanel = React.memo(function FreeformStudioPanel({
  activeTab = 'stickers',
}: FreeformStudioPanelProps = {}) {
  return (
    <div className="flex-1 min-w-0 font-cairo" dir="rtl">
      {activeTab === 'stickers' && <FreeformElementsTab category="stickers" />}
      {activeTab === 'shapes' && <FreeformElementsTab category="shapes" />}
      {activeTab === 'text' && <FreeformTextTab />}
      {activeTab === 'layers' && <FreeformLayersTab />}
    </div>
  );
});
