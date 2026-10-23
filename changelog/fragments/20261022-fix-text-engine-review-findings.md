---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/konva/elements/editor-transformer.tsx:348
  - frontend/src/lib/canvas/curved-text-utils.ts:306
  - frontend/src/lib/canvas/curved-text-utils.ts:486
  - frontend/src/lib/canvas/text-helpers.ts:70
  - frontend/src/components/editor/properties/panels/text/text-type-tab.tsx:361
  - frontend/src/lib/store/types.ts:108
  - frontend/src/lib/schema.ts:41
  - frontend/test/text-render-state.test.ts:5
  - frontend/e2e/text-measure.spec.ts:372
  - frontend/e2e/text-measure.spec.ts:497
---
إصلاح بنود مراجعة محرك النصوص: مقابض المحوّل العلوية للنص لم تعد تُزيح الصندوق رأسياً (إسقاط إزاحة الأصل على المحور المحلي x مع تثبيت الارتفاع، صحيح مع التدوير)؛ كانفاس النص المنحني المؤقت أو اتساعه من اتحاد صناديق حبر الغرافيم المدوّرة بدل صندوق العنصر فلم يبقَ قصّ للقوس، ويُرسم بمقياس نقطة الهدف (DPR/تصدير) فصار الحد حاداً بدل صورة مكبَّرة.
اتجاه الفقرة صار أول حرف قوي فعلاً (`\p{L}`) فلا تُحسب الأرقام المشرقية والترقيم العربي داخل نطاقات RTL عربيةً خطأً؛ وأُعيدت أنماط الشارة/الختم الزخرفية إلى تبويب خصائص النص عبر `applyTextPreset` (ملاءمة + سجل)، ووُسم `textVerticalAlign` بالهجر مع بقائه للقراءة القديمة فقط.
