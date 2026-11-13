---
type: fix
scope: print
related_files:
  - frontend/src/lib/export/export-pixel-filter.ts:21
  - frontend/test/export-image-fallback.test.ts:68
  - frontend/e2e/print-export.spec.ts:113
  - frontend/e2e/helpers/wails-v3-bridge.ts:161
  - docs/testing_guide.md:40
---
وحّد مسارات Canvas 2D اليدوية مع عقد RGBA القانوني بدل اختلاف `ctx.filter`، وحدّث محاكاة Canvas وتوقع نجاح الطباعة للحالة النهائية، وثبّت حالة spool النهائية في جسر E2E، وجعل mocks الخاصة بـTIFF متوافقة مع Node وjsdom.
