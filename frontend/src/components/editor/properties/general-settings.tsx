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
    rulerUnit,
    backgroundColor,
    setBackgroundColor,
    backgroundGradientColor2,
    setBackgroundGradientColor2,
    backgroundGradientAngle,
    setBackgroundGradientAngle,
  } = useEditorStore(
    useShallow((state) => ({
      rulerUnit: state.rulerUnit,
      backgroundColor: state.backgroundColor,
      setBackgroundColor: state.setBackgroundColor,
      backgroundGradientColor2: state.backgroundGradientColor2,
      setBackgroundGradientColor2: state.setBackgroundGradientColor2,
      backgroundGradientAngle: state.backgroundGradientAngle,
      setBackgroundGradientAngle: state.setBackgroundGradientAngle,
    })),
  );

  const unitLabel = rulerUnit === 'px' ? 'px' : 'مم';
  const [dimsOpen, setDimsOpen] = useState(true);
  // أداة خلفية الورقة الوحيدة في التطبيق — مفتوحة افتراضياً وبأداة مبسّطة
  // (رقعة + قيمة + قطارة + عينات).
  const [paperOpen, setPaperOpen] = useState(true);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-0 font-cairo" dir="rtl">
        <FluentSection
          title="أبعاد الورقة"
          headerClassName="min-h-7"
          collapsible
          open={dimsOpen}
          onOpenChange={setDimsOpen}
          action={
            <span
              dir="ltr"
              className="font-mono text-mini font-normal text-muted-foreground"
              title={`وحدة القياس الحالية: ${unitLabel}`}
            >
              {unitLabel}
            </span>
          }
        >
          <CanvasDimensionsPanel />
        </FluentSection>

        <FluentSection
          title="خلفية الورقة"
          headerClassName="min-h-7"
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
