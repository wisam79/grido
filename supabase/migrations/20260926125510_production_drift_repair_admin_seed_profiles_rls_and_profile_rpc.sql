-- =====================================================================
-- 2026-09-26 — إصلاح انحراف الإنتاج: تهيئة حساب الأدمن + ترميم سياسات profiles + حارس حقول الاشتراك + استرجاع ensure_profile_exists
-- السبب الجذري: هجرتان في المستودع (20260713000002، 20260725000001) تستخدمان OLD. داخل WITH CHECK
-- وهو غير صالح في سياسات RLS (42P01: missing FROM-clause entry for table "old") ⇒ لم تُطبَّق الحماية قط،
-- وترك الإنتاج السياسات المرنة القديمة (UPDATE بلا WITH CHECK) ⇒ تصعيد ذاتي للباقة/الحالة/الانتهاء/المفتاح.
-- هذه الهجرة idempotent وقابلة لإعادة التنفيذ.
-- ملاحظة: النسخة المطبَّقة على الإنتاج استخدمت SECURITY DEFINER للحارس وصُحّحت فوراً في
-- 20260926125727_fix_profile_guard_execution_context.sql — الملفان معاً يعطيان الحالة النهائية الصحيحة.
-- =====================================================================

-- 1) حساب الأدمن المعتمد (بديل الاعتماد على باقة enterprise)
INSERT INTO public.admin_users (user_id)
VALUES ('b2943199-cb11-4adc-9275-5a746aab879c')
ON CONFLICT (user_id) DO NOTHING;

-- 2) ترميم سياسات profiles: استبدال كامل للمجموعة الحالية بالمجموعة المحمية
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id OR public.is_admin());

CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "admin_update_any_profile" ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "no_direct_profile_insert" ON public.profiles
  FOR INSERT WITH CHECK (false);

-- 3) حارس حقول الاشتراك: يمنع تصعيد المستخدم لنفسه مع بقاء المشرف والمسارات الموثوقة
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- المسارات الموثوقة (SECURITY DEFINER مثل activate_license، أو service_role، أو صيانة مباشرة)
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- المشرف يملك تعديل حقول الاشتراك من لوحة الإدارة
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.license_key IS DISTINCT FROM OLD.license_key THEN
    RAISE EXCEPTION 'غير مصرح بتعديل حقول الاشتراك المباشرة (plan/status/expires_at/license_key)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_privilege_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_privilege_columns ON public.profiles;
CREATE TRIGGER guard_profile_privilege_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privilege_columns();

-- 4) استرجاع RPC ensure_profile_exists (مفقود على الإنتاج ⇒ فشل مسار الإنشاء الاحتياطي في التطبيق)
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_profile record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
  INTO v_email, v_name
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود في نظام الهوية';
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, name, email, plan, expires_at, status)
    VALUES (v_user_id, v_name, v_email, 'trial', timezone('utc'::text, now()) + interval '7 days', 'active')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  SELECT plan, expires_at, status INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  RETURN row_to_json(v_profile);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_profile_exists() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_profile_exists() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
