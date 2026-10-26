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
    previewCollageGap,
    previewCollageMargin,
    commitCollageSpacing,
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
      previewCollageGap: state.previewCollageGap,
      previewCollageMargin: state.previewCollageMargin,
      commitCollageSpacing: state.commitCollageSpacing,
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
      {/* 🎴 بطاقة 1: المسافات والاستدارة */}
      <FluentSection title="المسافات والاستدارة" collapsible defaultOpen={true}>
        <div className="flex flex-col gap-2.5">
          <FluentSliderField
            label="التباعد بين الصور"
            value={toMm(collageGap)}
            min={0}
            max={30}
            step={0.1}
            unit="mm"
            defaultValue={0}
            onChange={(mm) => previewCollageGap(toPx(mm))}
            onCommit={() => {
              commitCollageSpacing();
              useEditorStore.getState().pushHistory();
            }}
          />
          <FluentSliderField
            label="الهوامش الخارجية"
            value={toMm(collageMargin)}
            min={0}
            max={100}
            step={0.1}
            unit="mm"
            defaultValue={0}
            onChange={(mm) => previewCollageMargin(toPx(mm))}
            onCommit={() => {
              commitCollageSpacing();
              useEditorStore.getState().pushHistory();
            }}
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

      {/* 🎴 بطاقة 2: إطار وحدود الخلايا */}
      <FluentSection title="إطار الصور" collapsible defaultOpen={true}>
        <div className="space-y-2.5">
          {/* التسمية مختصرة: عنوان القسم «إطار الصور» يحمل السياق، فلا
              نكرّره في كل صف (كان: إطار الصور ← سُمك الإطار ← لون الإطار). */}
          <FluentSliderField
            label="السُّمك"
            value={collageStrokeWidth}
            min={0}
            max={15}
            step={1}
            unit="px"
            onChange={setCollageStrokeWidth}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />

          {collageStrokeWidth > 0 && (
            <ColorPanel
              wheelPosition="bottom"
              className="rounded-lg border border-border/60 bg-muted/20 p-2.5 animate-in fade-in slide-in-from-top-1 duration-150"
            >
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

      {/* 🎴 بطاقة 3: خطوط القص — العنوان يكفي، ومفتاح التشغيل في رأس القسم
          بدل صف يعيد العنوان نفسه ثلاث مرات (خطوط القص ← خطوط القص ←
          خطوط القص بين الصور). */}
      <FluentSection
        title="خطوط القص"
        collapsible
        defaultOpen={true}
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
            label={
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/30 shrink-0 shadow-xs" />
                <span>خط نهاية الطباعة</span>
              </div>
            }
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
