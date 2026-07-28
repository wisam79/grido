import { StateCreator } from "zustand";
import { CanvasElement, CanvasSlot, HistoryEntry } from "../types";

export interface HistorySlice {
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const DEFAULT_HISTORY_STATE = {
  history: [{ elements: [] as CanvasElement[], slots: [] as CanvasSlot[] }],
  historyIndex: 0,
};

type HistoryCross = HistorySlice & {
  elements: CanvasElement[];
  slots: CanvasSlot[];
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
      elements: elements.map((el) => structuredClone(el)),
      slots: slots.map((s) => structuredClone(s)),
    });
    
    if (newHistory.length > 20) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get() as HistoryCross;
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      elements: prev.elements.map((el) => structuredClone(el)),
      slots: prev.slots.map((s) => structuredClone(s)),
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
      elements: next.elements.map((el) => structuredClone(el)),
      slots: next.slots.map((s) => structuredClone(s)),
      historyIndex: historyIndex + 1,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
    });
  },
});
