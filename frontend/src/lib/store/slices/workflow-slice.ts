import { StateCreator } from "zustand";
import type { EditorState } from "../index";

// ─── الأنواع ───────────────────────────────────────────────────────────────

/**
 * مسار العمل الحالي:
 * - "quick"   إنتاج سريع — صور هوية وجوازات وطباعة (المستخدم الأساسي)
 * - "studio"  استوديو متقدم — كولاج حر، ملصقات، تصميم إبداعي
 * - "batch"   معالجة دفعية — قص وعزل وطباعة بالجملة
 * - null      لم يختر المستخدم بعد (تُعرض شاشة الترحيب)
 */
export type WorkflowMode = "quick" | "studio" | "batch";

export interface WorkflowSlice {
  /** مسار العمل الذي اختاره المستخدم — null يعني لم يختر بعد */
  workflowMode: WorkflowMode | null;
  /** هل ظهرت شاشة الترحيب من قبل في هذه الجلسة؟ */
  hasSeenWelcome: boolean;

  setWorkflowMode: (mode: WorkflowMode) => void;
  /** إعادة عرض شاشة الترحيب (من إعدادات المستخدم أو قائمة "تبديل المسار") */
  resetWorkflow: () => void;
}

// ─── الثوابت ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "grido_workflow_mode";

function loadPersistedMode(): WorkflowMode | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "quick" || saved === "studio" || saved === "batch") {
      return saved;
    }
  } catch {
    // ignore في بيئة الاختبارات
  }
  return null;
}

function persistMode(mode: WorkflowMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

// ─── الحالة الابتدائية ─────────────────────────────────────────────────────

const persistedMode = loadPersistedMode();

export const DEFAULT_WORKFLOW_STATE = {
  workflowMode: persistedMode,
  hasSeenWelcome: persistedMode !== null,
};

// ─── إنشاء الـ Slice ───────────────────────────────────────────────────────

export const createWorkflowSlice: StateCreator<EditorState, [], [], WorkflowSlice> = (set) => ({
  ...DEFAULT_WORKFLOW_STATE,

  setWorkflowMode: (mode) => {
    persistMode(mode);
    set({
      workflowMode: mode,
      hasSeenWelcome: true,
      // مسار الإنتاج السريع مسار إنتاج كولاج بطبيعته، فنفرض وضع الكانفاس عند
      // اختياره حتى يبدأ المستخدم بواجهة مبسّطة مطابقة لما يراه على الكانفاس
      ...(mode === "quick" ? { mode: "collage" as const } : {}),
    });
  },

  resetWorkflow: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set({ workflowMode: null, hasSeenWelcome: false });
  },
});
