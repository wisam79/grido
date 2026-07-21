import { StateCreator } from "zustand";

export interface HistorySlice {
  history: { elements: any[]; slots: any[] }[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const DEFAULT_HISTORY_STATE = {
  history: [{ elements: [] as any[], slots: [] as any[] }],
  historyIndex: 0,
};

type HistoryCross = HistorySlice & {
  elements: any[];
  slots: any[];
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;
};

export const createHistorySlice: StateCreator<HistoryCross, [], [], HistorySlice> = (set, get) => ({
  ...DEFAULT_HISTORY_STATE,

  pushHistory: () => {
    const { elements, slots, history, historyIndex } = get() as HistoryCross;
    const newHistory = history.slice(0, historyIndex + 1);

    newHistory.push({
      elements: elements.map((el) => ({ ...el })),
      slots: slots.map((s) => ({ ...s })),
    });
    
    if (newHistory.length > 20) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get() as HistoryCross;
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      elements: prev.elements.map((el) => ({ ...el })),
      slots: prev.slots.map((s) => ({ ...s })),
      historyIndex: historyIndex - 1,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
    });
  },

  redo: () => {
    const { history, historyIndex } = get() as HistoryCross;
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      elements: next.elements.map((el) => ({ ...el })),
      slots: next.slots.map((s) => ({ ...s })),
      historyIndex: historyIndex + 1,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
    });
  },
});
