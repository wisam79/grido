---
type: feat
scope: ui
related_files:
  - frontend/src/components/editor/system/startup-splash.tsx:5
  - frontend/src/components/editor/system/startup-splash.css:1
  - frontend/src/App.tsx:223
  - frontend/src/hooks/use-app-bootstrap.ts:90
  - frontend/src/lib/store/slices/license-slice.ts:251
  - frontend/test/App.test.tsx:452
  - frontend/test/license-slice.test.ts:1
---
إعادة تصميم شاشة التهيئة بشعار SVG مورّد من المالك، مع رسم متتابع لزوايا الإطار وتجميع الأجزاء بإزاحة ودوران قصيرين ولمعة مقصوصة داخل الشعار ومؤشر انتظار ثنائي النبضة؛ دعم المظهرين وتقليل الحركة وحالة وصولية واحدة، دون صورة نقطية أو مكتبة حركة جديدة.
ربط اختفاء الشاشة بنتيجة فحص الترخيص لا بمهلة الأربع ثواني؛ تنبيه للتأخر وإعادة محاولة محروسة عند الفشل التقني مع إغلاق آمن، وتمييز النتيجة القديمة عن الحالية وملكية طلب واحدة، مع الحفاظ على سياسة العمل دون اتصال؛ اختبارات الإقلاع والترخيص المستهدفة تغطي التأخر والأخطاء وسباقات الجلسة.
