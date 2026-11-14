import { useState } from 'react';

import { FluentSegmentedControl } from '@/components/ui/blocks';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { ElementHeaderBadge } from './element/element-header-badge';
import { ShadowGlowSection } from './element/shared/shadow-glow-section';
import { ElementArrangeTab } from './element/tabs/arrange-tab';
import {
  ImageStyleProperties,
  ImageAdjustProperties,
  ImageEffectsProperties,
} from './panels/image-properties';
import { ShapeStyleProperties, ShapeColorProperties } from './panels/shape-properties';
import {
  TextStyleProperties,
  TextColorProperties,
  TextEffectsProperties,
} from './panels/text-properties';

import type { CanvasElement } from '@/lib/editor-store';

export interface ElementPropertiesProps {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

function ElementPropertiesSession({ element, onUpdate: applyUpdate }: ElementPropertiesProps) {
  const [activeTab, setActiveTab] = useState<string>('style');
  const onUpdate: ElementPropertiesProps['onUpdate'] = (id, patch) => {
    const current = useEditorStore.getState().elements.find((item) => item.id === id) ?? element;
    if (current.locked && Object.keys(patch).some((key) => key !== 'locked' && key !== 'visible'))
      return;
    applyUpdate(id, patch);
  };

  const handleUnlock = () => {
    onUpdate(element.id, { locked: false });
    useEditorStore.getState().pushHistory();
  };

  const isImage = element.type === 'image';
  const fillTabLabel = isImage ? 'ضبط' : 'تعبئة';
  const fillTabTooltip = isImage
    ? 'ضبط السطوع والتباين والتشبع'
    : 'الألوان والتعبئة والتدرجات والصور';

  return (
    <div className="space-y-3 font-cairo select-none">
      {/* تنبيه القفل — الشارات السياقية الدائمة (إظهار/قفل) في رأس اللوحة */}
      <ElementHeaderBadge element={element} onUnlock={handleUnlock} />

      {/* لوحة التبويبات القياسية الأربعة الموحدة لجميع العناصر (Zero Dead Tabs) */}
      <fieldset
        disabled={Boolean(element.locked)}
        inert={Boolean(element.locked)}
        aria-disabled={Boolean(element.locked)}
        aria-label="خصائص العنصر القابلة للتعديل"
        className={cn('min-w-0 border-0 p-0 m-0', element.locked && 'opacity-50 select-none')}
      >
        {/* Radix يفرض dir="ltr" افتراضياً على جذر Tabs فينقلب ترتيب حقول اللوحة العربية */}
        <Tabs dir="rtl" value={activeTab} onValueChange={setActiveTab} className="w-full gap-3">
          {/* مبدّل سياقي مؤطّر على سطح اللوحة مباشرةً، بلا تثبيت أو بطاقة إضافية. */}
          <FluentSegmentedControl<string>
            layoutId="element-properties-tabs"
            variant="panel"
            value={activeTab}
            onChange={setActiveTab}
            size="md"
            idPrefix="element-properties-tabs"
            options={[
              {
                id: 'style',
                label: 'تنسيق',
                ariaLabel: 'التنسيق والقياسات',
                tooltip: 'التنسيق والقياسات',
              },
              {
                id: 'adjust',
                label: fillTabLabel,
                ariaLabel: isImage ? 'الألوان والضبط' : 'الألوان والتعبئة',
                tooltip: fillTabTooltip,
              },
              {
                id: 'effects',
                label: 'تأثير',
                ariaLabel: 'التأثيرات',
                tooltip: isImage ? 'التأثيرات وفلاتر الصورة' : 'التأثيرات والظلال',
              },
              {
                id: 'arrange',
                label: 'ترتيب',
                ariaLabel: 'الترتيب',
                tooltip: 'الترتيب — الموضع والمحاذاة والتدوير',
              },
            ]}
          />

          {/* 1. تبويب التنسيق (Style) */}
          <TabsContent
            value="style"
            id="element-properties-tabs-content-style"
            aria-labelledby="element-properties-tabs-trigger-style"
            className="mt-0 space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-100"
          >
            {element.type === 'image' && (
              <ImageStyleProperties element={element} onUpdate={onUpdate} />
            )}
            {element.type === 'text' && (
              <TextStyleProperties
                element={element}
                onUpdate={onUpdate}
                onNavigateTab={setActiveTab}
              />
            )}
            {element.type === 'shape' && (
              <ShapeStyleProperties
                element={element}
                onUpdate={onUpdate}
                onNavigateTab={setActiveTab}
              />
            )}
          </TabsContent>

          {/* 2. تبويب الألوان (Colors) */}
          <TabsContent
            value="adjust"
            id="element-properties-tabs-content-adjust"
            aria-labelledby="element-properties-tabs-trigger-adjust"
            className="mt-0 space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-100"
          >
            {element.type === 'image' && (
              <ImageAdjustProperties element={element} onUpdate={onUpdate} showReset={true} />
            )}
            {element.type === 'text' && (
              <TextColorProperties
                element={element}
                onUpdate={onUpdate}
                onNavigateTab={setActiveTab}
              />
            )}
            {element.type === 'shape' && (
              <ShapeColorProperties
                element={element}
                onUpdate={onUpdate}
                onNavigateTab={setActiveTab}
              />
            )}
          </TabsContent>

          {/* 3. تبويب التأثيرات (Effects) */}
          <TabsContent
            value="effects"
            id="element-properties-tabs-content-effects"
            aria-labelledby="element-properties-tabs-trigger-effects"
            className="mt-0 space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-100"
          >
            {element.type === 'text' && (
              <TextEffectsProperties
                element={element}
                onUpdate={onUpdate}
                onNavigateTab={setActiveTab}
              />
            )}
            {element.type === 'image' && (
              <ImageEffectsProperties element={element} onUpdate={onUpdate} />
            )}
            {element.type === 'shape' && (
              <ShadowGlowSection element={element} onUpdate={onUpdate} />
            )}
          </TabsContent>

          {/* 4. تبويب الترتيب (Arrange) */}
          <TabsContent
            value="arrange"
            id="element-properties-tabs-content-arrange"
            aria-labelledby="element-properties-tabs-trigger-arrange"
            className="mt-0 space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-100"
          >
            <ElementArrangeTab element={element} onUpdate={onUpdate} />
          </TabsContent>
        </Tabs>
      </fieldset>
    </div>
  );
}

export function ElementProperties(props: ElementPropertiesProps) {
  return (
    <ElementPropertiesSession
      key={`${props.element.id}:${props.element.type}:${Boolean(props.element.locked)}`}
      {...props}
    />
  );
}
