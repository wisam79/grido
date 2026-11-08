import { describe, it, expect, beforeEach } from 'vitest';

import { useEditorStore } from '../editor-store';

describe('element-slice clipboard', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.getState().setMode('single');
  });

  it('should copy selected elements to clipboardElements', () => {
    useEditorStore.getState().addTextElement('نص للتجربة');
    const el = useEditorStore.getState().elements[0];
    expect(el).toBeDefined();

    useEditorStore.getState().copySelectedElements([el.id]);
    expect(useEditorStore.getState().clipboardElements.length).toBe(1);
    expect(useEditorStore.getState().clipboardElements[0].id).toBe(el.id);
  });

  it('should cut selected elements and remove them from canvas', () => {
    useEditorStore.getState().addTextElement('نص للقص');
    const el = useEditorStore.getState().elements[0];

    useEditorStore.getState().cutSelectedElements([el.id]);
    expect(useEditorStore.getState().clipboardElements.length).toBe(1);
    expect(useEditorStore.getState().elements.length).toBe(0);
  });

  it('should paste copied elements onto canvas with new IDs', () => {
    useEditorStore.getState().addTextElement('نص للصق');
    const originalEl = useEditorStore.getState().elements[0];

    useEditorStore.getState().copySelectedElements([originalEl.id]);
    useEditorStore.getState().pasteCopiedElements();

    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(2);
    const pastedEl = elements[1];
    expect(pastedEl.id).not.toBe(originalEl.id);
    expect(pastedEl.x).toBeGreaterThan(originalEl.x);
    expect(useEditorStore.getState().selectedIds).toEqual([pastedEl.id]);
  });

  it('should reset locked and visible:false when pasting and duplicating (audit-10)', () => {
    useEditorStore.getState().addTextElement('نص مقفل ومخفي');
    const originalEl = useEditorStore.getState().elements[0];
    useEditorStore.getState().updateElement(originalEl.id, { locked: true, visible: false });

    // Paste test
    useEditorStore.getState().copySelectedElements([originalEl.id]);
    useEditorStore.getState().pasteCopiedElements();
    const afterPaste = useEditorStore.getState().elements;
    expect(afterPaste.length).toBe(2);
    const pasted = afterPaste[1];
    expect(pasted.locked).toBe(false);
    expect(pasted.visible).toBe(true);

    // Duplicate test
    useEditorStore.getState().duplicateElements([originalEl.id]);
    const afterDuplicate = useEditorStore.getState().elements;
    expect(afterDuplicate.length).toBe(3);
    const duplicated = afterDuplicate[2];
    expect(duplicated.locked).toBe(false);
    expect(duplicated.visible).toBe(true);
  });
});
