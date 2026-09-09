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

export type HistoryCross = HistorySlice & {
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

/**
 * 🚀 مقارنة عميقة بلا تسلسل JSON — كانت pushHistory تُسلسل اللقطة كاملة
 * (JSON.stringify لميغابايتات صور) في كل عملية سحب/تعديل للمقارنة مع الإدخال
 * الحالي. الحقول العددية تُقارن مباشرة، والسلاسل الضخمة (imageSrc) تُقارن
 * بالطول أولاً (رفض O(1) سريع) ثم بالقيمة عند تطابق الطول.
 */
const isSameSnapshot = (a: HistoryEntry, b: HistoryEntry): boolean => {
  if (a === b) return true;
  if (a.elements.length !== b.elements.length) return false;
  if (a.slots.length !== b.slots.length) return false;

  const scalarKeys = [
    "mode", "canvasWidth", "canvasHeight", "backgroundColor",
    "collageGap", "collageMargin", "collageRadius",
    "collageShowCutLines", "collageShowEndCutLine",
    "collageStrokeWidth", "collageStrokeColor",
    "lastEditedImage", "lastEditedImageAspect",
  ] as const;
  for (const key of scalarKeys) {
    if ((a[key] ?? null) !== (b[key] ?? null)) return false;
  }

  const valuesEqual = (x: unknown, y: unknown): boolean => {
    if (typeof x === "string" && typeof y === "string") {
      // رفض سريع بالطول قبل مقارنة القيم — يستثني صور Base64 الضخمة فوراً
      if (x.length !== y.length) return false;
      return x === y;
    }
    return x === y;
  };

  // مقارنة عناصر حقل بحقل — مراجع السلاسل المشتركة (imageSrc نفس المرجع بين
  // لقطتين متتاليتين) تُقارن بـ === فوري دون مسح المحتوى
  for (let i = 0; i < a.elements.length; i++) {
    const ea = a.elements[i];
    const eb = b.elements[i];
    if (ea === eb) continue;
    const ka = Object.keys(ea) as (keyof typeof ea)[];
    const kb = Object.keys(eb) as (keyof typeof eb)[];
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      const va = ea[k];
      const vb = eb[k];
      if (typeof va === "object" && va !== null) {
        if (JSON.stringify(va) !== JSON.stringify(vb)) return false;
      } else if (!valuesEqual(va, vb)) {
        return false;
      }
    }
  }

  for (let i = 0; i < a.slots.length; i++) {
    const sa = a.slots[i];
    const sb = b.slots[i];
    if (sa === sb) continue;
    const ka = Object.keys(sa) as (keyof typeof sa)[];
    const kb = Object.keys(sb) as (keyof typeof sb)[];
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      const va = sa[k];
      const vb = sb[k];
      if (typeof va === "object" && va !== null) {
        if (JSON.stringify(va) !== JSON.stringify(vb)) return false;
      } else if (!valuesEqual(va, vb)) {
        return false;
      }
    }
  }

  return true;
};

// سقف مزدوج للأرشيف: عدد اللقطات + حجم تقديري للذاكرة (بايت).
// اللقطات القديمة تُسقط أولاً حتى يهبط الحجم تحت السقف — يمنع تضخم الذاكرة
// مع صور عالية الدقة كثيرة العناصر (كل لقطة تحمل مراجع عناصر ضخمة).
const HISTORY_MAX_ENTRIES = 30;
const HISTORY_MAX_BYTES = 50 * 1024 * 1024;

// تقدير الحجم دون تسلسل كامل: نحصي أطوال سلاسل الصور (imageSrc/originalImageSrc)
// لأنها تهيمن على الذاكرة أمام الحقول العددية والمراجع الصغيرة.
const estimateEntryBytes = (entry: HistoryEntry): number => {
  let total = 2048; // مصروف إداري لكل لقطة (مصفوفات + حقول عددية)
  for (const el of entry.elements) {
    if (el.type === "image") {
      if (typeof el.imageSrc === "string") total += el.imageSrc.length;
      if (typeof el.originalImageSrc === "string") total += el.originalImageSrc.length;
    }
  }
  for (const sl of entry.slots) {
    if (typeof sl.imageSrc === "string") total += sl.imageSrc.length;
  }
  return total;
};

export const createHistorySlice: StateCreator<HistoryCross, [], [], HistorySlice> = (set, get) => ({
  ...DEFAULT_HISTORY_STATE,

  pushHistory: () => {
    const state = get() as HistoryCross;
    const { history, historyIndex } = state;

    const snapshot = captureSnapshot(state);

    // Avoid pushing identical states with fast structural check
    // 🚀 مقارنة عميقة بلا JSON.stringify — التسلسل كان يستهلك ميغابايتات
    // في كل pushHistory (نهاية كل سحب/تعديل) على الخيط الرئيسي
    if (history.length > 0 && historyIndex >= 0) {
      const current = history[historyIndex];
      if (isSameSnapshot(current, snapshot)) {
        return; // No change
      }
    }

    const newHistory = history.slice(0, historyIndex + 1);

    newHistory.push(snapshot);

    // سقف العدد أولاً، ثم سقف الحجم بإسقاط الأقدم حتى يهبط الاستهلاك تحت الحد
    if (newHistory.length > HISTORY_MAX_ENTRIES) newHistory.shift();
    let totalBytes = newHistory.reduce((sum, e) => sum + estimateEntryBytes(e), 0);
    while (newHistory.length > 1 && totalBytes > HISTORY_MAX_BYTES) {
      const dropped = newHistory.shift();
      if (dropped) totalBytes -= estimateEntryBytes(dropped);
    }
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
