import React, { createContext, useContext, useState } from "react";

/**
 * CanvasOverlayHost — طبقة التموضع للعناصر العائمة التي يجب أن تبقى **داخل
 * منطقة الكانفاس** (شريط التحديد السريع اليوم، وأي عنصر عائم لاحقاً).
 *
 * 🧭 المشكلة التي يحلّها: كان يستحيل على أي عنصر داخل الكانفاس أن يعرف حدود
 * منطقته، فاضطرّ شريط التحديد إلى `createPortal(document.body)` مع
 * `fixed top-16` ليظل ثابتاً على الشاشة — والنتيجة أنه كان يطفو فوق شريط
 * الأدوات ويمتد على الشريط الجانبي والألواح عند ضيق النافذة، ويحتاج
 * `--z-quick-bar: 500` لهزيمة كل طبقات الواجهة.
 *
 * 🔒 الآن يُسلَّم للحاوية عنصر حقيقي داخل لوح الكانفاس ذي `overflow-hidden`:
 * فيُقصّ العنصر العائم تلقائياً ضمن منطقة الكانفاس، ويبقى `z` محصوراً داخل
 * سياق التراص الخاص بقشرة الكانفاس (`z-10`) فلا يمكنه تجاوز الشريط الجانبي
 * (`z-20`) أو أي عنصر واجهة آخر.
 */
const CanvasOverlayHostContext = createContext<HTMLElement | null>(null);

/** عنصر الحاوية داخل لوح الكانفاس — أو null إذا لم يكن هناك لوح كانفاس مركّب */
// الـ hook والسياق في ملف المكوّن نفسه (كنمط stage-context) — لا يُصدَّر هنا
// سوى المكوّن والـ hook، فإعادة التحميل السريع لا تتأثر فعلياً
// eslint-disable-next-line react-refresh/only-export-components
export function useCanvasOverlayHost(): HTMLElement | null {
  return useContext(CanvasOverlayHostContext);
}

export function CanvasOverlayHost({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  return (
    <CanvasOverlayHostContext.Provider value={host}>
      {children}
      {/* طبقة تموضع فقط: بلا خلفية أو حدود، ولا تعترض أي تفاعل مع الكانفاس */}
      <div
        ref={setHost}
        data-testid="canvas-overlay-host"
        className="absolute inset-0 pointer-events-none"
      />
    </CanvasOverlayHostContext.Provider>
  );
}
