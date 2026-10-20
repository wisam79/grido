---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/templates/text-presets.ts:1
  - frontend/src/lib/canvas/text-helpers.ts:1
  - frontend/src/lib/canvas/text-layout.ts:1
  - frontend/src/lib/canvas/fill-paint.ts:1
  - frontend/src/lib/canvas/curved-text-utils.ts:1
  - frontend/src/components/editor/konva/elements/text-node.tsx:1
  - frontend/src/components/editor/properties/panels/text/text-color-tab.tsx:1
  - frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:1
  - frontend/src/lib/export/export-canvas-fitted.ts:1
  - frontend/src/lib/schema.ts:1
---
ترقية نظام النصوص: كتالوج `TEXT_PRESETS` موحّد يغذي شريط الإضافة والبطاقات السريعة والأنماط، وتعبئة النص بالصور والتدرجات في المعاينة والتصدير، ونمط التفاف `word/char/none` مشترك، وحالة تصيير واحدة للأرقام العربية وتباعد الحروف وتحويل حالة الأحرف.
النص المقوّس يرسم تعبئة كل حرف عبر `fill-paint` مع إعادة إسقاط التدرج ونقش الصورة إلى فضاء العنصر، فلا تدور الصورة مع الحروف ويبقى اللون متسقاً على القوس. ورياضيات التعبئة مشتركة مع الأشكال والتصدير اليدوي بدل نسخها.
التحقق: `tsc --noEmit` و`eslint` بلا أخطاء، واختبارات النص والتعبئة خضراء.
