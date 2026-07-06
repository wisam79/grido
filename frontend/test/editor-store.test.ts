import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';

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
    expect(state.canvasWidth).toBe(1200);
    expect(state.canvasHeight).toBe(1200);
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
    expect(state.elements[0].text).toBe('نص للتجربة');
  });

  it('should update element properties', () => {
    const store = useEditorStore.getState();
    store.addTextElement('تعديل');
    
    let state = useEditorStore.getState();
    const elemId = state.elements[0].id;
    
    store.updateElement(elemId, { color: '#FF0000', fontSize: 24 });
    
    state = useEditorStore.getState();
    expect(state.elements[0].color).toBe('#FF0000');
    expect(state.elements[0].fontSize).toBe(24);
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
    store.pushHistory();
    
    // إضافة عنصر آخر
    store.addTextElement('العنصر 2');
    store.pushHistory();
    
    let state = useEditorStore.getState();
    expect(state.elements.length).toBe(2);
    
    // التراجع
    store.undo();
    state = useEditorStore.getState();
    expect(state.elements.length).toBe(1);
    expect(state.elements[0].text).toBe('العنصر 1');
    
    // الإعادة
    store.redo();
    state = useEditorStore.getState();
    expect(state.elements.length).toBe(2);
  });
});
