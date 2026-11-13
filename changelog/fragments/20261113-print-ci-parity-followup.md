---
type: fix
scope: print
related_files:
  - frontend/src/lib/export/export-pixel-filter.ts:21
  - frontend/src/lib/export/export-canvas-collage.ts:164
  - frontend/e2e/helpers/wails-v3-bridge.ts:161
---
وحّد مسارات Canvas 2D اليدوية مع عقد RGBA القانوني بدل اختلاف `ctx.filter`، وثبّت حالة spool النهائية في جسر E2E، وجعل mocks الخاصة بـTIFF متوافقة مع Node وjsdom.
