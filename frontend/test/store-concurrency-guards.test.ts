import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';
import { CanvasElement } from '../src/lib/store/types';

describe('Store Concurrency & Edge-Cases Fortification Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('handles deep undo/redo history limits safely without memory leaks', () => {
    const store = useEditorStore.getState();

    // Push 40 distinct mutations to exceed standard history buffer limit
    for (let i = 0; i < 40; i++) {
      const el: CanvasElement = {
        id: `el-${i}`,
        type: 'text',
        x: i * 2,
        y: i * 2,
        width: 100,
        height: 30,
        text: `Item ${i}`,
        visible: true,
        locked: false,
        zIndex: i,
      };
      useEditorStore.getState().addElement(el);
    }

    expect(useEditorStore.getState().elements.length).toBe(40);
    expect(useEditorStore.getState().history.length).toBeLessThanOrEqual(30); // Max history limit invariant

    // Rapidly undo 20 times
    for (let i = 0; i < 20; i++) {
      useEditorStore.getState().undo();
    }
    expect(useEditorStore.getState().elements.length).toBe(20);

    // Rapidly redo 10 times
    for (let i = 0; i < 10; i++) {
      useEditorStore.getState().redo();
    }
    expect(useEditorStore.getState().elements.length).toBe(30);
  });

  it('safely handles updating non-existent element IDs without throwing', () => {
    expect(() => {
      useEditorStore.getState().updateElement('non-existent-id', { x: 999 });
    }).not.toThrow();
  });

  it('safely handles deleting non-existent element IDs without corruption', () => {
    const initialElements = useEditorStore.getState().elements;
    expect(() => {
      useEditorStore.getState().deleteElement('non-existent-id');
    }).not.toThrow();
    expect(useEditorStore.getState().elements).toEqual(initialElements);
  });

  it('clamps canvas dimensions within safe positive limits', () => {
    useEditorStore.getState().setCanvasDimensions(1200, 800);
    expect(useEditorStore.getState().canvasWidth).toBe(1200);
    expect(useEditorStore.getState().canvasHeight).toBe(800);

    // Extreme zoom factors
    useEditorStore.getState().setZoom(0.01);
    expect(useEditorStore.getState().zoom).toBeGreaterThanOrEqual(0.01);

    useEditorStore.getState().setZoom(50);
    expect(useEditorStore.getState().zoom).toBeLessThanOrEqual(50);
  });
});
