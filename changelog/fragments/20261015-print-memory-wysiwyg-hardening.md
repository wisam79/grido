---
type: fix
scope: print
related_files:
  - internal/service/print_service.go:44
  - internal/service/print_compose.go:335
  - internal/service/print_image_pipeline.go:707
  - frontend/src/components/editor/print/print-preview.tsx:165
  - internal/service/updater.go:479
  - frontend/src/hooks/use-face-frame.ts:130
---

إغلاق رباعية أبرز نقاط الضعف من تدقيق الجلسة (أمن المحدّث · واجهة/حالة · موثوقية Go · طباعة/تصدير):
- سقوف ذاكرة صريحة لكانفس التركيب (144MP وضلع أقصى 65535px) مع فحص مبكر قبل أي تخصيص وحارس هدف تحجيم قبل `imaging.Resize`، وتحويل أي panic في عمال المعالجة المتوازيين إلى خطأ مفهرس بدل إسقاط التطبيق.
- مطابقة ترتيب القلب←التدوير مع مصفوفة Konva (T·R·S) في مخرج الطباعة ومعاينته — كان الناتج ينعكس 180° عند 90°/270° مع أي قلب.
- فشل مغلق على رابط التنزيل الأولي في المحدّث (https حصراً قبل إنشاء الطلب — كان الفحص على إعادات التوجيه فقط).
- دورة حياة موحّدة لعامل التأطير المشترك: فكّ نسخة لم يعد يقتل عمل نسخة أخرى، والإلغاء يُسوّي كل الطلبات المعلقة ثم يُنهي العامل.
