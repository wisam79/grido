import React from "react";

/**
 * QuickBarGroup — مجموعة أزرار مترابطة داخل الشريط السريع.
 *
 * 🧭 كانت أزرار الشريط تتراصف كلها بنفس الفجوة (gap-1.5) فبدت كتلة واحدة
 * مزدحمة بلا دلالة. المجموعة تضغط فجوتها الداخلية (gap-0.5) لربط الأزرار
 * المترابطة معاً — والفجوة الخارجية للشريط نفسه (gap-1.5) تفصل بين المجموعات
 * بصرياً بلا فواصل زائدة. ملاحظة RTL: flex يعكس الاتجاه تلقائياً مع dir=rtl
 * فلا حاجة لخصائص اتجاهية.
 */
export const QuickBarGroup = React.memo(function QuickBarGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-0.5" role="group">
      {children}
    </div>
  );
});
