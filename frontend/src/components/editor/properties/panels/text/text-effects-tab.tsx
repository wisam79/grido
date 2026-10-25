import { useId, type CSSProperties } from 'react';

import { FluentSection, FluentSliderField } from '@/components/ui/blocks';
import { useEditorStore } from '@/lib/editor-store';
import {
  TEXT_BACKGROUND_DEFAULT_COLOR,
  TEXT_BACKGROUND_PRESETS,
  TEXT_CURVE_PRESETS,
  TEXT_PILL_RADIUS,
  TEXT_SHADOW_PRESETS,
  hasTextShadow,
  matchTextCurvePreset,
  matchTextShadowPreset,
  resolveTextBackgroundMode,
  textShadowPreviewCss,
  type TextBackgroundMode,
  type TextCurvePreset,
  type TextShadowPreset,
} from '@/lib/templates';
import { cn } from '@/lib/utils';

import { ControlRow, EffectTile } from './text-controls';
import { ColorField, ColorPanel } from '../../color-panel';

import type { TextTabProps } from './text-tab-types';
import type { TextElement } from '@/lib/editor-store';

const pushHistory = () => useEditorStore.getState().pushHistory();

/** مسارات SVG لمعاينة التقويس داخل خلية 64×32 — الشكل نفسه لا رقم الزاوية. */
const CURVE_PREVIEW_PATHS: Record<TextCurvePreset['id'], string> = {
  straight: 'M6,19 L58,19',
  arc: 'M6,25 Q32,3 58,25',
  dip: 'M6,10 Q32,32 58,10',
  circle: 'M12,27 A20,15 0 1,1 52,27',
};

function TileSample({ element, style }: { element: TextElement; style?: CSSProperties }) {
  return (
    <span
      dir="ltr"
      className="text-lg font-bold leading-none text-foreground"
      style={{ fontFamily: element.fontFamily, ...style }}
    >
      Aa
    </span>
  );
}

