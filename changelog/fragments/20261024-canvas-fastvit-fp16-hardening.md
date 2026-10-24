---
type: perf
scope: canvas
related_files:
  - internal/service/ai_assets/fastvit_sa24.onnx:1
  - internal/service/scanner_detector_service_windows.go:40
  - internal/server/asset_server.go:277
  - internal/service/scanner_detector_test.go:1
  - frontend/src/components/editor/document-scanner/core/warp-client.ts:95
---
ضغط نموذج كشف المستندات العصبي FastViT-SA24 إلى FP16 وتقليص الحجم 50% مع تعزيز موثوقية التهيئة: تحويل نموذج FastViT-SA24 إلى نصف الدقة العائمة FP16 مما يقلص حجم النموذج من 83MB إلى 39.8MB (توفير 41.3MB في ملف الـ exe المحمول) مع الحفاظ التام على دقة الكشف (peaks متطابقة 100%)، واستبدال sync.Once بتهيئة قابلة لإعادة المحاولة عند حدوث أخطاء قرص مؤقتة، وإرجاع HTTP 503 على المنصات غير المدعومة، ومنع ازدواجية رفع الوسائط المؤقتة في الماسح، وإضافة اختبارات شاملة لدورة حياة الكاشف.
