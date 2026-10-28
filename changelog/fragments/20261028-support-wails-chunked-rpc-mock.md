---
type: fix
scope: ui
related_files:
  - frontend/e2e/helpers/wails-v3-bridge.ts:178
---

دعم بروتوكول تجزئة الطلبات الكبيرة (Chunked RPC) في محاكي Wails v3 لبيئة E2E وتجميع الأجزاء عبر رؤوس `x-wails-chunk-*`، مع إرجاع مسار محلي خفيف لـ `SaveImageFromBase64`.
