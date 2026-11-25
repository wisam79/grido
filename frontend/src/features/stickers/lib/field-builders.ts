import type { StickerField, StickerFieldOption } from '../types';

/**
 * مُنشئات حقول القوالب — مصدر واحد لشكل `StickerField`.
 * كانت كل قائمة حقول تكرّر الكائن نفسه بستة أسطر في composer_cards وcomposer_stamps.
 * ترتيب المفاتيح هنا مطابق للكائن الحرفي القديم عمداً (يظهر في بيانات محفوظة).
 */
export function textField(id: string, label: string, defaultValue: string): StickerField {
  return { id, label, type: 'text', defaultValue };
}

export function selectField(
  id: string,
  label: string,
  presentation: NonNullable<StickerField['presentation']>,
  defaultValue: string,
  options: StickerFieldOption[],
): StickerField {
  return { id, label, type: 'select', presentation, defaultValue, options };
}
