import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { FluentSection, FluentSettingRow, FluentSliderField } from '@/components/ui/blocks';
import { Switch } from '@/components/ui/switch';
import { mmToPx, pxToMm } from '@/lib/canvas/units';
import { useEditorStore } from '@/lib/editor-store';
import { getEffectiveDpi } from '@/lib/templates';
import { ColorField, ColorPanel } from './color-panel';

export function CollageSettings() {
  const {
    collageGap,
    collageMargin,
    collageRadius,
    collageShowCutLines,
    collageShowEndCutLine,
    collageStrokeWidth,
    collageStrokeColor,
    canvasWidth,
    canvasHeight,
    printSettings,
    setCollageGap,
    setCollageMargin,
    setCollageRadius,
    setCollageShowCutLines,
    setCollageShowEndCutLine,
    setCollageStrokeWidth,
    setCollageStrokeColor,
  } = useEditorStore(
    useShallow((state) => ({
      collageGap: state.collageGap,
      collageMargin: state.collageMargin,
      collageRadius: state.collageRadius,
      collageShowCutLines: state.collageShowCutLines,
      collageShowEndCutLine: state.collageShowEndCutLine,
      collageStrokeWidth: state.collageStrokeWidth,
      collageStrokeColor: state.collageStrokeColor,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      printSettings: state.printSettings,
      setCollageGap: state.setCollageGap,
      setCollageMargin: state.setCollageMargin,
      setCollageRadius: state.setCollageRadius,
      setCollageShowCutLines: state.setCollageShowCutLines,
      setCollageShowEndCutLine: state.setCollageShowEndCutLine,
      setCollageStrokeWidth: state.setCollageStrokeWidth,
      setCollageStrokeColor: state.setCollageStrokeColor,
    })),
  );

  // 🖨️ المسافات تُخزَّن بكسلات الكانفس لكنها تُعرض بالمليمتر — نفس DPI الفعلي
  // المستخدم في الطباعة، فلا يرى المستخدم وحدتين متضاربتين في مستند ورقي.
  const dpi = useMemo(
    () => getEffectiveDpi(canvasWidth, canvasHeight, printSettings?.dpi || 300),
    [canvasWidth, canvasHeight, printSettings?.dpi],
  );
  const toMm = useCallback((px: number) => Math.round(pxToMm(px, dpi) * 10) / 10, [dpi]);
  const toPx = useCallback((mm: number) => Math.round(mmToPx(mm, dpi)), [dpi]);

  return (
    <div className="flex flex-col font-cairo" dir="rtl">
      <FluentSection title="المسافات والاستدارة" collapsible defaultOpen>
        <div className="space-y-2.5">
          <FluentSliderField
            label="التباعد"
            value={toMm(collageGap)}
            min={0}
            max={30}
            step={0.1}
            unit="mm"
            defaultValue={0}
            onChange={(mm) => setCollageGap(toPx(mm))}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
          <FluentSliderField
            label="الهوامش"
            value={toMm(collageMargin)}
            min={0}
            max={100}
            step={0.1}
            unit="mm"
            defaultValue={0}
            onChange={(mm) => setCollageMargin(toPx(mm))}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
          <FluentSliderField
            label="الزوايا"
            value={toMm(collageRadius)}
            min={0}
            max={50}
            step={0.1}
            unit="mm"
            defaultValue={0}
            onChange={(mm) => setCollageRadius(toPx(mm))}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        </div>
      </FluentSection>

      <FluentSection title="إطار الصور" collapsible defaultOpen>
        <div className="space-y-2.5">
          <FluentSliderField
            label="السُّمك"
            value={collageStrokeWidth}
            min={0}
            max={15}
            step={1}
            unit="px"
            defaultValue={0}
            onChange={setCollageStrokeWidth}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />

          {collageStrokeWidth > 0 && (
            <ColorPanel wheelPosition="bottom" className="pt-1">
              <ColorField
                color={collageStrokeColor}
                onChange={(hex) => {
                  setCollageStrokeColor(hex);
                }}
                onCommit={() => useEditorStore.getState().pushHistory()}
                className="w-full h-8"
                ariaLabel="لون إطار الكولاج"
              />
            </ColorPanel>
          )}
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 3: خطوط القص — بدون collapsible حتى يتحاذى مفتاحا التبديل
          على محور عمودي واحد تماماً دون إزاحة بسبب سهم الطي. */}
      <FluentSection
        title="خطوط القص"
        action={
          <Switch
            checked={collageShowCutLines}
            onCheckedChange={setCollageShowCutLines}
            aria-label="إظهار خطوط القص"
          />
        }
      >
        {/* صفّ مسطّح مباشرةً: كانت الحاوية المستديرة والوصف («نهاية الطباعة
            على الورقة») يكرّران التسمية نفسها بلا معلومة جديدة. */}
        {collageShowCutLines && (
          <FluentSettingRow
            label="خط نهاية الطباعة"
            control={
              <Switch
                checked={collageShowEndCutLine}
                onCheckedChange={setCollageShowEndCutLine}
                aria-label="إظهار خط نهاية الطباعة"
              />
            }
          />
        )}
      </FluentSection>
    </div>
  );
}
