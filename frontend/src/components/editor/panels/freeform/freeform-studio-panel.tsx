import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { FluentSegmentedControl } from '@/components/ui/blocks/fluent-segmented-control';
import { useEditorStore } from '@/lib/editor-store';
import { getToolsForWorkflow } from '@/lib/workspace-tools';

import { FreeformBackdropsTab } from './freeform-backdrops-tab';
import { FreeformElementsTab } from './freeform-elements-tab';
import { FreeformFontsTab } from './freeform-fonts-tab';
import { FreeformLayersTab } from './freeform-layers-tab';
import { FreeformPaletteTab } from './freeform-palette-tab';
import { FreeformPresetsTab } from './freeform-presets-tab';

import type { FreeformTab } from './freeform-panel-constants';

/* ═══════════════════════════════════════════════════════════════
   لوحات وضع التعديل الحر — التبويب النشط يحدّد اللوحة المعروضة.
   التسميات والأيقونات تأتي من سجل الأدوات في workspace-tools،
   فإضافة أداة جديدة تحتاج مدخلاً في السجل + سطراً هنا فقط.
   تبويب «العناصر» hub موحد: FreeformElementsTab بلا category مضبوطة
   فيعرض مبدّل الفئات الداخلي (شارات/أشكال/نصوص) بنفسه.
   ═══════════════════════════════════════════════════════════════ */

export interface FreeformStudioPanelProps {
  activeTab?: FreeformTab;
  onActiveTabChange?: (tab: FreeformTab) => void;
  /** شريط التبويبات الداخلي للشاشات المدمجة (< 1024px) حيث الشريط الجانبي غائب */
  showInternalTabs?: boolean;
}

export const FreeformStudioPanel = React.memo(function FreeformStudioPanel({
  activeTab = 'layers',
  onActiveTabChange,
  showInternalTabs = false,
}: FreeformStudioPanelProps = {}) {
  const { workflow, elementsCount } = useEditorStore(
    useShallow((state) => ({
      workflow: state.workflow,
      elementsCount: state.elements.length,
    })),
  );

  // 🧭 شريط تبويبات الاستوديو للشاشات المدمجة — من سجل الأدوات المفلتر
  // لمسار العمل (يطابق الشريط الجانبي: يُخفي elements في quick) — بلا هذا
  // لا يوجد أي مبدّل لمسي للتبويبات الستة في compact.
  const studioTabOptions = useMemo(
    () =>
      getToolsForWorkflow('single', workflow).map((tool) => ({
        id: tool.id,
        label: tool.label,
        icon: <tool.icon className="w-4 h-4 text-muted-foreground" weight="duotone" />,
        tooltip: tool.title,
        badge:
          tool.badge === 'elements' && elementsCount > 0 ? (
            <span className="min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-2xs font-bold tabular-nums flex items-center justify-center leading-none">
              {elementsCount > 99 ? '99+' : elementsCount}
            </span>
          ) : undefined,
      })),
    [workflow, elementsCount],
  );

  return (
    <div className="flex-1 min-w-0 font-cairo" dir="rtl">
      {showInternalTabs && (
        <div className="overflow-x-auto pb-0.5 -mb-0.5">
          <FluentSegmentedControl
            layoutId="studio-main-tabs"
            fullWidth={false}
            options={studioTabOptions}
            value={activeTab}
            onChange={(val) => onActiveTabChange?.(val as FreeformTab)}
            size="sm"
          />
        </div>
      )}
      {activeTab === 'layers' && <FreeformLayersTab />}
      {activeTab === 'elements' && <FreeformElementsTab />}
      {activeTab === 'presets' && <FreeformPresetsTab />}
      {activeTab === 'fonts' && <FreeformFontsTab />}
      {activeTab === 'palette' && <FreeformPaletteTab />}
      {activeTab === 'backdrops' && <FreeformBackdropsTab />}
    </div>
  );
});
