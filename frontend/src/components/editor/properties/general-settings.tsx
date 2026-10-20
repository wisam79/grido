import { useEffect, useRef, useState } from 'react';
import { CanvasDimensionsPanel } from './general/canvas-dimensions-panel';
import { GridColumnsPanel } from './general/grid-columns-panel';
import { StudioCanvasColorDeck } from './shared-controls';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';
import { FluentSection } from '@/components/ui/blocks';
import { PaintBrush } from '@/components/ui/icons';
import { PAPER_BACKGROUND_EVENTS } from '@/lib/ui/paper-background';
import { TooltipProvider } from '@/components/ui/tooltip';

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

  // أداة خلفية الورقة الوحيدة في التطبيق: تُفتح وتُمرَّر إليها عند طلبها من
  // بطاقة الحالة في اللوحات الجانبية (حدث موحّد بدل تكرار الأداة هناك).
  // تبقى مفتوحة افتراضياً — لكن بأداة مبسّطة (رقعة + قيمة + قطارة + عينات).
  const [paperOpen, setPaperOpen] = useState(true);
  const paperSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusPaperBackground = () => {
      setPaperOpen(true);
      requestAnimationFrame(() => {
        paperSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener(PAPER_BACKGROUND_EVENTS.focus, focusPaperBackground);
    return () => window.removeEventListener(PAPER_BACKGROUND_EVENTS.focus, focusPaperBackground);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-0 font-cairo" dir="rtl">
        <CanvasDimensionsPanel />

        <FluentSection
          ref={paperSectionRef}
          icon={<PaintBrush className="w-3.5 h-3.5 text-muted-foreground" weight="duotone" />}
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
