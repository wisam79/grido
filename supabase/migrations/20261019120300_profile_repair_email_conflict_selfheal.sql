-- =================================================================================
-- Migration: 20261019120300_profile_repair_email_conflict_selfheal.sql
-- الهدف: تعارض البريد الإلكتروني لم يعد يحجب إنشاء الملف الشخصي بشكل دائم (P2).
--   `profiles.email` فريد. عند اصطدام التسجيل ببريد محجوز سابقاً (صف يتيم من هوية
--   auth محذوفة) كان `handle_new_user` يبتلع unique_violation ويعيد new بلا صف،
--   و`ensure_profile_exists` يفعل المثل ثم يُعيد صفوفاً فارغة ({"plan":null,...})
--   ⇒ التطبيق يرى «ملفاً» بلا خطة ولا حالة ويعلق المستخدم بلا تفسير.
--   الإصلاح:
--     * دالة مشتركة `reclaim_orphan_profile_email` تستردّ الصفوف اليتيمة فقط
--       (بلا هوية auth حيّة) — لا تُسرق بريد حساب نشط أبداً.
--     * `handle_new_user` يحاول الاسترداد ثم الإدراج بدل الابتلاع الصامت.
--     * `ensure_profile_exists` يفشل صراحةً برسالة واضحة إن كان الحاجز حساباً
--       حياً، فلا يُعاد ملف فارغ يُقرأ كنجاح.
-- الهجرة idempotent: CREATE OR REPLACE + سحب المنح.
-- =================================================================================

-- 1) استرداد البريد من صف يتيم (بلا هوية auth حيّة) — قيد أمان صريح.
CREATE OR REPLACE FUNCTION public.reclaim_orphan_profile_email(p_email text, p_new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_id uuid;
BEGIN
  IF p_email IS NULL OR p_new_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- أقدم صف يحجب البريد وليس هو المستخدم الجديد نفسه.
  SELECT p.id INTO v_conflict_id
  FROM public.profiles p
  WHERE p.email = p_email
    AND p.id <> p_new_user_id
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_conflict_id IS NULL THEN
    RETURN false;
  END IF;

  -- الحاجز يملك هوية auth حيّة ⇒ لا استرداد (البريد مملوك فعلياً).
  IF EXISTS (SELECT 1 FROM auth.users au WHERE au.id = v_conflict_id) THEN
    RETURN false;
  END IF;

  DELETE FROM public.profiles WHERE id = v_conflict_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reclaim_orphan_profile_email(text, uuid) FROM PUBLIC;

-- 2) مشغّل التسجيل: يصلح نفسه عند التعارض مع صف يتيم بدل الابتلاع الصامت.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text := 'trial';
  user_status text := 'active';
  user_expiry timestamp with time zone := timezone('utc'::text, now()) + interval '7 days';
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, name, email, plan, expires_at, status)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      new.email,
      user_plan,
      user_expiry,
      user_status
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    -- تعارض على البريد: إن كان الحاجز صفاً يتيماً فاسترده ثم أعد الإدراج،
    -- وإلا اترك التسجيل ينجح بلا صف ليصلحه مسار ensure_profile_exists برسالة واضحة.
    IF public.reclaim_orphan_profile_email(new.email, new.id) THEN
      BEGIN
        INSERT INTO public.profiles (id, name, email, plan, expires_at, status)
        VALUES (
          new.id,
          COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          new.email,
          user_plan,
          user_expiry,
          user_status
        )
        ON CONFLICT (id) DO NOTHING;
      EXCEPTION WHEN unique_violation THEN
        NULL; -- تعارض آخر غير متوقع: لا نُفشل التسجيل.
      END;
    END IF;
  END;

  RETURN new;
END;
$$;

-- 3) مسار الترميم الاحتياطي (ensure_profile_exists): استرداد ذاتي + فشل صريح.
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
    -- تعارض على البريد: استرداد الصف اليتيم ثم إعادة المحاولة مرتين فقط.
    IF public.reclaim_orphan_profile_email(v_email, v_user_id) THEN
      BEGIN
        INSERT INTO public.profiles (id, name, email, plan, expires_at, status)
        VALUES (v_user_id, v_name, v_email, 'trial', timezone('utc'::text, now()) + interval '7 days', 'active')
        ON CONFLICT (id) DO NOTHING;
      EXCEPTION WHEN unique_violation THEN
        NULL; -- تعارض متكرر: يُكتشف أدناه بغياب الصف ⇒ رفض صريح.
      END;
    ELSE
      -- البريد مملوك لهوية auth حيّة أخرى ⇒ رفض صريح بدل ملف فارغ.
      RAISE EXCEPTION 'تعارض البريد الإلكتروني مع حساب آخر نشط — يلزم تغيير البريد من لوحة Supabase'
        USING ERRCODE = '23505';
    END IF;
  END;

  SELECT plan, expires_at, status INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'تعذر إنشاء الملف الشخصي لهذا المستخدم (تعارض بريد إلكتروني)';
  END IF;

  RETURN row_to_json(v_profile);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reclaim_orphan_profile_email(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
