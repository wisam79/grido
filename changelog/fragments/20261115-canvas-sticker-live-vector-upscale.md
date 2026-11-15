---
type: fix
scope: canvas
related_files:
  - frontend/src/features/stickers/lib/svg-rasterizer.ts:54
  - frontend/src/features/stickers/lib/print-rerasterize.ts:198
  - frontend/src/hooks/use-sticker-display-raster.ts:108
  - frontend/src/hooks/use-filter-cache.ts:33
  - frontend/src/components/editor/konva/elements/image-node.tsx:48
  - frontend/src/lib/canvas/konva-export-utils.ts:312
  - frontend/src/lib/export/export-canvas.ts:47
  - frontend/test/use-sticker-display-raster.test.ts:1
---
إصلاح انخفاض دقة الملصقات عند تكبيرها على الكانفاس أو تصديرها كصور عبر ترقية متجهة حيّة (`useStickerDisplayRaster`) في Konva `URLImage` مع كاش LRU رتيب بسقف 3072px ومواءمة التغطية دون مطّ، وتحديث `prepareStickerExportOverrides` وفك تغليف `Group` في `swapNodeImagesForCapture` لتغطية مسار `exportCanvas` (PNG/JPG والاحتياطي اليدوي).
