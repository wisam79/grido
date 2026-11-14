import React, { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { FluentSegmentedControl } from '@/components/ui/blocks';
import { CaretRight, PushPin } from '@/components/ui/icons';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { getSelectionElements } from '@/lib/selection-properties';
import { cn } from '@/lib/utils';

import { PanelShell } from './panel-shell';
import { CollageSettings } from '../properties/collage-settings';
import { ElementHeaderActions } from '../properties/element/element-header-badge';
import { ElementProperties } from '../properties/element-properties';
import { GeneralSettings } from '../properties/general-settings';
import { MultiSelectionProperties } from '../properties/multi-selection-properties';
import { SlotProperties } from '../properties/slot-properties';

import type { CanvasElement } from '@/lib/store/types';

export interface PropertiesPanelProps {
  /** يُمرر من App لإظهار زر الطي الداخلي — يُحذف في عرض Sheet الجوال */
  onCollapse?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const PropertiesPanel = React.memo(function PropertiesPanel({
  onCollapse,
  isPinned,
  onTogglePin,
}: PropertiesPanelProps) {
  // Shallow references for selected members only: unrelated element writes do
  // not redraw this panel. A multi-selection never borrows a primary's fields.
  const mode = useEditorStore((state) => state.mode);
  const canvasWidth = useEditorStore((state) => state.canvasWidth);
  const canvasHeight = useEditorStore((state) => state.canvasHeight);
  const updateSlot = useEditorStore((state) => state.updateSlot);
  const selectedElements = useEditorStore(
    useShallow((state) =>
      state.mode === 'single'
        ? getSelectionElements(state.elements, state.selectedIds, state.selectedId)
        : [],
    ),
  );
  const isMultiSelection = mode === 'single' && selectedElements.length > 1;
  const selectedElement = !isMultiSelection ? selectedElements[0] : undefined;
  const selectedSlot = useEditorStore((state) =>
    state.mode === 'collage' && state.selectedId
      ? state.slots.find((s) => s.id === state.selectedId)
      : undefined,
  );

  const [generalTab, setGeneralTab] = useState<'collage' | 'canvas'>('collage');

  useEffect(() => {
    const showCollageSettings = () => setGeneralTab('collage');
    window.addEventListener('grido:open-properties-panel', showCollageSettings);
    return () => window.removeEventListener('grido:open-properties-panel', showCollageSettings);
  }, []);

  let panelTitle = 'الخصائص';
  let panelSubtitle: string | undefined;
  const elementTypeLabel =
    selectedElement?.type === 'image'
      ? 'الصورة'
      : selectedElement?.type === 'text'
        ? 'النص'
        : selectedElement?.type === 'shape'
          ? 'الشكل'
          : 'العنصر';

  if (isMultiSelection) {
    panelTitle = 'خصائص التحديد';
    panelSubtitle = `${selectedElements.length} محدد · ${selectedElements.filter((element) => !element.locked).length} قابل للتعديل`;
  } else if (selectedElement) {
    panelTitle = `خصائص ${elementTypeLabel}`;
    if (selectedElement.type === 'text') {
      const fontSize = Math.round(selectedElement.fontSize ?? 32);
      const sizing = selectedElement.textSizing === 'auto' ? 'ملاءمة تلقائية' : 'عرض ثابت';
      panelSubtitle = `${fontSize}px · ${sizing}`;
    } else {
      panelSubtitle = `${Math.max(1, Math.round(selectedElement.width * canvasWidth))} × ${Math.max(
        1,
        Math.round(selectedElement.height * canvasHeight),
      )} px`;
    }
  } else if (selectedSlot) {
    panelTitle = 'خصائص الخلية';
    panelSubtitle = `الخلية ${selectedSlot.cellIndex + 1}`;
  } else if (mode === 'single') {
    panelTitle = 'إعدادات الورقة';
  }

  const handleUpdateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    const state = useEditorStore.getState();
    const selection = getSelectionElements(state.elements, state.selectedIds, state.selectedId);
    if (state.mode !== 'single' || selection.length !== 1 || selection[0].id !== id) return;
    // Store CRUD intentionally permits locked writes; this UI boundary permits
    // only the contextual lock/visibility actions on a locked single element.
    if (
      selection[0].locked &&
      Object.keys(patch).some((key) => key !== 'locked' && key !== 'visible')
    )
      return;
    state.updateElement(id, patch);
  }, []);

  return (
    <PanelShell
      title={panelTitle}
      subtitle={panelSubtitle}
      headerExtra={
        selectedElement || onTogglePin ? (
          <div className="inline-flex h-7 items-center gap-0.5 rounded-md border border-border/70 bg-muted p-0.5">
            {selectedElement && (
              <ElementHeaderActions element={selectedElement} onUpdate={handleUpdateElement} />
            )}
            {selectedElement && onTogglePin && (
              <div className="mx-0.5 h-3.5 w-px shrink-0 bg-border/60" aria-hidden="true" />
            )}
            {onTogglePin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onTogglePin}
                    aria-label={
                      isPinned
                        ? 'اللوحة مثبتة دائماً (انقر للإخفاء التلقائي عند عدم التحديد)'
                        : 'اللوحة تفاعلية مع التحديد (انقر للتثبيت الدائم)'
                    }
                    aria-pressed={isPinned}
                    className={cn(
                      'coarse-touch-target flex size-6 items-center justify-center rounded-sm border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                      isPinned
                        ? 'border-border/80 bg-card text-foreground shadow-2xs hover:bg-accent dark:border-white/10'
                        : 'border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )}
                  >
                    <PushPin
                      className="w-3.5 h-3.5"
                      weight={isPinned ? 'duotone' : 'regular'}
                      aria-hidden="true"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-cairo text-xs font-semibold">
                  {isPinned
                    ? 'اللوحة مثبتة دائماً — انقر للإخفاء التلقائي عند عدم التحديد'
                    : 'اللوحة تفاعلية — انقر لتثبيتها دائماً'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : undefined
      }
      onCollapse={onCollapse}
      collapseTitle="إخفاء لوحة الخصائص (Ctrl+Shift+B)"
      collapseIcon={
        <CaretRight
          className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-[color,transform]"
          weight="bold"
          aria-hidden="true"
        />
      }
      className="bg-transparent select-none"
    >
      <div className="space-y-3">
        {isMultiSelection && (
          <MultiSelectionProperties
            key={JSON.stringify([
              getDocumentSession(),
              selectedElements.map((element) => [
                element.id,
                element.type,
                element.locked,
                element.fillType,
                element.groupId,
              ]),
            ])}
            elements={selectedElements}
          />
        )}
        {selectedElement && (
          <ElementProperties
            key={`${selectedElement.id}:${selectedElement.type}`}
            element={selectedElement}
            onUpdate={handleUpdateElement}
          />
        )}
        {selectedSlot && !selectedElement && (
          <SlotProperties slot={selectedSlot} onUpdate={updateSlot} />
        )}
        {!isMultiSelection && !selectedElement && !selectedSlot && (
          <>
            {mode === 'collage' ? (
              <Tabs
                dir="rtl"
                value={generalTab}
                onValueChange={(value) => setGeneralTab(value as 'collage' | 'canvas')}
                className="w-full gap-3"
              >
                <FluentSegmentedControl<'collage' | 'canvas'>
                  layoutId="properties-general-tabs"
                  variant="panel"
                  ariaLabel="خصائص الكولاج والورقة"
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
                    },
                    {
                      id: 'canvas',
                      label: 'الورقة',
                      ariaLabel: 'إعدادات الورقة',
                      tooltip: 'أبعاد الورقة وخلفيتها',
                    },
                  ]}
                />
                <TabsContent
                  value="collage"
                  id="properties-general-tabs-content-collage"
                  aria-labelledby="properties-general-tabs-trigger-collage"
                  className="mt-0 space-y-3 focus-visible:outline-none"
                >
                  <CollageSettings />
                </TabsContent>
                <TabsContent
                  value="canvas"
                  id="properties-general-tabs-content-canvas"
                  aria-labelledby="properties-general-tabs-trigger-canvas"
                  className="mt-0 space-y-3 focus-visible:outline-none"
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
