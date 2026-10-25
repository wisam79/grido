import { FluentSection, FluentSliderField } from '@/components/ui/blocks';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { ColorField, ColorPanel } from '../../color-panel';
import { GradientPicker } from '../../gradient-picker';
import { gradientAngleFromPoints, gradientPointsFromAngle } from '../../gradient-utils';
import { normalizeImageFillPatch } from '../../image-fill-patch';

import type { TextTabProps } from './text-tab-types';

export function TextColorTab({ element, onUpdate }: TextTabProps) {
  const currentOpacity = Math.round((element.opacity ?? 1) * 100);
  const currentColor = element.color || '#000000';
  const hasStroke = (element.strokeWidth ?? 0) > 0;
  const currentStroke = element.stroke || '#000000';

  return (
    <ColorPanel wheelPosition="top">
      <div className="space-y-2.5 animate-in fade-in duration-150 font-cairo">
        {/* 🎴 بطاقة 1: تعبئة ولون النص */}
        <FluentSection
          title="تعبئة النص"
          collapsible
          defaultOpen={true}
          action={
            element.fillType && element.fillType !== 'solid' ? (
              <span className="text-mini font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 border border-border/50 select-none">
                {element.fillType === 'linear'
                  ? 'خطي'
                  : element.fillType === 'radial'
                    ? 'دائري'
                    : element.fillType === 'image'
                      ? 'صورة'
                      : 'مصمت'}
              </span>
            ) : undefined
          }
        >
          <GradientPicker
            fillType={element.fillType || 'solid'}
            allowImageFill
            imageFill={{
              fillImageSrc: element.fillImageSrc,
              fillImageFit: element.fillImageFit,
              fillImageScale: element.fillImageScale,
              fillImageRotation: element.fillImageRotation,
              fillImageOffsetX: element.fillImageOffsetX,
              fillImageOffsetY: element.fillImageOffsetY,
            }}
            onChangeImageFill={(patch) => {
              // نفس قاعدة الأشكال: إزالة الصورة تعيد النص لتعبئة مصمتة
              onUpdate(element.id, normalizeImageFillPatch(patch));
            }}
            onCommitImageFill={() => useEditorStore.getState().pushHistory()}
            color={currentColor}
            colorStops={
              element.fillLinearGradientColorStops ||
              element.fillRadialGradientColorStops || [0, '#3b82f6', 1, '#8b5cf6']
            }
            onChangeType={(type) => {
              onUpdate(element.id, { fillType: type });
              useEditorStore.getState().pushHistory();
            }}
            onChangeSolidColor={(col) => {
              onUpdate(element.id, { color: col });
            }}
            onChangeColorStops={(stops) => {
              onUpdate(element.id, {
                fillLinearGradientColorStops: stops,
                fillRadialGradientColorStops: stops,
              });
            }}
            onCommitColor={() => useEditorStore.getState().pushHistory()}
            angle={gradientAngleFromPoints(
              element.fillLinearGradientStartPoint,
              element.fillLinearGradientEndPoint,
            )}
            onChangeAngle={(deg) => {
              const { start, end } = gradientPointsFromAngle(deg);
              onUpdate(element.id, {
                fillLinearGradientStartPoint: start,
                fillLinearGradientEndPoint: end,
              });
            }}
            onCommitAngle={() => useEditorStore.getState().pushHistory()}
          />
        </FluentSection>

        {/* 🎴 بطاقة 2: إطار وحدود النص (Stroke) */}
        <FluentSection
          title="إطار وحدود النص"
          open={hasStroke}
          action={
            <div className="flex items-center gap-2">
              {hasStroke && (
                <ColorField
                  color={currentStroke}
                  onChange={(val) => {
                    onUpdate(element.id, { stroke: val });
                  }}
                  onCommit={() => useEditorStore.getState().pushHistory()}
                  swatchOnly
                  className="w-6 h-6 rounded-md shadow-2xs border border-white/10"
                  ariaLabel="لون إطار النص"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (hasStroke) {
                    onUpdate(element.id, { strokeWidth: 0 });
                  } else {
                    onUpdate(element.id, { stroke: element.stroke || '#000000', strokeWidth: 2 });
                  }
                  useEditorStore.getState().pushHistory();
                }}
                aria-label={hasStroke ? 'مفعّل' : 'إضافة'}
                className={cn(
                  'h-7 px-2.5 rounded-full text-mini font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 border select-none',
                  hasStroke
                    ? 'bg-card text-foreground border border-border/80 dark:border-white/15 shadow-xs font-bold ring-1 ring-primary/40'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60',
                )}
              >
                {hasStroke && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                )}
                <span>{hasStroke ? 'مفعّل' : 'إضافة'}</span>
              </button>
            </div>
          }
        >
          {hasStroke && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <FluentSliderField
                label="سماكة الحد"
                value={element.strokeWidth ?? 2}
                min={0.5}
                max={20}
                step={0.5}
                unit="px"
                onChange={(v) => onUpdate(element.id, { strokeWidth: v })}
                onCommit={() => useEditorStore.getState().pushHistory()}
              />
            </div>
          )}
        </FluentSection>

        {/* 🎴 بطاقة 3: الشفافية — القيمة تظهر مرة واحدة داخل المنزلق */}
        <FluentSection title="الشفافية">
          <FluentSliderField
            label="شفافية النص"
            value={currentOpacity}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        </FluentSection>
      </div>
    </ColorPanel>
  );
}
