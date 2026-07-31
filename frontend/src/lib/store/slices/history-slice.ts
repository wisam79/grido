import { StateCreator } from "zustand";
import { CanvasElement, CanvasSlot, HistoryEntry } from "../types";

export interface HistorySlice {
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

// القيم الافتراضية للحقول الإضافية — يجب أن تطابق DEFAULT_CORE_STATE في core-slice
export const DEFAULT_HISTORY_ENTRY_EXTRAS = {
  mode: "collage" as const,
  canvasWidth: 2480,
  canvasHeight: 3508,
  backgroundColor: "#FFFFFF",
  collageGap: 0,
  collageMargin: 0,
  collageRadius: 0,
  collageShowCutLines: false,
  collageStrokeWidth: 0,
  collageStrokeColor: "#000000",
  lastEditedImage: null as string | null,
  lastEditedImageAspect: null as number | null,
};

export const DEFAULT_HISTORY_STATE = {
  history: [{ elements: [] as CanvasElement[], slots: [] as CanvasSlot[], ...DEFAULT_HISTORY_ENTRY_EXTRAS }],
  historyIndex: 0,
};

type HistoryCross = HistorySlice & {
  elements: CanvasElement[];
  slots: CanvasSlot[];
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;
  mode?: "single" | "collage";
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  collageGap?: number;
  collageMargin?: number;
  collageRadius?: number;
  collageShowCutLines?: boolean;
  collageStrokeWidth?: number;
  collageStrokeColor?: string;
  lastEditedImage?: string | null;
  lastEditedImageAspect?: number | null;
};

// التقاط لقطة كاملة للحالة القابلة للتراجع (عناصر + خانات + إعدادات بصرية مؤثرة)
const captureSnapshot = (s: HistoryCross): HistoryEntry => ({
  // نسخ سطحي يمنع نسخ البيانات الضخمة مع ضمان فصل المراجع
  elements: s.elements.map((el) => ({ ...el })),
  slots: s.slots.map((sl) => ({ ...sl })),
  mode: s.mode,
  canvasWidth: s.canvasWidth,
  canvasHeight: s.canvasHeight,
  backgroundColor: s.backgroundColor,
  collageGap: s.collageGap,
  collageMargin: s.collageMargin,
  collageRadius: s.collageRadius,
  collageShowCutLines: s.collageShowCutLines,
  collageStrokeWidth: s.collageStrokeWidth,
  collageStrokeColor: s.collageStrokeColor,
  // تسوية undefined إلى null — يضمن تطابق JSON مع الإدخال الابتدائي في الـ dedupe
  lastEditedImage: s.lastEditedImage ?? null,
  lastEditedImageAspect: s.lastEditedImageAspect ?? null,
});

// استعادة حقول اللقطة — الحقول غير المعرفة (undefined) لا تُفرض على الحالة الحالية
const restoreEntry = (entry: HistoryEntry) => {
  const restored: Record<string, unknown> = {
    elements: entry.elements.map((el) => ({ ...el })),
    slots: entry.slots.map((sl) => ({ ...sl })),
  };
  const optionalKeys = [
    "mode", "canvasWidth", "canvasHeight", "backgroundColor",
    "collageGap", "collageMargin", "collageRadius",
    "collageShowCutLines", "collageStrokeWidth", "collageStrokeColor",
    "lastEditedImage", "lastEditedImageAspect",
  ] as const;
  for (const key of optionalKeys) {
    if (entry[key] !== undefined) {
      restored[key] = entry[key];
    }
  }
  return restored;
};

export const createHistorySlice: StateCreator<HistoryCross, [], [], HistorySlice> = (set, get) => ({
  ...DEFAULT_HISTORY_STATE,

  pushHistory: () => {
    const state = get() as HistoryCross;
    const { history, historyIndex } = state;

    const snapshot = captureSnapshot(state);
    const snapshotString = JSON.stringify(snapshot);

    // Avoid pushing identical states
    if (history.length > 0 && historyIndex >= 0) {
      const current = history[historyIndex];
      if (JSON.stringify(current) === snapshotString) {
        return; // No change
      }
    }

    const newHistory = history.slice(0, historyIndex + 1);

    newHistory.push(snapshot);

    if (newHistory.length > 30) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get() as HistoryCross;
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      ...restoreEntry(prev),
      historyIndex: historyIndex - 1,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
    } as Partial<HistoryCross>);
  },

  redo: () => {
    const { history, historyIndex } = get() as HistoryCross;
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      ...restoreEntry(next),
      historyIndex: historyIndex + 1,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
    } as Partial<HistoryCross>);
  },
});
