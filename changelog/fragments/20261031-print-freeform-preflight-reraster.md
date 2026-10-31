---
type: feat
scope: print
related_files:
  - frontend/src/lib/export/freeform-preflight.ts:41
  - frontend/src/features/stickers/lib/print-rerasterize.ts:100
  - frontend/src/components/editor/print/use-print-export.ts:263
  - frontend/src/components/editor/print/print-payload-builder.ts:295
  - frontend/src/components/editor/dialogs/export-dialog.tsx:202
  - frontend/src/lib/store/slices/element/image-elements.ts:89
  - frontend/src/features/stickers/components/vdp-import-dialog.tsx:150
  - frontend/src/lib/canvas/image-dimensions.ts:64
---
فحص جودة للوضع الحر (عناصر الصور/الملصقات) في الطباعة والتصدير كان حصراً للكولاج: حجب للمصادر غير المقروءة وتحذير للدقة الفعالة المنخفضة (< 250DPI) مع حل الأبعاد دفعياً. معه ترقية تلقائية لدقة الملصقات وقت الطباعة: أي عنصر يحمل stickerSource وانخفضت دقته الفعالة عن الحد يُعاد تصييره من SVG المتجه المحفوظ على مقاسه المطبوع الفعلي بـ DPI الورقة ويُرفع كأصل طباعة مؤقت دون لمس الستور، ويُستبدل مصدره في مسار التركيب السريع فقط. وربط صفوف VDP بمعاملات صفها عبر stickerSource في الإدراج الدفعي فتدخل نفس الترقية. أضيف resolveImageDimensions/resolveBatchImageDimensions كأساس مشترك للأبعاد الكاملة بعد EXIF.
