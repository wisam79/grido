import { DEFAULT_COLLAGE_STATE } from './collage-slice';
import {
  DEFAULT_HISTORY_ENTRY_EXTRAS,
  SNAPSHOT_KEYS,
  captureHistoryEntry,
  snapshotValuesEqual,
  type SnapshotSource,
  type SnapshotValues,
} from '../history-snapshot';

import type { CanvasElement, CanvasSlot, HistoryEntry } from '../types';
import type { StateCreator } from 'zustand';

// إعادة تصدير المصدر الوحيد للقيم الافتراضية (يستهلكها core-slice لبذرة reset)
export { DEFAULT_HISTORY_ENTRY_EXTRAS };

export interface HistorySlice {
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const DEFAULT_HISTORY_STATE = {
  history: [
    {
      elements: [] as CanvasElement[],
      // نفس مرجع خانات الحالة الابتدائية — بذرة لا تطابق الحالة الفعلية كانت
      // تجعل أول Ctrl+Z يستعيد خانات فارغة ويمحو شبكة الكولاج (إصلاح Bug#1)
      slots: DEFAULT_COLLAGE_STATE.slots,
      ...DEFAULT_HISTORY_ENTRY_EXTRAS,
    },
  ],
  historyIndex: 0,
};

// حقول اللقطة (mode..printSettings) مشتقة من سجل history-snapshot — مطلوبة
// كاملة في نوع الحالة (لا optional) فلا يسقط حقل جديد من اللقطة بصمت.
export type HistoryCross = HistorySlice &
  SnapshotValues & {
    elements: CanvasElement[];
    slots: CanvasSlot[];
    selectedId: string | null;
    selectedIds: string[];
    editingTextId: string | null;
    /** علامة التعديل منذ آخر حفظ — يملكها core-slice ويحدّثها سجل التاريخ */
    isDirty: boolean;
  };

// استعادة حقول اللقطة — الحقول غير المعرفة (undefined) لا تُفرض على الحالة الحالية
type RestoredSnapshot = Partial<SnapshotValues> & {
  elements: CanvasElement[];
  slots: CanvasSlot[];
};

const restoreEntry = (entry: HistoryEntry): RestoredSnapshot => {
  const restored: Record<string, unknown> = {
    elements: entry.elements.map((el) => ({ ...el })),
    slots: entry.slots.map((sl) => ({ ...sl })),
  };
  for (const key of SNAPSHOT_KEYS) {
    if (entry[key] !== undefined) {
      restored[key] = entry[key];
    }
  }
  return restored as RestoredSnapshot;
};

/**
 * يبذر رأس سجل التراجع من حالة كاملة بعد التسوية (loadProject) — اللقطة الأولى
 * تطابق الحالة الفعلية بالضبط فتبقى قابلة للعكس كاملاً ويمر الـ dedupe أول مرة.
 */
export const seedHistorySnapshot = (source: SnapshotSource) => ({
  history: [captureHistoryEntry(source)],
  historyIndex: 0,
});

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

  // كل حقول اللقطة عبر السجل الموحّد: عددية/نصية مباشرة مع تسوية null،
  // القوالب والأدلة بالمرجع، وإعدادات الطباعة بحقولها (انظر history-snapshot.ts)
  if (!snapshotValuesEqual(a, b)) return false;

  const valuesEqual = (x: unknown, y: unknown): boolean => {
    if (typeof x === 'string' && typeof y === 'string') {
      // رفض سريع بالطول قبل مقارنة القيم — يستثني صور Base64 الضخمة فوراً
      if (x.length !== y.length) return false;
      return x === y;
    }
    return x === y;
  };

  // مقارنة ضحلة للكائنات بدل JSON.stringify: الستور immutable بالـ spread
  // فاختلاف المرجع مع تساوي الحقول الضحلة نادر — والتحفظ هنا آمن (لقطة زائدة فقط)
  const shallowEqualObjects = (x: object, y: object): boolean => {
    if (x === y) return true;
    const kx = Object.keys(x);
    if (kx.length !== Object.keys(y).length) return false;
    const rx = x as Record<string, unknown>;
    const ry = y as Record<string, unknown>;
    for (const k of kx) {
      if (rx[k] !== ry[k]) return false;
    }
    return true;
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
      if (typeof va === 'object' && va !== null) {
        if (typeof vb !== 'object' || vb === null) return false;
        if (!shallowEqualObjects(va, vb)) return false;
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
      if (typeof va === 'object' && va !== null) {
        if (typeof vb !== 'object' || vb === null) return false;
        if (!shallowEqualObjects(va, vb)) return false;
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
    if (el.type === 'image') {
      if (typeof el.imageSrc === 'string') total += el.imageSrc.length;
      if (typeof el.originalImageSrc === 'string') total += el.originalImageSrc.length;
    }
  }
  for (const sl of entry.slots) {
    if (typeof sl.imageSrc === 'string') total += sl.imageSrc.length;
    // كانت مُهمَلة فيقدّر السقف نصف الحجم الفعلي عند وجود صورة أصلية محفوظة
    if (typeof sl.originalImageSrc === 'string') total += sl.originalImageSrc.length;
  }
  return total;
};

// اللقطات immutable بعد دفعها فسعة التقدير تُحفظ بأمان دون تغيير شكل HistoryEntry
const entryBytesCache = new WeakMap<HistoryEntry, number>();
const cachedEntryBytes = (entry: HistoryEntry): number => {
  const hit = entryBytesCache.get(entry);
  if (hit !== undefined) return hit;
  const v = estimateEntryBytes(entry);
  entryBytesCache.set(entry, v);
  return v;
};

export const createHistorySlice: StateCreator<HistoryCross, [], [], HistorySlice> = (set, get) => ({
  ...DEFAULT_HISTORY_STATE,

  pushHistory: () => {
    const state = get();
    const { history, historyIndex } = state;

    const snapshot = captureHistoryEntry(state);

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

    // سقف العدد أولاً، ثم سقف الحجم بإسقاط الأقدم حتى يهبط الاستهلاك تحت الحد.
    // التقدير مُخزن مؤقتاً (WeakMap) لأن اللقطات immutable بعد الدفع — كان يُعاد
    // حسابه لـ 30 لقطة في كل pushHistory
    if (newHistory.length > HISTORY_MAX_ENTRIES) newHistory.shift();
    let totalBytes = newHistory.reduce((sum, e) => sum + cachedEntryBytes(e), 0);
    while (newHistory.length > 1 && totalBytes > HISTORY_MAX_BYTES) {
      const dropped = newHistory.shift();
      if (dropped) totalBytes -= cachedEntryBytes(dropped);
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1, isDirty: true });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      ...restoreEntry(prev),
      historyIndex: historyIndex - 1,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
      isDirty: true,
    } as Partial<HistoryCross>);
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      ...restoreEntry(next),
      historyIndex: historyIndex + 1,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
      isDirty: true,
    } as Partial<HistoryCross>);
  },
});