export function TextEffectsTab({ element, onUpdate }: TextTabProps) {
  const shadowActive = hasTextShadow(element);
  const shadowPreset = matchTextShadowPreset(element);
  const bgMode = resolveTextBackgroundMode(element);
  const curve = element.curve ?? 0;
  const curvePreset = matchTextCurvePreset(curve);
  // معرّفات مسارات SVG فريدة لكل نسخة من اللوحة (قد تُعرض اللوحة مرتين: سطح مكتب/جوال)
  const pathIdPrefix = useId().replace(/:/g, '');

  const update = (patch: Partial<TextElement>) => onUpdate(element.id, patch);
  const commit = (patch: Partial<TextElement>) => {
    update(patch);
    pushHistory();
  };

  const applyShadow = (p: TextShadowPreset) =>
    commit({
      shadowColor: p.color,
      shadowBlur: p.blur,
      shadowOffsetX: p.ox,
      shadowOffsetY: p.oy,
      shadowOpacity: p.opacity,
    });

  const applyBackground = (mode: TextBackgroundMode) => {
    if (mode === 'none') {
      commit({ textBgColor: 'transparent', textBgBorderWidth: 0 });
      return;
    }
    const keepsColor = bgMode !== 'none' ? element.textBgColor : undefined;
    const currentRadius = element.textBgRadius ?? 0;
    commit({
      textBgColor: keepsColor || TEXT_BACKGROUND_DEFAULT_COLOR,
      textBgRadius:
        mode === 'pill'
          ? TEXT_PILL_RADIUS
          : currentRadius > 0 && currentRadius < TEXT_PILL_RADIUS
            ? currentRadius
            : 6,
      textBgPaddingX: element.textBgPaddingX ?? 12,
      textBgPaddingY: element.textBgPaddingY ?? 6,
    });
  };

  return (
    <ColorPanel wheelPosition="top">
      <div className="space-y-2.5 animate-in fade-in duration-150 font-cairo">
        <FluentSection title="الظل والتوهج">
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="أنماط الظل">
            {TEXT_SHADOW_PRESETS.map((p) => (
              <EffectTile
                key={p.id}
                label={p.label}
                testId={`text-shadow-${p.id}`}
                active={shadowPreset === p.id}
                onClick={() => applyShadow(p)}
              >
                <TileSample element={element} style={{ textShadow: textShadowPreviewCss(p) }} />
              </EffectTile>
            ))}
          </div>

          {shadowActive && (
            <div className="space-y-1.5 animate-in fade-in duration-100">
              <ControlRow label="اللون">
                <ColorField
                  color={element.shadowColor || '#000000'}
                  onChange={(val) => update({ shadowColor: val })}
                  onCommit={pushHistory}
                  swatchOnly
                  ariaLabel="لون الظل"
                />
              </ControlRow>
              <FluentSliderField
                layout="inline"
                label="التمويه"
                value={element.shadowBlur ?? 10}
                min={0}
                max={40}
                step={1}
                unit="px"
                onChange={(val) => update({ shadowBlur: val })}
                onCommit={pushHistory}
              />
              <FluentSliderField
                layout="inline"
                label="الكثافة"
                value={Math.round((element.shadowOpacity ?? 0.5) * 100)}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(val) => update({ shadowOpacity: val / 100 })}
                onCommit={pushHistory}
              />
            </div>
          )}
        </FluentSection>

        <FluentSection title="الخلفية والشارة">
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="خلفية النص">
            {TEXT_BACKGROUND_PRESETS.map((p) => (
              <EffectTile
                key={p.id}
                label={p.label}
                testId={`text-bg-${p.id}`}
                active={bgMode === p.id}
                onClick={() => applyBackground(p.id)}
              >
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5',
                    p.id === 'box' && 'rounded-sm bg-muted ring-1 ring-border/70',
                    p.id === 'pill' && 'rounded-full bg-muted ring-1 ring-border/70',
                  )}
                >
                  <TileSample element={element} style={{ fontSize: 15 }} />
                </span>
              </EffectTile>
            ))}
          </div>

          {bgMode !== 'none' && (
            <div className="space-y-1.5 animate-in fade-in duration-100">
              <ControlRow label="اللون">
                <ColorField
                  color={element.textBgColor || TEXT_BACKGROUND_DEFAULT_COLOR}
                  onChange={(val) => update({ textBgColor: val })}
                  onCommit={pushHistory}
                  swatchOnly
                  ariaLabel="لون خلفية النص"
                />
              </ControlRow>
              <FluentSliderField
                layout="inline"
                label="حشوة أفقية"
                value={element.textBgPaddingX ?? element.textBgPadding ?? 12}
                min={0}
                max={48}
                step={1}
                unit="px"
                onChange={(val) => update({ textBgPaddingX: val })}
                onCommit={pushHistory}
              />
              <FluentSliderField
                layout="inline"
                label="حشوة رأسية"
                value={element.textBgPaddingY ?? element.textBgPadding ?? 6}
                min={0}
                max={36}
                step={1}
                unit="px"
                onChange={(val) => update({ textBgPaddingY: val })}
                onCommit={pushHistory}
              />
              {bgMode === 'box' && (
                <FluentSliderField
                  layout="inline"
                  label="الاستدارة"
                  value={element.textBgRadius ?? 6}
                  min={0}
                  max={64}
                  step={1}
                  unit="px"
                  onChange={(val) => update({ textBgRadius: val })}
                  onCommit={pushHistory}
                />
              )}
            </div>
          )}
        </FluentSection>

        <FluentSection title="تقويس النص">
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="تقويس النص">
            {TEXT_CURVE_PRESETS.map((p) => (
              <EffectTile
                key={p.id}
                label={p.label}
                testId={`text-curve-${p.id}`}
                active={curvePreset === p.id}
                onClick={() => commit({ curve: p.value })}
              >
                <svg viewBox="0 0 64 32" className="h-9 w-full text-foreground" direction="ltr">
                  <path
                    id={`${pathIdPrefix}-curve-${p.id}`}
                    d={CURVE_PREVIEW_PATHS[p.id]}
                    fill="none"
                  />
                  <text
                    fontSize="10"
                    fontWeight="700"
                    fill="currentColor"
                    style={{ fontFamily: element.fontFamily }}
                  >
                    <textPath
                      href={`#${pathIdPrefix}-curve-${p.id}`}
                      startOffset="50%"
                      textAnchor="middle"
                    >
                      Aa Aa Aa
                    </textPath>
                  </text>
                </svg>
              </EffectTile>
            ))}
          </div>

          {curve !== 0 && (
            <FluentSliderField
              layout="inline"
              label="الزاوية"
              value={curve}
              min={-100}
              max={100}
              step={5}
              unit="°"
              onChange={(val) => update({ curve: val })}
              onCommit={pushHistory}
              className="animate-in fade-in duration-100"
            />
          )}
        </FluentSection>
      </div>
    </ColorPanel>
  );
}
