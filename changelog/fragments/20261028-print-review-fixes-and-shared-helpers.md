---
type: fix
scope: print
related_files:
  - internal/service/print_native.go:59
  - internal/service/printer_gdi_windows.go:792
  - internal/service/print_native_test.go:12
  - internal/service/printer_gdi_windows_test.go:34
  - frontend/src/components/editor/panels/custom-collage-card.tsx:327
  - frontend/test/App.test.tsx:269
  - frontend/src/lib/io/download.ts:6
  - docs/developer_guide.md:6
---
تصحيح مراجعة ما قبل الرفع: تطبيع مسار الملف وExports إلى مطلق قبل حل الروابط الرمزية في الطباعة الأصلية وGDI، وإضافة اختبارات قبول المسارات النسبية والمطلقة ورفض ExportsEvil دون فتح نافذة طباعة. إكمال مراجع ألواح تبويبات الكولاج بحاويات مخفية خفيفة واختبار شامل للربط، وتوثيق توحيد أدوات الملفات والوحدات والتفضيلات والتنزيل والطباعة الحالية دون تغيير عقود IPC.
