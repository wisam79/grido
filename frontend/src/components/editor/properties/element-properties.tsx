import { useState } from 'react';
import { CanvasElement, useEditorStore } from '@/lib/editor-store';
import { PaintBrush, Palette, Sparkle, ArrowsOutCardinal } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { FluentSegmentedControl } from '@/components/ui/blocks';
import {
  ImageStyleProperties,
  ImageAdjustProperties,
  ImageEffectsProperties,
} from './panels/image-properties';
import {
  TextStyleProperties,
  TextColorProperties,
  TextEffectsProperties,
} from './panels/text-properties';
import { ShapeStyleProperties, ShapeColorProperties } from './panels/shape-properties';
import { ElementHeaderBadge } from './element/element-header-badge';
import { ElementArrangeTab } from './element/tabs/arrange-tab';
import { ShadowGlowSection } from './element/shared/shadow-glow-section';

export interface ElementPropertiesProps {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

export function ElementProperties({ element, onUpdate }: ElementPropertiesProps) {
  const [activeTab, setActiveTab] = useState<string>('style');

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
    <div className="space-y-2.5 font-cairo select-none">
      {/* تنبيه القفل — الشارات السياقية الدائمة (إظهار/قفل) في رأس اللوحة */}
      <ElementHeaderBadge element={element} onUnlock={handleUnlock} />

      {/* لوحة التبويبات القياسية الأربعة الموحدة لجميع العناصر (Zero Dead Tabs) */}
      <div
        className={cn('min-w-0', element.locked && 'pointer-events-none opacity-50 select-none')}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* شريط تبويبات لاصق: يبقى سياق التبويب ظاهراً أثناء تمرير الأقسام */}
          <div className="sticky top-0 z-20 -mx-3.5 border-b border-border/40 bg-sidebar/95 px-3.5 pb-2 pt-0.5 backdrop-blur-xl">
            <FluentSegmentedControl<string>
              layoutId="element-properties-tabs"
              value={activeTab}
              onChange={setActiveTab}
              size="md"
              idPrefix="element-properties-tabs"
              options={[
                {
                  id: 'style',
                  label: 'تنسيق',
                  ariaLabel: 'التنسيق والقياسات',
                  icon: (
                    <PaintBrush
                      className="w-3.5 h-3.5 shrink-0 transition-transform"
                      weight={activeTab === 'style' ? 'duotone' : 'regular'}
                    />
                  ),
                  tooltip: 'التنسيق والقياسات',
                  className: 'px-1 gap-1',
                },
                {
                  id: 'adjust',
                  label: fillTabLabel,
                  ariaLabel: isImage ? 'الألوان والضبط' : 'الألوان والتعبئة',
                  icon: (
                    <Palette
                      className="w-3.5 h-3.5 shrink-0 transition-transform"
                      weight={activeTab === 'adjust' ? 'duotone' : 'regular'}
                    />
                  ),
                  tooltip: fillTabTooltip,
                  className: 'px-1 gap-1',
                },
                {
                  id: 'effects',
                  label: 'تأثير',
                  ariaLabel: 'التأثيرات',
                  icon: (
                    <Sparkle
                      className="w-3.5 h-3.5 shrink-0 transition-transform"
                      weight={activeTab === 'effects' ? 'duotone' : 'regular'}
                    />
                  ),
                  tooltip: isImage ? 'التأثيرات وفلاتر الصورة' : 'التأثيرات والظلال',
                  className: 'px-1 gap-1',
                },
                {
                  id: 'arrange',
                  label: 'ترتيب',
                  ariaLabel: 'الترتيب',
                  icon: (
                    <ArrowsOutCardinal
                      className="w-3.5 h-3.5 shrink-0 transition-transform"
                      weight={activeTab === 'arrange' ? 'duotone' : 'regular'}
                    />
                  ),
                  tooltip: 'الترتيب — الموضع والمحاذاة والتدوير',
                  className: 'px-1 gap-1',
                },
              ]}
            />
          </div>

          {/* 1. تبويب التنسيق (Style) */}
          <TabsContent
            value="style"
            id="element-properties-tabs-content-style"
            aria-labelledby="element-properties-tabs-trigger-style"
            className={cn(
              'mt-2 space-y-0 animate-in fade-in duration-150',
              element.locked && 'pointer-events-none opacity-50 select-none',
            )}
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
            className={cn(
              'mt-2 space-y-0 animate-in fade-in duration-150',
              element.locked && 'pointer-events-none opacity-50 select-none',
            )}
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
            className={cn(
              'mt-2 space-y-0 animate-in fade-in duration-150',
              element.locked && 'pointer-events-none opacity-50 select-none',
            )}
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
            className={cn(
              'mt-2 space-y-0 animate-in fade-in duration-150',
              element.locked && 'pointer-events-none opacity-50 select-none',
            )}
          >
            <ElementArrangeTab element={element} onUpdate={onUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
