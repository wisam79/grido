---
type: fix
scope: print
related_files:
  - internal/service/print_service.go:840
  - internal/service/print_export.go:244
  - internal/service/print_cmyk.go:187
  - internal/service/print_image_pipeline.go:434
  - internal/service/print_compose.go:586
  - internal/service/printer_gdi_windows.go:1246
  - frontend/src/components/editor/print/print-pixel-preview.ts:98
  - frontend/src/components/editor/print/print-preview.tsx:491
  - frontend/src/components/editor/print/use-print-export.ts:352
  - frontend/src/components/editor/print/print-payload-builder.ts:141
  - frontend/src/features/stickers/lib/print-rerasterize.ts:127
  - frontend/src/components/editor/dialogs/print-dialog.tsx:427
  - frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:261
  - frontend/src/lib/export/export-canvas.ts:82
---
إصلاح شامل لمسار الطباعة والتصدير (إزالة ازدواجية خطوط القص الرمادية في CMYK، تثبيت ترتيب الفلاتر القانوني والـ DPI الديناميكي والتدرج اللوني لكل نسخة في المعاينة، معالجة `JOB_NOT_FOUND` في طابور الويندوز بعد الطباعة المباشرة، تقديم الـ Preflight وتوازي قياس الأبعاد مع حفظ نسبة الملصقات، وتوحيد خطافات GDI وألوان وإعدادات الورق وعلامات الزوايا).
