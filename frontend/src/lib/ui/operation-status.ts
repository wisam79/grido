import { create } from 'zustand';
import { createLogger } from '@/lib/logger';

const logger = createLogger('operation-status');

export type OperationType =
  'bg_removal' | 'ai_enhance' | 'face_frame' | 'export' | 'save' | 'general';

export interface ActiveOperation {
  id: string;
  type: OperationType;
  title: string; // e.g. "جاري عزل الخلفية ..."
  targetId?: string; // element id or slot id
  canCancel: boolean;
  onCancel?: () => void;
  progress?: number; // 0 - 100
}

interface OperationStatusStore {
  activeOperation: ActiveOperation | null;
  startOperation: (op: Omit<ActiveOperation, 'id'>) => string;
  updateOperation: (id: string, updates: Partial<ActiveOperation>) => void;
  finishOperation: (id: string) => void;
  cancelActiveOperation: () => void;
}

/**
 * حالة تشغيل واجهة غير محفوظة منفصلة عن بيانات مشروع Zustand،
 * تصف العمليات النشطة وتمكّن من الإلغاء الحقيقي وتمنع تجميد أو ضياع مؤشرات المعالجة.
 */
export const useOperationStatusStore = create<OperationStatusStore>((set, get) => ({
  activeOperation: null,

  startOperation: (op) => {
    // 🛡️ شبكة أمان أحادية الخانة: بدء B أثناء A كان يُيتّم A (إنهاؤها لا يمحو B
    // وإلغاؤها يضيع). المتصلون (خطافات AI الثلاثة) يفحصون activeOperation مسبقاً
    // ويرفضون بأدب؛ هذا الحارس يمنع أي يتْم متبقٍ: المعرّف الوهمي لا يطابق أي
    // عملية في finish/update فيُتجاهل بأمان بدل تخريب العملية الجارية.
    const current = get().activeOperation;
    if (current) {
      logger.warn(
        `operation '${current.type}' busy — '${op.type}' not registered (orphan prevented)`,
      );
      return 'op_busy_' + Date.now().toString(36);
    }
    const id = 'op_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    set({
      activeOperation: {
        ...op,
        id,
      },
    });
    return id;
  },

  updateOperation: (id, updates) => {
    const current = get().activeOperation;
    if (current && current.id === id) {
      set({ activeOperation: { ...current, ...updates } });
    }
  },

  finishOperation: (id) => {
    const current = get().activeOperation;
    if (current && current.id === id) {
      set({ activeOperation: null });
    }
  },

  cancelActiveOperation: () => {
    const current = get().activeOperation;
    if (current && current.canCancel && current.onCancel) {
      try {
        current.onCancel();
      } catch (err) {
        logger.error('Error cancelling operation:', err);
      }
      set({ activeOperation: null });
    }
  },
}));
