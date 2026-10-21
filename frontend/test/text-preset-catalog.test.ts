import { describe, expect, it } from 'vitest';

import {
  QUICK_TEXT_PRESETS,
  TEXT_FILTER_OPTIONS,
} from '../src/components/editor/panels/freeform/freeform-panel-constants';
import {
  TEXT_PRESET_CATALOG,
  TEXT_PRESET_CATEGORY_LABELS,
  TEXT_PRESETS,
  type TextPresetType,
} from '../src/lib/templates';

describe('text preset catalog', () => {
  it('covers every preset id exactly once', () => {
    const ids = TEXT_PRESET_CATALOG.map((item) => item.id);
    expect(ids).toHaveLength(17);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(Object.keys(TEXT_PRESETS) as TextPresetType[]));
  });

  it('provides complete display metadata for every preset', () => {
    for (const item of TEXT_PRESET_CATALOG) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.description.trim().length).toBeGreaterThan(0);
      expect(item.sampleText.trim().length).toBeGreaterThan(0);
      expect(item.previewColor).toMatch(/^#|^rgb/);
      expect(TEXT_PRESET_CATEGORY_LABELS[item.category]).toBeTruthy();
      expect(item.config.lineHeight).toBeGreaterThan(0);
    }
  });

  it('derives the quick cards and filters from the same catalog', () => {
    expect(QUICK_TEXT_PRESETS).toHaveLength(TEXT_PRESET_CATALOG.length);
    expect(QUICK_TEXT_PRESETS[0]).toMatchObject({
      id: TEXT_PRESET_CATALOG[0].id,
      label: TEXT_PRESET_CATALOG[0].label,
      description: TEXT_PRESET_CATALOG[0].description,
      sampleText: TEXT_PRESET_CATALOG[0].sampleText,
    });
    expect(TEXT_FILTER_OPTIONS.map((option) => option.id)).toEqual([
      'all',
      ...Object.keys(TEXT_PRESET_CATEGORY_LABELS),
    ]);
  });

  it('keeps menu groups populated for the add-text dropdown', () => {
    for (const group of ['standard', 'documentation', 'effects'] as const) {
      expect(TEXT_PRESET_CATALOG.some((item) => item.menuGroup === group)).toBe(true);
    }
  });
});
