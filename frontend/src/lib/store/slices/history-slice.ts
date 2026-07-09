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

    const lastState = newHistory[newHistory.length - 1];
    if (lastState) {
      if (lastState.elements.length === elements.length && lastState.slots.length === slots.length) {
        const currentStr = JSON.stringify({ elements, slots });
        const lastStr = JSON.stringify({ elements: lastState.elements, slots: lastState.slots });
        if (currentStr === lastStr) {
          return;
        }
      }
    }

    newHistory.push({
      elements: structuredClone(elements),
      slots: structuredClone(slots),
    });
    if (newHistory.length > 20) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get() as HistoryCross;
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      elements: structuredClone(prev.elements),
      slots: structuredClone(prev.slots),
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
      elements: structuredClone(next.elements),
      slots: structuredClone(next.slots),
      historyIndex: historyIndex + 1,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
    });
  },
});
