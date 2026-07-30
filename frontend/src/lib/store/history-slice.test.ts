import { describe, it, expect, beforeEach } from 'vitest';
import { createHistorySlice } from './slices/history-slice';
import { create } from 'zustand';

describe('history-slice', () => {
  let store: any;

  beforeEach(() => {
    // Mock the store for testing the slice
      store = create((set: any, get: any, api: any) => ({
      ...createHistorySlice(set, get, api),
      elements: [],
      slots: [],
      backgroundColor: '#FFFFFF',
      canvasWidth: 2480,
      canvasHeight: 3508,
      collageGap: 0,
      collageMargin: 0,
      collageRadius: 0,
      collageShowCutLines: false,
      collageStrokeWidth: 0,
      collageStrokeColor: '#000000',
      mode: 'select',
      selectedId: null,
      selectedIds: [],
    }));
  });

  it('should push state to history and support undo/redo', () => {
    const s = store.getState();
    s.pushHistory();

    store.setState({ elements: [{ id: '1', type: 'rect' }] });
    store.getState().pushHistory();

    store.setState({ elements: [{ id: '1', type: 'rect' }, { id: '2', type: 'circle' }] });
    store.getState().pushHistory();

    const stateAfterAdds = store.getState();
    expect(stateAfterAdds.history.length).toBe(3); // 1 initial + 2 pushed
    expect(stateAfterAdds.historyIndex).toBe(2);

    // Undo once
    store.getState().undo();
    expect(store.getState().elements.length).toBe(1);
    expect(store.getState().historyIndex).toBe(1);

    // Undo twice
    store.getState().undo();
    expect(store.getState().elements.length).toBe(0);

    // Redo once
    store.getState().redo();
    expect(store.getState().elements.length).toBe(1);
  });

  it('should limit history to 30 entries and shift old entries', () => {
    const s = store.getState();
    
    // Push 35 times
    for (let i = 0; i < 35; i++) {
      store.setState({ elements: [{ id: String(i), type: 'rect' }] });
      store.getState().pushHistory();
    }

    const finalState = store.getState();
    expect(finalState.history.length).toBe(30);
  });

  it('should not push if the structural state is unchanged', () => {
    const s = store.getState();
    store.setState({ elements: [{ id: '1', type: 'rect' }] });
    store.getState().pushHistory();

    // Change something non-structural like selectedId
    store.setState({ selectedId: '1' });
    store.getState().pushHistory();

    const finalState = store.getState();
    // Only 1 push should actually be registered in past because the second was structurally identical
    expect(finalState.history.length).toBe(2); // Initial + 1 push
  });
});
