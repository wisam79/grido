import { StickerParams, StickerUserPreset } from "../types";

export const STICKER_PRESETS_STORAGE_KEY = "grido_sticker_presets";

/**
 * Loads all saved user presets from localStorage.
 */
export function loadStickerPresets(): StickerUserPreset[] {
  try {
    const raw = localStorage.getItem(STICKER_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => p && typeof p === "object" && p.id && p.templateId && p.params);
    }
    return [];
  } catch (e) {
    console.error("Failed to load sticker presets:", e);
    return [];
  }
}

/**
 * Saves a new preset to localStorage, capping at 50 presets to prevent storage bloat.
 */
export function saveStickerPreset(
  name: string,
  templateId: string,
  params: StickerParams
): StickerUserPreset {
  const current = loadStickerPresets();
  const newPreset: StickerUserPreset = {
    id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "قالب مخصص",
    templateId,
    params: {
      ...params,
      fields: { ...params.fields },
    },
    createdAt: Date.now(),
  };

  const updated = [newPreset, ...current.filter((p) => p.name !== newPreset.name)].slice(0, 50);
  try {
    localStorage.setItem(STICKER_PRESETS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to persist sticker preset:", e);
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
    console.error("Failed to update sticker presets after deletion:", e);
  }
  return filtered;
}

/**
 * Filters presets for a specific template.
 */
export function getPresetsForTemplate(
  presets: StickerUserPreset[],
  templateId: string
): StickerUserPreset[] {
  return presets.filter((p) => p.templateId === templateId);
}
