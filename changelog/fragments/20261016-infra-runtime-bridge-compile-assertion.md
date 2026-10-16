---
type: fix
scope: infra
related_files:
  - internal/service/runtime_wails.go:19
---
**تأكيد تحقيق واجهة الرنتايم وقت الترجمة (خلفية):** إضافة `var _ domain.RuntimeBridge = WailsRuntimeBridge{}` لضمان تحقيق واجهة `RuntimeBridge` وقت الترجمة في Go وحل تنبيه استيراد حزمة `domain` في بيئة الـ CI.
