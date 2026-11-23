import { create } from 'zustand';

import type { SnapGuide } from './snap-utils';

/**
 * مخزن تفاعل الكانفاس اللحظي (Canvas Interaction Transient Store).
 *
 * 🧭 يتتبع الحالات الحركية النشطة للعناصر (السحب والتحريك، التحجيم والتدوير، والتعديل).
 * يُستخدم بواسطة الشريط السريع العائم (CanvasQuickBar) لتحقيق «قاعدة السكون»:
 * يختفي الشريط تماماً أثناء حركة العناصر أو تحجيمها لمنع حجب الرؤية، ويعود للظهور
 * بسلاسة عند استقرار العناصر في موضعها النهائي (Rest State).
 * كما يعزل خطوط المحاذاة الذكية (activeGuides) لمنع إعادة رندر شجرة الكانفاس الأب عند السحب.
 */
export interface CropSessionActions {
  commit: () => void;
  cancel: () => void;
}

export interface CanvasInteractionState {
  /** هل يتم سحب وتحريك أي عنصر حالياً؟ */
  isDragging: boolean;
  /** هل يتم تحجيم أو تدوير أي عنصر عبر مقابض المحول (Transformer) حالياً؟ */
  isTransforming: boolean;
  /** خطوط المحاذاة الذكية النشطة أثناء السحب (Smart Snap Alignment Guides) */
  activeGuides: SnapGuide[];
  /** معرّف عنصر الصورة النشط في وضع ضبط الكادر الموضعي */
  croppingElementId: string | null;
  /** أفعال تأكيد/إلغاء جلسة ضبط الكادر النشطة (تُستدعى من لوحة المفاتيح أو الكانفاس) */
  cropSessionActions: CropSessionActions | null;
  setIsDragging: (isDragging: boolean) => void;
  setIsTransforming: (isTransforming: boolean) => void;
  setActiveGuides: (activeGuides: SnapGuide[]) => void;
  setCroppingElementId: (id: string | null) => void;
  setCropSessionActions: (actions: CropSessionActions | null) => void;
}

export const useCanvasInteraction = create<CanvasInteractionState>((set) => ({
  isDragging: false,
  isTransforming: false,
  activeGuides: [],
  croppingElementId: null,
  cropSessionActions: null,
  setIsDragging: (isDragging) => set({ isDragging }),
  setIsTransforming: (isTransforming) => set({ isTransforming }),
  setActiveGuides: (activeGuides) => set({ activeGuides }),
  setCroppingElementId: (id) =>
    set((state) => ({
      croppingElementId: id,
      cropSessionActions: id === null ? null : state.cropSessionActions,
    })),
  setCropSessionActions: (actions) => set({ cropSessionActions: actions }),
}));

/**
 * إعادة ضبط آمنة لحالة التفاعل عند أي حدث طارئ (مثل blur أو pointercancel)
 * لضمان عدم تعليق إخفاء الشريط أو بقاء خطوط المحاذاة ظاهرة تحت أي ظرف.
 */
export function resetCanvasInteraction(): void {
  useCanvasInteraction.setState({
    isDragging: false,
    isTransforming: false,
    activeGuides: [],
    croppingElementId: null,
    cropSessionActions: null,
  });
}
