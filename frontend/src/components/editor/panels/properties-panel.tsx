import React, { useCallback, useEffect, useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import type { CanvasElement } from '@/lib/store/types';
import { GeneralSettings } from '../properties/general-settings';
import { ElementProperties } from '../properties/element-properties';
import { SlotProperties } from '../properties/slot-properties';
import { CollageSettings } from '../properties/collage-settings';
import { PanelShell } from './panel-shell';
import { LayersPanel } from './layers-panel';
import { CaretRight, SlidersHorizontal, FileText, Stack } from '@/components/ui/icons';
import { FluentSegmentedControl } from '@/components/ui/blocks';
import { PAPER_BACKGROUND_EVENTS } from '@/lib/ui/paper-background';

export interface PropertiesPanelProps {
  /** يُمرر من App لإظهار زر الطي الداخلي — يُحذف في عرض Sheet الجوال */
  onCollapse?: () => void;
}

export const PropertiesPanel = React.memo(function PropertiesPanel({
  onCollapse,
}: PropertiesPanelProps) {
  // scalars فقط: الوضع/التحديد/الإجراء. لا اشتراك على مصفوفتي elements/slots
  // الكاملتين — element-slice يستبدلهما في كل كتابة، فكان كل نبضة سحب أو شريط
  // تمرير تُعيد رسم اللوح وكل الأقسام الفرعية. العنصر/الخلية المحددة تُحلّان
  // بمُحدِّد find ضيّق يُعيد مرجعاً ثابتاً ما لم يتغيّر العنصر المحدد نفسه:
  //فقط تغيّرات العنصر المحدد تُعيد الرسم (تحديث مباشر للأرقام دون رسم زحلق).
  const mode = useEditorStore((state) => state.mode);
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const updateSlot = useEditorStore((state) => state.updateSlot);
  const activeElementId = selectedId || (selectedIds.length > 0 ? selectedIds[0] : null);
  const selectedElement = useEditorStore((state) =>
    state.mode === 'single' && activeElementId
      ? state.elements.find((e) => e.id === activeElementId)
      : undefined,
  );
  const selectedSlot = useEditorStore((state) =>
    state.mode === 'collage' && state.selectedId
      ? state.slots.find((s) => s.id === state.selectedId)
      : undefined,
  );

  const [generalTab, setGeneralTab] = useState<'collage' | 'canvas' | 'layers'>('collage');
  const [elementSubView, setElementSubView] = useState<'props' | 'layers'>('props');
  const elementsCount = useEditorStore((state) => state.elements.length);

  // 🎯 انتقال موحّد إلى أداة خلفية الورقة: إلغاء التحديد (لأن الإعدادات العامة
  // ومنها الورقة تظهر فقط بلا تحديد) ثم تحويل تبويب الإعدادات إلى «الورقة»
  useEffect(() => {
    const focusPaperBackground = () => {
      useEditorStore.getState().selectElement(null);
      setGeneralTab('canvas');
    };
    window.addEventListener(PAPER_BACKGROUND_EVENTS.focus, focusPaperBackground);
    return () => window.removeEventListener(PAPER_BACKGROUND_EVENTS.focus, focusPaperBackground);
  }, []);

  // استنباط عنوان اللوح ديناميكياً وفق العنصر النشط
  let panelTitle = 'الخصائص';

  if (selectedElement) {
    if (elementSubView === 'layers') {
      panelTitle = `الطبقات (${elementsCount})`;
    } else if (selectedElement.type === 'image') {
      panelTitle = 'خصائص الصورة';
    } else if (selectedElement.type === 'text') {
      panelTitle = 'خصائص النص';
    } else {
      panelTitle = 'خصائص الشكل';
    }
  } else if (selectedSlot) {
    panelTitle = 'خصائص الخلية';
  } else if (mode === 'collage') {
    if (generalTab === 'layers') panelTitle = `الطبقات (${elementsCount})`;
    else panelTitle = generalTab === 'collage' ? 'إعدادات الكولاج' : 'إعدادات الورقة';
  } else {
    panelTitle = generalTab === 'layers' ? `الطبقات (${elementsCount})` : 'إعدادات الورقة';
  }

  const handleUpdateElement = useCallback((id: string, patch: Partial<Record<string, unknown>>) => {
    const { selectedIds, updateElements, updateElement } = useEditorStore.getState();
    const isMulti = selectedIds.length > 1 && selectedIds.includes(id);
    if (!isMulti) {
      updateElement(id, patch as Partial<CanvasElement>);
      return;
    }

    // التحديد المتعدد: الخيارات الأسلوبية تُبثّ لجميع المحددين (لون، خط، مرشحات، استدارة...)،
    // أما الإحداثيات والقفل فتُطبَّق على العنصر المعروض وحده — وإلا تتداخل العناصر بعضها فوق بعض
    const styleExcluded = new Set(['x', 'y', 'locked']);
    const stylePatch: Record<string, unknown> = {};
    const positionalPatch: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      (styleExcluded.has(key) ? positionalPatch : stylePatch)[key] = patch[key];
    }
    if (Object.keys(stylePatch).length > 0) {
      // العناصر المقفلة لا تُلمس في البث الجماعي — شارة القفل يجب أن تحترم
      // في كل أدوات التعديل (إصلاح Bug#19)
      const { elements: freshElements } = useEditorStore.getState();
      const broadcastIds = selectedIds.filter(
        (sid) => !freshElements.find((e) => e.id === sid)?.locked,
      );
      if (broadcastIds.length > 0) {
        updateElements(
          broadcastIds.map((sid) => ({ id: sid, patch: stylePatch as Partial<CanvasElement> })),
        );
      }
    }
    if (Object.keys(positionalPatch).length > 0) {
      updateElement(id, positionalPatch as Partial<CanvasElement>);
    }
  }, []);

  // تعيد تعيين تبويب الطبقات عند تغيير التحديد لتبقى الخصائص مرئية بلا قفز غير متعمد
  useEffect(() => {
    if (selectedElement) setElementSubView('props');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement?.id]);

  const generalTabs =
    mode === 'collage'
      ? ([
          {
            id: 'collage' as const,
            label: 'الكولاج',
            icon: <SlidersHorizontal className="w-4 h-4" weight="regular" />,
          },
          {
            id: 'canvas' as const,
            label: 'الورقة',
            icon: <FileText className="w-4 h-4" weight="regular" />,
          },
          {
            id: 'layers' as const,
            label: 'الطبقات',
            icon: <Stack className="w-4 h-4" weight="regular" />,
          },
        ] as const)
      : ([
          {
            id: 'canvas' as const,
            label: 'الورقة',
            icon: <FileText className="w-4 h-4" weight="regular" />,
          },
          {
            id: 'layers' as const,
            label: 'الطبقات',
            icon: <Stack className="w-4 h-4" weight="regular" />,
          },
        ] as const);

  return (
    <PanelShell
      title={panelTitle}
      onCollapse={onCollapse}
      collapseTitle="إخفاء لوحة الخصائص (Ctrl+Shift+B)"
      collapseIcon={
        <CaretRight
          className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
          weight="bold"
        />
      }
      className="bg-transparent select-none"
    >
      <div className="space-y-3">
        {/* خصائص العنصر المحدد — مع تبويب فرعي للطبقات */}
        {selectedElement && (
          <>
            <FluentSegmentedControl<'props' | 'layers'>
              layoutId="properties-element-subview"
              value={elementSubView}
              onChange={setElementSubView}
              size="sm"
              options={[
                { id: 'props', label: 'الخصائص', icon: <SlidersHorizontal className="w-4 h-4" /> },
                {
                  id: 'layers',
                  label: `الطبقات (${elementsCount})`,
                  icon: <Stack className="w-4 h-4" />,
                },
              ]}
            />
            {elementSubView === 'layers' ? (
              <LayersPanel />
            ) : (
              <ElementProperties element={selectedElement} onUpdate={handleUpdateElement} />
            )}
          </>
        )}

        {/* خصائص الخلية المحددة (كولاج) */}
        {selectedSlot && !selectedElement && (
          <SlotProperties slot={selectedSlot} onUpdate={updateSlot} />
        )}

        {/* إعدادات عامة — Web+Desktop بلا mobile branching */}
        {!selectedElement && !selectedSlot && (
          <div className="space-y-3">
            <FluentSegmentedControl
              layoutId="properties-general-tabs"
              value={generalTab}
              onChange={(v) => setGeneralTab(v as typeof generalTab)}
              size="sm"
              options={
                generalTabs as unknown as { id: string; label: string; icon: React.ReactNode }[]
              }
            />
            {generalTab === 'layers' ? (
              <LayersPanel />
            ) : mode === 'collage' ? (
              generalTab === 'collage' ? (
                <CollageSettings />
              ) : (
                <GeneralSettings />
              )
            ) : (
              <GeneralSettings />
            )}
          </div>
        )}
      </div>
    </PanelShell>
  );
});
