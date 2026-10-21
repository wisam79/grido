import React, { useCallback, useEffect, useState } from 'react';

import { FluentSegmentedControl } from '@/components/ui/blocks';
import { CaretRight, FileText, GridFour } from '@/components/ui/icons';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useEditorStore } from '@/lib/editor-store';
import { PAPER_BACKGROUND_EVENTS } from '@/lib/ui/paper-background';

import { PanelShell } from './panel-shell';
import { CollageSettings } from '../properties/collage-settings';
import { ElementHeaderActions } from '../properties/element/element-header-badge';
import { ElementProperties } from '../properties/element-properties';
import { GeneralSettings } from '../properties/general-settings';
import { SlotProperties } from '../properties/slot-properties';

import type { CanvasElement } from '@/lib/store/types';

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
  const canvasWidth = useEditorStore((state) => state.canvasWidth);
  const canvasHeight = useEditorStore((state) => state.canvasHeight);
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

  const [generalTab, setGeneralTab] = useState<'collage' | 'canvas'>('collage');

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

  // استنباط عنوان اللوح وسياقه ديناميكياً وفق العنصر النشط
  let panelTitle = 'الخصائص';
  let panelSubtitle: string | undefined;
  const isMultiSelection = selectedIds.length > 1;

  const elementTypeLabel =
    selectedElement?.type === 'image'
      ? 'الصورة'
      : selectedElement?.type === 'text'
        ? 'النص'
        : selectedElement?.type === 'shape'
          ? 'الشكل'
          : 'العنصر';

  if (selectedElement) {
    panelTitle = `خصائص ${elementTypeLabel}`;
    panelSubtitle = isMultiSelection
      ? `تحديد متعدد · ${selectedIds.length} عناصر`
      : `${Math.max(1, Math.round(selectedElement.width * canvasWidth))} × ${Math.max(
          1,
          Math.round(selectedElement.height * canvasHeight),
        )} px`;
  } else if (selectedSlot) {
    panelTitle = 'خصائص الخلية';
    panelSubtitle = `الخلية ${selectedSlot.cellIndex + 1}`;
  } else if (mode === 'collage') {
    // التبويبان داخل اللوح يسمّيان القسم (الكولاج / الورقة)، فرأس اللوح
    // يحمل هوية اللوح فقط بدل تكرار الاسم في سطرين متتاليين.
    panelTitle = 'الخصائص';
    panelSubtitle =
      generalTab === 'collage'
        ? undefined
        : `${Math.round(canvasWidth)} × ${Math.round(canvasHeight)} px`;
  } else {
    panelTitle = 'إعدادات الورقة';
    panelSubtitle = `${Math.round(canvasWidth)} × ${Math.round(canvasHeight)} px`;
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

  return (
    <PanelShell
      title={panelTitle}
      subtitle={panelSubtitle}
      headerExtra={
        selectedElement ? (
          <ElementHeaderActions element={selectedElement} onUpdate={handleUpdateElement} />
        ) : undefined
      }
      onCollapse={onCollapse}
      collapseTitle="إخفاء لوحة الخصائص (Ctrl+Shift+B)"
      collapseIcon={
        <CaretRight
          className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-[color,transform]"
          weight="bold"
        />
      }
      className="bg-transparent select-none"
    >
      <div className="space-y-3">
        {/* خصائص العنصر المحدد */}
        {selectedElement && (
          <ElementProperties element={selectedElement} onUpdate={handleUpdateElement} />
        )}

        {/* خصائص الخلية المحددة (كولاج) */}
        {selectedSlot && !selectedElement && (
          <SlotProperties slot={selectedSlot} onUpdate={updateSlot} />
        )}

        {/* إعدادات عامة */}
        {!selectedElement && !selectedSlot && (
          <>
            {mode === 'collage' ? (
              <Tabs
                value={generalTab}
                onValueChange={(value) => setGeneralTab(value as 'collage' | 'canvas')}
                className="w-full"
              >
                {/* شريط تبويبات لاصق — يبقي سياق الإعدادات ظاهراً أثناء التمرير */}
                <div className="sticky top-0 z-20 -mx-3 border-b border-border/40 bg-sidebar/95 px-3 pb-2.5 pt-0.5 backdrop-blur-xl">
                  <FluentSegmentedControl<'collage' | 'canvas'>
                    layoutId="properties-general-tabs"
                    value={generalTab}
                    onChange={setGeneralTab}
                    size="md"
                    idPrefix="properties-general-tabs"
                    options={[
                      {
                        id: 'collage',
                        label: 'الكولاج',
                        ariaLabel: 'إعدادات الكولاج',
                        tooltip: 'التخطيط والفواصل والهوامش',
                        icon: (
                          <GridFour
                            className="w-3.5 h-3.5 shrink-0"
                            weight={generalTab === 'collage' ? 'duotone' : 'regular'}
                          />
                        ),
                        className: 'px-1 gap-1',
                      },
                      {
                        id: 'canvas',
                        label: 'الورقة',
                        ariaLabel: 'إعدادات الورقة',
                        tooltip: 'أبعاد الورقة وخلفيتها',
                        icon: (
                          <FileText
                            className="w-3.5 h-3.5 shrink-0"
                            weight={generalTab === 'canvas' ? 'duotone' : 'regular'}
                          />
                        ),
                        className: 'px-1 gap-1',
                      },
                    ]}
                  />
                </div>

                <TabsContent
                  value="collage"
                  id="properties-general-tabs-content-collage"
                  aria-labelledby="properties-general-tabs-trigger-collage"
                  className="pt-1 outline-none"
                >
                  <CollageSettings />
                </TabsContent>

                <TabsContent
                  value="canvas"
                  id="properties-general-tabs-content-canvas"
                  aria-labelledby="properties-general-tabs-trigger-canvas"
                  className="pt-1 outline-none"
                >
                  <GeneralSettings />
                </TabsContent>
              </Tabs>
            ) : (
              <GeneralSettings />
            )}
          </>
        )}
      </div>
    </PanelShell>
  );
});
