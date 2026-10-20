---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/io/shape-catalog.ts:1
  - frontend/src/lib/io/svg-paths.ts:1
  - frontend/src/lib/canvas/shape-pattern.ts:1
  - frontend/src/components/editor/konva/elements/shape-node.tsx:1
  - frontend/src/components/editor/shapes/shape-glyph.tsx:1
  - frontend/src/components/editor/properties/gradient-picker.tsx:1
  - frontend/src/components/editor/properties/image-fill-controls.tsx:1
  - frontend/src/components/editor/properties/panels/shape-properties.tsx:1
  - frontend/src/components/editor/toolbar/toolbar-add-shapes.tsx:1
  - frontend/src/lib/export/export-canvas-fitted.ts:1
  - frontend/src/lib/store/types.ts:1
  - frontend/src/lib/schema.ts:1
  - frontend/src/lib/io/file-dialog-utils.ts:1
---
ترقية نظام الأشكال: كتالوج موحّد (33 شكلاً في ثلاث فئات) يستهلكه شريط الإضافة وشبكة التحرير الحر ومعاينة الخصائص بدل أربع قوائم مكررة، مع أنواع Konva أصلية جديدة (Arc/Wedge/سهم مزدوج)، ورؤوس نجمة قابلة للضبط، وزوايا مستقلة للمستطيل، وأنماط حد (متقطع/منقّط).
تعبئة الأشكال بالصور عبر `fillPatternImage` بأوضاع stretch/cover/contain/tile مع تدوير وإزاحة وحجم، برياضيات `shape-pattern` المشتركة بين معاينة Konva والتصدير الاحتياطي (بما فيها تعويض مقياس أشكال المسار)، وتوحيد اختيار الصور في `pickLocalImage` لإزالة تكرار فحص `data:image/`.
