---
type: fix
scope: ai
related_files:
  - supabase/migrations/20261101120000_activate_license_preserve_remaining_time.sql:49
  - modal_ai/upscaler.py:615
  - internal/service/ai_service.go:234
  - internal/service/ai_service.go:502
  - frontend/src/lib/export/export-canvas-fitted.ts:198
  - frontend/src/components/editor/konva/elements/text-node.tsx:97
  - frontend/src/lib/store/slices/core-slice.ts:429
---
الدفعة الثانية من خطة الإصلاح — أخطاء أموال العملاء وتوازن التصدير: هجرة activate_license تمدد الاشتراك من نهايته السارية (GREATEST/COALESCE) بدل محو الوقت المدفوع المتبقي؛ تحرير حجز الحصة المعلق فوراً عبر cancel_ai_quota_reservation عند فشل التسجيل النهائي في upscaler بدل احتجازه حتى مهلة الساعة؛ عدم تخزين انخفاض الخطة لـ free عند فشل عابر غير مهلة في كاش خطة Go (يخدم بفشل مغلق دون تثبيت الانخفاض)؛ فشل صريح 503 عند تعذر crypto/rand بدل معرّف Idempotency زمني مزيّف؛ ضبط letterSpacing صراحةً لكل عنصر نص في التصدير اليدوي (0px عند غيابه) فلا يتسرب بين العناصر؛ مسار احتياطي مسجّل للقص المستدير عند تعذر الكانفس الوسيط بدل إسقاط صامت؛ إعادة قياس النص بعد جاهزية الخط عبر الواجهة العامة لـ Konva بدل poking الخاص `_setTextData`؛ وcanvasZoom يعود للافتراضي في reset بدل إرث تكبير المشروع السابق. مع لمستَي حوكمة: تصحيح «41→75 اختباراً» في ci.yml وGo 1.26 في وكيل الباك-إند.
