import { describe, it, expect, beforeEach } from 'vitest';

import { useEditorStore } from '../src/lib/editor-store';
import {
  getDefaultStudioTab,
  getSectionsForWorkflow,
  isStudioTab,
  isCollageTab,
  migrateLegacyStudioTab,
  STUDIO_TOOLS,
  COLLAGE_TOOLS,
} from '../src/lib/workspace-tools';

import type { TextElement } from '../src/lib/editor-store';

describe('useEditorStore - Canvas Store Tests', () => {
  beforeEach(() => {
    // إعادة تعيين حالة المتجر قبل كل اختبار
    useEditorStore.getState().reset();
  });

  it('should initialize with default values', () => {
    const state = useEditorStore.getState();
    expect(state.mode).toBe('collage');
    expect(state.elements).toEqual([]);
    expect(state.slots.length).toBeGreaterThan(0);
    expect(state.canvasWidth).toBe(2480);
    expect(state.canvasHeight).toBe(3508);
    expect(state.backgroundColor).toBe('#FFFFFF');
  });

  it('should change editor mode', () => {
    const store = useEditorStore.getState();
    store.setMode('collage');
    expect(useEditorStore.getState().mode).toBe('collage');
  });

  it('should add text element and select it', () => {
    const store = useEditorStore.getState();
    store.addTextElement('نص للتجربة');

    const state = useEditorStore.getState();
    expect(state.elements.length).toBe(1);
    expect(state.elements[0].type).toBe('text');
    expect((state.elements[0] as TextElement).text).toBe('نص للتجربة');
  });

  it('should update element properties', () => {
    const store = useEditorStore.getState();
    store.addTextElement('تعديل');

    let state = useEditorStore.getState();
    const elemId = state.elements[0].id;

    store.updateElement(elemId, { color: '#FF0000', fontSize: 24 });

    state = useEditorStore.getState();
    expect((state.elements[0] as TextElement).color).toBe('#FF0000');
    expect((state.elements[0] as TextElement).fontSize).toBe(24);
  });

  it('should remove elements', () => {
    const store = useEditorStore.getState();
    store.addTextElement('للحذف');

    let state = useEditorStore.getState();
    const elemId = state.elements[0].id;

    store.removeElement(elemId);

    state = useEditorStore.getState();
    expect(state.elements.length).toBe(0);
  });

  it('should handle undo and redo properly', () => {
    const store = useEditorStore.getState();

    // إضافة عنصر نصي
    store.addTextElement('العنصر 1');

    // إضافة عنصر آخر
    store.addTextElement('العنصر 2');

    let state = useEditorStore.getState();
    expect(state.elements.length).toBe(2);

    // التراجع
    store.undo();
    state = useEditorStore.getState();
    expect(state.elements.length).toBe(1);
    expect((state.elements[0] as TextElement).text).toBe('العنصر 1');

    // الإعادة
    store.redo();
    state = useEditorStore.getState();
    expect(state.elements.length).toBe(2);
  });

  it('should automatically push history when elements are added, duplicated or removed', () => {
    const store = useEditorStore.getState();
    expect(store.history.length).toBe(1); // Initial state

    // Adding element automatically pushes history
    store.addTextElement('نص جديد');
    expect(useEditorStore.getState().history.length).toBe(2);
    expect(useEditorStore.getState().historyIndex).toBe(1);

    // Duplicating element automatically pushes history
    const elemId = useEditorStore.getState().elements[0].id;
    store.duplicateElement(elemId);
    expect(useEditorStore.getState().history.length).toBe(3);
    expect(useEditorStore.getState().historyIndex).toBe(2);

    // Removing element automatically pushes history
    store.removeElement(elemId);
    expect(useEditorStore.getState().history.length).toBe(4);
    expect(useEditorStore.getState().historyIndex).toBe(3);
  });
});

describe('Workflow slice & rail registry (sidebar de-clutter)', () => {
  beforeEach(() => {
    useEditorStore.getState().setWorkflow('studio');
  });

  it('defaults to studio workflow and persists quick mode', () => {
    expect(useEditorStore.getState().workflow).toBe('studio');
    useEditorStore.getState().setWorkflow('quick');
    expect(useEditorStore.getState().workflow).toBe('quick');
    expect(localStorage.getItem('grido_workflow_mode')).toBe('quick');
    useEditorStore.getState().setWorkflow('studio');
  });

  it('quick mode starts from layers while keeping every insertion tool', () => {
    const studioAll = getSectionsForWorkflow('single', 'studio');
    const studioQuick = getSectionsForWorkflow('single', 'quick');
    const allSections = studioAll.map((section) => section.id);
    const quickSections = studioQuick.map((section) => section.id);
    expect(allSections).toEqual(['layers', 'stickers', 'shapes', 'text']);
    expect(quickSections).toEqual(allSections);
    expect(getDefaultStudioTab('quick')).toBe('layers');
    expect(getDefaultStudioTab('studio')).toBe('stickers');
    // Collage sections unaffected by workflow
    expect(getSectionsForWorkflow('collage', 'quick')).toHaveLength(
      getSectionsForWorkflow('collage', 'studio').length,
    );
  });

  it('registry has one tab per insertion tool and no filler duplicates', () => {
    expect(STUDIO_TOOLS.filter((t) => ['stickers', 'shapes', 'text'].includes(t.id))).toHaveLength(
      3,
    );
    expect(STUDIO_TOOLS.map((t) => t.id)).not.toContain('elements');
    expect(COLLAGE_TOOLS.map((t) => t.id)).not.toContain('backdrop');
    expect(COLLAGE_TOOLS.map((t) => t.id)).toContain('custom');
  });

  it('migrates legacy stored tabs and validates current ones', () => {
    expect(migrateLegacyStudioTab('elements')).toBe('stickers');
    expect(migrateLegacyStudioTab('presets')).toBe('stickers');
    expect(migrateLegacyStudioTab('stickers')).toBeNull();
    expect(migrateLegacyStudioTab('shapes')).toBeNull();
    expect(migrateLegacyStudioTab('text')).toBeNull();
    expect(migrateLegacyStudioTab('layers')).toBeNull();
    expect(isStudioTab('stickers')).toBe(true);
    expect(isStudioTab('elements')).toBe(false);
    expect(isStudioTab('presets')).toBe(false);
    expect(isCollageTab('backdrop')).toBe(false);
    expect(isCollageTab('custom')).toBe(true);
  });
});
