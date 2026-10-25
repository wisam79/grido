import type { TextElement } from '../store/types';

/**
 * كتالوج تأثيرات النص — المصدر الوحيد لخلايا شبكة تبويب «التأثيرات».
 * كل تأثير هنا خصائص عرض فقط (ظل/خلفية/تقويس) ولا يغيّر الخط أو المحتوى؛
 * أنماط الخط الكاملة تعيش في `text-presets.ts`.
 */

export interface TextShadowPreset {
  id: 'none' | 'soft' | 'drop' | 'neon' | '3d';
  label: string;
  color: string;
  blur: number;
  ox: number;
  oy: number;
  opacity: number;
}

export const TEXT_SHADOW_PRESETS: readonly TextShadowPreset[] = [
  { id: 'none', label: 'بدون', color: '#000000', blur: 0, ox: 0, oy: 0, opacity: 0 },
  { id: 'soft', label: 'ناعم', color: '#000000', blur: 10, ox: 0, oy: 3, opacity: 0.35 },
  { id: 'drop', label: 'ساقط', color: '#000000', blur: 14, ox: 4, oy: 4, opacity: 0.6 },
  { id: 'neon', label: 'توهج', color: '#38bdf8', blur: 22, ox: 0, oy: 0, opacity: 0.9 },
  { id: '3d', label: 'مجسّم', color: '#000000', blur: 2, ox: 3, oy: 3, opacity: 0.85 },
];

export type TextBackgroundMode = 'none' | 'box' | 'pill';

export interface TextBackgroundPreset {
  id: TextBackgroundMode;
  label: string;
  radius: number;
}

/** نصف قطر ≥ هذا يُعامل ككبسولة (Konva يقصّه إلى نصف الارتفاع). */
export const TEXT_PILL_RADIUS = 999;

export const TEXT_BACKGROUND_PRESETS: readonly TextBackgroundPreset[] = [
  { id: 'none', label: 'بدون', radius: 0 },
  { id: 'box', label: 'مستطيل', radius: 6 },
  { id: 'pill', label: 'كبسولة', radius: TEXT_PILL_RADIUS },
];

export const TEXT_BACKGROUND_DEFAULT_COLOR = '#f1f5f9';

export interface TextCurvePreset {
  id: 'straight' | 'arc' | 'dip' | 'circle';
  label: string;
  value: number;
}

export const TEXT_CURVE_PRESETS: readonly TextCurvePreset[] = [
  { id: 'straight', label: 'مستقيم', value: 0 },
  { id: 'arc', label: 'قوس', value: 60 },
  { id: 'dip', label: 'مقلوب', value: -60 },
  { id: 'circle', label: 'دائري', value: 100 },
];

type ShadowSource = Pick<
  TextElement,
  'shadowBlur' | 'shadowOffsetX' | 'shadowOffsetY' | 'shadowOpacity'
>;
type BackgroundSource = Pick<TextElement, 'textBgColor' | 'textBgRadius'>;

export function hasTextShadow(el: ShadowSource): boolean {
  return (el.shadowBlur ?? 0) > 0 || (el.shadowOpacity ?? 0) > 0;
}

/** النمط الجاهز المطابق لقيم الظل الحالية، أو `null` إن عُدّلت يدوياً. */
export function matchTextShadowPreset(el: ShadowSource): TextShadowPreset['id'] | null {
  if (!hasTextShadow(el)) return 'none';
  const match = TEXT_SHADOW_PRESETS.find(
    (p) =>
      p.id !== 'none' &&
      Math.round(el.shadowBlur ?? 0) === p.blur &&
      Math.round(el.shadowOffsetX ?? 0) === p.ox &&
      Math.round(el.shadowOffsetY ?? 0) === p.oy,
  );
  return match?.id ?? null;
}

export function resolveTextBackgroundMode(el: BackgroundSource): TextBackgroundMode {
  if (!el.textBgColor || el.textBgColor === 'transparent') return 'none';
  return (el.textBgRadius ?? 0) >= TEXT_PILL_RADIUS ? 'pill' : 'box';
}

export function matchTextCurvePreset(curve: number | undefined): TextCurvePreset['id'] | null {
  return TEXT_CURVE_PRESETS.find((p) => p.value === (curve ?? 0))?.id ?? null;
}

/** ظل CSS مكافئ لمعاينة الخلية — يُشتق من النمط نفسه فلا تنحرف المعاينة عن الكانفس. */
export function textShadowPreviewCss(preset: TextShadowPreset): string | undefined {
  if (preset.id === 'none') return undefined;
  const alpha = Math.round(preset.opacity * 255)
    .toString(16)
    .padStart(2, '0');
  // المعاينة بمقياس ~1/3 من حجم الكانفس الافتراضي، فيُصغَّر التمويه والإزاحة
  const scale = 0.4;
  return `${preset.ox * scale}px ${preset.oy * scale}px ${preset.blur * scale}px ${preset.color}${alpha}`;
}
