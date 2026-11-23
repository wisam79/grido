---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/canvas/image-crop-commit.ts:56
  - frontend/src/components/editor/canvas/editor-canvas.tsx:264
  - frontend/src/components/editor/properties/panels/image-properties.tsx:736
  - frontend/src/components/editor/canvas/context-menu.tsx:273
  - frontend/src/components/editor/canvas/context-menu/element-menu-section.tsx:168
---
تطبيق `FF-01`: توجيه النقر المزدوج في الوضع الحر لإعادة تحرير الملصق أو قص الصورة، وتوحيد حفظ القص في `commitImageElementCrop` مع حفظ `originalImageSrc` للرجوع إليه واستعادة الأصل.
