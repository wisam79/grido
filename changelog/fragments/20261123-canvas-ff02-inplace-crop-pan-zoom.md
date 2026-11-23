---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/export/export-primitives.ts:108
  - frontend/src/lib/store/types.ts:114
  - frontend/src/lib/schema.ts:131
  - frontend/src/components/editor/konva/elements/image-node.tsx:207
  - frontend/src/components/editor/canvas/image-crop-overlay.tsx:574
  - frontend/src/lib/export/export-canvas-fitted.ts:153
  - frontend/src/lib/export/freeform-preflight.ts:107
  - frontend/src/lib/print/single-print-composition.ts:143
---
تطبيق `FF-02`: إضافة ضبط الكادر غير الهدّام داخل الإطار (`cropZoom` و`cropPanX` و`cropPanY`) مع حساب نافذة قص موحّد بين Konva والتصدير فائق الدقة والـ Preflight وحرس المسار السريع، وتجربة تحريك/تكبير موضعية على الكانفاس بحفظ بخطوة `Ctrl+Z` واحدة عبر `Enter` أو تراجع نظيف عبر `Esc`.