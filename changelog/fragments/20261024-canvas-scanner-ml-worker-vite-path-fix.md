---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/document-scanner/core/ml-orchestrator.ts:124
  - frontend/src/components/editor/document-scanner/core/ml-ingest.ts:38
  - frontend/src/components/editor/document-scanner/core/warp-client.ts:21
  - frontend/test/ml-orchestrator.test.ts:1
  - frontend/test/warp-worker-client.test.ts:1
  - frontend/package.json:88
---
تصحيح مسار استيراد عامل `scanner-ml.worker.ts` النسبي داخل Vite، ومطابقة معالجة الابتلاع القبلية (`ml-ingest.ts` 224×224 بملء الإطار الكامل دون أشرطة letterbox رمادية مصطنعة) مع عقد تدريب `DocCornerNet`، وإصلاح استخراج مسارات `/local-image/` المطلقة في `warp-client.ts` لمنع خطأ `SCN-WARP-03`.
