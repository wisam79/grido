import { StateCreator } from 'zustand';
import { EditorState } from '../index';

/* ═══════════════════════════════════════════════════════════════
   شريحة مسار العمل — إنتاج سريع مقابل استوديو تصميم.
   - `quick`: يخفي تبويب العناصر (ملصقات/أشكال/نصوص) من الشريط لتبسيط
     استوديوهات التصوير، ويفترض العمل على الكولاج أولاً.
   - `studio`: كل الأدوات ظاهرة (الافتراضي).
   يُحفظ في localStorage بنفس مفتاح `grido_workflow_mode` الذي تضبطه
   بيئة E2E على 'studio' — فالاختبارات ترى القائمة الكاملة دائماً.
   ملاحظة أمان مقصودة: تبديل المسار لا يغيّر وضع الكانفاس تلقائياً —
   الدخول للكولاج يمسح عناصر الحر (P1-19) فالتحويل التلقائي كان سيمسح
   عمل المستخدم. batch مؤجل بقرار D-5.
   ═══════════════════════════════════════════════════════════════ */

export type WorkflowMode = 'quick' | 'studio';

const STORAGE_KEY = 'grido_workflow_mode';

function readStoredWorkflow(): WorkflowMode {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw === 'quick' ? 'quick' : 'studio';
  } catch {
    return 'studio';
  }
}

export interface WorkflowSlice {
  workflow: WorkflowMode;
  setWorkflow: (mode: WorkflowMode) => void;
}

export const createWorkflowSlice: StateCreator<EditorState, [], [], WorkflowSlice> = (set) => ({
  workflow: readStoredWorkflow(),

  setWorkflow: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // تجاهل أخطاء الحصة أو التعطيل — الحالة تبقى في الذاكرة
    }
    set({ workflow: mode });
  },
});
