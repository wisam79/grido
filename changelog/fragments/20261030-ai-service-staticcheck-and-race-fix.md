---
type: fix
scope: ai
related_files:
  - internal/service/ai_service.go:455
  - internal/service/ai_service_test.go:81
  - frontend/src/hooks/use-ai-enhance.ts:413
---

- **إصلاح تنبيهات staticcheck في خدمة Go (`internal/service/ai_service.go` و `ai_service_test.go`):** إزالة علامات التنقيط من نص خطأ تحليل رابط البيانات وتطهير الدالة المساعدة غير المستخدمة.
- **تأمين حارس طزاثة الجلسة في خطاف تحسين الصورة (`frontend/src/hooks/use-ai-enhance.ts`):** إعادة التحقق من تطابق الجلسة والمشروع والمستخدم بعد قياس أبعاد الصورة وقبل اعتماد النتيجة على الكانفاس لتفادي سباق العمليات المتزامنة عند تبديل المستندات.
