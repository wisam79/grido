---
type: fix
scope: ui
related_files:
  - frontend/e2e/helpers/wails-v3-bridge.ts:288
---

تصحيح محاكي `SaveImageFromBase64` في جسر Wails v3 لبيئة E2E بإرجاع حمولة الصورة كـ dataURL أو مسار صالح بدلاً من السلسلة النصية 'success'، لمنع رفض الصور كغير مقروءة في فحص جودة الطباعة المسبق.
