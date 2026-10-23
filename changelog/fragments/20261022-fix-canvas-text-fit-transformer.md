---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/canvas/text-fit.ts:130
  - frontend/src/lib/store/slices/element/text-elements.ts:193
  - frontend/src/components/editor/konva/elements/text-node.tsx:228
  - frontend/src/components/editor/konva/elements/editor-transformer.tsx:279
  - frontend/src/components/editor/konva/layers/konva-overlay-layer.tsx:158
  - frontend/src/components/editor/canvas/text-editing-overlay.tsx:270
  - frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:84
  - frontend/src/components/editor/properties/element-properties.tsx:55
  - frontend/e2e/text-measure.spec.ts:251
  - frontend/test/text-fit.test.ts:1
---
اعتُمد نموذج تحجيم نص موحّد `textSizing: auto | fixed`: العرض في `auto` يلتصق بأطول سطر (بحد أدنى 24px و95% من الورقة) ويتوسّع حول المركز مع مراعاة الدوران، والارتفاع مشتق من المحتوى دائماً؛ و`fixed` يثبّت العرض ويلتف النص داخله. أُعيدت أركان محوّل النص الثمانية: الزوايا الأربع تُحجّم الكتلة تناسبياً — يُترجم مقياس العقدة إلى `fontSize` عند نهاية التحويل ويُكتب العرض بالنسبة نفسها كي تبقى نقاط الالتفاف — ومنتصفات الحواف تغيّر العرض فقط وتحوّل النص إلى `fixed` دون مساس بالخط.
أُعيد تصميم تبويب خصائص النص في أربعة أقسام مسطّحة (الخط/التنسيق/الملاءمة/التباعد) بأدوات 32px وأزرار أيقونية موثّقة، ويستهلك محرر النص المباشر ومساري العرض والتصدير هندسة `fitTextGeometry` نفسها، مع تثبيت `dir="rtl"` على جذر تبويبات العنصر لأن Radix يفرض LTR افتراضياً فينقلب ترتيب الحقول.
