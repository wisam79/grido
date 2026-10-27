---
type: refactor
scope: ui
related_files:
  - internal/utils/paths.go:28
  - internal/server/asset_server.go:160
  - frontend/src/lib/io/save-result.ts:7
  - frontend/src/lib/io/file-dialog-utils.ts:20
  - frontend/src/lib/canvas/element-geometry.ts:179
  - frontend/src/lib/io/project-hydrator.ts:40
  - frontend/src/lib/store/slices/collage-slice.ts:384
---
تفكيك وتوحيد الازدواجية المعمارية عبر الباك إند والواجهة: توحيد فحص المسارات الآمنة PathWithinDir ورفع الصور في Go، واستخراج أدوات تصنيف نتائج الحفظ وتدوير العناصر ومطابقة المقاسات وتفريد المعرفات في React مع تغطية اختبارية شاملة.
