---
type: fix
scope: infra
related_files:
  - build/windows/installer/project.nsi:150
  - app.go:53
  - internal/service/scanner_warp_service.go:132
  - internal/service/license_service.go:65
  - internal/service/onnx_runtime_windows.go:1
  - frontend/src/lib/canvas/konva-export-utils.ts:529
  - frontend/src/hooks/use-keyboard-shortcuts.ts:369
  - .github/workflows/ci.yml:16
---
تنفيذ خطة الاستقرار S0–S8: الاحتفاظ ببيانات المستخدم عند الإزالة، تقليص IPC، إلغاء الماسح الحقيقي، منع نتائج المصادقة القديمة وتنقيح السجلات، توحيد ملكية ONNX، تسلسل التقاط Stage، إصلاح الوصول والتكبير حتى 200%، وإضافة Race/coverage دورية. بقيت تحسينات bundle وIPC gateway وبصمات الأصول لدُفعات مستقلة.
