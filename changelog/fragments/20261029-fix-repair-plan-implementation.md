---
type: fix
scope: infra
related_files:
  - internal/repository/media_cleanup.go:140
  - internal/service/ai_service.go:178
  - frontend/src/lib/store/slices/collage-slice.ts:549
  - frontend/src/lib/print/print-layout-math.ts:162
  - frontend/src/lib/ai/ai-result-commit.ts:59
  - frontend/src/hooks/use-ai-enhance.ts:86
  - frontend/src/features/freeform-collage/lib/freeform-dialog-state.ts:1
  - admin-web/src/lib/landing/dialog-state.ts:1
  - .github/workflows/ci.yml:121
---
تنفيذ خطة الإصلاح الشاملة: حماية مراجع الوسائط الستة في تنظيف المشاريع مع فشل مغلق، حفظ قوائم التعبئة ومنع حلقة السعة بسقف 500 وتفريغ صريح للفائض، مطابقة هندسة الخلية الفيزيائية بين المعاينة والتصدير، حارس مسودة عند تغيّر العرض، ونقل محرر الكولاج الحر إلى مضيف واحد مع دورة حياة صفحة الهبوط.
ميزانية 180 ثانية لكل طلب AI في الخلفية مع مهلة واجهة 200 ثانية بلا إعادة محاولة تلقائية، ومعاينة غير مدمرة للنتيجة (قبول/رفض صريح) تُبطلها حارس الجلسة، وإضافة مهمة `validate-modal-ai` في CI؛ الاختبارات المستهدفة خضراء محلياً ونتائج CI والتحقق البصري والنشر بوابات لاحقة.
