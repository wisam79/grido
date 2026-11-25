---
trigger: glob
glob: "{supabase/**/*,internal/service/*auth*,internal/service/session*,internal/service/license*,internal/service/supabase_client.go,frontend/src/lib/store/slices/license-slice.ts,frontend/src/components/editor/dialogs/account/**/*}"
description: "قواعد أمان قاعدة البيانات وتفويض Supabase وسياسات RLS والمصادقة والجلسات"
---

# قواعد أمان قاعدة البيانات والتفويض (Database Security & Authz)

التفاصيل ومصفوفة الاختبار T1–T7 في `.agents/skills/supabase-security-and-migrations/SKILL.md`.

- **فخ المنطق ثلاثي القيم (`IS NOT TRUE`):** أي دالة boolean داخل `SECURITY DEFINER` يجب أن ترجع `COALESCE(expr, false)` ويكون كل فحص تخويل بـ `IS NOT TRUE` (يُمنع `IF NOT fn()` لأن `NOT NULL = NULL` يسمح بالتجاوز).
- **سياسات RLS والهجرات:** لا تستخدم `OLD.`/`NEW.` داخل RLS (احمِ أعمدة الاشتراك بمشغّل `BEFORE UPDATE` مثل `guard_profile_privilege_columns`). اكتب `WITH CHECK` صراحةً مع `UPDATE` واستعمل `(select auth.uid())` للأداء. الهجرات المطبّقة لا تُعدّل — أضف هجرة جديدة ومرّر `scripts/migration-lint.mjs --update-manifest`.
- **`SECURITY DEFINER` والتحقق الحي:** اضبط `SET search_path` واشتق الهوية من `auth.uid()` لا وسائط العميل. اختبر الهجرات عبر Supabase MCP داخل `BEGIN ... ROLLBACK` بأدوار PostgREST الحقيقية (`authenticated`/`anon`). ملاحظة: التشفير المحلي المشتق من `MachineGuid` غير سري، وتفعيل `activate_license` بالعتاد غير منفّذ فعلياً.
- **المصادقة والجلسة الواحدة:** لا تطبع `string(body)` في سجلات المصادقة (`auth_flows.go`, `license_service.go`, `oauth_server.go`) — اكتفِ بنوع الخطأ والحالة و`len(body)`. طابق سياسة كلمات المرور (8 أحرف + حروف وأرقام) في Go والواجهة. الجلسة الواحدة تعتمد Last-Wins في `public.user_sessions` (`claim_session`/`check_session`) مع Offline Grace عند انقطاع الشبكة وحصر الطرد في `ErrSessionSuperseded`.
