---
type: feat
scope: canvas
related_files:
  - internal/service/svg_media.go:218
  - internal/service/media_service.go:322
  - internal/server/asset_server.go:167
  - native_image_drop.go:35
  - app.go:201
  - internal/repository/media_cleanup.go:122
  - frontend/src/lib/canvas/svg-logo.ts:42
  - frontend/src/lib/io/svg-slot-compat.ts:20
  - frontend/src/lib/store/types.ts:113
  - frontend/src/lib/utils.ts:152
  - frontend/src/hooks/use-sticker-display-raster.ts:118
  - frontend/src/features/stickers/lib/print-rerasterize.ts:68
  - frontend/src/lib/print/single-print-composition.ts:118
  - frontend/src/lib/export/freeform-preflight.ts:100
  - frontend/src/lib/store/slices/element/merge.ts:134
  - frontend/src/components/editor/properties/panels/image-properties.tsx:483
  - frontend/src/components/editor/properties/layers-list.tsx:128
---

دعم استيراد الشعارات المتجهة (`.svg`) وتعقيمها وتلوينها بضغطة واحدة في الوضع الحر (`FF-06`) مع استعادة اللون الأصلي بخطوة تراجع واحدة (`Ctrl+Z`) والحفاظ على حدّتها في العرض والتصدير والطباعة (`300+ DPI`).
