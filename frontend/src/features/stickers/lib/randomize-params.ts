import { CURATED_PALETTES } from '../constants';
import { pickDifferentPalette } from './color-derivation';

import type { StickerParams } from '../types';

/**
 * ذيل التوزيع العشوائي المشترك في القوالب: حقول مختارة ثم لوحة لونية مختلفة.
 * كان متطابقاً حرفياً في composer_cards وcomposer_stamps.
 *
 * الحقول تصل محسوبةً في موضع الاستدعاء، أي قبل اللوحة، فترتيب نداءات
 * Math.random (حقول ثم لوحة) يبقى كما كان والتوزيع لا يتغير.
 */
export function randomizeSurfaceParams(
  current: StickerParams,
  fields: Record<string, string>,
): StickerParams {
  const palette = pickDifferentPalette(CURATED_PALETTES, current.primaryColor);

  return {
    ...current,
    fields: { ...current.fields, ...fields },
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    backgroundColor: palette.background,
    isTransparent: false,
  };
}

/** اختيار معرّف عشوائي من قائمة خيارات (الخيارات غير فارغة دائماً في القوالب) */
export function randomOptionId<T extends { id: string }>(options: readonly T[]): string {
  return options[Math.floor(Math.random() * options.length)].id;
}
