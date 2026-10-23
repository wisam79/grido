---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/canvas/transform-anchors.ts:1
  - frontend/src/components/editor/konva/elements/editor-transformer.tsx:272
  - frontend/src/components/editor/konva/layers/konva-overlay-layer.tsx:82
  - frontend/e2e/text-measure.spec.ts:251
---

أُعيد تحجيم حجم الخط من مقابض محوّل النص كما كان قبل نموذج `textSizing`: سحب أي زاوية من الزوايا الأربع يحجّم الكتلة تناسبياً (`keepRatio`)، ويُترجم مقياس العقدة عند نهاية التحويل إلى `fontSize` بحد أدنى 6px مع إعادة مقياس العقدة إلى 1 فلا يبقى تحجيم بصري غير مطبَّع. يُكتب العرض بالنسبة نفسها كي تبقى نقاط الالتفاف وخطوط الالتفاف كما هي، وتبقى الحالة `auto | fixed` دون تغيير، وتُقاس زخارف النص (الحد/الظل/الاستدارة) بالنسبة نفسها فتبقى متناسبة.
منتصفات الحواف (`middle-left/right` و`top/bottom-center`) تبقى للعرض فقط بلا مساس بحجم الخط، ويحوّل تغيير العرض الفعلي النص إلى `fixed`، مع تثبيت الحافة العليا (إسقاط إزاحة الأصل على المحور المحلي x) فلا يزيح السحب مقبض `top-*` النص رأسياً حتى مع التدوير. عناصر متعددة مختلطة تحصل كلها على المقياس الهندسي نفسه، والنقاط النصية وحدها تُترجم إلى حجم خط.
