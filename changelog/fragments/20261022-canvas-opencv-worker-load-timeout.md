---
type: fix
scope: canvas
related_files:
  - frontend/src/components/editor/document-scanner/opencv-loader.ts:29
  - frontend/src/workers/document-detector.worker.ts:78
  - frontend/src/components/editor/document-scanner/core/opencv-detector.ts:175
  - frontend/e2e/detector-worker-probe.spec.ts:71
---

إصلاح سقوط كشف OpenCV داخل العامل على الآلات الباردة — مهلة تحميل WASM صارت قابلة للضبط (90 ثانية في العامل) بدل سقف 10 ثوانٍ الذي كان يُرجع `null` قبل اكتمال التهيئة، وسقف تجربة المستخدم بقي 4 ثوانٍ في `document-detector` فلم يتغيّر شعور المستخدم.
