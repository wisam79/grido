---
type: feat
scope: canvas
related_files:
  - internal/service/scanner_warp_service.go:1
  - internal/service/scanner_warp_filters.go:1
  - internal/service/exif_orientation.go:1
  - internal/server/asset_server.go:495
  - frontend/src/components/editor/document-scanner/core/ml-orchestrator.ts:1
  - frontend/src/components/editor/document-scanner/core/ml-ingest.ts:1
  - frontend/src/components/editor/document-scanner/core/warp-client.ts:1
  - frontend/src/workers/scanner-ml.worker.ts:1
  - frontend/test/scanner-warp-golden.test.ts:1
  - frontend/test/ml-orchestrator.test.ts:1
  - docs/plans/neural-scanner-warp-migration-spec.md:1
---
ترحيل ماسح المستندات إلى نموذج DocCornerNet العصبي واستعدال Go واستئصال OpenCV.js: استبدال محرك OpenCV WASM بالكامل ونقل الاستدلال إلى عامل ويب مستقل مع كانفاس ابتلاع ثابت (224×224) عبر `ml-orchestrator.ts` و`scanner-ml.worker.ts`، وبناء خدمة الاستعدال والقص والـEXIF والفلاتر في Go خلف `/api/scanner-warp` بتطابق حرفي 100% مع Golden vectors، وإزالة مسار الكنتورات الكلاسيكي لخفض استهلاك الذاكرة وحماية WebView2 من تجاوز السقف.
