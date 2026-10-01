---
trigger: glob
globs:
  - "supabase/**/*"
  - "internal/service/*auth*"
  - "internal/service/session*"
  - "internal/service/license*"
  - "internal/service/supabase_client.go"
  - "frontend/src/lib/store/slices/license-slice.ts"
  - "frontend/src/components/editor/dialogs/account/**/*"
description: "قواعد أمان قاعدة البيانات وتفويض Supabase وسياسات RLS والمصادقة وتشفير الجلسات"
---

# قواعد أمان قاعدة البيانات والتفويض (Database Security & Authz)

## قاعدة البيانات والتفويض (Database & Authorization Security)
- **فحص التفويض بـ`IS NOT TRUE` لا `IF NOT fn()` (فخ المنطق ثلاثي القيم):** أي دالة تعيد boolean داخل دالة `SECURITY DEFINER` قد تعيد `NULL`، و`NOT NULL = NULL` و`IF NULL` لا ترفع الاستثناء ⇒ تجاوز كامل. مُثبت حيّاً (2026-09-26): `is_admin()` أعادت `NULL` لأي مستخدم بلا `role` في `app_metadata` فاستدعى دور `anon` دوال الأدمن بنجاح. القاعدة: ألزم كل دالة boolean بإعادة قيمة غير فارغة (`COALESCE(expr, false)`) واكتب كل فحص `IS NOT TRUE`. التفاصيل والمصفوفة الكاملة في `.agents/skills/supabase-security-and-migrations/SKILL.md`.
- **لا `OLD.`/`NEW.` داخل سياسات RLS:** غير متاحين (`42P01`) وتفشل الهجرة كاملةً بصمت مع تسجيلها كمنفَّذة. حماية أعمدة الاشتراك عبر مشغّل `BEFORE UPDATE` (`guard_profile_privilege_columns`).
- **`UPDATE` بلا `WITH CHECK` = ثغرة تصعيد:** اكتب `WITH CHECK` صراحةً دائماً؛ وأداءً استخدم `(select auth.uid())` و`(select auth.role())` و`(select auth.jwt())`.
- **الهجرة المطبَّقة غير قابلة للتعديل:** الإصلاح يكون بهجرة جديدة لا بتعديل القديمة؛ بوابة `scripts/migration-lint.mjs` مع `supabase/migrations.manifest.json` تمنع الانحراف (شغّل `--update-manifest` بعد إضافة هجرة جديدة).
- **دوال `SECURITY DEFINER`:** `SET search_path` دائماً، واشتقاق الهوية من `auth.uid()` فقط، وعدم الثقة بأي حصّة أو معرّف قادم من العميل، والتحقق الحيّ عبر Supabase MCP في معاملة تُلغى (`apply_migration` ثم `list_migrations` لمواءمة اسم الملف، و`execute_sql` بمحاكاة `request.jwt.claims` + `set local role`).
- **تشفير التوكن/الترخيص المحلي مشتق من معرّف الجهاز (`MachineGuid`) وهو غير سرّي** ⇒ لا تعامله كحماية؛ وربط تفعيل الترخيص بالجهاز غير مُنفَّذ فعلياً (`activate_license` تهمل `p_device_id`)؛ ومنح الجداول الزائدة (`TRUNCATE/REFERENCES/TRIGGER` لـ`anon`) و`auth_leaked_password_protection` بنود مفتوحة.
- **التنفيذ الفعلي لا القراءة:** مراجعة SQL وحدها لا تُثبت الأمان — أعد تشغيل مصفوفة T1–T7 بأدوار PostgREST الحقيقية قبل اعتبار أي إصلاح تخويل مُغلقاً.
- **حظر طباعة استجابات المصادقة في السجلات (Auth Log Sanitization Invariant):** يُمنع إجبارياً تمرير نصوص الاستجابات الخام (`string(body)`) إلى دوال التسجيل (`slog.Error`, `slog.Warn`, `slog.Info`) في كافة مسارات المصادقة وتدوير التوكنات واستعادة الحسابات (`auth_flows.go`, `license_service.go`, `oauth_server.go`)، حتى عند فشل فك التشفير بعد استجابة `200 OK`. يجب الاكتفاء بتسجيل نوع الخطأ، رمز الحالة، وطول الاستجابة بالبايتات (`bytes: len(body)`) لمنع كتابة التوكنات المشفرة أو بيانات المستخدمين إلى سجلات القرص.
- **التطابق الصارم لسياسات كلمات المرور (Password Policy Parity Invariant):** أي اشتراطات تفرضها خدمة المصادقة السحابية Supabase Auth (مثل `minimum_password_length = 8` واشتراط `letters_digits`) يجب تطبيقها مسبقاً وبشكل متطابق تماماً في فحص Go المحلي (`validatePasswordStrength`) والواجهة الأمامية (`use-auth-forms.ts`) وقاموس تعريب الأخطاء (`supabase_client.go`). يُمنع إرسال طلبات بكلمات مرور لا تستوفي الحد الأدنى تجنباً لرفض الخادم غير المفسر للمستخدم.
- **إدارة الجلسة الواحدة النشطة بلا ربط بالعتاد (Single Active Session & Last-Wins Invariant):** يعتمد نظام التوثيق على جلسة نشطة واحدة لكل مستخدم في جدول `public.user_sessions` المحمي بسياسة deny-all، وتدار حصراً عبر دالتي `claim_session` و `check_session` بصلاحية `SECURITY DEFINER`. المبدأ الحاكم هو "آخر دخول يفوز" (Last-Wins) دون أي ربط بالعتاد. في Go backend (`session_manager.go`)، يُمنع إجبارياً طرد المستخدم عند تعذر الاتصال بالشبكة (سماح عدم الاتصال Offline Grace)، ويقتصر الطرد حصراً على تلقي إثبات شبكي صريح بوجود جلسة أحدث (`ErrSessionSuperseded`)، مع تصفير الجلسة المحلية في الواجهة وفتح نافذة الحساب بإشعار توضيحي.
