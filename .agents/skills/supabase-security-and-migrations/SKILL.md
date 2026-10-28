---
name: supabase-security-and-migrations
description: تأمين RLS ودوال SECURITY DEFINER وهندسة هجرات Supabase والتحقق الحيّ عبر MCP (`/database-migration`)
---

# 🔐 تأمين قاعدة البيانات والتفويض على Supabase (Authz, RLS & Migrations)

استخدم هذا الدليل عند أي عمل على `supabase/migrations/` أو سياسات RLS أو دوال `SECURITY DEFINER` أو التحقق من الإنتاج عبر Supabase MCP.
> **أمر التشغيل المباشر للهجرات:** يمكن استدعاء مسار العمل المنهجي بكتابة `/database-migration` في صندوق المحادثة.

---

## 1. القاعدة الذهبية — فخ المنطق ثلاثي القيم (The NULL-Boolean Trap)

**لا تكتب أبداً `IF NOT some_boolean_function() THEN RAISE` داخل دالة `SECURITY DEFINER`.**
إن أمكن للدالة أن تُعيد `NULL` (لا `false`)، فإن `NOT NULL = NULL` و`IF NULL` تُعامَل كـ«خطأ» ⇒ **لا يُرفع الاستثناء ⇒ يمرّ الطلب بلا تحقق**.

الواقعة الحقيقية: كانت `is_admin()` تُعرَّف بـ
```sql
RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
   OR EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()));
```
عندما يكون `app_metadata = {}` (حال كل مستخدم عادي) فإن الطرف الأول = `NULL`، و`EXISTS(...)` = `FALSE`، و`NULL OR FALSE = NULL` ⇒ **كل دوال الأدمن (`admin_create_license_key`, `admin_extend_license`, `admin_revoke_license`) كانت مكشوفة لأي حامل للمفتاح العام (`anon`)**.

القواعد الإلزامية:
1. **أي دالة تعيد boolean تُلزَم بإعادة قيمة غير فارغة:** `RETURN COALESCE(<expr>, false) OR ...`.
2. **كل فحص تخويل داخل دالة يستخدم `IS NOT TRUE`** لا `NOT`:
   ```sql
   IF public.is_admin() IS NOT TRUE THEN
       RAISE EXCEPTION 'عملية مرفوضة' USING ERRCODE = '42501';
   END IF;
   ```
3. **افحص دائماً الحالة الحدّية `NULL`** عند مراجعة أي فحص — «وجود الفحص» ≠ «فعاليته».

---

## 2. أنماط RLS الصحيحة

- **`OLD.`/`NEW.` غير متاحين في سياسات RLS إطلاقاً.** أي `WITH CHECK (... plan = OLD.plan ...)` يفشل بـ`42P01: missing FROM-clause entry for table "old"` و**تفشل الهجرة كاملةً بصمت** (تُسجَّل كأنها نُفِّذت). حماية الأعمدة تُنفَّذ عبر **مشغّل `BEFORE UPDATE`** (`guard_profile_privilege_columns`).
- **`UPDATE` بلا `WITH CHECK` يورِّث `USING` ضمنياً** ⇒ يسمح بتعديل أي عمود. اكتب `WITH CHECK` صراحةً دائماً.
- **`INSERT`** يُقيَّد صراحةً: `WITH CHECK (false)` للجداول التي تُنشأ بمشغّل فقط (مثل `profiles` عبر `handle_new_user`).
- **أداء:** استخدم `(select auth.uid())` و`(select auth.role())` و`(select auth.jwt())` — لفّها بـ`SELECT` يجعلها تُقيَّم مرة واحدة لكل استعلام لا لكل صف (مستشار `auth_rls_initplan`).
- **أسماء السياسات ASCII دائماً:** PostgreSQL يقصّ أي معرّف عند 63 بايتاً **بصمت**؛ الاسم العربي الطويل يتحوّل لاسم مغاير ⇒ انحراف غير مرئي.

---

## 3. دوال SECURITY DEFINER

- **`SET search_path = public` دائماً** (و`public, extensions` عند الحاجة إلى `gen_random_uuid`).
- **اشتق الهوية من `auth.uid()` فقط**، ولا تثق أبداً بوسائط العميل: `check_and_record_ai_usage` يشتق الحصة من `profiles.plan` الخادمية ويهمل `p_daily_limit`، ويرفض `p_user_id ≠ auth.uid()` لغير المسؤول.
- **منح `anon` مقصود** لدوال الأدمن (قاعدة `AGENTS.md`)، فالفحص الداخلي هو خط الدفاع الوحيد ⇒ يجب أن يكون متيناً (`IS NOT TRUE`).
- **مشغّل بهلواني:** إذا كانت دالة مشغّل `SECURITY DEFINER`، فإن `current_user` يساوي مالك الدالة (postgres) فيتجاوز أي فحص `current_user NOT IN ('authenticated','anon')`. استخدم `SECURITY INVOKER` عندما تريد أن يعكس `current_user` دور الطلب الحقيقي.

