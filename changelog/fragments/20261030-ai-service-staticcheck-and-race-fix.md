---
type: fix
scope: infra
related_files:
  - internal/service/ai_service.go:455
  - internal/service/ai_service_test.go:81
  - frontend/src/hooks/use-ai-enhance.ts:413
  - internal/repository/db_test.go:200
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:348
  - .github/workflows/ci.yml:646
---

- **إصلاح تنبيهات staticcheck في خدمة Go (`internal/service/ai_service.go` و `ai_service_test.go`):** إزالة علامات التنقيط من نص خطأ تحليل رابط البيانات وتطهير الدالة المساعدة غير المستخدمة.
- **تأمين حارس طزاثة الجلسة في خطاف تحسين الصورة (`frontend/src/hooks/use-ai-enhance.ts`):** إعادة التحقق من تطابق الجلسة والمشروع والمستخدم بعد قياس أبعاد الصورة وقبل اعتماد النتيجة على الكانفاس لتفادي سباق العمليات المتزامنة عند تبديل المستندات.
- **إضافة جدول القوالب المخصصة لاختبارات تنظيف الوسائط (`internal/repository/db_test.go`):** تسجيل `domain.CustomTemplate` في التهيئة الذاتية لقاعدة بيانات الاختبار لضمان عدم تعطل تنظيف الصور القديمة غير المستخدمة.
- **مواءمة بنية أزرار المحاذاة مع فحص هندسة الألواح (`collage-custom-grid-tab.tsx`):** استبدال حاوية الشبكة غير المتساوية بحاوية مرنة (`flex`) لحماية اختبارات `e2e/panel-geometry.spec.ts`.
- **تثبيت إصدار Ubuntu لمهمة فحص WebKit (`.github/workflows/ci.yml`):** ضبط بيئة تشغيل `webkit-smoke` على `ubuntu-24.04` لتوافق مكتبة ICU (`libicudata.so.74`) مع متصفح Playwright WebKit.
