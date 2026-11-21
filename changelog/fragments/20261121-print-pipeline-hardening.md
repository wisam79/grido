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
  - internal/service/print_rotation_test.go:508
  - internal/service/print_composition_integration_test.go:138
  - internal/service/print_cutline_test.go:263
  - internal/service/printer_gdi_windows_test.go:1201
  - frontend/src/components/editor/print/print-pixel-preview.ts:99
  - frontend/src/components/editor/print/print-preview.tsx:491
  - frontend/src/components/editor/print/use-print-export.ts:352
  - frontend/src/components/editor/print/print-payload-builder.ts:138
  - frontend/src/features/stickers/lib/print-rerasterize.ts:124
  - frontend/src/components/editor/dialogs/print-dialog.tsx:427
  - frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:261
  - frontend/src/lib/export/export-canvas.ts:82
  - frontend/test/sticker-quality.test.ts:211
  - frontend/test/print-export-payload.test.ts:1182
  - frontend/test/print-dialog-backstage.test.tsx:496
  - frontend/test/canvas-dimensions-panel.test.tsx:220
---
إصلاح شامل لمسار الطباعة والتصدير وتطوير اختبارات تكاملية وبكسلية حقيقية لعزل كاش `processedKey` باختلاف `CropMode`، وحدود `composeCanvas`، ومعاينة CMYK TIFF و`_preview.png`، وخطاف `printerGDIWin32.createDC`، وترقية الملصقات متعددة النسب، وترتيب فحص الـ Preflight ومطابقة ورق الدرايفر.
