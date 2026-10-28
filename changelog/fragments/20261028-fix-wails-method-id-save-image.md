---
type: fix
scope: ui
related_files:
  - frontend/e2e/helpers/wails-v3-bridge.ts:92
---

مواءمة معرّفات استدعاء Wails v3 ($Call.ByID) في جسر E2E وربط 211586642 بدالة `SaveImageFromBase64` بدلاً من مسار وهمي لـ SaveFileDialog لتفادي إخفاق فحص الجودة المسبق للطباعة.
