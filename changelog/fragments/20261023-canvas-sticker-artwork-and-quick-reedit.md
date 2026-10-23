---
type: feat
scope: canvas
related_files:
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:150
  - frontend/src/features/stickers/lib/sticker-text.ts:151
  - frontend/src/features/stickers/lib/sticker-font-embed.ts:25
  - frontend/src/features/stickers/lib/svg-rasterizer.ts:59
  - frontend/src/features/stickers/lib/sticker-a11y.ts:136
  - frontend/src/features/stickers/components/sticker-preview.tsx:175
  - frontend/src/features/stickers/components/sticker-properties.tsx:111
---
ترقية رسوم قوالب الملصقات وملاءمة نصوص الحقول والأقواس (`data-max-width`)، وتضمين كافة أوزان ومجموعات الخطوط (`unicode-range`) عند تصدير SVG/PNG، وحفظ بيانات مصدر الملصق (`stickerSource`) عند الإدراج السريع من تبويب الملصقات لإتاحة «تعديل الملصق» ونسخ SVG من قائمة النقر الأيمن.
