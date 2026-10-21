import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { FluentSection, FluentSettingRow, FluentSliderField } from '@/components/ui/blocks';
import { BoundingBox, Scissors, GridFour, Check } from '@/components/ui/icons';
import { Switch } from '@/components/ui/switch';
import { mmToPx, pxToMm } from '@/lib/canvas/units';
import { useEditorStore } from '@/lib/editor-store';
import { getEffectiveDpi } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { PopoverColorPicker } from './shared-controls';

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

  // لون الإطار يُدخل باستمرار (نص/عجلة) — ندفع سطر تراجع واحد بعد توقف الكتابة (إصلاح Bug#2)
  const colorCommitTimerRef = useRef<number | null>(null);
  const commitColorLater = useCallback(() => {
    if (colorCommitTimerRef.current !== null) window.clearTimeout(colorCommitTimerRef.current);
    colorCommitTimerRef.current = window.setTimeout(() => {
      colorCommitTimerRef.current = null;
      useEditorStore.getState().pushHistory();
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (colorCommitTimerRef.current !== null) window.clearTimeout(colorCommitTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col font-cairo" dir="rtl">
      {/* 🎴 بطاقة 1: المسافات والاستدارة */}
      <FluentSection
        icon={<GridFour className="w-3.5 h-3.5" weight="duotone" />}
        title="المسافات والاستدارة"
        collapsible
        defaultOpen={true}
      >
        <div className="flex flex-col gap-2.5">
          <FluentSliderField
            label="التباعد بين الصور"
            value={toMm(collageGap)}
            min={0}
            max={toMm(30)}
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
            max={toMm(100)}
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
            max={toMm(50)}
            step={0.1}
            unit="mm"
            defaultValue={0}
            onChange={(mm) => setCollageRadius(toPx(mm))}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 2: إطار وحدود الخلايا */}
      <FluentSection
        icon={<BoundingBox className="w-3.5 h-3.5" weight="duotone" />}
        title="إطار الصور"
        collapsible
        defaultOpen={true}
      >
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

          {/* لوحة لون الإطار — تظهر فقط عند تفعيل السُمك */}
          {collageStrokeWidth > 0 && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground/90">اللون</span>

                <div className="flex items-center gap-1.5">
                  {[
                    { hex: '#e10e0e', label: 'أحمر' },
                    { hex: '#000000', label: 'أسود' },
                    { hex: '#9ca3af', label: 'رمادي' },
                    { hex: '#2563eb', label: 'أزرق' },
                    { hex: '#ffffff', label: 'أبيض' },
                  ].map(({ hex, label }) => {
                    const isSelected = collageStrokeColor.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`لون الإطار ${label}`}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setCollageStrokeColor(hex);
                          commitColorLater();
                        }}
                        title={label}
                        className={cn(
                          'w-7 h-7 rounded-full border border-black/20 dark:border-white/25 transition-colors cursor-pointer shadow-2xs flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                          isSelected &&
                            'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xs',
                        )}
                        style={{ backgroundColor: hex }}
                      >
                        {isSelected && (
                          <Check
                            className={cn(
                              'w-3 h-3',
                              hex === '#ffffff' ? 'text-slate-900' : 'text-white',
                            )}
                            weight="bold"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <PopoverColorPicker
                color={collageStrokeColor}
                onChange={(hex) => {
                  setCollageStrokeColor(hex);
                  commitColorLater();
                }}
                className="w-full h-8"
                ariaLabel="لون إطار الكولاج"
              />
            </div>
          )}
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 3: خطوط القص — العنوان يكفي، ومفتاح التشغيل في رأس القسم
          بدل صف يعيد العنوان نفسه ثلاث مرات (خطوط القص ← خطوط القص ←
          خطوط القص بين الصور). */}
      <FluentSection
        icon={<Scissors className="w-3.5 h-3.5" weight="duotone" />}
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
