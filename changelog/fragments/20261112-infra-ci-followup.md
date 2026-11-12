---
type: fix
scope: infra
related_files:
  - frontend/e2e/command-palette-commands.spec.ts:18
  - internal/service/scanner_warp_service.go:483
---
مواءمة اختبار لوحة الأدوات مع استضافتها الوحيدة داخل Radix Dialog لإدارة التركيز، وحذف غلاف استعدال داخلي غير مستخدم كشفه Staticcheck في CI.
