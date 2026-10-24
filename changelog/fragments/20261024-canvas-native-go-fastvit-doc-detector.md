---
type: feat
scope: canvas
related_files:
  - internal/service/scanner_detector_service_windows.go:1
  - internal/service/scanner_detector_service_other.go:1
  - internal/server/asset_server.go:257
  - main.go:500
  - frontend/src/components/editor/document-scanner/core/warp-client.ts:184
  - frontend/src/components/editor/document-scanner/core/ml-orchestrator.ts:404
---
دعم الكشف العصبي فائق الدقة لأركان المستندات والبطاقات الشخصية في Go محلياً: إضافة خدمة `ScannerDetectorService` المعتمدة على نموذج `FastViT-SA24` عبر مكتبة ONNX Runtime المضمنة في الثنائي الواحد، ونقطة النهاية الآمنة `/api/scanner-detect` لاستخراج أركان الوثائق عبر خرائط الحرارة الحبيبية دون أي استهلاك لذاكرة الويب فيو.
