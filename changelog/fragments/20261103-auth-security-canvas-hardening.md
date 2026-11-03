---
type: fix
scope: auth
related_files:
  - internal/service/license_service.go:32
  - internal/service/phone_bridge_service.go:108
  - internal/service/ai_service.go:214
  - internal/service/updater.go:618
  - frontend/src/lib/canvas/curved-text-utils.ts:100
  - frontend/src/lib/store/history-snapshot.ts:146
  - frontend/src/lib/store/slices/grid-slice.ts:112
  - frontend/src/components/editor/dialogs/export-dialog.tsx:248
---
حزمة تدقيق الأمان والكانفاس والشبكة وإصلاحات الاستقرار: تأمين تدوير جلسات الترخيص وحمايتها من سباقات Goroutines المتزامنة، وعزل أجيال جلسة جسر الهاتف وحصر ربطها بـ LAN IP وإغلاق استجابة المصافحة، وفرض HTTPS حصراً على مسار Modal AI لمنع تسريب JWT، وإلزامية مفتاح التوقيع للمحدّث في الإنتاج (Fail-closed)، وإصلاح اتصال التشكيل العربي في النص المنحني، وفصل إعدادات عرض الشبكة عن سجل التراجع مع دفع السجل للأدلة اليدوية، وحظر JPEG في مسار تصدير CMYK مع فرض TIFF دفاعياً.
