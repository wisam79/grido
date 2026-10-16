---
type: fix
scope: ui
related_files:
  - admin-web/src/components/landing/Header.tsx:186
  - admin-web/src/components/landing/RoiCalculator.tsx:33
  - admin-web/src/components/landing/AppMockup.tsx:383
  - admin-web/design.md:389
---

إصلاحات مراجعة التغييرات غير المرفوعة في صفحة الهبوط (الجلسة 0.88): خلفية قائمة الجوال صارت `createPortal(document.body)` بدل أن يسجنها `backdrop-blur-2xl` في الهيدر الملتصق (كانت تغطي شريط الهيدر فقط بعد التمرير فيتعطل الإغلاق بالنقر)، و`priceFill` تُشتق من السعر المقيَّد بمدى العملة الحالية فتأمن قفزة التعبئة لحظة تبديل العملة قبل مزامنة السعر، و`#666` المتبقي في تسمية محاكاة مستوى التشغيل ← `#8A8A8A`، مع تصحيح سجل دستور التصميم (الأقسام الأحد عشر لا تسعة).

**بوابات الجودة:** `oxlint` نظيف · `tsc -b && vite build` ناجح · `vitest` 14/14 · `docs-gate --strict-refs` ناجحة (2026-10-16).
