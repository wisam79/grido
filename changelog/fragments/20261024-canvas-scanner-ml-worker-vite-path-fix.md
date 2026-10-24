---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/document-scanner/core/ml-orchestrator.ts:124
  - frontend/package.json:88
---
تصحيح مسار استيراد عامل `scanner-ml.worker.ts` النسبي داخل Vite (`../../../../workers/scanner-ml.worker.ts`) لنجاح حزم الإنتاج وبناء Wails، ومزامنة إزالة `@techstark/opencv-js`.
