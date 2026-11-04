---
type: fix
scope: ui
related_files:
  - frontend/src/hooks/use-workspace-panels.ts:76
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:259
  - frontend/src/components/editor/workspace/rail-settings-menu.tsx:150
  - frontend/e2e/workflows.spec.ts:44
  - frontend/test/use-workspace-panels.test.ts:70
---
إعادة تثبيت لوحة الخصائص (`isInspectorPinned`) افتراضياً لتوفير إعدادات الورقة فور إقلاع التطبيق واستقرار نسبة ملاءمة العرض في الشاشات العريضة، واستبدال حجم الخط الاعتباطي في تبويب شبكة الكولاج بـ `text-mini` للامتثال لحارس التايبوغرافي، وتحديث اختبار سير العمل (E2E) لتبديل المظهر من قائمة إعدادات الشريط.
