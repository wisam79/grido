---
type: fix
scope: ui
related_files:
  - frontend/src/components/ui/slider.tsx:68
  - frontend/src/components/editor/canvas/use-canvas-viewport.ts:360
  - frontend/src/components/editor/canvas/editor-canvas.tsx:526
  - frontend/src/components/editor/canvas/canvas-bleed-guides.tsx:54
  - frontend/src/components/editor/workspace/rail-settings-menu.tsx:120
  - frontend/src/components/editor/workspace/workspace-panel-rail.tsx:195
  - frontend/src/components/editor/toolbar/toolbar.tsx:103
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:275
  - frontend/test/freeform-editor.test.tsx:621
---
إعادة صقل وتوحيد قائمة الإعدادات (RailSettingsMenu) وفق لغة Fluent 2: بطاقة ملف تعريفي أنيقة للمستخدم، استبدال الرموز النصية بأيقونات فوسفور متناسقة، تصحيح اتجاه كبسولات الاختصارات LTR عبر FluentKbd، وإزالة البقع الخضراء الزائدة من أيقونة الكولاج وأيقونة الترس في الشريط الجانبي. بالإضافة إلى مزامنة أبعاد خطوط الإرشاد فورياً أثناء الزوم واستعادة اللون الأبيض المحايد للمنـزلق، واستعادة كلاسات أبعاد أزرار شريط الأدوات ومطابقة عناوين الملصقات ورفع مهلة اختبار المحرر الحر لضمان اجتياز CI.
