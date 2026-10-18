import type { StickerParams, StickerTemplate } from '../../types';
import { postProcessStickerSvg } from '../sticker-text';
import { sanitizeStickerColor, sanitizeStickerFontFamily } from '../svg-safety';

/**
 * build-svg.ts — نقطة التوليد الوحيدة لكل ملصق.
 *
 * كل مسارات العرض/التصدير/VDP تمر هنا: تعقيم الألوان والخط والحقول، ثم
 * generateSvg، ثم معالجة RTL/الملاءمة/فضّ المعرّفات. لا تُستدعى
 * `template.generateSvg` مباشرة من أي مكوّن أو مسار تصدير.
 */

export const MAX_STICKER_FIELD_LENGTH = 500;
export const MIN_STICKER_FONT_SCALE = 0.8;
export const MAX_STICKER_FONT_SCALE = 1.3;

export function buildDefaultStickerParams(template: StickerTemplate): StickerParams {
  return {
    fields: Object.fromEntries(template.fields.map((f) => [f.id, f.defaultValue])),
    primaryColor: template.defaultColors.primary,
    secondaryColor: template.defaultColors.secondary,
    backgroundColor: template.defaultColors.background,
    isTransparent: false,
    fontFamily: 'Cairo',
    fontScale: 1,
    finish: 'standard',
    dieCutBorder: true,
  };
}

function clampFontScale(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.min(MAX_STICKER_FONT_SCALE, Math.max(MIN_STICKER_FONT_SCALE, value));
}

/**
 * يعيد نسخة قابلة للحقن في SVG: ألوان صالحة، عائلة خط نظيفة، سقف لطول
 * الحقول، وتطبيع fontScale. لا يغيّر هوية التصميم أو حقوله الاختيارية.
 */
export function sanitizeStickerParams(
  template: StickerTemplate,
  params: StickerParams,
): StickerParams {
  const cleanFamily = sanitizeStickerFontFamily(params.fontFamily || 'Cairo');
  const safeFamily = cleanFamily.includes(' ') ? `'${cleanFamily}'` : cleanFamily;

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(params.fields ?? {})) {
    fields[key] = String(value ?? '').slice(0, MAX_STICKER_FIELD_LENGTH);
  }

  return {
    ...params,
    fields,
    primaryColor: sanitizeStickerColor(params.primaryColor, template.defaultColors.primary),
    secondaryColor: sanitizeStickerColor(params.secondaryColor, template.defaultColors.secondary),
    backgroundColor: sanitizeStickerColor(
      params.backgroundColor,
      template.defaultColors.background,
    ),
    fontFamily: safeFamily,
    fontScale: clampFontScale(params.fontScale),
  };
}

export interface BuildStickerSvgOptions {
  /** بادئة فريدة لمعرّفات SVG عند عرض عدة نسخ في DOM واحد */
  namespace?: string;
}

/** يبني SVG نهائياً مُعقّماً وجاهزاً للعرض أو التصدير. */
export function buildStickerSvg(
  template: StickerTemplate,
  params: StickerParams,
  options: BuildStickerSvgOptions = {},
): string {
  const safeParams = sanitizeStickerParams(template, params);
  const raw = template.generateSvg(safeParams);
  return postProcessStickerSvg(raw, { namespace: options.namespace });
}
