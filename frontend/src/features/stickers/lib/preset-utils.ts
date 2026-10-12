import { StickerParams, StickerUserPreset } from '../types';
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
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (p) =>
          p &&
          typeof p === 'object' &&
          typeof p.id === 'string' &&
          typeof p.templateId === 'string' &&
          p.params &&
          typeof p.params === 'object' &&
          p.params.fields &&
          typeof p.params.fields === 'object',
      );
    }
    return [];
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
