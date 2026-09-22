import { create } from "zustand";
import type { ResolvedFitMode } from "@/lib/canvas/fit";

/**
 * حالة ملاءمة الكانفاس المعروضة — جسر صغير بين الكانفاس وشريط العرض.
 *
 * منطقة العمل (EditorCanvas) هي وحدها من يعرف هندسة الحاوية وحجم الورقة،
 * فيحسب الوضع الفعلي (كامل/عرض) ونسبة الفراغ الجانبي. شريط العرض في
 * التذييل خارج شجرة الكانفاس، فينشر الكانفاس النتيجة هنا ليُظهرها الشريط
 * بلا تكرار القياس ولا اشتراك مزدوج في هندسة الـ DOM.
 */
export interface CanvasFitStatus {
  /** الوضع الفعلي بعد حلّ `auto` — null قبل أول قياس حقيقي */
  resolved: ResolvedFitMode | null;
  /** نسبة عرض منطقة العمل المهدورة جانب الورقة في ملاءمة الارتفاع */
  leftoverRatio: number;
}

export const useCanvasFitStatus = create<CanvasFitStatus>(() => ({
  resolved: null,
  leftoverRatio: 0,
}));

/** نشر نتيجة القياس — كتابة متساوية لا تُنتج إعادة تصيير جديدة */
export function publishCanvasFitStatus(status: CanvasFitStatus): void {
  const current = useCanvasFitStatus.getState();
  if (
    current.resolved === status.resolved &&
    Math.abs(current.leftoverRatio - status.leftoverRatio) < 0.001
  ) {
    return;
  }
  useCanvasFitStatus.setState(status);
}
