---
type: perf
scope: infra
related_files:
  - internal/service/memory_service.go:38
  - internal/service/memory_service_windows.go:24
  - frontend/src/lib/canvas/image-cache.ts:15
  - frontend/src/lib/store/slices/core-slice.ts:320
  - frontend/src/App.tsx:6
  - frontend/src/lib/io/exif-utils.ts:18
  - frontend/src/lib/canvas/image-cache.test.ts:1
---

تقليم ذاكرة تكيّفي في Go (فحص كل 45 ثانية، تنفيذ عند كومة 320 MiB أو كل 10 دقائق) بدل `GC` + `EmptyWorkingSet` كل 30 ثانية، وميزانية بايتات 256 MiB لكاش صور الواجهة مع تفريغه عند مستند جديد.

حُذف برميل `@/components/editor` واستُبدل باستيرادات مباشرة في `App` و`license-lock-screen` و`app-dialogs-host`، فانفصل `print-dialog` عن حزمة الإقلاع، وصار `exifr` يُحمَّل عند الطلب. القياس: الحزمة الرئيسية 1,978.04 → 1,851.16 kB (−41.7 kB gzip).
