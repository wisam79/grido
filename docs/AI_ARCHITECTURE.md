# معمارية الذكاء الاصطناعي (AI Architecture)

## نظرة عامة

> 📚 **التوثيق المرتبط:** خريطة التوثيق الإلزامية [`docs/DOCUMENTATION_MAP.md`](DOCUMENTATION_MAP.md) · المهارة [`grido-docs-sync-guard`](../.agents/skills/grido-docs-sync-guard/SKILL.md) · القاعدة الحاكمة `.agents/AGENTS.md` (مسار المعالجة المزدوج + حظر أسرار AI المشتركة).
> أي تغيير في هذا المستند (مسار، سرّ، حصة، مزوّد) يُلزم بتحديثه في نفس الجلسة وفق مصفوفة المزامنة.

---
تطبيق Grido Studio يعتمد على معمارية هجينة (Hybrid) لتمرير ومعالجة الصور عبر الذكاء الاصطناعي. تم التخلي عن استخدام Supabase Edge Functions كوسيط (Proxy) لتمرير بيانات الصور، وذلك لتجنب أخطاء انقطاع الاتصال (Timeout WORKER_RESOURCE_LIMIT) في الخطط المجانية لسوبابيز (التي تنهي الاتصال بعد 5 ثوانٍ).

## مسار البيانات المباشر (Direct-to-Modal Pattern)
بدلاً من الوسيط، يعتمد التطبيق حالياً مساراً مباشراً يوفر أقصى سرعة وأمان مع إدارة الحصص (Quotas) بشكل فوري:

1. **الطلب من العميل:**
   - تطبيق سطح المكتب (Go/Wails) يقوم بتجهيز الصورة (Base64) ويحدد حجمها.
   - التطبيق يحصل على JWT Token الخاص بالمستخدم المسجل الدخول في Supabase.
   - يتم إرسال طلب HTTP POST **مباشرة** إلى خوادم Modal AI.
   - يتم تضمين الـ JWT Token في ترويسة Authorization: Bearer.

2. **التوثيق في خوادم Modal (Auth Verification):**
   - سيرفر upscaler.py في Modal يستقبل الطلب.
   - قبل معالجة الصورة، يقوم السيرفر بالاتصال بـ Supabase Auth API للتحقق من أن الـ JWT Token صالح وأنه يعود لمستخدم حقيقي.
   - إذا كان التوكن منتهياً أو مزيفاً، يتم رفض الطلب فوراً بـ 401 Unauthorized.

3. **تسجيل الاستهلاك (Quota Management):**
   - بعد أن يكتمل ترميم الصورة (وهي عملية قد تستغرق من 5 إلى 15 ثانية)، يقوم سيرفر Modal بتسجيل هذا الاستهلاك فوراً في قاعدة بيانات Supabase.
   - يتم ذلك عبر استدعاء دالة RPC في قاعدة البيانات اسمها check_and_record_ai_usage.
   - يمرر لها: معرّف المستخدم، وحجم الصورة، والحد اليومي المسموح للمستخدم، وتكلفة المعالجة بالدولار.
   - إذا تبين أن المستخدم تجاوز الحد المسموح به (مثلاً خطة مجانية واستنفد رصيده)، سيرفض الـ RPC تسجيل الصورة وسيعيد Modal رسالة خطأ 429 Quota Exceeded ولن يتم عرض الصورة للمستخدم.

## إعدادات الأمان المطلوبة في Modal
لكي يعمل سيرفر Modal AI بشكل صحيح كحارس أمن، يجب أن يحتوي على المتغيرات البيئية (Secrets) التالية:
- SUPABASE_URL: رابط مشروع سوبابيز (مثل https://xxxx.supabase.co)
- SUPABASE_ANON_KEY: المفتاح العام (Anon Key) للتخاطب مع الـ API
- `grido-ai-secret` و `supabase-auth`: أسماء أسرار Modal الخادمية المستخدمة في `modal_ai/upscaler.py:63` — تُقرأ **داخل خادم Modal فقط**، ولا يُرسل أي منها من التطبيق.

## لماذا هذا التصميم؟
1. **السرعة:** لا توجد طبقات بروكسي إضافية تنسخ بيانات الصورة الضخمة (Base64) وتستهلك ذاكرة (RAM).
2. **استقرار الأداء:** معالجات الذكاء الاصطناعي تحتاج لوقت تنفيذ طويل (Long-Running Tasks). توجيهها لمودال مباشرة يلغي قيود الوقت المفروضة على Serverless Functions في سوبابيز.
3. **الأمان:** المسار الأساسي يعتمد على Supabase JWT لكل مستخدم، والتحقق يتم خادمياً في `upscaler.py` عبر `/auth/v1/user`.
   🔒 **حُذف السرّ المشترك نهائياً (2026-09-25 — تدقيق `C-02`):** لم يعد يوجد أي حقن `-X ...ModalAIKey` في `build.ps1` و`release.yml` و`build/windows/Taskfile.yml`، وحُذف المتغير `ModalAIKey` ودالة `GetModalAIKey` من `internal/service/license_service.go`.
   السبب: لم يكن له أي مستهلك إنتاجي (كان يُستدعى من الاختبار فقط)، وكان يبقى نصاً داخل الثنائي قابلاً للاستخراج بـ`strings` في كل إصدار منشور.
   **إن عاد هذا النمط بأي شكل فهو تراجع أمني** (راجع `docs/reviews/07-full-security-completeness-audit-2026-09-25.md`).
4. **تتبع التكاليف:** الإدارة المركزية لحساب تكلفة كل عملية معالجة (GPU Time) عبر تسجيل الثواني المستغرقة بدقة في قاعدة بيانات Supabase.

## صلاحيات قواعد البيانات وملفات الـ Migrations
- تاريخياً: `supabase/migrations/20260729000000_fix_is_admin_permissions.sql` وسّع `GRANT EXECUTE` لـ `is_admin()` و `check_and_record_ai_usage()` إلى (`authenticated`, `anon`, `service_role`).
- الحالي (الحاكم): `supabase/migrations/20260907000000_grant_rpc_permissions.sql:5-20` يمنح `activate_license` و `check_and_record_ai_usage` إلى `authenticated` و `service_role` فقط (بدون `anon`) مع `NOTIFY pgrst, 'reload schema'`.
