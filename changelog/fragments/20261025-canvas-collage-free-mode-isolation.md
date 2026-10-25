---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/store/slices/collage-slice.ts:252
  - frontend/src/lib/canvas/resize-elements.ts:11
  - frontend/src/lib/store/slices/core-slice.ts:158
  - frontend/src/features/freeform-collage/components/freeform-collage-modal.tsx:676
  - frontend/src/components/editor/panels/template-panel.tsx:81
  - frontend/src/hooks/use-keyboard-shortcuts.ts:97
  - frontend/test/collage-slice.test.ts:186
---

فصل الكولاج عن الوضع الحر بالكامل: عزل أبعاد الورقة ولون وتدرج الخلفية بين الوضعين (`freeformCanvasWidth/Height/Bg` مقابل `collageCanvasWidth/Height/Bg`) مع حفظ واستعادة حالة كل وضع تلقائياً عند التبديل، ودمجها في سكيما المشروع ولحظات سجل التراجع. تعديلات الكولاج (قوالب، شبكات، أبعاد) لم تعد تمس عناصر الوضع الحر، و`setTemplate` لم يعد يمسح الكولاج، وتطبيق الكولاج الحر لم يعد يمطّ العناصر الحرة، مع إزالة حوار التأكيد الزائد وتنبيه القفل المضلل عند الحذف بالكولاج.
