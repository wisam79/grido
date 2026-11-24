---
type: fix
scope: canvas
related_files:
  - native_image_drop.go:33
  - native_image_drop.go:44
  - main.go:412
  - frontend/src/lib/canvas/image-shape-fill.ts:108
  - frontend/src/lib/store/slices/element/merge.ts:172
  - frontend/src/lib/store/slices/element/merge.ts:266
  - frontend/src/lib/canvas/canvas-interaction-store.ts:31
  - frontend/src/components/editor/konva/elements/fillable-shape-geometry.tsx:32
  - frontend/src/components/editor/konva/layers/konva-overlay-layer.tsx:55
  - frontend/src/components/editor/canvas/use-image-drop.ts:173
  - frontend/src/components/editor/canvas/editor-canvas.tsx:454
---
تنقيح ملاحظات مراجعة `FF-04`: تصفية غير الصور في Go قبل بث أحداث Wails، وإزالة إعادة ترميز `originalImageSrc` غير الضرورية في `needsImageCapture`، ومواءمة أهلية المجموعات عبر `isDropFillableImageShape` وتوحيد Undo للإفلات المتعدد مع إبراز التحويم على طبقة الأدوات بهندسة `FillableShapeGeometry` المشتركة.
