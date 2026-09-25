import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore, TextElement } from '../src/lib/editor-store';
import {
  getToolsForWorkflow,
  isStudioTab,
  isCollageTab,
  migrateLegacyStudioTab,
  STUDIO_TOOLS,
  COLLAGE_TOOLS,
} from '../src/lib/workspace-tools';

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

  it('quick mode hides the merged elements hub from studio tools only', () => {
    const studioAll = getToolsForWorkflow('single', 'studio');
    const studioQuick = getToolsForWorkflow('single', 'quick');
    expect(studioAll.map((t) => t.id)).toContain('elements');
    expect(studioQuick.map((t) => t.id)).not.toContain('elements');
    expect(studioQuick.length).toBe(studioAll.length - 1);
    // Collage tools unaffected by workflow
    expect(getToolsForWorkflow('collage', 'quick')).toHaveLength(
      getToolsForWorkflow('collage', 'studio').length,
    );
  });

  it('registry has no filler duplicates: single elements hub, no separate backdrop', () => {
    expect(STUDIO_TOOLS.filter((t) => ['stickers', 'shapes', 'text'].includes(t.id))).toHaveLength(
      0,
    );
    expect(STUDIO_TOOLS.map((t) => t.id)).toContain('elements');
    expect(COLLAGE_TOOLS.map((t) => t.id)).not.toContain('backdrop');
    expect(COLLAGE_TOOLS.map((t) => t.id)).toContain('custom');
  });

  it('migrates legacy stored tabs and validates current ones', () => {
    expect(migrateLegacyStudioTab('stickers')).toBe('elements');
    expect(migrateLegacyStudioTab('shapes')).toBe('elements');
    expect(migrateLegacyStudioTab('text')).toBe('elements');
    expect(migrateLegacyStudioTab('layers')).toBeNull();
    expect(isStudioTab('elements')).toBe(true);
    expect(isStudioTab('stickers')).toBe(false);
    expect(isCollageTab('backdrop')).toBe(false);
    expect(isCollageTab('custom')).toBe(true);
  });
});
