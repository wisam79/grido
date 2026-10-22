---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/panels/collage/collage-autofill-plan.ts:84
  - frontend/src/components/editor/panels/collage/collage-autofill-plan.ts:160
  - frontend/src/components/editor/panels/collage/collage-autofill-plan.ts:197
  - frontend/src/components/editor/panels/collage/collage-autofill-tab.tsx:114
  - frontend/src/components/editor/panels/collage/collage-autofill-tab.tsx:613
  - frontend/src/components/editor/panels/collage/collage-autofill-tab.tsx:707
  - frontend/src/lib/store/slices/collage-slice.ts:174
  - frontend/src/lib/store/slices/collage-slice.ts:349
  - frontend/src/lib/store/slices/core-slice.ts:369
  - frontend/test/collage-autofill-plan.test.ts:1
  - frontend/test/collage-autofill-tab.test.tsx:1
---

إعادة بناء لوحة «تعبئة وفرز الخانات»: صار ترتيب التعبئة مستنبطاً من هندسة الخانات (x/y) بدل `cellIndex` الذي كان ينقلب بعد تبديل المحاور أو تغيير القالب، والخلط Fisher–Yates ببذرة مع زر «خلط جديد» بدل `sort(() => Math.random()-0.5)` المنحاز. أُضيفت خريطة نتيجة حيّة تُظهر رقم الصورة في كل خانة قبل التطبيق (بمحاذاة اللوحة، `dir="ltr"`) مع تمييز الخانات المتبقية وتلك التي ستبقى بلا صورة، فاختفى التوزيع الأعمى. شريط الصور صار قائمة جلسة محفوظة في المتجر (تبقى عند تبديل التبويبات) بحد 500 صورة، مرقّمة وقابلة للسحب وAlt+الأسهم والحذف، مع إزالة التكرار عند الاستيراد. الأداء: `setSlotImagesBatch` أصبحت O(n+m) بخرائط بدل بحث متكرر، والمصغّرات 128px من جانب Go، والعرض 24 مصغّرة + «عرض الكل»، وتُستبدل مصغّرات الخرائط بالأرقام فوق 48 خانة؛ إعادة التطبيق بلا تغيير لم تعد تملأ سجل التراجع.
