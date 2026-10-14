---
type: fix
scope: print
related_files:
  - internal/service/print_cmyk_tiff.go:42
  - frontend/src/lib/export/export-cmyk.ts:18
---

إصلاح اختفاء خط القص عند 298mm على ورق 297mm — قيد `Math.min(paperHeight)` في بناء التصدير والمعاينة.

> انسخ هذا التمبلت إلى `YYYYMMDD-<scope>-<slug>.md` وعدّل الحقول.
> يُحذف التمبلت تلقائياً عند جمع الـ fragments في الإصدار.

<!--
  type:  feat | fix | perf | refactor | docs | security | removed
  scope: print | canvas | ai | build | auth | ui | docs | infra
         (اختر الأقرب — يُستخدم لتجميع الأقسام في CHANGELOG تلقائياً)
  related_files: مسار:سطر لكل ملف لمسه التغيير — البوابة تتحقق من وجود المسار
-->