---

## 4. مسار عمل صياغة وتطبيق الهجرات (Migration SOP — `/database-migration`)

### الخطوة 1: صياغة ملف الهجرة
أنشئ ملف هجرة جديد في مجلد `supabase/migrations/` بالاسم القياسي المعتمد على الطابع الزمني `YYYYMMDDHHMMSS_<name>.sql`:
- تفعيل RLS إجبارياً على أي جدول جديد: `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`.
- سياسات `USING` و `WITH CHECK` صريحة ومقيدة.
- أي دالة `SECURITY DEFINER` تضبط: `SET search_path = ''` وتشتق الهوية من `auth.uid()`.
- التحقق بشرط `IS NOT TRUE` لا `IF NOT fn()`.

### الخطوة 2: الفحص والتحقق التجريبي عبر Supabase MCP
اختبر الدوال والسياسات داخل معاملة تجريبية تُلغى (Rollback Transaction):
```sql
BEGIN;
-- تنفيذ أوامر الهجرة هنا
-- اختبار صلاحيات anon و authenticated
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
-- تنفيذ الاستعلام والتأكد من الحجب أو المنح
ROLLBACK;
```

### الخطوة 3: دفع الهجرة للسيرفر السحابي
```bash
supabase db push --yes
```

### الخطوة 4: تحديث مانيفست الهجرات وبوابة التوثيق
```bash
node scripts/migration-lint.mjs --update-manifest
node scripts/docs-gate.mjs --strict-refs
```
> **تنبيه حاسم:** الهجرة المطبقة لا تُعدّل إطلاقاً. الإصلاح يكون دائماً بهجرة جديدة لضمان عدم حدوث انحراف في المانيفست.

---

## 5. التحقق الحيّ عبر Supabase MCP (لا بالقراءة)

القراءة وحدها لا تُثبت الأمان. اعتمد التحقق السلوكي:

**أ. مزامنة الهجرة مع الملف:**
1. `apply_migration(project_id, name, query)` — ينشئ نسخة بالطابع الزمني.
2. `list_migrations(project_id)` لقراءة الإصدار المُسجَّل (مثل `20260926160117`).
3. أنشئ ملف المستودع بنفس الإصدار والاسم: `supabase/migrations/20260926160117_<name>.sql`.

**ب. اختبار التخويل في معاملة تُلغى** (أدوار PostgREST الحقيقية):
```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub','<USER_UUID>','role','authenticated','app_metadata','{}')::text, true);
set local role authenticated;   -- أو anon
select public.admin_create_license_key('pro', 12, 'PROBE') as result;  -- يجب أن يُرفض
rollback;
```
- كرّر السيناريو بدور `anon` وبمستخدم مصادق غير مسؤول.
- راقب `IS NULL` على نتيجة `is_admin()` تحديداً — هي إشارة الخطر.
- قياس المستشارات قبل/بعد: `get_advisors(type: 'security'|'performance')`.

---

## 6. مصفوفة اختبار التخويل المختصرة (Regression Matrix)

| # | السيناريو | النتيجة المتوقعة |
|---|---|---|
| T1 | المالك (عضوّ `admin_users`) يستدعي دوال الأدمن | نجاح |
| T2 | مستخدم مصادق غير مسؤول | `42501` / `P0001` رفض |
| T3 | دور `anon` بالمفتاح العام | رفض |
| T4 | تحديث ذاتي لحقول الاشتراك (`plan/status/expires_at/license_key`) | `42501` (المشغّل الحارس) |
| T5 | تحديث ذاتي لاسم/بريد شرعي | نجاح |
| T6 | `anon` يقرأ الجداول | 0 صفوف |
| T7 | مشرف يعدّل حقول عميل من لوحة الإدارة | نجاح |

---

## 7. أمان المصادقة والـ Edge Functions (Auth & Functions Hardening)

1. **مواءمة سياسات Auth بين السحابة والعميل:**
   - تحقق دائماً من مطابقة إعدادات `minimum_password_length` و `password_requirements` في `supabase/config.toml` ولوحة Supabase Auth مع دوال التحقق في العميل المحلي (`auth_flows.go` و `use-auth-forms.ts`).
2. **تقليص سطح الهجوم للدوال الميتة (Zero Orphan Edge Functions):**
   - يُمنع إبقاء أي دالة Edge منشورة بصلاحية `SUPABASE_SERVICE_ROLE_KEY` إذا لم تكن مستخدمة فعلياً من العميل.
3. **حظر تسريب التوكنات في سجلات التطبيق:**
   - عند التعامل مع استجابات `/auth/v1/verify` أو التدوير، لا تطبع محتوى الاستجابة الخام في `slog` لتجنب حفظ التوكنات في ملفات السجلات المحلية على جهاز المستخدم.
