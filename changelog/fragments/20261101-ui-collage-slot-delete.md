---
type: feat
scope: ui
related_files:
  - frontend/src/lib/store/slices/collage-slice.ts:1301
  - frontend/src/components/editor/canvas/quick-bar/quick-bar-slot-section.tsx:118
---
ميزة حذف الخلية المضافة في الكولاج: أداة `removeCollageSlot` في الستور تعكس `addAdjacentCollageSlot` (ترقيم `cellIndex`، خبز القالب المتبقي كقالب يدوي وحذف `physicalLayout`، نقل التحديد لأول خانة باقية عند حذف الأساسي أو إعادة بناء القائمة المتعددة بلاها، خطوة تراجع واحدة) مع رفض حذف الخلية الأخيرة، وزر «حذف الخلية» بأيقونة سلة في الشريط السريع العائم أعلى الخلية المحددة — متاح حتى للخانة الفارغة ومعطّل بتريح واضح للخلية الأخيرة.
