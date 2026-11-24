---
type: feat
scope: canvas
related_files:
  - frontend/src/lib/canvas/image-shape-fill.ts:1
  - frontend/src/lib/store/slices/element/merge.ts:267
  - frontend/src/components/editor/canvas/use-image-drop.ts:89
  - frontend/src/lib/canvas/konva-export-utils.ts:818
  - frontend/src/components/editor/canvas/context-menu/element-menu-section.tsx:121
  - main.go:419
  - native_image_drop.go:30
---
تطبيق `FF-04`: إفلات الصورة داخل شكل صالح عبر Hit-Testing وطلبات Wails مترابطة، وإجراء «قنّع الصورة بهذا الشكل» بمعاملة ذرية وخطوة تراجع واحدة تحفظ الأصل وتنسيق الشكل.
حماية المصدر المرئي ودقة الالتقاط والنتائج المتأخرة، ومنع استبدال تحرير أحدث أو إسقاط الصور المتعارضة في الكولاج، دون محرك أقنعة مكرر أو تغيير تسامح التصدير الافتراضي.
