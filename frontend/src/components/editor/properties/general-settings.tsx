import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { FluentSection } from '@/components/ui/blocks';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useEditorStore } from '@/lib/editor-store';

import { CanvasDimensionsPanel } from './general/canvas-dimensions-panel';
import { GridColumnsPanel } from './general/grid-columns-panel';
import { StudioCanvasColorDeck } from './shared-controls';

export function GeneralSettings() {
  const {
    backgroundColor,
    setBackgroundColor,
    backgroundGradientColor2,
    setBackgroundGradientColor2,
    backgroundGradientAngle,
    setBackgroundGradientAngle,
  } = useEditorStore(
    useShallow((state) => ({
      backgroundColor: state.backgroundColor,
      setBackgroundColor: state.setBackgroundColor,
      backgroundGradientColor2: state.backgroundGradientColor2,
      setBackgroundGradientColor2: state.setBackgroundGradientColor2,
      backgroundGradientAngle: state.backgroundGradientAngle,
      setBackgroundGradientAngle: state.setBackgroundGradientAngle,
    })),
  );

  // أداة خلفية الورقة الوحيدة في التطبيق — مفتوحة افتراضياً وبأداة مبسّطة
  // (رقعة + قيمة + قطارة + عينات).
  const [paperOpen, setPaperOpen] = useState(true);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-0 font-cairo" dir="rtl">
        <CanvasDimensionsPanel />

        <FluentSection
          title="خلفية الورقة"
          collapsible
          open={paperOpen}
          onOpenChange={setPaperOpen}
        >
          <StudioCanvasColorDeck
            color={backgroundColor}
            onChange={setBackgroundColor}
            gradientColor2={backgroundGradientColor2}
            onChangeGradientColor2={setBackgroundGradientColor2}
            gradientAngle={backgroundGradientAngle}
            onChangeGradientAngle={setBackgroundGradientAngle}
          />
        </FluentSection>

        <GridColumnsPanel />
      </div>
    </TooltipProvider>
  );
}
