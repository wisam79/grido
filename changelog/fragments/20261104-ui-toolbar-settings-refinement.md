---
type: refactor
scope: ui
related_files:
  - frontend/src/App.tsx:360
  - frontend/src/components/editor/toolbar/toolbar.tsx:65
  - frontend/src/components/editor/toolbar/mode-switcher.tsx:15
  - frontend/src/components/editor/toolbar/toolbar-file-ops.tsx:237
  - frontend/src/components/editor/workspace/workspace-panel-rail.tsx:585
  - frontend/src/components/editor/workspace/rail-settings-menu.tsx:30
  - frontend/src/components/editor/canvas/canvas-rulers.tsx:95
  - frontend/src/index.css:232
---
تحسين وتوحيد شريط الأدوات وقائمة الإعدادات والمساطر: نقل مبدّل وضع العمل إلى منتصف شريط الأدوات الرئيسي، وتوحيد خامة وأوزان أزرار الإدراج والتصدير والطباعة بنمط Fluent 2 الهادئ، وتفريغ شريط العنوان بنقل عناصر الحساب والمظهر والألواح إلى قائمة إعدادات موحدة في أسفل الشريط الجانبي الأيسر، ودمج خلفية المساطر مع مساحة العمل وإزالة الظلال لإزالة التداخل البصري.
