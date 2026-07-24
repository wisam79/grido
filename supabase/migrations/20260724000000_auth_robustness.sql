-- =================================================================================
-- Migration: 20260724000000_auth_robustness.sql
-- Goal: Fix handle_new_user trigger conflict handling & provide fallback RPC
--       to ensure every authenticated user receives a 7-day trial profile.
-- =================================================================================

-- 1. Safely update handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_plan text := 'trial';
  user_status text := 'active';
  user_expiry timestamp with time zone := timezone('utc'::text, now()) + interval '7 days';
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

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fallback RPC: ensure_profile_exists() for authenticated users
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

  INSERT INTO public.profiles (id, name, email, plan, expires_at, status)
  VALUES (
    v_user_id,
    v_name,
    v_email,
    'trial',
    timezone('utc'::text, now()) + interval '7 days',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET updated_at = timezone('utc'::text, now());

  SELECT plan, expires_at, license_key, status INTO v_profile
  from public.profiles
  WHERE id = v_user_id;

  RETURN row_to_json(v_profile);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_profile_exists TO authenticated;
