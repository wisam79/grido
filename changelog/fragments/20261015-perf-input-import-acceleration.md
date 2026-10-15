---
type: perf
scope: canvas
related_files:
  - internal/server/asset_server.go:294
  - frontend/src/lib/canvas/image-dimensions.ts:8
  - frontend/src/lib/canvas/measure-image.ts:13
  - frontend/src/lib/io/clipboard-utils.ts:80
  - frontend/src/components/editor/dialogs/batch-insert-dialog.tsx:135
  - frontend/src/components/editor/toolbar/toolbar-file-ops.tsx:162
  - frontend/src/hooks/use-app-bootstrap.ts:173
---

تسريع نظام الإدخال والاستيراد واستئصال الحلقات التسلسلية الثقيلة من الواجهة:
- كاش ذاكرة فوري للنسب الباعية (Map O(1)) وحل أبعاد الدفعات الكبيرة بطلب IPC واحد متوازي عبر Go `GetBatchImageDimensions` بدل الحلقات التسلسلية الفردية O(N).
- بث ثنائي مباشر للصور المنسوخة من الحافظة عبر `/api/upload-media` المحمي بتوكن الجلسة بدل التحويل لـ Base64 في V8 واستدعاء `SaveImageFromBase64`.
- إرجاع أبعاد الصورة ونسبتها الباعية فورياً مع استجابة `/api/upload-media` في Go لإلغاء أي طلبات شبكية أو IPC لاحقة.
- إدراج دفعي ذري للسحب والإفلات المكتبي (`native-file-drop`) بلقطة تراجع واحدة مع دعم توزيع الكولاج.
