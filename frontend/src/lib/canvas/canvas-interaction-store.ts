import { create } from 'zustand';

/**
 * مخزن تفاعل الكانفاس اللحظي (Canvas Interaction Transient Store).
 *
 * 🧭 يتتبع الحالات الحركية النشطة للعناصر (السحب والتحريك، التحجيم والتدوير، والتعديل).
 * يُستخدم بواسطة الشريط السريع العائم (CanvasQuickBar) لتحقيق «قاعدة السكون»:
 * يختفي الشريط تماماً أثناء حركة العناصر أو تحجيمها لمنع حجب الرؤية، ويعود للظهور
 * بسلاسة عند استقرار العناصر في موضعها النهائي (Rest State).
 */
export interface CanvasInteractionState {
  /** هل يتم سحب وتحريك أي عنصر حالياً؟ */
  isDragging: boolean;
  /** هل يتم تحجيم أو تدوير أي عنصر عبر مقابض المحول (Transformer) حالياً؟ */
  isTransforming: boolean;
  setIsDragging: (isDragging: boolean) => void;
  setIsTransforming: (isTransforming: boolean) => void;
}

export const useCanvasInteraction = create<CanvasInteractionState>((set) => ({
  isDragging: false,
  isTransforming: false,
  setIsDragging: (isDragging) => set({ isDragging }),
  setIsTransforming: (isTransforming) => set({ isTransforming }),
}));

/**
 * إعادة ضبط آمنة لحالة التفاعل عند أي حدث طارئ (مثل blur أو pointercancel)
 * لضمان عدم تعليق إخفاء الشريط تحت أي ظرف.
 */
export function resetCanvasInteraction(): void {
  useCanvasInteraction.setState({ isDragging: false, isTransforming: false });
}
