import { useEditorStore } from "@/lib/editor-store";

/* ═══════════════════════════════════════════════════════════════
   خلفية الورقة — أداة واحدة في التطبيق كله.

   تعديل لون/تدرج الورقة يعيش في مكان واحد فقط: قسم «خلفية الورقة»
   في لوحة الخصائص. اللوحات الأخرى (تبويب الكولاج، تبويب الخلفيات)
   تعرض بطاقة حالة مختصرة + زر ينقل المستخدم إلى الأداة عبر هذين
   الحدثين، بدل إعادة بناء الأداة نفسها في أكثر من لوحة.
   ═══════════════════════════════════════════════════════════════ */

export const PAPER_BACKGROUND_EVENTS = {
  /** يفتح لوحة الخصائص من الشريط الجانبي */
  openPanel: "grido:open-properties-panel",
  /** يُوجّه لوحة الخصائص إلى قسم الورقة ويفتحه ويمرّر إليه */
  focus: "grido:focus-paper-background",
} as const;

/**
 * نقل المستخدم إلى أداة خلفية الورقة الوحيدة.
 * إلغاء التحديد أولاً لأن لوحة الخصائص تعرض الإعدادات العامة (ومنها الورقة)
 * فقط حين لا يوجد عنصر أو خلية محددة.
 */
export function openPaperBackgroundTool(): void {
  useEditorStore.getState().selectElement(null);
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PAPER_BACKGROUND_EVENTS.openPanel));
  window.dispatchEvent(new CustomEvent(PAPER_BACKGROUND_EVENTS.focus));
}
