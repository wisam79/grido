import { StateCreator } from "zustand";
import { CanvasElement, CanvasSlot, HistoryEntry } from "../types";
import { DEFAULT_COLLAGE_STATE } from "./collage-slice";

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
  collageShowEndCutLine: true,
  collageStrokeWidth: 0,
  collageStrokeColor: "#000000",
  lastEditedImage: null as string | null,
  lastEditedImageAspect: null as number | null,
};

export const DEFAULT_HISTORY_STATE = {
  history: [{
    elements: [] as CanvasElement[],
    // نفس مرجع خانات الحالة الابتدائية — بذرة لا تطابق الحالة الفعلية كانت
    // تجعل أول Ctrl+Z يستعيد خانات فارغة ويمحو شبكة الكولاج (إصلاح Bug#1)
    slots: DEFAULT_COLLAGE_STATE.slots,
    ...DEFAULT_HISTORY_ENTRY_EXTRAS,
  }],
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
  collageShowEndCutLine?: boolean;
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
  collageShowEndCutLine: s.collageShowEndCutLine,
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
    "collageShowCutLines", "collageShowEndCutLine", "collageStrokeWidth", "collageStrokeColor",
    "lastEditedImage", "lastEditedImageAspect",
  ] as const;
  for (const key of optionalKeys) {
    if (entry[key] !== undefined) {
      restored[key] = entry[key];
    }
  }
  return restored;
};

// كاش تسلسل JSON لكل إدخال تاريخ — يمنع إعادة تسلسل نفس الإدخال في كل دفعة.
// الـ WeakMap يسمح بتجميع الإدخالات المهملة تلقائياً (إصلاح Bug#17)
const entryJsonCache = new WeakMap<HistoryEntry, string>();

export const createHistorySlice: StateCreator<HistoryCross, [], [], HistorySlice> = (set, get) => ({
  ...DEFAULT_HISTORY_STATE,

  pushHistory: () => {
    const state = get() as HistoryCross;
    const { history, historyIndex } = state;

    const snapshot = captureSnapshot(state);

    // Avoid pushing identical states with fast structural check
    if (history.length > 0 && historyIndex >= 0) {
      const current = history[historyIndex];
      if (
        current.elements.length === snapshot.elements.length &&
        current.slots.length === snapshot.slots.length &&
        current.mode === snapshot.mode &&
        current.canvasWidth === snapshot.canvasWidth &&
        current.canvasHeight === snapshot.canvasHeight &&
        current.backgroundColor === snapshot.backgroundColor &&
        current.collageGap === snapshot.collageGap &&
        current.collageMargin === snapshot.collageMargin &&
        current.collageRadius === snapshot.collageRadius &&
        current.collageShowCutLines === snapshot.collageShowCutLines &&
        current.collageShowEndCutLine === snapshot.collageShowEndCutLine &&
        current.collageStrokeWidth === snapshot.collageStrokeWidth &&
        current.collageStrokeColor === snapshot.collageStrokeColor &&
        current.lastEditedImage === snapshot.lastEditedImage &&
        current.lastEditedImageAspect === snapshot.lastEditedImageAspect
      ) {
        // نسلسل اللقطة الجديدة مرة واحدة فقط، والإدخال الحالي يُؤخذ من الكاش
        const snapshotJson = JSON.stringify(snapshot);
        let currentJson = entryJsonCache.get(current);
        if (currentJson === undefined) {
          currentJson = JSON.stringify(current);
          entryJsonCache.set(current, currentJson);
        }
        if (currentJson === snapshotJson) {
          return; // No change
        }
        // اللقطة ستصبح الإدخال الحالي في الدفعة القادمة — نخزن تسلسلها مسبقاً
        entryJsonCache.set(snapshot, snapshotJson);
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
