---
type: perf
scope: canvas
related_files:
  - internal/service/media_service.go:148
  - internal/service/ai_service.go:388
  - frontend/src/lib/io/media-upload.ts:1
  - frontend/src/components/editor/dialogs/refine-bg-dialog.tsx:460
  - frontend/src/components/editor/properties/panels/image-properties.tsx:228
  - frontend/src/hooks/use-ai-enhance.ts:75
---

تفريغ العمليات الثقيلة إلى Go والتدفق الثنائي للكانفاس وتحسين استهلاك الذاكرة:
- استبدال تشفير `canvas.toDataURL` والنصوص العريضة في `refine-bg-dialog` بالضخ الثنائي المباشر عبر `uploadCanvasBlob` كـ `multipart/form-data` مع كاش لحظي للأبعاد.
- تفويض تحسين الدقة بالذكاء الاصطناعي (`EnhanceImageWithAI`) لمسارات الصور المحلية في Go مباشرة دون استدعاء DOM Image أو تحجيم Canvas وإعادة تشفير JPEG في المتصفح.
- تسريع حفظ مخرجات الماسح الضوئي (`image-properties.tsx`) عبر الحفظ المتوازي واستعلام أبعاد الدفعة `resolveBatchImageAspectRatios` مع إدراج ذري واحد في الستور (`addImageElementsBatch`).
