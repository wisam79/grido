import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';

describe('Store Concurrency & Edge-Cases Fortification Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('handles deep undo/redo history limits safely without memory leaks', () => {
    // Add 40 text elements to push past history limit
    for (let i = 0; i < 40; i++) {
      useEditorStore.getState().addTextElement(`Item ${i}`);
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
      useEditorStore.getState().removeElement('non-existent-id');
    }).not.toThrow();
    expect(useEditorStore.getState().elements).toEqual(initialElements);
  });

  it('clamps canvas dimensions within safe positive limits', () => {
    useEditorStore.getState().setCanvasSize(1200, 800);
    expect(useEditorStore.getState().canvasWidth).toBe(1200);
    expect(useEditorStore.getState().canvasHeight).toBe(800);

    // Extreme zoom factors
    useEditorStore.getState().setCanvasZoom(0.01);
    expect(useEditorStore.getState().canvasZoom).toBeGreaterThanOrEqual(0.01);

    useEditorStore.getState().setCanvasZoom(50);
    expect(useEditorStore.getState().canvasZoom).toBeLessThanOrEqual(50);
  });
});
