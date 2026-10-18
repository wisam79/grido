import { StickerParams, StickerUserPreset } from '../types';
import { StickerUserPresetSchema, stripDangerousKeys } from './sticker-design/schema';
import { createLogger } from '@/lib/logger';

const logger = createLogger('sticker-presets');

export const STICKER_PRESETS_STORAGE_KEY = 'grido_sticker_presets';

/**
 * Loads all saved user presets from localStorage.
 */
export function loadStickerPresets(): StickerUserPreset[] {
  try {
    const raw = localStorage.getItem(STICKER_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // تحقق مخطط كامل بدل فحص سطحي: يرفض الحقول الزائدة/التالفة ويمنع
    // تمرير كائنات غير موثوقة إلى buildStickerSvg لاحقاً.
    const seen = new Set<string>();
    const valid: StickerUserPreset[] = [];
    for (const item of parsed) {
      // تقميع المفاتيح الخطرة قبل المخطط: تعيين السجلات داخل zod المباشر
      // يستدعي setter النموذج الأولي إن مر مثل `__proto__` بقيمة كائن.
      const result = StickerUserPresetSchema.safeParse(stripDangerousKeys(item));
      if (!result.success || seen.has(result.data.id)) continue;
      seen.add(result.data.id);
      valid.push(result.data);
      if (valid.length >= 50) break;
    }
    return valid;
  } catch (e) {
    logger.error('Failed to load sticker presets:', e);
    return [];
  }
}

/**
 * Saves a new preset to localStorage, capping at 50 presets to prevent storage bloat.
 */
function newPresetId(): string {
  // معرّف فريد مضمون ضد التصادم في العمليات الدفعية (قاعدة المشروع: crypto.randomUUID حصراً)
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `preset_${crypto.randomUUID()}`;
    }
  } catch {
    // سقوط آمن لبيئات قديمة بلا WebCrypto
  }
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

export function saveStickerPreset(
  name: string,
  templateId: string,
  params: StickerParams,
): StickerUserPreset {
  const current = loadStickerPresets();
  const newPreset: StickerUserPreset = {
    id: newPresetId(),
    name: name.trim() || 'قالب مخصص',
    templateId,
    params: {
      ...params,
      version: 2,
      fields: { ...params.fields },
    },
    createdAt: Date.now(),
  };

  // #16 — تقييد الحذف بـ templateId أيضاً لمنع محو preset قالب آخر بنفس الاسم الافتراضي
  const updated = [
    newPreset,
    ...current.filter((p) => !(p.templateId === newPreset.templateId && p.name === newPreset.name)),
  ].slice(0, 50);
  try {
    localStorage.setItem(STICKER_PRESETS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    logger.error('Failed to persist sticker preset:', e);
  }
  return newPreset;
}

/**
 * Deletes a preset by ID from localStorage.
 */
export function deleteStickerPreset(presetId: string): StickerUserPreset[] {
  const current = loadStickerPresets();
  const filtered = current.filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(STICKER_PRESETS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    logger.error('Failed to update sticker presets after deletion:', e);
  }
  return filtered;
}

/**
 * Filters presets for a specific template.
 */
export function getPresetsForTemplate(
  presets: StickerUserPreset[],
  templateId: string,
): StickerUserPreset[] {
  return presets.filter((p) => p.templateId === templateId);
}
